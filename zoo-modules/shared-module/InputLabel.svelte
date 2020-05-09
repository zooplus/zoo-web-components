<svelte:options tag="zoo-input-label"></svelte:options>
{#if labeltext}
<div class="label">
	<span>{labeltext}</span>
</div>
{/if}

<style type='text/scss'>
	@import "variables";

	.label {
		font-size: $p2-size;
		line-height: $p2-line-height;
		font-weight: 800;
		color: $matterhorn;
		text-align: left;
	}
</style>

<script>
	export let labeltext = '';
</script>