# @frankfmy/state-motion-svelte

Svelte 5 rune adapters with loading, presence and small DOM components. Version
0.1.2, MIT. Requires Svelte ~5.57.0 (5.57.x) and a Svelte-aware build such as Vite with the
Svelte plugin. The `.svelte` and `.svelte.js` exports intentionally retain Svelte
source; the consumer compiler produces the client or SSR implementation. Types
are emitted at build time. Do not import these rune modules in plain Node.

```svelte
<script>
  import { createSvelteState } from '@frankfmy/state-motion-svelte';
  const count = createSvelteState(0);
</script>
<button onclick={() => count.set(count.get() + 1)}>{count.signal}</button>
```

Only `/habitat` needs the optional exact peer `@frankfmy/state-motion@0.1.1`.
Root state, `/loader`, `/presence-animator`, `/transition`, `/slot-geometry`,
`/Loader.svelte` and `/child/Divided.svelte` work without core.
`createSvelteRoot` returns its cleanup function; dispose owned roots, call
`PresenceAnimator.destroy()` and `LoaderStore.reset()` when the owner unmounts.

Package **0.1.2** is distributed as [@frankfmy/state-motion-svelte on npm](https://www.npmjs.com/package/@frankfmy/state-motion-svelte).

```sh
npm install @frankfmy/state-motion-svelte@0.1.2 svelte@5.57.2
```

Source builds and older, immutable v0.1.0 GitHub archives remain alternatives;
they are a different version from the current adapter. The
[repository README](https://github.com/FrankFMY/state-motion#readme) covers all
exports, installation, CSS customization, behavior and limitations.

The 0.1.2 correction widens only the Svelte peer from exact 5.57.0 to its
patch series. Core remains 0.1.1. Qualification retains Svelte 5.57.0 and adds
a shared Svelte 5.57.2 SSR/Chromium/WebKit consumer with
`@frankfmy/svg-sprite-toolkit@0.1.3` (Vite 7.3.7 and Svelte plugin 6.2.1).
No force install or peer override is needed.

## Author and contact

Created and maintained by [Artem Prianishnikov (Артем Прянишников / FrankFMY)](https://github.com/FrankFMY).

- Email: [Pryanishnikovartem@gmail.com](mailto:Pryanishnikovartem@gmail.com) · [frankfmy@proton.me](mailto:frankfmy@proton.me)
- Telegram: [@FrankFMY](https://t.me/FrankFMY)
- Website: [frankfmy.com](https://frankfmy.com)
- Profiles: [GitHub](https://github.com/FrankFMY) · [LinkedIn](https://www.linkedin.com/in/frankfmy/) · [X](https://x.com/FrankFMY) · [npm](https://www.npmjs.com/~frankfmy)
