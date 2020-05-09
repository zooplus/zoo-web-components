<svelte:options tag="zoo-input-label"></svelte:options>
{#if labeltext}
<div class="label">
	<span>{labeltext}</span>
</div>
{/if}

<style type='text/scss'>
	@import "variables";

	.label {
		font-size: 14px;
		font-weight: 800;
		line-height: 20px;
		color: $matterhorn;
		text-align: left;
	}
</style>

<script>
	export let labeltext = '';
</script>