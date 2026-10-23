import { ServerHabitat, ServerRender, Render, RenderNumber, type IState } from '@frankfmy/state-motion';
import type { C3 } from '@frankfmy/state-motion/vector3';
import { C3S } from '@frankfmy/state-motion/vector3/states';
const habitat = new ServerHabitat();
const state: IState<number> = habitat.toState(0);
const render = new ServerRender();
new RenderNumber('number', { current: state, target: habitat.toState(0) }, { render }, { tau: 90, eps: .001 }).run(5);
const vector = habitat.toState<C3>({ x: 0, y: 0, z: 0 });
new C3S('vector', { current: vector, target: habitat.toState<C3>({ x: 1, y: 2, z: 3 }) }, { render });
new Render({ requestAnimationFrame: () => 1, cancelAnimationFrame: () => {} });
// @ts-expect-error core slots preserve value types
state.set('bad');
// @ts-expect-error missing z coordinate
vector.set({ x: 1, y: 2 });
