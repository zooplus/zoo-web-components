<svelte:options tag="zoo-input-info"></svelte:options>
{#if !valid && inputerrormsg}
	<div class="error-holder">
		<div class="svg-wrapper"><svg class="exclamation-circle" width="21" height="21" viewBox="0 0 1050 1001"><path transform="matrix(1 0 0 -1 0 1e3)" d="m501 918c76 0 145-19 209-56 64-37 115-88 152-152 37-64 56-134 56-209 0-76-19-145-56-209-37-64-88-115-152-152-64-37-134-56-209-56-76 0-145 19-209 56-64 37-115 88-152 152-37 64-56 134-56 209 0 76 19 145 56 209 37 64 88 115 152 152 64 37 134 56 209 56zm70-677v103c0 5-2 9-5 13-3 3-7 5-12 5h-104c-5 0-9-2-12-5-4-4-5-8-5-12v-103c0-5 2-9 5-12 4-4 8-5 12-5h104c5 0 9 2 12 5 3 3 5 8 5 13zm-1 187l10 337c0 4-2 8-5 10-4 3-8 4-13 4h-119c-5 0-9-1-13-4-4-2-5-5-5-10l9-337c0-4 2-7 5-9 4-3 8-4 13-4h100c5 0 9 1 13 4 3 3 5 6 6 9h0z"/></svg></div>
		<div class="error-label">{inputerrormsg}</div>
	</div>
{/if} 
{#if infotext}
	<div class="info">
		<div class="svg-wrapper"><svg class="info-rounded-circle" width="21" height="21" viewBox="0 0 1050 1001"><path transform="matrix(1 0 0 -1 0 1e3)" d="m501 83c-230 0-417 187-417 417 0 230 187 417 417 417 230 0 417-187 417-417 0-230-187-417-417-417zm0 646c-35 0-63-28-63-63 0-35 28-63 63-63s63 28 63 63c0 35-28 63-63 63zm-42-229v-167c0-23 19-42 42-42s42 19 42 42v167c0 23-19 42-42 42s-42-19-42-42z"/></svg></div>
		<span class="info-text">{infotext}</span>
	</div>
{/if}

<style type='text/scss'>
	@import "variables";
	.info, .error-holder {
		padding-right: 2px;
		font-size: 12px;
		color: $matterhorn;
		display: flex;
	  	align-items: center;
		.svg-wrapper {
			display: flex;
			align-self: start;
		}
	}
	.info-rounded-circle, .exclamation-circle {
		padding-right: 2px;
		& > path {
			fill: $matterhorn;
		}
	}
	.exclamation-circle > path {
		fill: $error-text-color;
	}
	.error-holder {
		animation: hideshow 0.5s ease;
		color: $error-text-color;
		.error-label {
			font-size: 12px;
		}
	}
	@keyframes hideshow {
		0% { opacity: 0; }
		100% { opacity: 1; }
	} 
</style>

<script>
	export let valid = true;
	export let inputerrormsg = '';
	export let infotext = '';
</script>