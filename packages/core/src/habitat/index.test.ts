import { describe, expect, test } from "bun:test";
import { ServerHabitat } from "./server/index.js";

describe("ServerHabitat", () => {
	test("создаёт независимые state-слоты, сохраняет proxy identity и отмечает SSR", () => {
		const habitat = new ServerHabitat();
		const first = habitat.toState({ value: 1 });
		const second = habitat.toState({ value: 2 });
		const next = { value: 3 };

		first.set(next);
		expect(first.get()).toBe(next);
		expect(second.get()).toEqual({ value: 2 });
		expect(habitat.proxy(next)).toBe(next);
		expect(habitat.isSSR).toBe(true);
	});
});
