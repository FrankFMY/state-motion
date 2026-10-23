# Contributing

Use Node 24.20.0 and Bun 1.4.2. Install with `bun install --frozen-lockfile`, then
run `bun run verify`. The first browser run requires the matching Playwright
Chromium and WebKit binaries; see the README. No hosted workflow is required.

Keep framework-neutral runtime code in `packages/core`, and Svelte-specific code
in `packages/svelte`. The root Svelte state entry must work without core. Only
`/habitat` may require its exact optional peer. Keep internal support small;
avoid adding a general helper or task-control surface.

For a behavior fix, add a focused regression and retain the existing tests.
Run `bun run test` for source tests, `bun run check` for native TypeScript/Svelte
checks, and `bun run lint` for static checks. `bun run build` emits core ESM and
Svelte compiler sources with declarations. TypeScript 6 is a pinned build API
compatibility dependency; TypeScript 7 remains the native checker/core compiler.

`bun run pack` validates the actual file allowlist. `bun run test:consumers`
installs the tarballs into separate ignored workspaces, checks declaration
consumers, builds SSR/client bundles and runs browser assertions. It also runs
the retained unit and presence inventory against installed release bytes.
`bun run test:clean` copies the non-ignored source into a new fixture, performs
a frozen install, reruns local gates and compares emitted files byte for byte.
It does not claim to test a remote Git clone. The dependency-isolation step temporarily moves only the checkout's development
`node_modules` and restores it; do not run another build concurrently.

Keep generated output, tarballs, browser evidence and local reports out of Git.
Packed-consumer projects use isolated temporary directories (`TMPDIR` when set);
source-clean-build fixtures use `.fixtures/`, and archives use `.artifacts/`. Never embed machine
paths, tokens, private contacts or unrelated project data in source, tests or
documentation. Use synthetic fixtures.

For a release, review the final source and tarball contents, preserve full MIT
and dependency notices, and verify hashes. A maintainer must separately validate
the actual published clone and GitHub assets. Private package flags are removed
only with registry authority; local pack/install does not grant it. Open a
repository issue or pull request for ordinary contributions once the repository
is available. No private security contact is asserted here.
