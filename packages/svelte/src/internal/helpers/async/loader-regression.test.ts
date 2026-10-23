import { describe, expect, spyOn, test } from "bun:test";
import { flush } from "../__tests.js";
import { Deferred } from "./index.js";
import { Loader } from "./loader.js";

describe("Loader pending accounting", () => {
	test("registers each operation once during continuous overlap", async () => {
		const subscriptions: Array<() => number> = [];
		const restore: Array<() => void> = [];
		const states: boolean[] = [];
		const loader = new Loader((busy) => states.push(busy));
		const push = (): Deferred => {
			const deferred = new Deferred();
			const probe = spyOn(deferred.promise, "then");
			subscriptions.push(() => probe.mock.calls.length);
			restore.push(() => probe.mockRestore());
			loader.push(deferred.promise);
			return deferred;
		};
		try {
			const anchor = push();
			for (let i = 0; i < 32; i++) {
				const operation = push();
				operation.resolve();
				await flush();
				expect(loader.__pending).toBe(1);
			}
			expect(states).toEqual(Array.from({ length: 33 }, () => true));
			anchor.resolve();
			await flush();
			expect(states.at(-1)).toBe(false);
			expect(subscriptions.reduce((sum, count) => sum + count(), 0)).toBe(33);
		} finally {
			for (const stop of restore) stop();
		}
	});

	test.each(["reset", "settle"] as const)("preserves work started by the idle observer after %s", async (mode) => {
		const original = new Deferred();
		const fresh = new Deferred();
		const states: boolean[] = [];
		let restart = true;
		const loader = new Loader((busy) => {
			states.push(busy);
			if (!busy && restart) {
				restart = false;
				loader.push(fresh.promise);
			}
		});
		loader.push(original.promise);
		if (mode === "reset") loader.reset();
		original.resolve();
		await flush();
		expect(states).toEqual([true, false, true]);
		fresh.resolve();
		await flush();
		expect(states).toEqual([true, false, true, false]);
	});

	test("propagates a busy observer error without losing settlement accounting", async () => {
		const operation = new Deferred();
		const states: boolean[] = [];
		const loader = new Loader((busy) => {
			states.push(busy);
			if (busy) throw new TypeError("observer failed");
		});
		expect(() => loader.push(operation.promise)).toThrow("observer failed");
		operation.resolve();
		await flush();
		expect(states).toEqual([true, false]);
		expect(loader.__pending).toBe(0);
	});

	test("counts duplicate pushes independently and ignores old settlements after reset", async () => {
		const old = new Deferred();
		const fresh = new Deferred();
		const states: boolean[] = [];
		const loader = new Loader((busy) => states.push(busy));
		loader.push(old.promise);
		loader.push(old.promise);
		loader.reset();
		loader.push(fresh.promise);
		loader.push(fresh.promise);
		old.resolve();
		await flush();
		expect(states).toEqual([true, true, false, true, true]);
		fresh.resolve();
		await flush();
		expect(states).toEqual([true, true, false, true, true, false]);
	});

	test("supports reset from the busy observer without resurrecting discarded work", async () => {
		const old = new Deferred();
		const fresh = new Deferred();
		const states: boolean[] = [];
		let resetOnBusy = true;
		const loader = new Loader((busy) => {
			states.push(busy);
			if (busy && resetOnBusy) {
				resetOnBusy = false;
				loader.reset();
			}
		});
		loader.push(old.promise);
		loader.push(fresh.promise);
		old.resolve();
		await flush();
		expect(states).toEqual([true, false, true]);
		fresh.resolve();
		await flush();
		expect(states).toEqual([true, false, true, false]);
	});
});
