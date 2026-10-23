import { Loader } from "./internal/helpers/async/loader.js";
import type { IState } from "./internal/helpers/types.js";
import { onMount } from "svelte";
import CONFIG from "./__config.js";
import type { ISvelteState } from "./index.svelte.js";
import { createSvelteRawState } from "./index.svelte.js";

export type { LoaderHook } from "./internal/helpers/async/loader.js";

/**
 * Менеджер состояния выполнения для асинхронных операций.
 * Поддерживает гидратацию true-значения после SSR
 *
 * @example
 * ```typescript
 * // Создание экземпляра. Конструктор принимает IState, не boolean.
 * const loader = LoaderStore.default(true); // в SSR значение будет true
 *
 * loader.hydrate(); // Если значение состояния `true`, добавляет onMount-проверку должно ли оно быть таковым
 *
 * $effect(() => {
 *   if (loader.state.signal) {
 *     console.log("Loading...");
 *   } else {
 *     console.log("Not loading");
 *   }
 * });
 *
 * // Передача промиса
 * async function fetchData() {
 *   const promise = fetch("/api/data");
 *   loader.push(promise);
 *   const data = await promise;
 *   return data;
 * }
 *
 * // Запуск операции
 * async function runFetch() {
 *   const data = await loader.run(() => fetch("/api/data"));
 *   return data;
 * }
 *
 * // Ручной хук (создаёт промис внутри)
 * const complete = loader.hook();
 * try {
 *   await someAsyncOperation();
 * } finally {
 *   complete();
 * }
 * ```
 */
export class LoaderStore<State extends IState<boolean> = ISvelteState<boolean>> extends Loader {
	state: State;

	static default(init: boolean = CONFIG.LOADER_DEFAULT): LoaderStore {
		return new LoaderStore(createSvelteRawState(init));
	}

	constructor(state: State) {
		super((v) => {
			state.set(v);
		});
		this.state = state;
	}

	/**
	 * Создаёт {@link onMount} проверку значения
	 */
	hydrate(): this {
		onMount(() => this.__check(this.__version));
		return this;
	}
}
