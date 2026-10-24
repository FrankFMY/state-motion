import { hydrate, unmount } from 'svelte';
import App from './App.svelte';
const icon = document.querySelector('svg[aria-label="Combined circle"]');
const app = hydrate(App, { target: document.getElementById('app')! });
Object.assign(window, {
 __sameNode: (window as unknown as { __ssrNode: Element }).__ssrNode === document.querySelector('[data-testid="counter"]'),
 __sameIcon: icon === document.querySelector('svg[aria-label="Combined circle"]'),
 __unmount: () => unmount(app),
});
