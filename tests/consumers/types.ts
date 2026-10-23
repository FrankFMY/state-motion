import { createSvelteState, createSvelteRoot, createSvelteDerived, createSvelteWritableDerived } from '@frankfmy/state-motion-svelte';
import type { Component, Snippet } from 'svelte';
import Divided from '@frankfmy/state-motion-svelte/child/Divided.svelte';
import Loader from '@frankfmy/state-motion-svelte/Loader.svelte';
import type { DividedChild, EmbeddedChild } from '@frankfmy/state-motion-svelte/child/types';
import type { IState } from '@frankfmy/state-motion';
const value: IState<number> = createSvelteState(1);
value.set(2);
// @ts-expect-error value type is preserved
value.set('bad');
const stop: () => void = createSvelteRoot(() => {});
stop();
const read = createSvelteDerived(() => 1);
// @ts-expect-error derived signals are readonly
read.signal = 2;
createSvelteWritableDerived(() => 1).set(2);
declare const snippet: Snippet<[{ props: { n: number } }]>;
declare const component: Component<{ props: { n: number } }>;
const child: DividedChild<{ n: number }> = { type: 'snippet', func: snippet, props: { n: 1 } };
const comp: DividedChild<{ n: number }> = { type: 'component', func: component, props: { n: 1 } };
Divided(null, { child }); Divided(null, { child: comp });
// @ts-expect-error child value type must match its snippet
const bad: DividedChild<{ n: number }> = { type: 'snippet', func: snippet, props: { n: 'bad' } };
void bad;
// @ts-expect-error generic component call validates nested props
Divided<{ n: number }>(null, { child: { type: 'snippet', func: snippet, props: { n: 'bad' } } });
declare const embedded: Snippet<[{ n: number }]>;
const simple: EmbeddedChild<{ n: number }> = { type: 'snippet', func: embedded }; void simple;
// @ts-expect-error embedded snippet does not accept a props envelope
const badEmbedded: EmbeddedChild<{ n: number }> = { type: 'snippet', func: snippet }; void badEmbedded;
declare const internals: Parameters<typeof Loader>[0];
Loader(internals, { position: 'absolute', size: ['small', { active: true }] });
// @ts-expect-error invalid CSS position
Loader(internals, { position: 'somewhere' });
