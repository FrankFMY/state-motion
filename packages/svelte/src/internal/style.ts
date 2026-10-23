/** Narrow formatting used by slide; preserves three-decimal rounding. */
export const px = (value: number): string => `${Number.isNaN(value) ? 0 : Math.round(value * 1000) / 1000}px`;
export const toCapitalCase = (word: string = ""): string => word.charAt(0).toUpperCase() + word.slice(1);
