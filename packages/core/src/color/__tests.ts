import type { IDriftState, IState } from "../internal/helpers/types.js";
import type { tOKLCH } from "./oklch.js";

/** Короткая фабрика тестовых цветов; поля можно переопределить точечно. */
export const color = (value: Partial<tOKLCH> = {}): tOKLCH => ({ l: 0.5, c: 0.1, h: 0, a: 1, ...value });

const slot = <V>(initial: V): IState<V> => {
	let value = initial;
	return {
		get: () => value,
		set: (next) => {
			value = next;
		},
	};
};

/** Пара независимых state-ячеек. */
export const drift = <V>(current: V, target: V = current): IDriftState<V> => ({
	current: slot(current),
	target: slot(target),
});
