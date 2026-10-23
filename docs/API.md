# API and export mapping

All paths below are explicit package exports. Internal helpers are not public
entry points. No broad helper package is required.

## Core

Prefix: `@frankfmy/state-motion`.

| Path | Exports and intended use |
| --- | --- |
| root | `AbstractHabitat`, `ServerHabitat`, `Render`, `RenderState`, `RenderNumber`, `ServerRender`, scheduler interfaces and structural state types |
| `/render` | Scheduler, numeric state, hook/options/event types |
| `/server` | `ServerHabitat`: plain `get`/`set`, identity `proxy` |
| `/server/render` | `ServerRender`: `step`, `settle`, `start`, `stop`, `clear` |
| `/__config` | Default mutable `HabitatConfig` |
| `/color` | `OKLCH`, `ColorState`, `tOKLCH`, color `tick` |
| `/color/oklch`, `/color/state` | Separate color utility and state entry points |
| `/color/__config` | Default mutable `ColorsConfig` |
| `/vector3` | `UC3` utility and `C3` type |
| `/vector3/types` | `C3` type |
| `/vector3/states` | `C3S` and vector `tick` |
| `/vector3/__config` | Default mutable `Vector3Config` |

The habitat entry points keep their names relative to the new core package.
Color and vector modules are explicitly grouped under `/color` and `/vector3`.
This mapping avoids collisions between their `tick` functions and configs.

An `IState<T>` supplies `get(): T` and `set(value: T): void`. An `IDriftState<T>`
contains `current` and `target` slots. `AbstractHabitat` adapts values to those
slots and optionally proxies objects. `isSSR` is initialized at construction;
it does not change if globals are installed later.

`Render` takes `{ requestAnimationFrame, cancelAnimationFrame, prepare?, draw?,
onerror? }`. Items have `{ id, func, opts: { tau, eps } }`; returning `false`
removes the current registration. Items receive `{ timings: { dt, time }, iat,
item }`. `add` preserves an existing ID; `upsert` replaces its registration.
`has` and `drop` inspect or remove IDs. `frame()` makes a manual step and can
also draw an empty scene. `onerror` receives item callback failures; hook
callbacks themselves are expected not to throw.

`RenderState(id, { current, target }, { drift, tick, eq, render?, onchange? },
{ tau, eps })` accepts application-defined interpolation. `run(target)` updates
the destination. `dirty(options, mode = 'keep')` reschedules, and `stop()` removes
this state's entry. `onchange(mode, dirty)` receives `force` for immediate
application or `tick` during animation. An equality check may keep a near-equal
current value unchanged; snapping occurs when an interpolation step reaches the
target tolerance.

`RenderNumber.derived(pair, { get, set })` projects a numeric field out of an
existing current/target pair without replacing either outer object.

`OKLCH` accepts `{ l, c, h, a }`, with hue in degrees. Its methods are `black`,
`assign`, `drift`, `clamp`, `lerp`, `eq`, and `css`. Chroma is bounded below by
zero; browser color management handles display gamut. Hue takes the shortest
arc; equality ignores hue only when both colors are near-achromatic.

`UC3` supplies `zero(x = 0, y = x, z = x)`, `copy`, `assign`, `drift`, `eq`, and
`lerp`. Interpolation permits extrapolation. `assign` and `drift` mutate the
current object. `ColorState` and `C3S` use per-channel `tau`/`eps` objects and
preserve the current object's identity when applying the exact destination.

Config objects retain useful defaults: frame timing, server stepping, color
channel tolerances, presence/slide duration, and initial loader state. Configure
before constructing instances or pass instance options. `C3S.__tau` and
`C3S.__eps` are initial copies of the vector config; changing the config after
module initialization does not rewrite those static copies. Fields prefixed
`__` remain observable for compatibility and tests, but direct writes can break
lifecycle accounting.

## Svelte

Prefix: `@frankfmy/state-motion-svelte`.

| Path | Exports |
| --- | --- |
| root | `createSvelteState`, `createSvelteRawState`, `createSvelteDerived`, `createSvelteWritableDerived`, `createSvelteEffect`, `createSvelteRoot`, `createSvelteSnapshot`, `createSvelteProxy`, `createSvelteRawProxy`, and state interfaces |
| `/habitat` | `SvelteHabitat`; requires optional core peer exactly `0.1.0` |
| `/loader` | `LoaderStore`, `LoaderHook` |
| `/presence-animator` | `PresenceAnimator`, `PresenceAnimatorOptions` |
| `/transition` | `slide` with optional `classic: true` |
| `/slot-geometry` | `create_slot_geometry`, `Placement`, `SlotGeometry` |
| `/Loader.svelte` | Default visual `Loader` component |
| `/loader-props` | `LoaderProps` |
| `/child/Divided.svelte` | Default generic `Divided` component |
| `/child/types` | `DividedChild`, `EmbeddedChild`, component/snippet variants, `ChildDividedProps` |
| `/__config` | Default mutable `SvelteHelpersConfig` |

The original relative rune, habitat, loader, presence, transition and child
entry names are preserved. Visual Loader and data-free slot geometry now have
explicit exports in the same optional package. They need no utility CSS
framework or application context.

`ISvelteState<T>` has a tracked `signal` accessor plus untracked `get`, `set`, and
`untrack(callback)`. No-argument state factories include `undefined` in the
value type. Raw state tracks assignment only; it does not deeply proxy objects.
Derived signals are read-only. Writable derived values hold an optimistic
override until a dependency changes. A proxy preserves Svelte's normal deep
reactivity; a raw proxy returns the original object. Snapshot delegates to
Svelte's snapshot rules.

`createSvelteEffect` uses the current effect owner. `createSvelteRoot` creates an
explicit owner and **returns its disposer**; call it yourself. Effects are
client behavior, so SSR does not prove their reactivity.

`LoaderStore.default(initial = false)` creates a reactive boolean store.
`new LoaderStore(state)` accepts a structural `IState<boolean>`, not a boolean.
Use `push(promise)`, `hook()`, `run(asyncFunction, external?)`, and `reset()`.
Call `.hydrate()` during component initialization when a server-rendered true
flag should be checked on mount. Pending client work keeps it true; otherwise it
resets to false. Register cleanup on the component's owner.

`PresenceAnimator({ initial = true, duration = 350, backup? })` exposes `show`,
`visible`, `progress`, `target`, and `frame` slots. `toggle()` updates desired
state and calls `backup` synchronously. Opening makes `visible` true immediately;
closing hides only after interpolation. Call `destroy()` at unmount. Calling
`toggle()` requires browser frame APIs; constructing the object is SSR-safe.

`Divided` accepts a discriminated `child`. Both component and snippet variants
receive `{ props }`. A `DividedChild<{ n: number }>` requires a matching `props`
value. `EmbeddedChild` is a type for consumers that pass the props directly,
without that envelope. The component declaration is generated from its real
generic Svelte source, including negative-prop checks.

`Loader` accepts `position` (CSS position, default `fixed`) and `size` (Svelte
class value). The fallback is a centered 6rem spinner, inset zero, z-index 600,
with a gray background. `--loader-background` and `--loader-size` customize it;
`--color-base-300`, `--color-base-100`, and `--theme-duration` are optional theme
fallbacks. A supplied size class can override width/height. Use `position="absolute"`
inside a positioned container for a local overlay. Supply your own status text
or live region; this visual component does not label the operation.

`create_slot_geometry()` supplies `observe`, `retain(scope, ids)` and `height(id)`.
Call `retain` with an owner token and current membership, then use
`use:geometry.observe={{ id, present }}` on a measured element. Read `height(id)`
as a CSS pixel string or `undefined`; the lookup itself is not reactive. Callers
choose when to consume measurements. ResizeObserver captures positive, finite
connected-element heights while present. A departure preserves the last real
height. Each scope change starts a generation; update the action to adopt that
generation. No domain payload or reconciliation algorithm is stored here.
