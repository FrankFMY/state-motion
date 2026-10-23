import { createSvelteState, createSvelteRawState, createSvelteRoot, type ISvelteState } from '@frankfmy/state-motion-svelte';
const state: ISvelteState<number> = createSvelteState(1);
state.set(2);
// @ts-expect-error no implicit coercion
state.set('bad');
const raw = createSvelteRawState({ n: 1 }); raw.set({ n: 2 });
const dispose: () => void = createSvelteRoot(() => {}); dispose();
