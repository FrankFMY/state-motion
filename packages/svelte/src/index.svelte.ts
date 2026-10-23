import type { IState } from "./internal/helpers/types.js";
import { untrack } from "svelte";

/**
 * Интерфейс $state-хранилища.
 *
 * - `signal` реактивный
 * - `get`/`set`/`untrack` идут через {@link untrack}
 */
export interface ISvelteState<V = boolean | undefined> extends IState<V> {
	/**
	 * @reactive
	 */
	signal: V;
	/**
	 * Получает текущее значение состояния без подписки на изменения.
	 */
	get(): V;
	/**
	 * Безопасно устанавливает новое значение состояния (внутри {@link untrack}).
	 */
	set(state: V): void;
	/**
	 * Вызов коллбэка внутри {@link untrack}
	 */
	untrack<R>(call: (state: V) => R): R;
}

//...

/**
 * `$state`. Без аргумента — `undefined`.
 *
 * @template T - Тип значения
 * @returns {ISvelteState<T | undefined>} $state-хранилище значения
 *
 * @see https://svelte.dev/docs/svelte/what-are-runes
 */
function createSvelteState<T = boolean>(): ISvelteState<T | undefined>;

/**
 * @template T - Тип значения
 * @param {T} initial - Начальное значение
 * @returns {ISvelteState<T>} $state-хранилище значения
 *
 * @see https://svelte.dev/docs/svelte/what-are-runes
 */
function createSvelteState<T = boolean>(initial: T): ISvelteState<T>;

/**
 * `$state`. Без аргумента — `undefined`.
 *
 * @template T - Тип значения
 * @param {T} initial - Начальное значение
 * @returns {ISvelteState<T>} $state-хранилище значения
 *
 * @see https://svelte.dev/docs/svelte/what-are-runes
 */
function createSvelteState<T = boolean>(initial?: T): ISvelteState<T | undefined> {
	let signal = $state(initial);
	return {
		get signal() {
			return signal;
		},
		set signal(state) {
			signal = state;
		},
		get() {
			return untrack(() => signal);
		},
		set(state): void {
			untrack(() => {
				signal = state;
			});
		},
		untrack(call) {
			return untrack(() => call(signal));
		},
	};
}

export { createSvelteState };

//...

/**
 * `$state.raw` — без глубокой реактивности. Без аргумента — `undefined`.
 *
 * @template T - Тип значения
 * @returns {ISvelteState<T | undefined>} $state-хранилище значения
 *
 * @see https://svelte.dev/docs/svelte/what-are-runes
 */
function createSvelteRawState<T = boolean>(): ISvelteState<T | undefined>;

/**
 * `$state.raw` — без глубокой реактивности.
 *
 * @template T - Тип значения
 * @param {T} initial - Начальное значение
 * @returns {ISvelteState<T>} $state-хранилище значения
 *
 * @see https://svelte.dev/docs/svelte/what-are-runes
 */
function createSvelteRawState<T = boolean>(initial: T): ISvelteState<T>;

/**
 * `$state.raw` — без глубокой реактивности. Без аргумента — `undefined`.
 *
 * @template T - Тип значения
 * @param {T} initial - Начальное значение
 * @returns {ISvelteState<T>} $state-хранилище значения
 *
 * @see https://svelte.dev/docs/svelte/what-are-runes
 */
function createSvelteRawState<T = boolean>(initial?: T): ISvelteState<T | undefined> {
	let signal = $state.raw(initial);
	return {
		get signal() {
			return signal;
		},
		set signal(state) {
			signal = state;
		},
		get() {
			return untrack(() => signal);
		},
		set(state): void {
			untrack(() => {
				signal = state;
			});
		},
		untrack(call) {
			return untrack(() => call(signal));
		},
	};
}

export { createSvelteRawState };

//...

/**
 * `$derived.by`. Только чтение. `get()` без подписки.
 */
export interface ISvelteDerived<V> {
	readonly signal: V;
	/**
	 * Получает текущее значение состояния без подписки на изменения.
	 */
	get(): V;
}

export const createSvelteDerived = <V>(effect: () => V): ISvelteDerived<V> => {
	const signal = $derived.by(effect);
	return {
		get signal(): V {
			return signal;
		},
		get(): V {
			return untrack(() => signal);
		},
	};
};

/**
 * `$derived.by` с записью. Временный оверрайд, как в доке Svelte
 * (optimistic UI): `likes += 1` сразу, сервер потом подтянет `post`.
 *
 * Пока зависимости не изменились — держится записанное.
 * Зависимости обновились — снова формула, оверрайд сбрасывается.
 * Сервер упал — откатываете сами (`likes -= 1`). Через `$effect` не писать.
 */
export type ISvelteWritableDerived<V> = ISvelteState<V>;

export const createSvelteWritableDerived = <T>(func: () => T): ISvelteWritableDerived<T> => {
	let signal = $derived.by(func);
	return {
		get signal() {
			return signal;
		},
		set signal(state) {
			signal = state;
		},
		get() {
			return untrack(() => signal);
		},
		set(state): void {
			untrack(() => {
				signal = state;
			});
		},
		untrack(call) {
			return untrack(() => call(signal));
		},
	};
};

//...

export const createSvelteEffect = (func: () => void): void => {
	$effect(func);
};

export const createSvelteRoot = (func: () => void | (() => void)): (() => void) => {
	return $effect.root(func);
};

export const createSvelteSnapshot = <V>(v: V): V => $state.snapshot(v) as V;

/** `$state(obj)` — новый прокси, не тождественен `obj`. */
export const createSvelteProxy = <O>(obj: O): O => {
	// noinspection UnnecessaryLocalVariableJS
	const proxy = $state(obj);
	return proxy;
};

/** `$state.raw(obj)` preserves identity and does not create a deep reactive proxy. */
export const createSvelteRawProxy = <O>(obj: O): O => {
	// noinspection UnnecessaryLocalVariableJS
	const proxy = $state.raw(obj);
	return untrack(() => proxy);
};
