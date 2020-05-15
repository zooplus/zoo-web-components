<svelte:options tag="zoo-input-label"></svelte:options>
{#if labeltext}
	<div>{labeltext}</div>
{/if}

<style type='text/scss'>
	@import "variables";

	div {
		font-size: $p1-size;
		line-height: $p1-line-height;
		font-weight: 800;
		color: $grey-dark;
		text-align: left;
	}
</style>

<script>
	export let labeltext = '';
</script>