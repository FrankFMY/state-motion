import type { IState } from "../../internal/helpers/types.js";
import { AbstractHabitat } from "../index.js";

/** Нереактивный habitat для SSR, скриптов и unit-тестов. */
export class ServerHabitat extends AbstractHabitat {
	/** Создаёт независимый слот, который хранит последнее переданное значение. */
	toState<T>(value: T): IState<T> {
		let v = value;
		return {
			get: () => v,
			set: (next) => {
				v = next;
			},
		};
	}

	/** На сервере proxy не нужен, поэтому возвращается исходная ссылка. */
	proxy<T>(obj: T): T {
		return obj;
	}
}
