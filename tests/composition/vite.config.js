import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSvgSprite } from '@frankfmy/svg-sprite-toolkit/vite';
export default defineConfig({ plugins: [viteSvgSprite({ source: 'artwork.svg', selection: 'icons.json', output: 'generated/icons.svg', types: 'generated/icon-keys.ts', schema: 'generated/schema.json', fileName: 'assets/icons.svg' }), svelte()] });
