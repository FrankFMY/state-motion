import type { tOKLCH } from "./oklch.js";

export interface ColorsConfig {
	/** Допуск сравнения по каналам. Hue измеряется в градусах. */
	OKLCH_EPS: tOKLCH;
	/** Ниже этой chroma оттенок визуально не определён. */
	OKLCH_ACHROMATIC_C: number;
	/** Постоянные сглаживания `ColorState`, ms. */
	COLOR_STATE_TAU: tOKLCH;
}

const config: ColorsConfig = {
	OKLCH_EPS: { l: 0.001, c: 0.0015, h: 1, a: 0.002 },
	OKLCH_ACHROMATIC_C: 0.01,
	COLOR_STATE_TAU: { l: 90, c: 100, h: 120, a: 150 },
};

export default config;
