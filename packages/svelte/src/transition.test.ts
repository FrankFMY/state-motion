import { expect, test } from "bun:test";
import { slide } from "./transition.js";

for (const axis of ["x", "y"] as const) {
  for (const opacity of [0, 0.25, 1]) {
    test(`custom slide preserves computed opacity ${opacity} on ${axis} axis`, () => {
      const previous = globalThis.getComputedStyle;
      globalThis.getComputedStyle = () => ({
        opacity: String(opacity),
        width: "80px",
        height: "64px",
        paddingTop: "0px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px",
        marginTop: "0px", marginBottom: "0px", marginLeft: "0px", marginRight: "0px",
        borderTopWidth: "0px", borderBottomWidth: "0px", borderLeftWidth: "0px", borderRightWidth: "0px",
      } as CSSStyleDeclaration);
      try {
        const transition = slide({} as Element, { axis });
        const css = transition.css;
        expect(css).toBeDefined();
        if (!css) throw new Error("Expected CSS transition");
        const start = Number(/opacity:\s*([^;]+);/.exec(css(0, 1))?.[1]);
        const end = Number(/opacity:\s*([^;]+);/.exec(css(1, 0))?.[1]);
        expect(start).toBe(0);
        expect(end).toBe(opacity);
      } finally {
        if (previous) globalThis.getComputedStyle = previous;
        else Reflect.deleteProperty(globalThis, "getComputedStyle");
      }
    });
  }
}
