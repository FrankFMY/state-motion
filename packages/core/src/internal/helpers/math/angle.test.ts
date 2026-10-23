import { describe, expect, test } from "bun:test";
import { Angle } from "./angle.js";

describe("angle", () => {
	test("normalize / lerp / dist / eq используют кратчайшую дугу в градусах", () => {
		expect([Angle.normalize(-725), Angle.normalize(725), Angle.normalize(360)]).toEqual([355, 5, 0]);
		expect(Angle.lerp(350, 10, 0.5)).toBe(0);
		expect(Angle.lerp(10, 350, 0.5)).toBe(0);
		expect(Angle.lerp(0, 180, 0.5)).toBe(270);
		expect(Angle.lerp(350, 10, 2)).toBe(30);
		expect(Angle.dist(350, 10)).toBe(20);
		expect(Angle.dist(-725, 725)).toBe(10);
		expect(Angle.eq(-10, 350)).toBe(true);
		expect(Angle.eq(0, 0.001, 0.001)).toBe(true);
		expect(Angle.eq(0, 0.0011, 0.001)).toBe(false);
	});

});
