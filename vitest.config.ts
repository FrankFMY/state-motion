import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
export default defineConfig({
 plugins: [svelte({ configFile: "packages/svelte/svelte.config.js" })],
 test: { include: ["packages/svelte/src/**/*.vitest.ts"], environment: "node" },
});
