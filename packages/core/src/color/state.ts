import type { NewRenderState, RenderLoopItemOptions, RenderStateHabitat, RenderTickContext } from "../habitat/render.js";
import { Render, RenderState } from "../habitat/render.js";
import type { IDriftState } from "../internal/helpers/types.js";
import CONFIG from "./__config.js";
import type { tOKLCH } from "./oklch.js";
import { OKLCH } from "./oklch.js";

export const tick = (ctx: RenderTickContext<tOKLCH, tOKLCH>): tOKLCH => {
	const dt = ctx.timings.dt;
	const tau = ctx.opts.tau;
	return OKLCH.lerp(ctx.current.get(), ctx.target.get(), {
		l: Render.alpha(dt, tau.l),
		c: Render.alpha(dt, tau.c),
		h: Render.alpha(dt, tau.h),
		a: Render.alpha(dt, tau.a),
	});
};

/**
 * Анимируемый OKLCH поверх `RenderState`.
 *
 * Каждый канал имеет свой `tau`, поэтому прозрачность может догонять цвет
 * медленнее, а hue всегда идёт по короткой дуге. Без `render` новый цвет
 * применяется сразу — это обычный контракт `RenderState`.
 *
 * Экспортируется из корня `@frankfmy/state-motion/color` и требует `@frankfmy/state-motion`.
 */
export class ColorState extends RenderState<tOKLCH, tOKLCH> {
	constructor(
		id: string,
		state: IDriftState<tOKLCH>,
		habitat: RenderStateHabitat,
		opts: RenderLoopItemOptions<tOKLCH> = {
			eps: { ...CONFIG.OKLCH_EPS },
			tau: { ...CONFIG.COLOR_STATE_TAU },
		},
	) {
		const ctx: NewRenderState<tOKLCH, tOKLCH> = {
			...habitat,
			tick,
			drift: (current, target) => OKLCH.drift(current, target),
			eq: (current, target, eps) => OKLCH.eq(current, target, eps),
		};
		super(id, state, ctx, opts);
	}
}
