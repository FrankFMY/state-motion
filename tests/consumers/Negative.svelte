<script lang="ts">
 import Divided from '@frankfmy/state-motion-svelte/child/Divided.svelte';
 import Loader from '@frankfmy/state-motion-svelte/Loader.svelte';
</script>
{#snippet numberChild({ props }: { props: { n: number } })}<span>{props.n}</span>{/snippet}
<Divided child={{ type: 'snippet', func: numberChild, props: { n: 'bad' } }} />
<Loader position="somewhere" />
