import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import CONFIG from "../__config.js";
import type { RenderFrameEvent, RenderLoopItemOptions } from "../render.js";
import { Render } from "../render.js";
import { ServerRender } from "./render.js";

const TAU = Render.tau;
const MIN_DT = CONFIG.RENDER_MIN_DT;
const MAX_DT = CONFIG.RENDER_MAX_DT;
const OPTS: RenderLoopItemOptions<number> = { tau: TAU, eps: 1e-3 };

const sink = (maxFrames: number | null = null) => {
	const events: RenderFrameEvent<number>[] = [];
	let count = 0;
	const func = (e: RenderFrameEvent<number>): boolean => {
		events.push(e);
		count++;
		return !(maxFrames !== null && count >= maxFrames);
	};
	return { events, func };
};

describe("ServerRender.step / settle / frame", () => {
	test("step двигает __now, клампит dt, не вызывает func без pending", () => {
		const r = new ServerRender();
		const { events, func } = sink();
		r.step(50);
		expect(events).toHaveLength(0);
		r.add({ id: "a", func, opts: OPTS });
		r.step(20);
		r.step(40);
		expect(events.map((e) => e.timings.dt)).toEqual([20, 40]);
		expect(events[1].timings.time).toBe(110);
		expect(events[1].iat).toBe(events[0].iat);
		expect(events[0].item.id).toBe("a");
		expect(events[0].item.opts.tau).toBe(TAU);

		const clamped = new ServerRender();
		const s = sink();
		clamped.add({ id: "a", func: s.func, opts: OPTS });
		clamped.step(1);
		clamped.step(10000);
		clamped.step(-100);
		expect(s.events.map((e) => e.timings.dt)).toEqual([MIN_DT, MAX_DT, MIN_DT]);
	});

	test("settle крутит до пустой кучи или maxSteps; frame смешивается со step", () => {
		const r = new ServerRender();
		const finite = sink(5);
		const endless = sink();
		r.add({ id: "a", func: finite.func, opts: OPTS });
		r.frame(100);
		r.step(20);
		expect(finite.events).toHaveLength(2);
		r.settle();
		expect(finite.events).toHaveLength(5);
		expect(r.__heap.size).toBe(0);
		expect(finite.events[0].timings.dt).toBeCloseTo(100 / 6, 4);
		expect(finite.events[0].item.opts.tau).toBe(TAU);

		const loop = new ServerRender();
		loop.add({ id: "inf", func: endless.func, opts: OPTS });
		loop.settle(10);
		expect(endless.events).toHaveLength(10);
		expect(loop.__heap.size).toBe(1);

		const resumed = new ServerRender();
		const afterStop = sink(2);
		resumed.add({ id: "paused", func: afterStop.func, opts: OPTS });
		resumed.stop();
		expect(resumed.__pending.size).toBe(0);
		resumed.settle();
		expect(afterStop.events).toHaveLength(2);
		expect(resumed.__heap.size).toBe(0);
	});
});

describe("ServerRender: Render API и interval", () => {
	let origSetInterval: typeof globalThis.setInterval;
	let origClearInterval: typeof globalThis.clearInterval;
	let intervalCb: (() => void) | null = null;
	let setIntervalMock: ReturnType<typeof mock>;
	let clearIntervalMock: ReturnType<typeof mock>;

	beforeEach(() => {
		origSetInterval = globalThis.setInterval;
		origClearInterval = globalThis.clearInterval;
		intervalCb = null;
		setIntervalMock = mock((cb: () => void) => {
			intervalCb = cb;
			return 1 as unknown as ReturnType<typeof setInterval>;
		});
		clearIntervalMock = mock(() => {
			intervalCb = null;
		});
		globalThis.setInterval = setIntervalMock;
		globalThis.clearInterval = clearIntervalMock;
	});

	afterEach(() => {
		globalThis.setInterval = origSetInterval;
		globalThis.clearInterval = origClearInterval;
	});

	test("add/drop/ошибка/draw; start идемпотентен, stop/clear гасят interval", () => {
		const draw = mock(() => null);
		const onerror = mock((_e: unknown) => null);
		const r = new ServerRender({ draw, onerror });
		const keep = mock((_e: RenderFrameEvent<number>) => true);
		const boom = new Error("boom");
		r.add({ id: "keep", func: keep, opts: OPTS });
		r.add({
			id: "boom",
			opts: OPTS,
			func: () => {
				throw boom;
			},
		});
		r.add({ id: "keep", func: () => false, opts: OPTS });
		r.step();
		expect(keep).toHaveBeenCalledTimes(1);
		expect(onerror.mock.calls[0][0]).toBe(boom);
		expect(draw).toHaveBeenCalledTimes(1);
		expect(r.__heap.has("keep")).toBe(true);
		r.drop("keep");
		r.step();
		expect(keep).toHaveBeenCalledTimes(1);

		const tick = mock((_e: RenderFrameEvent<number>) => false);
		r.add({ id: "tick", func: tick, opts: OPTS });
		r.stop();
		expect(r.__heap.has("tick")).toBe(true);
		expect(r.__pending.size).toBe(0);
		r.start(16);
		r.start(16);
		expect(setIntervalMock).toHaveBeenCalledTimes(1);
		const draws = draw.mock.calls.length;
		intervalCb!();
		expect(tick).toHaveBeenCalledTimes(1);
		expect(draw.mock.calls.length).toBeGreaterThan(draws);
		r.clear();
		expect(clearIntervalMock).toHaveBeenCalledTimes(1);
		expect(r.__heap.size).toBe(0);
		expect(r.__interval).toBeNull();
	});
});

test("insertion and manual frame timestamps share the server's virtual clock", () => {
 const render = new ServerRender();
 const events: Array<{ iat: number; time: number }> = [];
 const item = { id: "clock", opts: { tau: 90, eps: .001 }, func: (event: RenderFrameEvent<number>) => {
  events.push({ iat: event.iat, time: event.timings.time }); return true;
 } };
 render.upsert(item, "refresh"); render.step(20);
 render.upsert(item, "keep"); render.frame();
 render.upsert(item, "refresh"); render.step(20);
 expect(events).toEqual([{ iat: 0, time: 20 }, { iat: 0, time: 20 }, { iat: 20, time: 40 }]);
 render.clear();
});
