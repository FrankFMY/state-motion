# state-motion

State slots and motion that can run without a UI framework, with a separate
Svelte 5 adapter for reactive components.

I wanted the same small `get`/`set` models to work in a browser, in server
rendering, and in deterministic tests. I also wanted changing a destination to
continue an animation from its current value. The core separates those models
from frame scheduling; the Svelte package supplies reactive slots and a few
lifecycle utilities I use with them.

| Package | Purpose | Runtime requirements |
| --- | --- | --- |
| `@frankfmy/state-motion` | State, scheduler, numbers, OKLCH, 3D vectors | ESM; no runtime dependencies |
| `@frankfmy/state-motion-svelte` | Rune adapters, loading, presence, snippets, slot measurements | Svelte 5.57.0 and a Svelte compiler |

Version 0.1.1 is MIT licensed and configured for public npm distribution.
Check the exact registry version before installing core:

```sh
npm view @frankfmy/state-motion@0.1.1 version &&
npm install @frankfmy/state-motion@0.1.1
```

For Svelte, check and install the separate adapter with its tested peer:

```sh
npm view @frankfmy/state-motion-svelte@0.1.1 version &&
npm install @frankfmy/state-motion-svelte@0.1.1 svelte@5.57.0
```

Add core 0.1.1 as well when importing `/habitat`. Other adapter entries work
without core. Registry publication is separate from verification; source builds
and the immutable v0.1.0 GitHub assets below remain alternatives.

## Build a checkout

Use Node **24.20.0** and Bun **1.4.2**. The lockfile pins Svelte **5.57.0**, native
TypeScript **7.0.2**, and the build tools. TypeScript **6.0.3** is also installed:
Svelte's declaration generator still needs its JavaScript compiler API.
The core and TypeScript checks use native TypeScript 7; `svelte-check --tsgo`
uses the supported two-version setup.

```sh
git clone https://github.com/FrankFMY/state-motion.git
cd state-motion
bun install --frozen-lockfile
bun run verify
```

`verify` runs lint, type and Svelte checks, the unit and presence suites, package
builds, packing checks, separate installed-tarball consumers and a clean source
copy rebuild that compares emitted bytes. Browser checks
use Playwright's normal Chromium and WebKit discovery. If those browsers are not
installed, install the versions required by the pinned Playwright package:

```sh
bun x playwright install chromium webkit
```

`bun run pack` writes both tarballs to a new directory under `.artifacts/` and
records filenames, SHA-256 hashes and contents in `.artifacts/latest.json`.
Packed-consumer projects use unique temporary directories outside the checkout's
dependency hierarchy; `TMPDIR` can select their parent. Source-clean-build fixtures
remain ignored under `.fixtures/`. The consumer harness
temporarily moves this checkout's `node_modules` while testing dependency
isolation and restores it in `finally`; run it without another build using that
directory. It owns and closes its local HTTP servers. Download/install checks use a
loopback release-shaped URL with a redirect and verify SHA-256 before installing;
they do not contact GitHub.

## Install release assets

Download both small package archives and the checksum listing, then verify them
before installing. Downloading first also works with npm 12's default restriction
on direct URL dependencies without changing its policy:

```sh
curl --fail --location --output frankfmy-state-motion-0.1.0.tgz \
  https://github.com/FrankFMY/state-motion/releases/download/v0.1.0/frankfmy-state-motion-0.1.0.tgz &&
curl --fail --location --output frankfmy-state-motion-svelte-0.1.0.tgz \
  https://github.com/FrankFMY/state-motion/releases/download/v0.1.0/frankfmy-state-motion-svelte-0.1.0.tgz &&
curl --fail --location --output SHA256SUMS \
  https://github.com/FrankFMY/state-motion/releases/download/v0.1.0/SHA256SUMS &&
sha256sum --check SHA256SUMS &&
bun add ./frankfmy-state-motion-0.1.0.tgz
```

For Svelte, add its asset and the tested Svelte peer to an application with the
Svelte Vite plugin or an equivalent Svelte-aware compiler:

```sh
sha256sum --check SHA256SUMS &&
bun add ./frankfmy-state-motion-svelte-0.1.0.tgz svelte@5.57.0
```

Require a successful checksum check; use an equivalent SHA-256 verifier on
platforms without `sha256sum`.
The Svelte root import works without core. Install **both** assets to use
`@frankfmy/state-motion-svelte/habitat`; these v0.1.0 assets use core peer `0.1.0`.
Current source and registry version 0.1.1 use matching core peer `0.1.1`.
For a local build, substitute the paths recorded by `bun run pack` for downloaded
filenames. No registry command for either library is required.

## Core example

```js
import { ServerHabitat, ServerRender, RenderNumber } from '@frankfmy/state-motion';

const habitat = new ServerHabitat();
const render = new ServerRender();
const current = habitat.toState(0);
const target = habitat.toState(0);
const position = new RenderNumber(
  'position', { current, target }, { render }, { tau: 90, eps: 0.001 },
);

position.run(100);
render.step(16); // advance deterministic time; current is between 0 and 100
render.settle(); // bounded stepping until the scheduled work finishes
console.log(current.get()); // 100
render.clear();
```

In a browser, construct `Render` with bound `requestAnimationFrame` and
`cancelAnimationFrame`. Call `clear()` when its owner is disposed. Omitting
`render` from a `RenderState` applies its target immediately.

`ColorState` from `/color` interpolates OKLCH channels and takes the short hue
arc. `C3S` from `/vector3/states` interpolates `{ x, y, z }` with independent
smoothing constants. The [consumer app](tests/consumers/App.svelte) renders both
as CSS color and translation, alongside a loader and an animated panel.

## Svelte example

```svelte
<script>
  import { onDestroy } from 'svelte';
  import { createSvelteState, createSvelteDerived } from '@frankfmy/state-motion-svelte';
  import { LoaderStore } from '@frankfmy/state-motion-svelte/loader';
  import Loader from '@frankfmy/state-motion-svelte/Loader.svelte';

  const count = createSvelteState(0);
  const doubled = createSvelteDerived(() => count.signal * 2);
  const loading = LoaderStore.default();
  onDestroy(() => loading.reset());

  async function increment() {
    await loading.run(async () => {
      count.set(count.get() + 1);
    });
  }
</script>

<button onclick={increment}>{count.signal}; doubled: {doubled.signal}</button>
<div style="position:relative;min-height:10rem">
  {#if loading.state.signal}<Loader position="absolute" />{/if}
</div>
```

Use `.signal` where Svelte should track a dependency. `get()`, `set()` and
`untrack()` deliberately avoid creating subscriptions. Root adapters include
raw, derived, writable-derived, effect, root, snapshot, proxy and raw-proxy
variants, all retaining their `createSvelte…` names.

The adapter ships `.svelte` and `.svelte.js` sources under the `svelte` export
condition with generated `.d.ts` files. Your Svelte compiler chooses client or
SSR output. Plain Node imports of rune modules are outside this contract;
there is no simulated rune runtime. Core is ordinary compiled ESM.

## Behavior and boundaries

- Scheduler `upsert(item, 'keep')` preserves the first insertion time;
  `'refresh'` starts a new one. Reentry and replacement are safe during a frame.
  `stop()` pauses scheduling; `clear()` also removes entries and permits reuse.
- Smoothing uses `1 - exp(-dt / tau)`, with frame deltas clamped to 8–50 ms by
  default. `tau` is a time constant, not a fixed-duration promise. Supply finite
  values, positive smoothing constants and sensible nonnegative tolerances.
- Loader tracks pending operations, including each duplicate push. A rejection
  finishes that operation, while other work can keep the loader busy. `reset()`
  invalidates old completions; it does not cancel the underlying operation.
- `createSvelteRoot()` returns a disposer. Presence requires `destroy()` on
  unmount. Slot actions disconnect their observer on destruction; membership
  removal and scope changes discard retained measurements.
- There is no 2D geometry engine, application singleton, persistence, network
  fetching, task cancellation framework, color-space conversion or gamut
  mapping. Use a dedicated geometry library for planar work.

See the [API and export mapping](docs/API.md), [behavior details](docs/BEHAVIOR.md),
[change log](CHANGELOG.md), and [contribution guide](CONTRIBUTING.md).

## Validation scope

The local gates target Node 24.20.0 and Bun 1.4.2, Svelte 5.57.0 SSR, and real
Chromium and WebKit hydration through Playwright 1.63.0. They check packed ESM,
emitted declarations, positive and negative component props, Loader lifecycle,
color/vector interpolation, presence cleanup and native resize observation.
Browser layout assertions cover loader fallback CSS, absolute/fixed positioning,
custom size classes and theme variables. No Firefox or older-runtime support is
claimed. The package engine range is broader than the exact tested patch version.

These are correctness and compatibility gates. There is no heap, throughput or
animation-performance benchmark claim. See the CI runs for per-revision results.

## Continuous integration

[CI runs](https://github.com/FrankFMY/state-motion/actions/workflows/ci.yml) run on
pull requests, pushes to `main`, and manual dispatch. Node 24.20.0 and Bun 1.4.2
execute the full `bun run verify` gate: source and packed unit/presence tests,
core/Svelte dependency isolation, types, SSR, Chromium/WebKit consumers and the
clean-source rebuild, followed by a dependency audit. Logs and consumer receipts
are retained for seven days. CI does not publish either package.

## Author and contact

Created and maintained by [Artem Prianishnikov (Артем Прянишников / FrankFMY)](https://github.com/FrankFMY).

- Email: [Pryanishnikovartem@gmail.com](mailto:Pryanishnikovartem@gmail.com)
- Telegram: [@FrankFMY](https://t.me/FrankFMY)
- Website: [frankfmy.com](https://frankfmy.com)
- Profiles: [GitHub](https://github.com/FrankFMY) · [LinkedIn](https://www.linkedin.com/in/frankfmy/) · [X](https://x.com/FrankFMY)

## License

[MIT](LICENSE), copyright 2026 FrankFMY. See [third-party notices](THIRD_PARTY_NOTICES.md)
for actual dependency licensing.
