import { expect, test } from "bun:test";
import { Render, type RenderLoopItem } from "./render.js";

function scheduler() {
 const pending = new Map<number, FrameRequestCallback>();
 const delivered: FrameRequestCallback[] = [];
 let id = 0;
 const render = new Render({
  requestAnimationFrame: (fn) => { pending.set(++id, fn); delivered.push(fn); return id; },
  cancelAnimationFrame: (key) => { pending.delete(key); },
 });
 const step = () => {
  const calls = [...pending.values()]; pending.clear();
  for (const fn of calls) fn(performance.now());
 };
 return { render, pending, delivered, step };
}

test("reentry with the same item object preserves its new registration", () => {
 const { render, step, pending } = scheduler();
 let calls = 0;
 const item: RenderLoopItem<number> = {
  id: "same", opts: { tau: 90, eps: 0.001 },
  func: () => { if (++calls === 1) render.upsert(item, "refresh"); return false; },
 };
 render.add(item); step();
 expect(render.has("same")).toBe(true);
 expect(pending.size).toBe(1);
 step(); expect(calls).toBe(2); expect(pending.size).toBe(0);
});

test("clear and reentry during a frame schedule exactly one successor", () => {
 const { render, step, pending } = scheduler();
 render.add({ id: "old", opts: { tau: 90, eps: 0.001 }, func: () => {
  render.clear();
  render.add({ id: "new", opts: { tau: 90, eps: 0.001 }, func: () => false });
  return false;
 } });
 step(); expect(pending.size).toBe(1);
 step(); expect(render.__heap.size).toBe(0); expect(pending.size).toBe(0);
});

test("a canceled callback cannot execute a later generation", () => {
 const { render, delivered, pending, step } = scheduler();
 let calls = 0;
 render.add({ id: "old", opts: { tau: 90, eps: 0.001 }, func: () => false });
 const late = delivered[0]!;
 render.clear();
 render.add({ id: "new", opts: { tau: 90, eps: 0.001 }, func: () => { calls++; return false; } });
 late(100); expect(calls).toBe(0); expect(pending.size).toBe(1);
 step(); expect(calls).toBe(1);
});
