import { px, toCapitalCase } from "./internal/style.js";
import { quadInOut } from "svelte/easing";
import type { SlideParams, TransitionConfig } from "svelte/transition";
import { slide as svelte_slide } from "svelte/transition";
import CONFIG from "./__config.js";

const css_delay = (t: number, v: number): number => {
	if (t <= v) return 0;
	if (t >= 1) return 1;
	return (t - v) / (1 - v);
};

const css_boost = (t: number, v: number): number => {
	if (t <= 0) return 0;
	if (t >= 1 - v) return 1;
	return t / (1 - v);
};

/**
 * Слайд-анимация с добавлением лёгкого fade-эффекта
 */
export const slide = (
	node: Element,
	{ delay = 0, duration = CONFIG.SLIDE_DURATION, easing, axis = "y", classic }: SlideParams & { classic?: boolean } = {},
): TransitionConfig => {
	if (classic) return svelte_slide(node, { delay, duration, easing, axis });
	if (!easing) easing = quadInOut;

	const style = getComputedStyle(node);
	const opacity = Number.parseFloat(style.opacity);
	const prop = axis === "y" ? "height" : "width";
	const propValue = Number.parseFloat(style[prop]);

	const secProps = axis === "y" ? ["top", "bottom"] : ["left", "right"];

	const capSecProps = secProps.map(toCapitalCase) as ("Left" | "Right" | "Top" | "Bottom")[];

	const padStart = Number.parseFloat(style[`padding${capSecProps[0]}`]);
	const padEnd = Number.parseFloat(style[`padding${capSecProps[1]}`]);
	const marStart = Number.parseFloat(style[`margin${capSecProps[0]}`]);
	const marEnd = Number.parseFloat(style[`margin${capSecProps[1]}`]);
	const borStart = Number.parseFloat(style[`border${capSecProps[0]}Width`]);
	const borEnd = Number.parseFloat(style[`border${capSecProps[1]}Width`]);

	return {
		delay,
		duration,
		easing,
		css: (t): string => {
			const boosted = css_boost(t, CONFIG.SLIDE_SIZE_BOOST);
			const delayed = css_delay(t, CONFIG.SLIDE_FADE_DELAY);
			return `
	      overflow: hidden;
	      opacity: ${delayed * opacity};
	      ${prop}: ${boosted * propValue}px;
	      padding-${secProps[0]}: ${px(boosted * padStart)};
	      padding-${secProps[1]}: ${px(boosted * padEnd)};
	      margin-${secProps[0]}: ${px(boosted * marStart)};
	      margin-${secProps[1]}: ${px(boosted * marEnd)};
	      border-${secProps[0]}-width: ${px(boosted * borStart)};
	      border-${secProps[1]}-width: ${px(boosted * borEnd)};
	      min-${prop}: 0
	    `;
		},
	};
};
