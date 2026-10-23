import { describe, expect, test } from "bun:test";
import CONFIG from "./__config.js";
import { UC3 } from "./index.js";
import type { C3 } from "./types.js";

describe("UC3", () => {
	test("zero / copy / assign / eq / lerp", () => {
		expect(UC3.zero()).toEqual({ x: 0, y: 0, z: 0 });
		expect(UC3.zero(1)).toEqual({ x: 1, y: 1, z: 1 });
		expect(UC3.zero(1, 2, 3)).toEqual({ x: 1, y: 2, z: 3 });

		const original: C3 = { x: 1, y: 2, z: 3 };
		const copied = UC3.copy(original);
		expect(copied).toEqual(original);
		expect(copied).not.toBe(original);
		copied.x = 99;
		expect(original.x).toBe(1);

		UC3.assign(copied, original);
		expect(copied).toEqual(original);
		UC3.assign(copied);
		expect(copied).toEqual({ x: 0, y: 0, z: 0 });

		expect(UC3.eq({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(true);
		expect(UC3.eq({ x: 1, y: 2, z: 3 }, { x: 1 + CONFIG.C3_EPS.x / 2, y: 2, z: 3 })).toBe(true);
		expect(UC3.eq({ x: 1, y: 2, z: 3 }, { x: 1 + CONFIG.C3_EPS.x * 2, y: 2, z: 3 })).toBe(false);

		expect(UC3.lerp({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }, { x: 0.5, y: 0.5, z: 0.5 })).toEqual({
			x: 5,
			y: 10,
			z: 15,
		});
		expect(UC3.lerp({ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 30 }, { x: 1, y: 0.5, z: 0 })).toEqual({ x: 10, y: 10, z: 0 });
	});
});
