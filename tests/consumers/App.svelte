<script lang="ts">
 import { onMount, onDestroy, tick } from 'svelte';
 import { createSvelteState, createSvelteRawState, createSvelteDerived, createSvelteWritableDerived, createSvelteEffect, createSvelteRoot, createSvelteProxy, createSvelteRawProxy, createSvelteSnapshot } from '@frankfmy/state-motion-svelte';
 import { LoaderStore } from '@frankfmy/state-motion-svelte/loader';
 import Loader from '@frankfmy/state-motion-svelte/Loader.svelte';
 import Divided from '@frankfmy/state-motion-svelte/child/Divided.svelte';
 import { PresenceAnimator } from '@frankfmy/state-motion-svelte/presence-animator';
 import { create_slot_geometry } from '@frankfmy/state-motion-svelte/slot-geometry';
 import { slide } from '@frankfmy/state-motion-svelte/transition';
 import { SvelteHabitat } from '@frankfmy/state-motion-svelte/habitat';
 import { Render } from '@frankfmy/state-motion';
 import { OKLCH, ColorState } from '@frankfmy/state-motion/color';
 import { UC3, type C3 } from '@frankfmy/state-motion/vector3';
 import { C3S } from '@frankfmy/state-motion/vector3/states';
 import Child from './Child.svelte';

 const count = createSvelteState(0);
 const doubled = createSvelteDerived(() => count.signal * 2);
 const optimistic = createSvelteWritableDerived(() => count.signal + 10);
 const raw = createSvelteRawState({ n: 1 });
 const deep = createSvelteProxy({ n: 1 });
 const original = { n: 1 };
 const rawProxy = createSvelteRawProxy(original);
 const loader = LoaderStore.default();
 const idleHydration = LoaderStore.default(true).hydrate();
 const pendingHydration = LoaderStore.default(true).hydrate();
 const finishHydration = pendingHydration.hook();
 const presence = new PresenceAnimator({ initial: false, duration: 70 });
 const geometry = create_slot_geometry();
 const initialScope = {};
 geometry.retain(initialScope, ['row']);
 let height = $state(96.5);
 let present = $state(true);
 let fixed = $state(false);
 const habitat = new SvelteHabitat();
 const vector = habitat.toState<C3>(UC3.zero());
 const color = habitat.toState({ l: .2, c: .2, h: 350, a: 1 });
 let stopEffects = () => {};
 let render: Render | undefined;
 const effects: number[] = [];
 let cleanup = 0;
 let disposed = false;
 const samples: number[] = [];
 onMount(() => {
  stopEffects = createSvelteRoot(() => {
   createSvelteEffect(() => { effects.push(count.signal); return () => { cleanup++; }; });
  });
  render = new Render({ requestAnimationFrame: requestAnimationFrame.bind(window), cancelAnimationFrame: cancelAnimationFrame.bind(window) });
  const motion = new C3S('vector', { current: vector, target: habitat.toState(UC3.zero()) }, { render, onchange: () => { samples.push(vector.get().x); } });
  const shade = new ColorState('color', { current: color, target: habitat.toState({ ...color.get() }) }, { render });
  Object.assign(window, { demo: {
   count, doubled, optimistic, raw, deep, rawProxy, original, snapshot: createSvelteSnapshot,
   loader, idleHydration, pendingHydration, finishHydration, presence, geometry, effects, samples,
   status: () => ({ cleanup, disposed, pending: render?.__heap.size, frame: render?.__frame_id }),
   stopEffects: () => stopEffects(),
   setHeight: (n: number) => { height = n; },
   depart: () => { present = false; height = 16; },
   resetScope: () => geometry.retain({}, ['row']),
   returnScope: () => geometry.retain(initialScope, ['row']),
   remove: () => geometry.retain(initialScope, []),
   showFixed: (value: boolean) => { fixed = value; },
   animate: () => { motion.run({ x: 100, y: 50, z: 25 }); shade.run({ l: .8, c: .12, h: 10, a: .7 }); },
   vector, color, tick,
  } });
 });
 onDestroy(() => { disposed = true; stopEffects(); loader.reset(); pendingHydration.reset(); presence.destroy(); render?.clear(); });
</script>

<main>
 <h1>State and motion consumer</h1>
 <button data-testid="counter" onclick={() => count.set(count.get() + 1)}>Count: {count.signal}; doubled: {doubled.signal}</button>
 <p data-testid="optimistic">{optimistic.signal}</p>
 <p data-testid="raw">{raw.signal.n}</p>
 <p data-testid="deep">{deep.n}</p>
 <p data-testid="busy">{loader.state.signal ? 'busy' : 'idle'}</p>
 <p data-testid="hydration-idle">{idleHydration.state.signal ? 'busy' : 'idle'}</p>
 <p data-testid="hydration-pending">{pendingHydration.state.signal ? 'busy' : 'idle'}</p>
 <button onclick={finishHydration}>Finish hydration work</button>
 {#snippet preview({ props }: { props: { label: string } })}<span data-testid="snippet-child">{props.label}</span>{/snippet}
 <Divided child={{ type: 'snippet', func: preview, props: { label: 'Snippet child' } }} />
 <Divided child={{ type: 'component', func: Child, props: { label: 'Component child' } }} />
 <button data-testid="toggle" onclick={() => presence.toggle()}>Toggle presence</button>
 {#if presence.visible.signal}<aside data-testid="presence" style:opacity={presence.progress.signal} transition:slide={{ duration: 20 }}>Panel</aside>{/if}
 <div data-testid="slot" style:height={`${height}px`} use:geometry.observe={{ id: 'row', present }}></div>
 <div data-testid="motion" style:transform={`translate3d(${vector.signal.x}px, ${vector.signal.y}px, ${vector.signal.z}px)`} style:background={OKLCH.css(color.signal)}>Motion</div>
 <div data-testid="overlay" style="position:relative;width:240px;height:160px">{#if loader.state.signal}<Loader position="absolute" />{/if}</div>
 <div data-testid="overlay-small" style="position:relative;width:240px;height:80px;--loader-background:rgb(1,2,3)">{#if loader.state.signal}<Loader size="consumer-small" position="absolute" />{/if}</div>
 {#if fixed}<Loader />{/if}
</main>

<style>
 @layer theme, base, components, utilities;
 @layer utilities { :global(.consumer-small) { width: 2rem; height: 2rem; } }
 main { font-family: sans-serif; padding: 16px; }
 [data-testid='slot'] { width: 180px; background: #ddd; }
 [data-testid='motion'] { width: 80px; height: 30px; }
</style>
