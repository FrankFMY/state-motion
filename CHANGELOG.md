# Changelog

## state-motion-svelte 0.1.2

- Accept Svelte 5.57.x patches (`~5.57.0`) instead of requiring exactly 5.57.0.
- Retain the tested 5.57.0 minimum and optional core peer 0.1.1; no runtime or
  declaration changes and no new core version.
- Exercise ordinary all-six npm resolution and shared Svelte 5.57.2 types, SSR,
  Chromium/WebKit hydration, SVG plugin/Icon rendering and lifecycle teardown.

## 0.1.1

- Prepare public npm distribution with explicit registry and access metadata.
- Document exact registry-version checks while preserving older GitHub archive installation.
- Keep the two state-motion packages and their optional core peer on matching versions.
- No runtime, declaration, dependency implementation or public API changes.

## 0.1.0

- Introduce framework-neutral state, scheduler and server renderer with separate
  OKLCH and vector3 interpolation entry points.
- Package optional Svelte 5 rune adapters, habitat, LoaderStore, presence,
  transitions, generic children, visual Loader and data-free slot geometry.
- Preserve pending-count Loader behavior with overlap, duplicate, reset and
  reentrant-observer regressions on packed files.
- Return effect-root cleanup; guard scheduler/presence callbacks and slot
  observations across cancellation, replacement and scope generations.
- Keep server insertion/manual-frame timestamps on the virtual clock and make
  core declarations usable without DOM typings.
- Emit ESM/declarations and Svelte compiler sources with explicit exports,
  pinned dependencies, tarball consumers and browser layout checks.

Registry publication and GitHub delivery are separate release steps.
