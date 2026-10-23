import { hydrate, unmount } from 'svelte';
import App from './App.svelte';
const app = hydrate(App, { target: document.getElementById('app')! });
Object.assign(window, {
 __sameNode: (window as unknown as { __ssrNode: Element }).__ssrNode === document.querySelector('[data-testid="counter"]'),
 __unmount: () => unmount(app),
});
