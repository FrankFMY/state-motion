import type { Action } from "svelte/action";

export interface Placement {
	id: string;
	present: boolean;
}
export interface SlotGeometry {
	observe: Action<HTMLElement, Placement>;
	retain: (scope: unknown, ids: readonly string[]) => void;
	height: (id: string) => string | undefined;
}

/** Data-free DOM geometry, scoped to the owning mounted projection. */
export const create_slot_geometry = (): SlotGeometry => {
	const nodes = new Map<string, { element: HTMLElement; present: boolean }>();
	const heights = new Map<string, number>();
	let scope: unknown;
	let generation = 0;
	let members: Set<string> | undefined;
	return {
		observe: (element, placement) => {
			let current = placement;
			let current_generation = generation;
			let disposed = false;
			const capture = (): void => {
				if (disposed || current_generation !== generation || !current.present || !element.isConnected || nodes.get(current.id)?.element !== element || (members && !members.has(current.id))) return;
				const height = element.getBoundingClientRect().height;
				if (Number.isFinite(height) && height > 0) heights.set(current.id, height);
			};
			nodes.set(current.id, { element, present: current.present });
			capture();
			const Resize = element.ownerDocument?.defaultView?.ResizeObserver;
			const observer = typeof Resize === "function" ? new Resize(capture) : null;
			observer?.observe(element);
			return {
				update(next): void {
					if (disposed) return;
					if (nodes.get(current.id)?.element === element) nodes.delete(current.id);
					current = next;
					current_generation = generation;
					nodes.set(current.id, { element, present: current.present });
					capture();
				},
				destroy(): void {
					disposed = true;
					observer?.disconnect();
					if (nodes.get(current.id)?.element === element) nodes.delete(current.id);
				},
			};
		},
		retain: (next_scope, ids) => {
			members = new Set(ids);
			// Descendant DOM may already be a departure before its action updates.
			// Measure only in the action's matching present-state lifecycle.
			if (scope !== next_scope) {
				scope = next_scope;
				generation++;
				heights.clear();
				return;
			}
			const visible = new Set(ids);
			for (const id of heights.keys()) if (!visible.has(id)) heights.delete(id);
		},
		height: (id) => {
			const height = heights.get(id);
			return height === undefined ? undefined : `${height}px`;
		},
	};
};
