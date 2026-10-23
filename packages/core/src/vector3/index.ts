import { EPS } from "../internal/helpers/eps.js";
import { lerp } from "../internal/helpers/math/index.js";
import type { IState } from "../internal/helpers/types.js";
import CONFIG from "./__config.js";
import type * as ST from "./types.js";

class iUC3 {
	__zero = this.zero();

	/**
	 * Фабрика точки `zero(x = 0, y = x, z = x)`.
	 */
	zero(x: number = 0, y: number = x, z: number = x): ST.C3 {
		return { x, y, z };
	}

	/**
	 * Поверхностная копия: новый объект с теми же `x`/`y`/`z`.
	 */
	copy(p: ST.C3): ST.C3 {
		return { x: p.x, y: p.y, z: p.z };
	}

	/**
	 * **Мутирует** `p`: копирует значения из `expected`.
	 * По умолчанию `expected = {0, 0, 0}`.
	 *
	 * Единственный публичный способ мутировать входной объект.
	 */
	assign(p: ST.C3, expected: ST.C3 = this.__zero): void {
		p.x = expected.x;
		p.y = expected.y;
		p.z = expected.z;
	}

	drift(current: IState<ST.C3>, target: IState<ST.C3>): void {
		this.assign(current.get(), target.get());
	}

	/**
	 * Структурно точное равенство c `EPS` по трём осям.
	 *
	 * `b` по умолчанию `{0, 0, 0}` (проверка «точка ли в origin»).
	 */
	eq(a: ST.C3, b: ST.C3 = this.__zero, eps: ST.C3 = CONFIG.C3_EPS): boolean {
		return EPS.eq(a.x, b.x, eps.x) && EPS.eq(a.y, b.y, eps.y) && EPS.eq(a.z, b.z, eps.z);
	}

	/**
	 * Линейная интерполяция `a + (b - a) * t`.
	 *
	 * `t` задаёт независимый коэффициент для каждой оси.
	 * **Не ограничена** `t ∈ [0, 1]` — допускает экстраполяцию при `t < 0` или `t > 1`.
	 */
	lerp(a: ST.C3, b: ST.C3, t: ST.C3): ST.C3 {
		return {
			x: lerp(a.x, b.x, t.x),
			y: lerp(a.y, b.y, t.y),
			z: lerp(a.z, b.z, t.z),
		};
	}
}

export const UC3 = new iUC3();

export type { C3 } from "./types.js";
