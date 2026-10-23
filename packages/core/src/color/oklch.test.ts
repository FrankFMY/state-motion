import { describe, expect, test } from "bun:test";
import CONFIG from "./__config.js";
import { color } from "./__tests.js";
import { OKLCH } from "./oklch.js";

describe("OKLCH", () => {
	test("clamp и lerp: wide-gamut chroma сохраняется, hue идёт короткой дугой", () => {
		expect(OKLCH.clamp(color({ l: 2, c: 0.8, h: -725, a: -1 }))).toEqual({ l: 1, c: 0.8, h: 355, a: 0 });

		expect(
			OKLCH.lerp(color({ h: 350, a: 1 }), color({ l: 1, c: 0.3, h: 10, a: 0 }), {
				l: 2,
				c: 0.5,
				h: 0.5,
				a: 0.25,
			}),
		).toEqual({ l: 1, c: 0.2, h: 0, a: 0.75 });
	});

	test("eq симметричен; hue цикличен и игнорируется только у двух серых", () => {
		const eps = CONFIG.OKLCH_EPS;
		const base = color();
		expect(OKLCH.eq(base, color({ l: base.l + eps.l, c: base.c + eps.c, h: 360 - eps.h, a: base.a - eps.a }))).toBe(true);
		expect(OKLCH.eq(base, color({ h: 2 }))).toBe(false);

		const grayA = color({ c: 0.005, h: 0 });
		const grayB = color({ c: 0.006, h: 180 });
		expect(OKLCH.eq(grayA, grayB)).toBe(true);
		expect(OKLCH.eq(grayB, grayA)).toBe(true);
		expect(OKLCH.eq(color({ c: 0.02, h: 0 }), color({ c: 0.02, h: 180 }))).toBe(false);

		expect(OKLCH.eq(base, color({ h: 30 }), { l: 0, c: 0, h: 30, a: 0 })).toBe(true);
	});

	test("css сначала приводит каналы к валидному диапазону и стабилизирует точность", () => {
		expect(OKLCH.css(color({ l: 2, c: -0.1, h: -10, a: -1 }))).toBe("oklch(100.00% 0.0000 350.00 / 0.0000)");
	});
});
