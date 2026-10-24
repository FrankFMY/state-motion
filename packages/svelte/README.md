# @frankfmy/state-motion-svelte

Svelte 5 rune adapters with loading, presence and small DOM components. Version
0.1.1, MIT. Requires Svelte 5.57.0 and a Svelte-aware build such as Vite with the
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

Check the exact npm registry version before installing:

```sh
npm view @frankfmy/state-motion-svelte@0.1.1 version &&
npm install @frankfmy/state-motion-svelte@0.1.1 svelte@5.57.0
```

Registry publication is separate from verification. Source builds and older
versioned GitHub archives remain alternatives. The
[repository README](https://github.com/FrankFMY/state-motion#readme) covers all
exports, installation, CSS customization, behavior and limitations.

## Author and contact

Created and maintained by [Artem Prianishnikov (Артем Прянишников / FrankFMY)](https://github.com/FrankFMY).

- Email: [Pryanishnikovartem@gmail.com](mailto:Pryanishnikovartem@gmail.com)
- Telegram: [@FrankFMY](https://t.me/FrankFMY)
- Website: [frankfmy.com](https://frankfmy.com)
- Profiles: [GitHub](https://github.com/FrankFMY) · [LinkedIn](https://www.linkedin.com/in/frankfmy/) · [X](https://x.com/FrankFMY)
