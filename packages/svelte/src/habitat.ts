import { AbstractHabitat } from "@frankfmy/state-motion";
import { createSvelteProxy, createSvelteState } from "./index.svelte.js";

/**
 * Нужен `@frankfmy/state-motion` (optional у пакета).
 *
 * - `toState` — {@link createSvelteState} (`$state`, глубокий)
 * - `proxy` — {@link createSvelteProxy}, новый прокси, не тождественен входу
 */
export class SvelteHabitat extends AbstractHabitat {
	toState = createSvelteState;

	proxy<T>(obj: T): T {
		return createSvelteProxy<T>(obj);
	}
}
