import type { NewRenderState, RenderLoopItemOptions, RenderStateHabitat, RenderTickContext } from "../../habitat/render.js";
import { Render, RenderState } from "../../habitat/render.js";
import type { IDriftState } from "../../internal/helpers/types.js";
import CONFIG from "../__config.js";
import { UC3 } from "../index.js";
import type * as PT from "../types.js";

export const tick = (ctx: RenderTickContext<PT.C3, PT.C3>): PT.C3 => {
	const dt = ctx.timings.dt;
	const tau = ctx.opts.tau;
	return UC3.lerp(ctx.current.get(), ctx.target.get(), {
		x: Render.alpha(dt, tau.x),
		y: Render.alpha(dt, tau.y),
		z: Render.alpha(dt, tau.z),
	});
};

/** Анимируемая точка с отдельными `tau` и `eps` для каждой оси. */
export class C3S extends RenderState<PT.C3, PT.C3> {
	static __eps: PT.C3 = { ...CONFIG.C3_EPS };
	static __tau: PT.C3 = { ...CONFIG.C3_STATE_TAU };

	constructor(
		id: string,
		state: IDriftState<PT.C3>,
		habitat: RenderStateHabitat,
		opts: RenderLoopItemOptions<PT.C3> = { eps: { ...C3S.__eps }, tau: { ...C3S.__tau } },
	) {
		const ctx: NewRenderState<PT.C3, PT.C3> = {
			...habitat,
			tick,
			drift: (current, target) => UC3.drift(current, target),
			eq: (current, target, eps) => UC3.eq(current, target, eps),
		};
		super(id, state, ctx, opts);
	}
}
