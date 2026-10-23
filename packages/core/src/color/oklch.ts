import { clamp as math_clamp, lerp as math_lerp } from "../internal/helpers/math/index.js";
import { Angle } from "../internal/helpers/math/angle.js";
import type { IState } from "../internal/helpers/types.js";
import CONFIG from "./__config.js";

/**
 * OKLCH + alpha.
 *
 * `l`/`a` обычно `0…1`, `c` неотрицательная, `h` — градусы. Функции принимают
 * обычный объект: класс или специальный color-instance не нужен.
 */
export interface tOKLCH {
	l: number;
	c: number;
	h: number;
	a: number;
}

const within = (a: number, b: number, eps: number): boolean => Math.abs(a - b) <= eps + Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b)) * 4;

class iOKLCH {
	/** Кэш `black()` для дефолтных аргументов. */
	__black: tOKLCH = this.black();

	black(): tOKLCH {
		return { l: 0, c: 0, h: 0, a: 1 };
	}

	assign(a: tOKLCH, expected: tOKLCH = this.__black): void {
		a.l = expected.l;
		a.c = expected.c;
		a.h = expected.h;
		a.a = expected.a;
	}

	drift(current: IState<tOKLCH>, target: IState<tOKLCH>): void {
		this.assign(current.get(), target.get());
	}

	//...

	/**
	 * Приводит цвет к рабочему диапазону.
	 *
	 * Chroma ограничена только снизу: значения выше привычных `0.4` допустимы
	 * для wide-gamut и будут обработаны браузером при выводе CSS.
	 */
	clamp({ l, c, h, a }: tOKLCH): tOKLCH {
		return {
			l: math_clamp(0, l, 1),
			c: Math.max(0, c),
			h: Angle.normalize(h),
			a: math_clamp(0, a, 1),
		};
	}

	/**
	 * Интерполирует каналы с отдельным `t`; hue идёт по короткой дуге.
	 *
	 * Результат проходит через {@link clamp}: для `l`/`a` это не
	 * экстраполяция за диапазон, даже если `t < 0` или `t > 1`.
	 */
	lerp(current: tOKLCH, target: tOKLCH, t: tOKLCH): tOKLCH {
		return this.clamp({
			l: math_lerp(current.l, target.l, t.l),
			c: math_lerp(current.c, target.c, t.c),
			h: Angle.lerp(current.h, target.h, t.h),
			a: math_lerp(current.a, target.a, t.a),
		});
	}

	/**
	 * Визуальное равенство с поканальным допуском.
	 *
	 * Сравнение симметрично. Hue не учитывается, только когда **оба** цвета
	 * ахроматические; у серого оттенок не имеет видимого смысла.
	 */
	eq(current: tOKLCH, target: tOKLCH = this.__black, eps: tOKLCH = CONFIG.OKLCH_EPS): boolean {
		if (!within(current.l, target.l, eps.l) || !within(current.c, target.c, eps.c) || !within(current.a, target.a, eps.a)) return false;
		if (current.c <= CONFIG.OKLCH_ACHROMATIC_C && target.c <= CONFIG.OKLCH_ACHROMATIC_C) return true;
		return Angle.eq(current.h, target.h, eps.h);
	}

	/**
	 * Валидная CSS-функция с устойчивой точностью для snapshot/style diff.
	 * Перед форматированием цвет клампится.
	 */
	css(value: tOKLCH): string {
		const { l, c, h, a } = this.clamp(value);
		return `oklch(${(l * 100).toFixed(2)}% ${c.toFixed(4)} ${h.toFixed(2)} / ${a.toFixed(4)})`;
	}
}

export const OKLCH = new iOKLCH();
