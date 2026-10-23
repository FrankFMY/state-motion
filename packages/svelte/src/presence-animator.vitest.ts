import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PresenceAnimator } from "./presence-animator.js";

let now = 0;
let raf: FrameRequestCallback | null = null;
let rafId = 0;

beforeEach(() => {
	now = 0;
	raf = null;
	rafId = 0;
	vi.stubGlobal("performance", { now: () => now });
	vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback): number => {
		raf = fn;
		rafId += 1;
		return rafId;
	});
	vi.stubGlobal("cancelAnimationFrame", (): void => {
		raf = null;
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const step = (ms: number): void => {
	now += ms;
	raf?.(now);
};

describe("PresenceAnimator", () => {
	it("toggle: backup сразу, visible на открытии сразу / на закрытии после ease", { timeout: 1000 }, () => {
		const backed: boolean[] = [];
		const p = new PresenceAnimator({ initial: false, duration: 40, backup: (v) => backed.push(v) });
		expect(p.visible.signal).toBe(false);
		expect(p.progress.signal).toBe(0);

		p.toggle();
		expect(backed).toStrictEqual([true]);
		expect(p.show.signal).toBe(true);
		expect(p.visible.signal).toBe(true);
		expect(p.frame.signal).not.toBe(0);

		step(40);
		expect(p.progress.signal).toBe(1);
		expect(p.visible.signal).toBe(true);
		expect(p.frame.signal).toBe(0);

		p.toggle();
		expect(backed).toStrictEqual([true, false]);
		expect(p.visible.signal).toBe(true);
		step(40);
		expect(p.progress.signal).toBe(0);
		expect(p.visible.signal).toBe(false);
	});

	it("повтор в кадре не перезапускает rAF и едет с текущего progress", { timeout: 1000 }, () => {
		const p = new PresenceAnimator({ initial: false, duration: 40 });
		p.toggle();
		step(20);
		const mid = p.progress.signal;
		expect(mid).toBeGreaterThan(0.3);
		expect(mid).toBeLessThan(0.7);

		const scheduled = rafId;
		p.toggle();
		expect(p.show.signal).toBe(false);
		expect(p.target.signal).toBe(0);
		expect(rafId).toBe(scheduled);
		expect(p.visible.signal).toBe(true);
		expect(p.progress.signal).toBe(mid);

		step(4);
		expect(p.progress.signal).toBeLessThan(mid);
		expect(p.progress.signal).toBeGreaterThan(0);
		step(40);
		expect(p.progress.signal).toBe(0);
		expect(p.visible.signal).toBe(false);
	});

	it("destroy снимает rAF", { timeout: 1000 }, () => {
		const p = new PresenceAnimator({ initial: false, duration: 40 });
		p.toggle();
		p.destroy();
		expect(p.frame.signal).toBe(0);
		expect(raf).toBeNull();
	});
});

it("destroy prevents an already-delivered callback from reviving the animation", () => {
 const p = new PresenceAnimator({ initial: false, duration: 40 });
 p.toggle();
 const late = raf!;
 p.destroy();
 const old = p.progress.signal;
 late(20);
 expect(p.progress.signal).toBe(old);
 expect(p.frame.signal).toBe(0);
 p.toggle();
 const frame = p.frame.signal;
 late(40);
 expect(p.frame.signal).toBe(frame);
 p.destroy();
});
