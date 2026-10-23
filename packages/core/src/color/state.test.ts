import { describe, expect, test } from "bun:test";
import type { RenderTickContext } from "../habitat/render.js";
import CONFIG from "./__config.js";
import { color, drift } from "./__tests.js";
import type { tOKLCH } from "./oklch.js";
import { ColorState, tick as colorStateTick } from "./state.js";

const options = {
	eps: { l: 0.001, c: 0.001, h: 1, a: 0.001 },
	tau: { l: 100, c: 100, h: 100, a: 100 },
};

describe("ColorState", () => {
	test("force без render, независимые defaults и поканальный tick по короткой дуге", () => {
		const firstState = drift(color({ h: 350 }), color({ h: 350 }));
		const first = new ColorState("first", firstState, {});
		const second = new ColorState("second", drift(color(), color()), {});
		expect(first.opts.eps).not.toBe(CONFIG.OKLCH_EPS);
		expect(first.opts.eps).not.toBe(second.opts.eps);
		expect(first.opts.tau).not.toBe(second.opts.tau);

		const target = color({ l: 0.9, c: 0.3, h: 10, a: 0.5 });
		first.run(target);
		expect(first.current.get()).toEqual(target);
		expect(first.current.get()).not.toBe(target);

		const state = drift(color({ h: 350 }), target);
		const ctx: RenderTickContext<tOKLCH, tOKLCH> = {
			...state,
			iat: 0,
			timings: { dt: Math.log(2) * 100, time: 100 },
			opts: options,
		};
		expect(colorStateTick(ctx)).toEqual({ l: 0.7, c: 0.2, h: 0, a: 0.75 });
	});
});
