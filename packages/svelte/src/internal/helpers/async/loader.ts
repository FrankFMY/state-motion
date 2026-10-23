import { Deferred } from "./index.js";

/**
 * Тип хука, возвращаемый методом {@link Loader.hook}.
 */
export type LoaderHook = ReturnType<Loader["hook"]>;

/**
 * Очередь «занято».
 *
 * `onchange(true)` при добавлении операции.
 * `onchange(false)` один раз, когда завершились все учтённые операции.
 *
 * Когда применять: спиннер на пачке запросов, кнопка Saving, любой boolean busy.
 * Не подходит, если нужен abort одного промиса или прогресс `3/10`. Это только флаг.
 *
 * Каждая операция учитывается один раз, без хранения завершённых промисов.
 * {@link Loader.reset} меняет поколение: поздний settle старой операции
 * не может погасить новую очередь.
 *
 * Для UI берите `LoaderStore` из `@frankfmy/state-motion-svelte`. Там реактивный `state` и `hydrate` после SSR.
 */
export class Loader {
	__pending: number = 0;
	__version: symbol = Symbol();
	__onchange: (v: boolean) => void;

	constructor(onchange: (v: boolean) => void) {
		this.__onchange = onchange;
	}

	/**
	 * Снимает busy и забывает текущие операции. Промисы не abort'аются.
	 *
	 * Когда применять: unmount, смена сущности, отмена экрана.
	 *
	 * Меняет `__version` до уведомления, чтобы обработчик мог начать новую работу.
	 */
	reset(): void {
		this.__version = Symbol();
		this.__pending = 0;
		this.__onchange(false);
	}

	//...

	__check(version: symbol): void {
		if (this.__version === version && this.__pending === 0) this.reset();
	}

	__settle(version: symbol): void {
		if (this.__version !== version) return;
		this.__pending--;
		this.__check(version);
	}

	//...

	/**
	 * Промис уже есть: начатый `fetch` или чужой thenable.
	 * Несколько `push` держат один busy, пока все промисы не завершатся.
	 *
	 * Reject не снимает «занято» и не уходит в `onchange`.
	 * Ошибку ловит тот, кто держит промис.
	 *
	 * ```ts
	 * const p = fetch("/api");
	 * loader.push(p);
	 * const data = await p;
	 * ```
	 */
	push(promise: Promise<any>): void {
		const version = this.__version;
		this.__pending++;
		// Register before notifying: observers may reset or enqueue synchronously.
		void Promise.resolve(promise).then(
			() => this.__settle(version),
			() => this.__settle(version),
		);
		this.__onchange(true);
	}

	/**
	 * Когда промиса нет: callback-API, сокет, «сам скажу когда».
	 *
	 * Возвращает `resolve` внутреннего слота.
	 * Звать в `finally`. Повторный вызов безвреден.
	 *
	 * ```ts
	 * const done = loader.hook();
	 * try { await someCallbackApi(); } finally { done(); }
	 * ```
	 */
	hook(): () => void {
		const deferred = new Deferred();
		this.push(deferred.promise);
		return deferred.resolve;
	}

	/**
	 * Вызывает `func` и ждёт результат. Busy и `await` в одном месте.
	 *
	 * `external` — индикатор только этой операции.
	 * Соседние операции могут по-прежнему держать глобальный busy.
	 *
	 * `external(false)` срабатывает в `finally`, даже если `func` бросил до `push`.
	 * Reject учитывается как завершение. Глобальный флаг не прыгает на каждой ошибке.
	 *
	 * ```ts
	 * const data = await loader.run(() => fetch("/api").then((r) => r.json()));
	 * ```
	 */
	async run<T = any>(func: () => Promise<T>, external?: (v: boolean) => void): Promise<T> {
		external?.(true);
		try {
			const promise = func();
			this.push(promise);
			return await promise;
		} finally {
			external?.(false);
		}
	}
}
