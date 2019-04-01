<svelte:options tag="zoo-input-label"></svelte:options>
{#if labeltext}
<div class="label" class:error="{!valid}">
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
	}

	.error {
		color: $error-text-color;
	}
</style>

<script>
	export let valid = true;
	export let labeltext = '';
</script>