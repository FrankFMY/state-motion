<script lang="ts">
 import { createSvelteState } from '@frankfmy/state-motion-svelte';
 import Icon from '@frankfmy/svg-sprite-toolkit/Icon.svelte';
 import { spriteUrl } from 'virtual:svg-sprite';
 import type { IconKey } from './generated/icon-keys.js';
 import StateDemo from './StateDemo.svelte';
 const key = createSvelteState<IconKey>('circle');
</script>
<StateDemo />
<section aria-label="Sprite composition">
 <button data-testid="swap-icon" onclick={() => key.set(key.get() === 'circle' ? 'square' : 'circle')}>Swap icon</button>
 <Icon key={key.signal} {spriteUrl} title="Combined circle" width={48} height={48} />
</section>
