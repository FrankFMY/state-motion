# Lifecycle behavior

## Scheduler

A render pass snapshots registrations. Work added during a pass waits for the
next pass; replacing an ID prevents its stale snapshot from running. Completion
removes the exact registration that ran, including when the same item object is
reinserted. `keep` preserves `iat`; `refresh` changes it. Clearing and starting
new work inside a callback leaves one successor frame. Callbacks delivered
after stop/clear cannot execute a later generation.

`ServerRender` offers explicit time steps and optional timer-driven stepping.
Insertion times and default manual-frame times use the same virtual clock as
`step`, so elapsed-time callbacks do not mix host and simulated timestamps.
`settle(maxSteps = 1000)` is bounded and may return with work remaining for an
infinite or very slow animation; inspect `has(id)` if completion matters. Always
stop/clear an automatic server renderer before releasing its owner.

## Loader

The internal pending counter records each `push`, including multiple pushes of
the same Promise. Each registration attaches one settlement handler pair and
is counted once. It does not retain completed promises or rescan a growing
promise collection. This is an accounting property, not a memory or performance
benchmark result.

Each push synchronously notifies `true`; there is no deduplication of busy
notifications. Resolving or rejecting the final pending operation resets the
generation and notifies `false`. Rejecting one operation does not clear its
neighbors. Explicit `reset()` always notifies false, even if already idle.

Generation changes happen before idle notification. An observer may start new
work from that notification; completion of discarded operations cannot decrement
the new counter. Registration happens before busy notification, so a busy
observer can reset or enqueue synchronously without losing settlement accounting.
Busy-observer exceptions propagate to the caller after registration. Observers
should not throw from asynchronous idle notification.

`hook()` returns an idempotent completion callback. `run()` returns the
operation's result and propagates its error. Its optional external callback is
per-operation: it receives false in `finally` even when the operation throws
synchronously, while neighboring operations may keep global busy true. The
external callback itself is expected not to throw.

This reset/hook/run contract differs from an ActivityTracker-style
track/active/idle API. Neither method names nor observer/reset semantics are a
drop-in replacement. No general async-control library is duplicated or exported.

## Svelte ownership

A Svelte effect root has an explicit disposer. Ordinary effects follow their
component/root owner. Destroying presence cancels its frame and invalidates
late callbacks; the instance can subsequently be toggled again. Unmount code
should also clear a shared Render and reset any owned LoaderStore. Resetting a
Loader does not abort fetches or arbitrary user operations.

Slot geometry retains only IDs, element references, owner scope and numeric
heights. Resize observations stop affecting it on departure, action destruction,
membership removal, scope change, or replacement by a new element with the same
ID. Returning to an old scope object's identity does not reactivate its old
observers. Environments without ResizeObserver get the initial/action-update
measurement only. Call `retain` as membership changes to release saved heights.

## Version 0.1.0 differences

The package separates framework-neutral core from optional Svelte imports,
removes unused helper and private build dependencies, and emits declarations.
It keeps the pending-count Loader implementation. The effect-root adapter now
returns Svelte's actual cleanup function. Scheduler and observer generations
cover reentry and late callbacks. The visual loader works with its own CSS;
raw-proxy identity and optional peer paths are documented explicitly.
