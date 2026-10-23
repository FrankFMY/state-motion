<script lang="ts" generics="Props extends Record<string, any> | null = null">
 import type { ChildDividedProps, DividedChild } from "./types.js";
 const { child }: ChildDividedProps<Props> = $props();
 // Both public variants use the same { props } runtime envelope, including undefined.
 const body = $derived(child as DividedChild<Record<string, any>>);
</script>

{#if body.type === "snippet"}
 {@render body.func({ props: body.props })}
{:else}
 {@const Body = body.func}
 <Body props={body.props} />
{/if}
