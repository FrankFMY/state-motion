import { expectTypeOf, test } from "bun:test";
import type { Component, Snippet } from "svelte";
import type { DividedChild, EmbeddedChild } from "./types.js";

test("Divided snippet получает { props }, компонент — проп props", () => {
	interface Props {
		n: number;
	}
	type Snip = DividedChild<Props> & { type: "snippet" };
	type Comp = DividedChild<Props> & { type: "component" };
	expectTypeOf<Snip["func"]>().toEqualTypeOf<Snippet<[{ props: Props }]>>();
	expectTypeOf<Comp["func"]>().toEqualTypeOf<Component<{ props: Props }>>();
	expectTypeOf<EmbeddedChild<Props>["func"]>().toEqualTypeOf<Component<Props> | Snippet<[props: Props]>>();
});
