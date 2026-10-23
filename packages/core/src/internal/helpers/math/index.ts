export const clamp = (dmin: number, value: number, dmax: number): number => Math.max(Math.min(value, dmax), dmin);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
