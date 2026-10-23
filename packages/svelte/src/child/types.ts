import type { Component, Snippet } from "svelte";

export type DividedChildComponent<Props extends Record<string, any> | null = null> =
	Props extends Record<string, any>
		? { type: "component"; func: Component<{ props: Props }>; props: Props }
		: { type: "component"; func: Component; props?: never };

export type DividedChildSnippet<Props extends Record<string, any> | null = null> =
	Props extends Record<string, any>
		? { type: "snippet"; func: Snippet<[{ props: Props }]>; props: Props }
		: { type: "snippet"; func: Snippet<[{ props?: undefined }]>; props?: never };

/** `Divided` рендерит `{ props }`. Сниппет: `Snippet<[{ props }]>` . Компонент: проп `props`. */
export type DividedChild<Props extends Record<string, any> | null = null> = DividedChildComponent<Props> | DividedChildSnippet<Props>;

//...

export interface EmbeddedChildComponent<Props extends Record<string, any>> {
	type: "component";
	func: Component<Props>;
}

export interface EmbeddedChildSnippet<Props extends Record<string, any>> {
	type: "snippet";
	func: Snippet<[props: Props]>;
}

/** Без обёртки. Сниппет или компонент с голыми пропсами. */
export type EmbeddedChild<Props extends Record<string, any>> = EmbeddedChildComponent<Props> | EmbeddedChildSnippet<Props>;

export interface ChildDividedProps<Props extends Record<string, any> | null = null> {
 child: DividedChild<Props>;
}
