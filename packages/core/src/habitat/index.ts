import type { IState } from "../internal/helpers/types.js";

/** Минимальный адаптер между моделями и конкретной реактивной средой. */
export abstract class AbstractHabitat {
	/** Считается один раз в конструкторе (`typeof window`), дальше не обновляется. */
	isSSR: boolean = typeof window === "undefined";

	/** Создаёт доступ к значению через общий интерфейс `get`/`set`. */
	abstract toState<T>(value: T): IState<T>;

	/** Подготавливает объект для реактивной среды. */
	abstract proxy<T>(obj: T): T;
}
