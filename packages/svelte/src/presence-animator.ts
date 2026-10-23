import { untrack } from "svelte";
import CONFIG from "./__config.js";
import type { ISvelteState } from "./index.svelte.js";
import { createSvelteRawState } from "./index.svelte.js";

export interface PresenceAnimatorOptions {
	initial?: boolean;
	duration?: number;
	backup?: (state: boolean) => void;
}

/**
 * Панель / aside / overlay. `{#if visible}` держит узел в DOM.
 * `progress` едет на ширину или opacity. `show` — «хотим открыто».
 *
 * `toggle` сразу пишет `show` и зовёт `backup` (persist, URL).
 * Открытие: `visible = true` в этом же тике.
 * Закрытие: `visible = false` только после ease.
 *
 * Повтор во время кадра не перезапускает rAF. Сбрасывает отсчёт
 * с текущего `progress` на новый `target` (easeInOutQuad, тот же `duration`).
 *
 * ```ts
 * const panel = new PresenceAnimator({
 *   initial: false,
 *   backup: (open) => localStorage.setItem("panel", String(open)),
 * });
 * {#if panel.visible.signal}
 *   <aside style:opacity={panel.progress.signal}>…
 * {/if}
 * ```
 */
export class PresenceAnimator {
	show: ISvelteState<boolean>;
	visible: ISvelteState<boolean>;
	frame: ISvelteState<number>;

	// если show === true -> едем к 1 (открыто), иначе к 0 (скрыто)
	target: ISvelteState<0 | 1>;
	progress: ISvelteState<number>;

	duration: number;
	backup?: (state: boolean) => void;

	__generation = Symbol();
	__start_time = 0;
	__start_progress = 0;

	constructor(ctx: PresenceAnimatorOptions = {}) {
		const initial = ctx.initial ?? CONFIG.PRESENCE_INITIAL;
		this.duration = ctx.duration ?? CONFIG.PRESENCE_DURATION;
		this.backup = ctx.backup;
		this.show = createSvelteRawState(initial);
		this.visible = createSvelteRawState(initial);
		this.target = createSvelteRawState(initial ? 1 : 0);
		this.progress = createSvelteRawState(this.target.get());
		this.frame = createSvelteRawState(0);
	}

	destroy(): void {
		this.__generation = Symbol();
		untrack(() => {
			const frame = this.frame.signal;
			if (frame) cancelAnimationFrame(frame);
			this.frame.signal = 0;
		});
	}

	toggle(): void {
		untrack(() => {
			const next = !this.show.signal;
			this.show.signal = next;
			this.target.signal = next ? 1 : 0;
			this.backup?.(next);
			if (next) this.visible.signal = true;

			this.__start_time = performance.now();
			this.__start_progress = this.progress.signal;
			if (this.frame.signal) return;

			const generation = this.__generation;
			const animate = (time: number): void => {
				if (generation !== this.__generation) return;
				const elapsed = time - this.__start_time;
				const t = this.duration <= 0 ? 1 : Math.min(elapsed / this.duration, 1);
				const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
				this.progress.signal = this.__start_progress + (this.target.signal - this.__start_progress) * ease;

				if (t < 1) {
					this.frame.signal = requestAnimationFrame(animate);
				} else {
					const target = this.target.signal;
					this.progress.signal = target;
					if (target === 0) this.visible.signal = false;
					this.frame.signal = 0;
				}
			};

			this.frame.signal = requestAnimationFrame(animate);
		});
	}
}
