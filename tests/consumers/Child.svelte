<script lang="ts">
 const { props }: { props: { label: string } } = $props();
</script>
<span data-testid="component-child">{props.label}</span>
