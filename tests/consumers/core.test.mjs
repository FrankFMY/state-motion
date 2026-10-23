import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AbstractHabitat, ServerHabitat, Render, RenderNumber, RenderState, ServerRender } from '@frankfmy/state-motion';
import { OKLCH, ColorState } from '@frankfmy/state-motion/color';
import { UC3 } from '@frankfmy/state-motion/vector3';
import { C3S } from '@frankfmy/state-motion/vector3/states';
import config from '@frankfmy/state-motion/__config';

test('framework-free imports and structural get/set state', async () => {
 await assert.rejects(import('svelte'));
 const h = new ServerHabitat();
 assert(h instanceof AbstractHabitat);
 const object = { count: 1 };
 assert.equal(h.proxy(object), object);
 const state = h.toState(2); state.set(3); assert.equal(state.get(), 3);
 assert.equal(h.isSSR, true);
 assert.equal(config.RENDER_MIN_DT, 8);
});

test('number, color and vector interpolate and settle to exact targets', () => {
 const h = new ServerHabitat(); const render = new ServerRender();
 const pair = (a, b = structuredClone(a)) => ({ current: h.toState(a), target: h.toState(b) });
 const number = new RenderNumber('number', pair(0), { render }, { tau: 30, eps: 0.001 });
 const vector = new C3S('vector', pair(UC3.zero()), { render });
 const color = new ColorState('color', pair({ l: .2, c: .2, h: 350, a: 1 }), { render });
 assert(number instanceof RenderState);
 const destination = { l: .8, c: .15, h: 10, a: .7 };
 number.run(100); vector.run({ x: 100, y: -50, z: 25 }); color.run(destination);
 render.step(16);
 assert(number.current.get() > 0 && number.current.get() < 100);
 assert(vector.current.get().x > 0 && vector.current.get().x < 100);
 assert(color.current.get().h > 350 || color.current.get().h < 10);
 render.settle();
 assert.equal(number.current.get(), 100);
 assert.deepEqual(vector.current.get(), { x: 100, y: -50, z: 25 });
 assert.deepEqual(color.current.get(), destination);
 assert.match(OKLCH.css(color.current.get()), /^oklch\(/);
 assert.equal(render.__heap.size, 0); assert.equal(render.__pending.size, 0);
 render.clear();
});

test('keep/refresh, same-object reentry and clear leave a reusable scheduler', () => {
 const render = new ServerRender();
 const item = { id: 'loop', opts: { tau: 90, eps: .001 }, func: () => true };
 render.upsert(item, 'refresh'); const initial = render.__heap.get('loop').iat;
 render.step(16);
 render.upsert(item, 'keep'); assert.equal(render.__heap.get('loop').iat, initial);
 render.upsert(item, 'refresh'); assert(render.__heap.get('loop').iat > initial);
 let calls = 0;
 item.func = () => { if (++calls === 1) render.upsert(item, 'keep'); return false; };
 render.step(); assert(render.has('loop')); render.step(); assert.equal(calls, 2);
 render.clear(); assert.equal(render.__pending.size, 0);
 assert.equal(Render.alpha(0), 0);
});

test('force mode preserves object references and stop preserves unfinished state', () => {
 const h = new ServerHabitat(); const original = UC3.zero();
 const vector = new C3S('force', { current: h.toState(original), target: h.toState(UC3.zero()) }, {});
 vector.run({ x: 1, y: 2, z: 3 }); assert.equal(vector.current.get(), original);
 assert.deepEqual(original, { x: 1, y: 2, z: 3 }); vector.stop();
});
