import CONFIG from "./__config.js";
export const EPS = {
 eq(a: number, b: number, eps: number = CONFIG.EPS_DEFAULT): boolean {
  return Math.abs(a - b) <= eps;
 },
};
