import { describe, expect, expectTypeOf, test } from "bun:test";
import { flush } from "../__tests.js";
import { Loader } from "./loader.js";

describe("Loader", () => {
	test("busy до завершения всех операций; reject не гасит соседей; reset глушит старый settle", async () => {
		const states: boolean[] = [];
		const loader = new Loader((v) => states.push(v));

		let resolveSecond!: () => void;
		loader.push(Promise.resolve(1));
		loader.push(
			new Promise<void>((resolve) => {
				resolveSecond = resolve;
			}),
		);
		loader.push(Promise.reject(new Error("fail")));
		expect(loader.__pending).toBe(3);
		expect(states).toEqual([true, true, true]);

		await flush();
		expect(states).toEqual([true, true, true]);

		resolveSecond();
		await flush();
		expect(states).toEqual([true, true, true, false]);
		expect(loader.__pending).toBe(0);

		let resolveP!: () => void;
		loader.push(
			new Promise<void>((resolve) => {
				resolveP = resolve;
			}),
		);
		loader.reset();
		expect(loader.__pending).toBe(0);
		expect(states).toEqual([true, true, true, false, true, false]);

		resolveP();
		await flush();
		expect(states).toEqual([true, true, true, false, true, false]);

		const priorVersion = loader.__version;
		loader.reset();
		expect(loader.__version).not.toBe(priorVersion);
		expect(states.at(-1)).toBe(false);
	});

	test("hook и run: идемпотентный done, external в finally, sync throw до push", async () => {
		const states: boolean[] = [];
		const external: boolean[] = [];
		const loader = new Loader((v) => states.push(v));

		const c1 = loader.hook();
		const c2 = loader.hook();
		c1();
		c1();
		await flush();
		expect(states).toEqual([true, true]);
		c2();
		await flush();
		expect(states).toEqual([true, true, false]);

		expect(
			await loader.run(
				() => Promise.resolve(42),
				(v) => external.push(v),
			),
		).toBe(42);
		expect(external).toEqual([true, false]);

		await expect(
			loader.run(
				() => Promise.reject(new TypeError("async boom")),
				(v) => external.push(v),
			),
		).rejects.toThrow(TypeError);
		expect(external).toEqual([true, false, true, false]);

		const before = loader.__pending;
		await expect(
			loader.run(() => {
				throw new Error("sync boom");
			}),
		).rejects.toThrow("sync boom");
		expect(loader.__pending).toBe(before);
		expect(states.at(-1)).toBe(false);

		expectTypeOf(loader.run<string>(() => Promise.resolve("s"))).toEqualTypeOf<Promise<string>>();
	});
});
