<svelte:options tag="zoo-input-info"></svelte:options>
{#if !valid && inputerrormsg}
	<div class="error-holder">
		<div class="svg-wrapper"><svg class="exclamation-circle" width="24" height="24" viewBox="0 0 24 24"><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg></div>
		<div class="error-label">{inputerrormsg}</div>
	</div>
{/if} 
{#if infotext}
	<div class="info">
		<div class="svg-wrapper"><svg class="info-rounded-circle" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></div>
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