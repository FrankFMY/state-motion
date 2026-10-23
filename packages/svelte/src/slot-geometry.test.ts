import { expect, test } from "bun:test";
import { create_slot_geometry } from "./slot-geometry.js";

test("a newly mounted slot has geometry before its first remote reconciliation", () => {
	const geometry = create_slot_geometry();
	const scope = {};
	const element = { isConnected: true, getBoundingClientRect: () => ({ height: 352.84375 }) } as unknown as HTMLElement;
	geometry.retain(scope, ["row"]);
	const action = geometry.observe(element, { id: "row", present: true });
	expect(geometry.height("row")).toBe("352.84375px");
	action?.destroy?.();
});

test("pre-render retention cannot replace a card's height with its already-rendered departure", () => {
	const geometry = create_slot_geometry();
	const scope = {};
	let height = 406.84375;
	const element = { isConnected: true, getBoundingClientRect: () => ({ height }) } as unknown as HTMLElement;
	geometry.retain(scope, ["row"]);
	const action = geometry.observe(element, { id: "row", present: true });
	height = 54;
	geometry.retain(scope, ["row"]);
	expect(geometry.height("row")).toBe("406.84375px");
	action?.update?.({ id: "row", present: false });
	expect(geometry.height("row")).toBe("406.84375px");
	action?.destroy?.();
});

test("a still-present slot records its updated rendered height through its action", () => {
	const geometry = create_slot_geometry();
	const scope = {};
	let height = 80;
	const element = { isConnected: true, getBoundingClientRect: () => ({ height }) } as unknown as HTMLElement;
	geometry.retain(scope, ["row"]);
	const action = geometry.observe(element, { id: "row", present: true });
	height = 160;
	action?.update?.({ id: "row", present: true });
	expect(geometry.height("row")).toBe("160px");
	action?.destroy?.();
});

test("a content resize retains live geometry without a slot revision and stops at departure", () => {
	const geometry = create_slot_geometry();
	const scope = {};
	const resize: { notify?: () => void; observed?: HTMLElement; disconnected: number } = { disconnected: 0 };
	let height = 80;
	const element = {
		isConnected: true,
		getBoundingClientRect: () => ({ height }),
		ownerDocument: {
			defaultView: {
				ResizeObserver: class {
					constructor(callback: () => void) {
						resize.notify = callback;
					}
					observe(target: HTMLElement): void {
						resize.observed = target;
					}
					disconnect(): void {
						resize.disconnected++;
					}
				},
			},
		},
	} as unknown as HTMLElement;
	geometry.retain(scope, ["row"]);
	const action = geometry.observe(element, { id: "row", present: true });
	height = 160;
	resize.notify?.();
	expect(geometry.height("row")).toBe("160px");
	expect(resize.observed).toBe(element);
	geometry.retain({}, ["row"]);
	height = 200;
	resize.notify?.();
	expect(geometry.height("row")).toBeUndefined();
	geometry.retain(scope, ["row"]);
	height = 160;
	action?.update?.({ id: "row", present: true });
	action?.update?.({ id: "row", present: false });
	height = 54;
	resize.notify?.();
	expect(geometry.height("row")).toBe("160px");
	action?.destroy?.();
	geometry.retain(scope, []);
	resize.notify?.();
	expect(geometry.height("row")).toBeUndefined();
	expect(resize.disconnected).toBe(1);
});

test("a different projection does not inherit geometry from a coincident slot id", () => {
	const geometry = create_slot_geometry();
	const scope = {};
	const element = { isConnected: true, getBoundingClientRect: () => ({ height: 80 }) } as unknown as HTMLElement;
	geometry.retain(scope, ["row"]);
	const action = geometry.observe(element, { id: "row", present: true });
	geometry.retain(scope, ["row"]);
	expect(geometry.height("row")).toBe("80px");
	geometry.retain({}, ["row"]);
	expect(geometry.height("row")).toBeUndefined();
	action?.destroy?.();
});

test("adopting a membership removal releases that slot's retained geometry", () => {
	const geometry = create_slot_geometry();
	const scope = {};
	const element = { isConnected: true, getBoundingClientRect: () => ({ height: 80 }) } as unknown as HTMLElement;
	geometry.retain(scope, ["row"]);
	const action = geometry.observe(element, { id: "row", present: true });
	geometry.retain(scope, ["row"]);
	action?.destroy?.();
	geometry.retain(scope, []);
	expect(geometry.height("row")).toBeUndefined();
});

test("a departed slot keeps its last actual fractional row height without retaining domain data", () => {
	const geometry = create_slot_geometry();
	const scope = {};
	let height = 96.5;
	const element = { isConnected: true, getBoundingClientRect: () => ({ height }) } as unknown as HTMLElement;
	geometry.retain(scope, ["row"]);
	const action = geometry.observe(element, { id: "row", present: true });
	geometry.retain(scope, ["row"]);
	expect(geometry.height("row")).toBe("96.5px");
	action?.update?.({ id: "row", present: false });
	height = 12;
	geometry.retain(scope, ["row"]);
	expect(geometry.height("row")).toBe("96.5px");
	action?.destroy?.();
});

test("returning to the same scope identity cannot revive an old observer", () => {
 const g = create_slot_geometry();
 const a = {};
 let callback = () => {};
 let height = 50;
 const element = { isConnected: true, getBoundingClientRect: () => ({ height }), ownerDocument: { defaultView: {
  ResizeObserver: class { constructor(fn: () => void) { callback = fn; } observe() {} disconnect() {} },
 } } } as unknown as HTMLElement;
 g.retain(a, ["row"]);
 const action = g.observe(element, { id: "row", present: true });
 g.retain({}, ["row"]); g.retain(a, ["row"]);
 height = 90; callback(); expect(g.height("row")).toBeUndefined();
 action?.update?.({ id: "row", present: true }); expect(g.height("row")).toBe("90px");
 g.retain(a, []); callback(); expect(g.height("row")).toBeUndefined();
 action?.destroy?.();
});

test("a replaced action cannot overwrite the current owner's geometry", () => {
 const g = create_slot_geometry();
 const scope = {};
 g.retain(scope, ["row"]);
 const callbacks: (() => void)[] = [];
 const element = (height: number) => ({ isConnected: true, getBoundingClientRect: () => ({ height }), ownerDocument: { defaultView: {
  ResizeObserver: class { constructor(fn: () => void) { callbacks.push(fn); } observe() {} disconnect() {} },
 } } } as unknown as HTMLElement);
 const old = g.observe(element(50), { id: "row", present: true });
 const current = g.observe(element(90), { id: "row", present: true });
 callbacks[0]!(); expect(g.height("row")).toBe("90px");
 old?.destroy?.(); callbacks[1]!(); expect(g.height("row")).toBe("90px");
 current?.destroy?.();
});
