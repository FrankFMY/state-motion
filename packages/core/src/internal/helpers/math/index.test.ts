import { describe, expect, test } from "bun:test";
import { clamp, lerp } from "./index.js";

describe("number helpers", () => {
	test("clamp при перевёрнутом диапазоне; lerp экстраполяция", () => {
		expect(clamp(10, 5, 0)).toBe(10);
		expect(clamp(0, 5, 10)).toBe(5);
		expect(lerp(0, 10, 1.5)).toBe(15);
		expect(lerp(0, 10, -0.5)).toBe(-5);
	});
});
