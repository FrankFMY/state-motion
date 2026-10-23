import { describe, expect, test } from "bun:test";
import { EPS } from "./eps.js";

const eps = 1e-5;

describe("eps", () => {
	test("полоса равенства и порядок", () => {
		expect(EPS.eq(2, 2 + eps / 2, eps)).toBe(true);
		expect(EPS.eq(2, 2 + eps * 2, eps)).toBe(false);
		expect(EPS.eq(0, -0, eps)).toBe(true);
		expect(EPS.eq(1, 1)).toBe(true);
	});

	test("NaN / ±Infinity / нестандартный EPS", () => {
		const specials = [Number.NaN, Infinity, -Infinity];
		for (const a of specials) {
			for (const b of [...specials, 0, 5]) {
				expect(EPS.eq(a, b, eps)).toBe(false);
			}
		}

		expect(EPS.eq(1, 1, 0)).toBe(true);
		expect(EPS.eq(1, 1 + Number.EPSILON, 0)).toBe(false);
		expect(EPS.eq(1, 1, -1)).toBe(false);
		expect(EPS.eq(1, 1, Number.NaN)).toBe(false);
		expect(EPS.eq(0, 1000, Infinity)).toBe(true);
		expect(EPS.eq(1, 1.0001, 1e-3)).toBe(true);
		expect(EPS.eq(1, 1.0001, 1e-5)).toBe(false);
	});

});
