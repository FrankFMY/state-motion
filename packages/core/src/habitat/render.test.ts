import { describe, expect, mock, test } from "bun:test";
import { lerp } from "../internal/helpers/math/index.js";
import type { DriftFunc, EqFunc, IDriftState, IState } from "../internal/helpers/types.js";
import CONFIG from "./__config.js";
import type { NewRender, RenderFrameEvent, RenderLoopItemOptions, RenderStateHabitat, RenderTimings, TickFunc } from "./render.js";
import { Render, RenderNumber, RenderState } from "./render.js";
import { ServerHabitat } from "./server/index.js";

const habitat = new ServerHabitat();

const TAU = Render.tau;
const MIN_DT = CONFIG.RENDER_MIN_DT;
const MAX_DT = CONFIG.RENDER_MAX_DT;
const eps = 1e-3;
const OPTS: RenderLoopItemOptions<number> = { tau: TAU, eps };
const opts = (tau: number): RenderLoopItemOptions<number> => ({ tau, eps });

interface Box {
	v: number;
}

// oxlint-disable-next-line typescript/explicit-function-return-type
const setup = () => {
	let lastCb: ((ts: number) => void) | null = null;
	let nextId = 1;
	const draw = mock((_timings: RenderTimings) => null);
	const onerror = mock((_e: unknown) => null);
	const requestAnimationFrame = mock((cb: (ts: number) => void) => {
		lastCb = cb;
		return nextId++;
	});
	const cancelAnimationFrame = mock((_id: number) => null);
	const ctx: NewRender = { draw, onerror, requestAnimationFrame, cancelAnimationFrame };
	const trigger = (ts: number): void => {
		if (!lastCb) throw new Error("rAF callback not planned");
		const cb = lastCb;
		lastCb = null;
		cb(ts);
	};
	return { ctx, draw, onerror, requestAnimationFrame, cancelAnimationFrame, trigger };
};

const sink = () => {
	const events: RenderFrameEvent<number>[] = [];
	return {
		events,
		func: (e: RenderFrameEvent<number>): boolean => {
			events.push(e);
			return true;
		},
	};
};

const boxDrift: DriftFunc<Box> = (current: IState<Box>, target: IState<Box>): void => {
	Object.assign(current.get(), target.get());
};

const boxTick: TickFunc<Box, number> = (ctx) => {
	const t = Render.alpha(ctx.timings.dt, ctx.opts.tau);
	const current = ctx.current.get();
	return { v: current.v + (ctx.target.get().v - current.v) * t };
};

const boxEq: EqFunc<Box, number> = (a, b, eps) => Math.abs(a.v - b.v) <= eps;

const numTick: TickFunc<number, number> = (ctx) => lerp(ctx.current.get(), ctx.target.get(), Render.alpha(ctx.timings.dt, ctx.opts.tau));

const boxSlot = (v: number): IState<Box> => {
	const box = { v };
	return {
		get: () => box,
		set: (next) => {
			box.v = next.v;
		},
	};
};

const boxState = (v: number): IDriftState<Box> => ({
	current: boxSlot(v),
	target: boxSlot(v),
});

const boxValue = (id: string, v: number, habitat: RenderStateHabitat): RenderState<Box, number> =>
	new RenderState(
		id,
		boxState(v),
		{
			drift: boxDrift,
			tick: boxTick,
			eq: boxEq,
			...habitat,
		},
		OPTS,
	);

describe("Render.alpha", () => {
	test("дефолтный tau = Render.tau", () => {
		expect(Render.alpha(50)).toBe(Render.alpha(50, TAU));
		expect(Render.tau).toBe(TAU);
	});
});

describe("Render.add / upsert / drop", () => {
	test("add идемпотентен по id; event.item — тот же объект; drop+add и разные id — нет", () => {
		const { ctx, trigger } = setup();
		const r = new Render(ctx);
		const first = mock((_e: RenderFrameEvent<number>) => false);
		const second = mock((_e: RenderFrameEvent<number>) => false);
		const other = mock((_e: RenderFrameEvent<number>) => false);
		const a = { id: "a", func: first, opts: OPTS };
		r.add(a);
		r.add({ id: "a", func: second, opts: opts(40) });
		r.add({ id: "b", func: other, opts: OPTS });
		trigger(1000);
		expect(first).toHaveBeenCalledTimes(1);
		expect(first.mock.calls[0][0].item).toBe(a);
		expect(second).not.toHaveBeenCalled();
		expect(other).toHaveBeenCalledTimes(1);

		r.drop("a");
		r.add({ id: "a", func: second, opts: opts(40) });
		trigger(1016);
		expect(second).toHaveBeenCalledTimes(1);
		expect(second.mock.calls[0][0].item.opts.tau).toBe(40);
	});

	test("upsert keep сохраняет iat и меняет item; refresh ставит новый; отсутствующий id создаёт запись", async () => {
		const { ctx, trigger } = setup();
		const r = new Render(ctx);
		const iats: number[] = [];
		const taus: number[] = [];
		r.add({
			id: "a",
			opts: OPTS,
			func: (e) => {
				iats.push(e.iat);
				taus.push(e.item.opts.tau);
				return true;
			},
		});
		trigger(1000);
		const iat0 = iats[0];
		r.upsert(
			{
				id: "a",
				opts: opts(40),
				func: (e) => {
					iats.push(e.iat);
					taus.push(e.item.opts.tau);
					return true;
				},
			},
			"keep",
		);
		trigger(1016);
		expect(iats[1]).toBe(iat0);
		expect(taus[1]).toBe(40);

		await new Promise<void>((resolve) => {
			setTimeout(resolve, 2);
		});
		r.upsert(
			{
				id: "a",
				opts: opts(200),
				func: (e) => {
					iats.push(e.iat);
					taus.push(e.item.opts.tau);
					return false;
				},
			},
			"refresh",
		);
		trigger(1032);
		expect(iats[2]).toBeGreaterThanOrEqual(iat0);
		expect(taus[2]).toBe(200);

		const created = mock((_e: RenderFrameEvent<number>) => false);
		r.upsert({ id: "new", func: created, opts: OPTS }, "keep");
		trigger(1048);
		expect(created).toHaveBeenCalledTimes(1);
		expect(r.__heap.has("new")).toBe(false);
	});

	test("заменённый во время кадра item не удаляется и старый snapshot не вызывается", () => {
		const { ctx, trigger, onerror } = setup();
		const r = new Render(ctx);
		const replacement = mock((_e: RenderFrameEvent<number>) => false);
		const stale = mock((_e: RenderFrameEvent<number>) => false);

		r.add({
			id: "a",
			opts: OPTS,
			func: () => {
				r.upsert({ id: "a", opts: OPTS, func: replacement }, "keep");
				r.upsert({ id: "b", opts: OPTS, func: replacement }, "keep");
				throw new Error("old item failed after replacement");
			},
		});
		r.add({ id: "b", opts: OPTS, func: stale });

		trigger(1000);
		expect(onerror).toHaveBeenCalledTimes(1);
		expect(stale).not.toHaveBeenCalled();
		expect(r.__heap.get("a")?.item.func).toBe(replacement);
		expect(r.__heap.get("b")?.item.func).toBe(replacement);

		trigger(1016);
		expect(replacement).toHaveBeenCalledTimes(2);
		expect(r.__heap.size).toBe(0);
	});
});

describe("Render: цикл", () => {
	test("prepare до func, draw после; оба получают timings", () => {
		const { ctx, trigger, draw } = setup();
		const prepare = mock((_timings: RenderTimings) => null);
		ctx.prepare = prepare;
		const r = new Render(ctx);
		const { events, func } = sink();
		r.add({ id: "a", func, opts: OPTS });
		trigger(1000);
		expect(prepare).toHaveBeenCalledTimes(1);
		expect(draw).toHaveBeenCalledTimes(1);
		expect(prepare.mock.calls[0][0]).toEqual(events[0].timings);
		expect(draw.mock.calls[0][0]).toEqual(events[0].timings);
	});

	test("ошибка удаляет запись, onerror получает её, остальные кадры живут", () => {
		const { ctx, trigger, onerror } = setup();
		const r = new Render(ctx);
		const boom = new Error("boom");
		let n = 0;
		r.add({
			id: "a",
			opts: OPTS,
			func: () => {
				throw boom;
			},
		});
		r.add({
			id: "b",
			opts: OPTS,
			func: () => {
				n++;
				return n < 2;
			},
		});
		trigger(1000);
		expect(onerror.mock.calls[0][0]).toBe(boom);
		expect(r.__heap.has("a")).toBe(false);
		expect(n).toBe(1);
		trigger(1016);
		expect(n).toBe(2);
		expect(r.__heap.size).toBe(0);
	});

	test("ровно один rAF на кадр; пустая куча не планирует следующий", () => {
		const { ctx, trigger, requestAnimationFrame } = setup();
		const r = new Render(ctx);
		r.add({ id: "a", func: () => true, opts: OPTS });
		r.add({ id: "b", func: () => true, opts: OPTS });
		expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
		trigger(1000);
		expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
		r.frame(1030);
		expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
	});

	test("clear отменяет rAF и позволяет переиспользовать инстанс", () => {
		const { ctx, trigger, draw, cancelAnimationFrame } = setup();
		const r = new Render(ctx);
		r.add({ id: "a", func: () => true, opts: OPTS });
		const fid = r.__frame_id;
		r.clear();
		expect(cancelAnimationFrame).toHaveBeenCalledWith(fid);
		expect(r.__heap.size).toBe(0);
		expect(r.__loop).toBe(false);

		const fn = mock((_e: RenderFrameEvent<number>) => false);
		r.add({ id: "a", func: fn, opts: OPTS });
		trigger(1000);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(draw).toHaveBeenCalled();
	});
});

describe("Render.frame", () => {
	test("вне цикла: пустая куча — только draw; непустая — старт цикла с dt≈16.67", () => {
		const { ctx, draw, requestAnimationFrame } = setup();
		const idle = new Render(ctx);
		idle.frame(1000);
		expect(draw).toHaveBeenCalledTimes(1);
		expect(requestAnimationFrame).not.toHaveBeenCalled();
		expect(idle.__loop).toBe(false);

		const { events, func } = sink();
		const r = new Render(ctx);
		r.__heap.set("a", { iat: 0, item: { id: "a", func, opts: OPTS } });
		r.frame(1000);
		expect(events[0].timings.dt).toBeCloseTo(100 / 6, 4);
		expect(events[0].item.id).toBe("a");
		expect(r.__loop).toBe(true);
		expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
	});

	test("внутри цикла не дублирует rAF; следующий dt считается от ручного кадра; пустая куча гасит loop", () => {
		const { ctx, trigger, draw, cancelAnimationFrame, requestAnimationFrame } = setup();
		const r = new Render(ctx);
		const { events, func } = sink();
		r.add({ id: "a", func, opts: OPTS });
		trigger(1000);
		const fidAfterFirst = r.__frame_id;
		r.frame(1030);
		expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
		expect(r.__frame_id).toBe(fidAfterFirst);
		trigger(1050);
		expect(events[1].timings.dt).toBe(30);
		expect(events[2].timings.dt).toBe(20);

		const fidPending = r.__frame_id;
		r.drop("a");
		const draws = draw.mock.calls.length;
		r.frame(2000);
		expect(cancelAnimationFrame).toHaveBeenCalledWith(fidPending);
		expect(r.__loop).toBe(false);
		expect(draw.mock.calls.length).toBe(draws + 1);
	});
});

describe("Render: кламп dt", () => {
	test("первый кадр 16.67; rAF и frame клампятся в [min, max], негативный dt → min", () => {
		const { ctx, trigger } = setup();
		const r = new Render(ctx);
		const { events, func } = sink();
		r.add({ id: "a", func, opts: OPTS });
		trigger(0);
		expect(events[0].timings.dt).toBeCloseTo(100 / 6, 4);

		trigger(MIN_DT / 2);
		expect(events[1].timings.dt).toBe(MIN_DT);
		trigger(events[1].timings.time + 30);
		expect(events[2].timings.dt).toBe(30);
		r.frame(events[2].timings.time + MAX_DT * 100);
		expect(events[3].timings.dt).toBe(MAX_DT);
		r.frame(0);
		expect(events[4].timings.dt).toBe(MIN_DT);
	});
});

//...

describe("RenderState", () => {
	test("принимает IDriftState; force без render; same target — no-op / re-tick; ссылки стабильны", () => {
		const state = boxState(0);
		const events: Array<[string, boolean]> = [];
		const obj = new RenderState(
			"force",
			state,
			{
				drift: boxDrift,
				tick: boxTick,
				eq: boxEq,
				onchange: (mode, dirty) => events.push([mode, dirty]),
			},
			OPTS,
		);
		expect(obj.current).toBe(state.current);
		expect(obj.target).toBe(state.target);

		const current_ref = obj.current.get();
		const target_ref = obj.target.get();
		obj.run({ v: 10 });
		expect(obj.current.get()).toBe(current_ref);
		expect(obj.target.get()).toBe(target_ref);
		expect(current_ref.v).toBe(10);
		expect(target_ref.v).toBe(10);
		expect(events).toEqual([["force", false]]);

		events.length = 0;
		obj.run({ v: 10 });
		expect(events).toHaveLength(0);

		obj.current.get().v = 0;
		obj.run({ v: 10 });
		expect(obj.current.get().v).toBe(10);
		expect(events).toEqual([["force", false]]);
	});

	test("с Render: interpolate, settle, onchange tick, stop; upsert keep обновляет opts", () => {
		const { ctx, trigger } = setup();
		const r = new Render(ctx);
		const events: Array<[string, boolean]> = [];
		const obj = boxValue("n", 0, { render: r, onchange: (mode, dirty) => events.push([mode, dirty]) });

		obj.run({ v: 100 }, opts(40));
		expect(r.__heap.get("n")?.item.opts.tau).toBe(40);
		trigger(1000);
		expect(obj.current.get().v).toBeGreaterThan(0);
		expect(obj.current.get().v).toBeLessThan(100);
		expect(events[0]).toEqual(["tick", true]);

		obj.run({ v: 200 }, opts(200));
		expect(r.__heap.get("n")?.item.opts.tau).toBe(200);

		while (r.__heap.size > 0) trigger(r.__time + 16);
		expect(obj.current.get().v).toBe(200);
		expect(events.at(-1)).toEqual(["tick", false]);
		expect(r.__heap.has("n")).toBe(false);

		obj.run({ v: 0 });
		expect(r.__heap.has("n")).toBe(true);
		obj.stop();
		expect(r.__heap.has("n")).toBe(false);
		expect(() => boxValue("anon", 0, {}).stop()).not.toThrow();

		const idle = boxValue("idle", 5, { render: r });
		idle.run({ v: 5 });
		expect(r.__heap.has("idle")).toBe(false);
	});
});

describe("RenderNumber", () => {
	test("force без render; interpolate и settle с Render", () => {
		const events: Array<[string, boolean]> = [];
		const state = { current: habitat.toState(0), target: habitat.toState(0) };
		const n = new RenderNumber("n", state, { onchange: (mode, dirty) => events.push([mode, dirty]) }, OPTS);
		expect(n.current).toBe(state.current);
		n.run(10);
		expect(n.current.get()).toBe(10);
		expect(n.target.get()).toBe(10);
		expect(events).toEqual([["force", false]]);

		const { ctx, trigger } = setup();
		const r = new Render(ctx);
		const obj = new RenderNumber("num", { current: habitat.toState(0), target: habitat.toState(0) }, { render: r, tick: numTick }, OPTS);
		obj.run(100);
		trigger(1000);
		expect(obj.current.get()).toBeGreaterThan(0);
		expect(obj.current.get()).toBeLessThan(100);
		while (r.__heap.size > 0) trigger(r.__time + 16);
		expect(obj.current.get()).toBe(100);
	});

	test("разрешает переопределить drift и связывает derived с обоими исходными слотами", () => {
		const drift = { current: habitat.toState({ v: 1 }), target: habitat.toState({ v: 2 }) };
		const derived = RenderNumber.derived(drift, {
			get: (value) => value.v,
			set: (value, next) => {
				value.v = next;
			},
		});
		expect(derived.current.get()).toBe(1);
		expect(derived.target.get()).toBe(2);
		derived.current.set(3);
		derived.target.set(4);
		expect(drift.current.get().v).toBe(3);
		expect(drift.target.get().v).toBe(4);

		const customDrift = mock((current: IState<number>, target: IState<number>) => current.set(target.get() + 1));
		const number = new RenderNumber("custom", { current: habitat.toState(0), target: habitat.toState(0) }, { drift: customDrift }, OPTS);
		number.run(10);
		expect(customDrift).toHaveBeenCalledTimes(1);
		expect(number.current.get()).toBe(11);
	});
});
