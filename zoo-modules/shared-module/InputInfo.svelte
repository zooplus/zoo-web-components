<svelte:options tag="zoo-log-input-info"></svelte:options>
{#if !valid && inputerrormsg}
	<div class="error-holder">
		<span class="icon-exclamation-circle"></span>
		<div class="error-label">{inputerrormsg}</div>
	</div>
{/if} 
{#if infotext}
	<div class="info">
		<span class="icon-info-rounded-circle"></span>
		<span class="info-text">{infotext}</span>
	</div>
{/if}

<style type='text/scss'>
	@import "variables";
	.info {
		padding-right: 2px;
		font-size: 12px;
		color: $matterhorn;
		display: flex;
	  	align-items: center;
		.icon-info-rounded-circle {
			padding-right: 2px;
			font-size: 20px;
			&:before {
			content: "\EA4C";
			}
		}
	}
	.error-holder {
		color: $error-text-color;
		display: flex;
		align-items: center;
		.error-label {
			font-size: 12px;
		}
		.icon-exclamation-circle {
			padding-right: 2px;
			&:before {
				content: "\EA38";
				font-size: 20px;
			}
		}
	}
	.icon-angle-up, .icon-angle-down {
		color: $matterhorn;
		&.error {
			color: $error-text-color;
		}
	}
	.icon-angle-up:before {
		content: "\EA05";
		position: absolute;
		right: 3%;
		top: 28%;
	}
	.icon-angle-down:before {
		content: "\EA02";
		position: absolute;
		right: 3%;
		top: 42%;
	}
</style>

<script>
	export let valid = true;
	export let inputerrormsg = '';
	export let infotext = '';
</script>