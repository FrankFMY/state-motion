import { EPS } from "../internal/helpers/eps.js";
import { clamp, lerp } from "../internal/helpers/math/index.js";
import type { DriftFunc, EqFunc, IDriftState, IState } from "../internal/helpers/types.js";
import CONFIG from "./__config.js";

export interface RenderLoopItemOptions<O> {
	tau: O;
	eps: O;
}

export interface RenderLoopItem<O> {
	id: string;
	func: (event: RenderFrameEvent<O>) => boolean;
	opts: RenderLoopItemOptions<O>;
}

//..

export interface RenderTimings {
	/**
	 * Дельта времени от предыдущего кадра, с клампом в `[__min_dt, __max_dt]`.
	 */
	dt: number;
	/**
	 * `ts` текущего кадра (время `performance.now()`).
	 */
	time: number;
}

export interface RenderFrameEvent<O> {
	timings: RenderTimings;
	item: RenderLoopItem<O>;
	iat: number;
}

//...

export interface RenderHabitat {
	requestAnimationFrame: (callback: (time: number) => void) => number;
	cancelAnimationFrame: (id: number) => void;
}

export interface RenderHooks {
	/**
	 * Вызывается перед каждым `__tick`
	 */
	prepare?: (timings: RenderTimings) => void;
	/**
	 * Вызывается в конце каждого `__tick`
	 */
	draw?: (timings: RenderTimings) => void;
	/**
	 * Вызывается при ошибке в `func`
	 */
	onerror?: (error: unknown) => void;
}

export interface NewRender extends RenderHooks, RenderHabitat {}

export type RenderUpsertIatMode = "keep" | "refresh";

export class Render {
	/**
	 * Минимальный `dt` (мс). Если `rAF` пришёл чаще — клампится снизу.
	 * Защищает от >120 Гц (где некоторые браузеры/мониторы выдают лишние кадры)
	 * и от «нулевых» `dt` при нескольких `rAF`-ах в одном тике
	 */
	__min_dt = CONFIG.RENDER_MIN_DT;

	/**
	 * Максимальный `dt` (мс). Если `rAF` пришёл реже — клампится сверху.
	 * Ограничивает скачки `dt` при уходе вкладки в фон, системных подвисаниях
	 * и т.п.: без клампа единичный «долгий» кадр унес бы сглаженные значения
	 * далеко за цель и сломал бы инерцию
	 */
	__max_dt = CONFIG.RENDER_MAX_DT;

	/**
	 * Идентификатор запланированного `rAF` (0 = нет ожидающего кадра)
	 */
	__frame_id = 0;
	__generation = Symbol();

	/**
	 * `ts` последнего кадра; используется для расчёта `dt`
	 */
	__time = 0;

	/**
	 * `true`, если рендер-цикл активен (был хотя бы один `rAF`-кадр)
	 */
	__loop = false;

	/**
	 * Куча анимаций для следующего кадра
	 */
	__heap = new Map<string, { iat: number; item: RenderLoopItem<any> }>();

	//...

	protected now(): number {
		return performance.now();
	}

	has(id: string): boolean {
		return this.__heap.has(id);
	}

	upsert(item: RenderLoopItem<any>, mode: RenderUpsertIatMode): void {
		if (mode === "keep") {
			const existed = this.__heap.get(item.id);
			if (existed) {
				this.__heap.set(item.id, { iat: existed.iat, item });
				this.run();
				return;
			}
		}
		this.__heap.set(item.id, { iat: this.now(), item });
		this.run();
	}

	add(item: RenderLoopItem<any>): void {
		if (!this.has(item.id)) this.upsert(item, "refresh");
	}

	drop(id: string): void {
		this.__heap.delete(id);
	}

	//...

	ctx: NewRender;

	constructor(ctx: NewRender) {
		this.ctx = ctx;
	}

	/**
	 * Один шаг рендера: считает `dt` (с клампом), итерирует кучу, вызывает
	 * `func` каждой записи. Если `func` вернул `false` — запись удаляется
	 * (анимация завершена). Ошибки в `func` → запись удаляется + `onerror`.
	 *
	 * В конце всегда вызывает `ctx.draw`. **Не** планирует следующий кадр —
	 * это задача `__frame`/`frame`.
	 *
	 * Первый кадр (`__loop === false`): `dt` = `100/6` (≈16.67), т.к. ещё
	 * не от чего считать дельту. Это канон для «старта с чистого листа»
	 */
	__tick(ts: number): void {
		const __dt = this.__loop ? ts - this.__time : CONFIG.RENDER_START_DT;

		// Для ручного кадра наличием клэмпа тоже можно пренебречь, т.к. он не предназначен для множественного использования.
		// (Речь о том, что он будет не реальный, а всегда минимальный)
		const dt = clamp(this.__min_dt, __dt, this.__max_dt);
		this.__time = ts;

		const timings: RenderTimings = { dt, time: this.__time };

		this.ctx.prepare?.(timings);

		for (const [id, entry] of Array.from(this.__heap.entries())) {
			if (this.__heap.get(id) !== entry) continue;
			const { iat, item } = entry;
			try {
				const need_new_frame = item.func({ iat, item, timings });
				if (!need_new_frame && this.__heap.get(id) === entry) this.__heap.delete(id);
			} catch (error: unknown) {
				if (this.__heap.get(id) === entry) this.__heap.delete(id);
				this.ctx.onerror?.(error);
			}
		}

		this.ctx.draw?.(timings);
	}

	/**
	 * Кадр, вызванный из `rAF`. После `__tick` планирует следующий кадр,
	 * **только** если куча непуста. С пустой кучей — сбрасывает `__frame_id` и гасит
	 * `__loop`: цикл самозавершается, когда все анимации отработали `false`
	 */
	__frame(ts: number): void {
		const generation = this.__generation;
		this.__tick(ts);
		if (generation !== this.__generation) return;
		this.__frame_id = 0;
		if (this.__heap.size > 0) {
			this.__loop = true;
			this.run();
		} else {
			this.__loop = false;
		}
	}

	//...

	/**
	 * Ручной кадр (вне `rAF`). Полезно для принудительной отрисовки вне цикла
	 * (например, при resize, оффскрин-рендере, сервер-сайде) или для «вклинивания»
	 * в активный цикл: сдвигает `__time` так, что следующий `rAF`-кадр считает
	 * `dt` от этого момента (т.е. «съедает» время).
	 *
	 * Поведение:
	 * - куча пуста → `__stop` (отменяет висящий `rAF`, гасит `__loop`).
	 * - куча непуста → `__tick` + старт цикла (`__loop = true`, `run()`).
	 *
	 * В отличие от `__frame`, **не** сбрасывает `__frame_id` перед `run`:
	 *  если кадр уже запланирован — `run` вернётся раньше, без дубля
	 */
	frame(ts: number = this.now()): void {
		this.__tick(ts);
		if (this.__heap.size > 0) {
			this.__loop = true;
			this.run();
		} else {
			this.stop();
		}
	}

	/**
	 * Планирует ровно один `rAF`, если ещё не запланирован (`__frame_id === 0`).
	 * Идемпотентна: повторные вызовы в одном кадре — no-op. Это ключевое
	 * свойство, разрешающее множественные `push` без шторма `rAF`-ов.
	 */
	run(): void {
		if (this.__frame_id) return;
		const generation = this.__generation;
		this.__frame_id = this.ctx.requestAnimationFrame((t) => {
			if (generation === this.__generation) this.__frame(t);
		});
	}

	//...

	/**
	 * Останавливает планировщик: отменяет висящий `rAF`, сбрасывает `__frame_id`,
	 * гасит `__loop`. **Не** трогает кучу — в отличие от `clear`, записи
	 * сохраняются. Удобно для паузы с возможностью возобновления через `run`.
	 */
	stop(): void {
		this.__generation = Symbol();
		if (this.__frame_id) this.ctx.cancelAnimationFrame(this.__frame_id);
		this.__frame_id = 0;
		this.__loop = false;
	}

	/**
	 * Полностью остановить рендер:
	 * - отменить запланированный кадр;
	 * - сбросить `__loop`, очистить кучу;
	 *
	 * @remarks После `clear` объект можно использовать заново
	 */
	clear(): void {
		this.stop();
		this.__heap.clear();
	}

	//...

	static tau: number = 90;

	/**
	 * Экспоненциальный коэффициент сглаживания для кадра: `α = 1 - exp(-dt / tau)`.
	 *
	 * Используется для плавной интерполяции значений без фиксированной длительности —
	 * каждый кадр значение приближается к цели на определенный процент оставшегося пути.
	 * Если цель меняется в процессе (например, курсор мыши двигается), анимация плавно
	 * перестраивается без рывков.
	 *
	 * **Как подобрать tau под желаемую длительность T (как в CSS transition):**
	 * ```
	 * tau = T / n
	 * ```
	 * где `n` — сколько периодов tau должно пройти до визуального «успокоения».
	 *
	 * **Почему n имеет значение:**
	 * Экспоненциальное сглаживание никогда не достигает цели полностью — оно бесконечно
	 * приближается. Оставшиеся проценты превращаются в медленное «доплывание»:
	 *
	 * | n | Достигнуто | Остаток | Визуальное ощущение |
	 * |---|------------|---------|---------------------|
	 * | 3 | ~95%       | 5px из 100px | Движение останавливается резковато, видно, что ещё ползёт |
	 * | 4 | ~98%       | 2px из 100px | Почти не заметно, но пристальный взгляд увидит микродвижение |
	 * | 5 | ~99.3%     | 0.7px из 100px | Глаз не различает, полная остановка |
	 *
	 * **Рекомендации по выбору n:**
	 * - `n = 3` — для динамических вещей, которые постоянно меняются (камера, следование за мышью)
	 * - `n = 4` — стандарт для большинства UI (компромисс между плавностью и производительностью)
	 * - `n = 5` — когда нужно полное визуальное завершение (меню, тултипы, модальные окна)
	 *
	 * **Примеры подбора tau:**
	 * | Хочу как transition | tau (n=3) | tau (n=4) | tau (n=5) | Сценарий |
	 * |---|---|---:|---:|---|
	 * | 100ms | 33 | 25 | 20 | Мгновенный отклик на мышь |
	 * | 200ms | 67 | 50 | 40 | Быстрое появление тултипа |
	 * | 300ms | 100 | 75 | 60 | Стандартный UI-переход |
	 * | 500ms | 167 | 125 | 100 | Плавная камера |
	 * | 1000ms | 333 | 250 | 200 | Инерционное движение |
	 *
	 * **Поведение при разных dt:**
	 * - При малом `dt` (высокий FPS) `α ≈ dt / tau` — ведёт себя почти линейно
	 * - При `dt = tau` за один кадр покрывается ~63% расстояния до цели
	 * - При большом `dt` (лаги, вкладка в фоне) `α → 1` — мгновенный докрут до цели
	 *
	 * @param dt - дельта времени между кадрами в миллисекундах (`performance.now()`)
	 * @param tau - постоянная времени сглаживания в миллисекундах.
	 * Чем больше — тем «инерционнее» движение, тем плавнее выглядит анимация.
	 * По умолчанию {@link Render.tau} (90ms, подходит почти для всего и для микро-дельт в частности)
	 *
	 * @returns Коэффициент `α` в диапазоне `(0, 1)`, готовый к использованию в `lerp`
	 *
	 * @example
	 * ```typescript
	 * // Плавное движение камеры к target (дефолтный tau=90, ~450ms до покоя при n=5)
	 * const a = Render.alpha(dt);
	 * camera.center = lerp(camera.center, camera.target, a);
	 *
	 * // Быстрое появление тултипа (~200ms до покоя при n=5)
	 * tooltip.opacity = lerp(tooltip.opacity, 1, Render.alpha(dt, 40));
	 *
	 * // Анимация с явным завершением (как CSS transition на 300ms, n=5 → tau=60)
	 * const a = Render.alpha(dt, 60);
	 * value = lerp(value, target, a);
	 * if (Math.abs(value - target) < 0.001) {
	 *     value = target; // snap to exact target
	 *     render.drop('my-animation');
	 * }
	 * ```
	 *
	 * @remarks
	 * В отличие от CSS transition с фиксированной длительностью, экспоненциальное
	 * сглаживание даёт адаптивное поведение: если цель изменилась в середине анимации,
	 * движение плавно перестраивается без рывков. Это идеально для камер, следования
	 * за курсором, инерционной прокрутки и любых continuously-changing targets.
	 */
	static alpha(dt: number, tau: number = Render.tau): number {
		return 1 - Math.exp(-dt / tau);
	}
}

//...

export interface RenderTickContext<V, O> extends IDriftState<V> {
	timings: RenderTimings;
	opts: RenderLoopItemOptions<O>;
	iat: number;
}

export type TickFunc<V, O> = (ctx: RenderTickContext<V, O>) => V;

//...

export interface RenderStateHabitat {
	render?: Render;
	onchange?: (mode: "force" | "tick", dirty: boolean) => void;
}

export interface RenderStateTools<V, O> {
	drift: DriftFunc<V>;
	tick: TickFunc<V, O>;
	eq: EqFunc<V, O>;
}

export interface NewRenderState<V, O> extends RenderStateHabitat, RenderStateTools<V, O> {}

/**
 * Связывает пару `current`/`target` с {@link Render}.
 *
 * `run` меняет цель и запускает кадры. Без `render` значение применяется сразу.
 * Наследники задают покадровый переход через `tick` и условие остановки через
 * `eq`; `drift` фиксирует точное конечное значение.
 */
export class RenderState<V, O> implements IDriftState<V> {
	id: string;
	current: IState<V>;
	target: IState<V>;

	drift: DriftFunc<V>;
	tick: TickFunc<V, O>;
	eq: EqFunc<V, O>;

	render?: Render;
	onchange?: (mode: "force" | "tick", dirty: boolean) => void;
	opts: RenderLoopItemOptions<O>;

	constructor(id: string, state: IDriftState<V>, ctx: NewRenderState<V, O>, opts: RenderLoopItemOptions<O>) {
		this.id = id;
		this.current = state.current;
		this.target = state.target;
		this.drift = ctx.drift;
		this.tick = ctx.tick;
		this.eq = ctx.eq;
		this.render = ctx.render;
		this.onchange = ctx.onchange;
		this.opts = opts;
	}

	/** Удаляет состояние из render-loop, не меняя `current` и `target`. */
	stop(): void {
		this.render?.drop(this.id);
	}

	/**
	 * Устанавливает новую цель. Равная цель — no-op, если `current` уже дошёл,
	 * иначе незавершённое движение запускается повторно.
	 */
	run(target: V, opts: RenderLoopItemOptions<O> = this.opts): void {
		if (this.eq(this.target.get(), target, opts.eps)) {
			if (this.eq(this.current.get(), this.target.get(), opts.eps)) return;
		} else {
			this.target.set(target);
		}
		this.dirty(opts);
	}

	/**
	 * Помечает состояние требующим кадра.
	 *
	 * `keep` сохраняет время первого запуска (`iat`), `refresh` начинает его
	 * заново. Без render-loop сразу вызывает `drift`.
	 */
	dirty(opts: RenderLoopItemOptions<O> = this.opts, mode: RenderUpsertIatMode = "keep"): void {
		if (this.render) {
			this.render.upsert(
				{
					id: this.id,
					func: (event) => this.__frame(event),
					opts,
				},
				mode,
			);
		} else {
			this.drift(this.current, this.target);
			this.onchange?.("force", false);
		}
	}

	__frame(event: RenderFrameEvent<O>): boolean {
		const dirty = this.__tick({
			iat: event.iat,
			timings: event.timings,
			opts: event.item.opts,
			current: this.current,
			target: this.target,
		});
		this.onchange?.("tick", dirty);
		return dirty;
	}

	__tick(ctx: RenderTickContext<V, O>): boolean {
		if (this.eq(ctx.current.get(), ctx.target.get(), ctx.opts.eps)) return false;

		const next = this.tick(ctx);

		if (this.eq(ctx.target.get(), next, ctx.opts.eps)) {
			this.drift(ctx.current, ctx.target);
		} else {
			ctx.current.set(next);
		}
		return true;
	}
}

//...

export interface NewRenderNumber extends RenderStateHabitat, Partial<RenderStateTools<number, number>> {
	drift?: DriftFunc<number>;
}

export interface DerivedRenderNumberHooks<V> {
	get: (state: V) => number;
	set: (state: V, value: number) => void;
}

export class RenderNumber extends RenderState<number, number> {
	constructor(id: string, state: IDriftState<number>, habitat: NewRenderNumber, opts: RenderLoopItemOptions<number>) {
		const ctx: NewRenderState<number, number> = {
			...habitat,
			drift: habitat.drift ?? ((current, target): void => current.set(target.get())),
			tick: habitat.tick ?? RenderNumber.tick,
			eq: habitat.eq ?? EPS.eq,
		};
		super(id, state, ctx, opts);
	}

	static tick(ctx: RenderTickContext<number, number>): number {
		const alpha = Render.alpha(ctx.timings.dt, ctx.opts.tau);
		return lerp(ctx.current.get(), ctx.target.get(), alpha);
	}

	static derived<V>(drift: IDriftState<V>, hooks: DerivedRenderNumberHooks<V>): IDriftState<number> {
		return {
			current: {
				get(): number {
					return hooks.get(drift.current.get());
				},
				set(value: number): void {
					hooks.set(drift.current.get(), value);
				},
			},
			target: {
				get(): number {
					return hooks.get(drift.target.get());
				},
				set(value: number): void {
					hooks.set(drift.target.get(), value);
				},
			},
		};
	}
}
