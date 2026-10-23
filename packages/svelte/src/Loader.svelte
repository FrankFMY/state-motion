<script lang="ts">
	import type { LoaderProps } from "./loader-props.js";
	import { fade, scale } from "svelte/transition";

	const { size, position }: LoaderProps = $props();
</script>

<div
	transition:fade|global={{ duration: 400, delay: 100 }}
	class="g-loader"
	style={`position:${position ?? "fixed"}`}>
	<svg transition:scale|global={{ duration: 400, delay: 100 }} class={["g-spinner", size]} viewBox="0 0 100 100">
		<circle class="g-spinner-path" cx="50" cy="50" r="20" fill="none" stroke="#262626" stroke-width="5" />
		<circle class="g-spinner-spin" cx="50" cy="50" r="20" fill="none" stroke-width="5" stroke-miterlimit="10" />
	</svg>
</div>

<style>
	@layer components {
		:where(.g-loader) {
			display: flex;
			align-items: center;
			justify-content: center;
			inset: 0;
			z-index: 600;
			max-width: 100vw;
			max-height: 100vh;
			background: var(--loader-background, var(--color-base-300, #e5e7eb));
		}

		:where(.g-spinner) {
			width: var(--loader-size, 6rem);
			height: var(--loader-size, 6rem);
		}
	}

	@keyframes g-spinner-rotator {
		0% {
			transform: rotate(0deg);
		}
		50% {
			transform: rotate(180deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.g-spinner {
		animation: g-spinner-rotator calc(var(--theme-duration, 0.35s) * 8) cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
	}

	.g-spinner-path {
		stroke: var(--color-base-100, #262626);
	}

	@keyframes g-spinner {
		0% {
			stroke-dasharray: 1, 200;
			stroke-dashoffset: 0;
			stroke: #464b77;
		}
		25%,
		75% {
			stroke: #5e6ad2;
		}
		50% {
			stroke-dasharray: 89, 200;
			stroke-dashoffset: -35;
			stroke: #a6b0ff;
		}
		to {
			stroke-dasharray: 89, 200;
			stroke-dashoffset: -124;
			stroke: #464b77;
		}
	}

	.g-spinner-spin {
		stroke-dasharray: 1, 200;
		stroke-dashoffset: 0;
		animation: g-spinner 2s ease-in-out infinite;
		stroke-linecap: round;
	}
</style>
