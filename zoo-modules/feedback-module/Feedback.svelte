<svelte:options tag="zoo-log-feedback"></svelte:options>
<div class="feedback-box {type}">
	{#if type === 'error'}
		<svg width="35" height="35" viewBox="50 0 1050 1001"><path class="error" transform="matrix(1 0 0 -1 0 1e3)" d="m501 146c196 0 355 159 355 355 0 196-159 355-355 355-196 0-355-159-355-355 0-196 159-355 355-355zm0 772c230 0 417-187 417-417 0-230-187-417-417-417-230 0-417 187-417 417 0 230 187 417 417 417zm-132-336c28 0 51 23 51 51 0 28-23 51-51 51-28 0-51-23-51-51 0-28 23-51 51-51zm264 0c28 0 51 23 51 51 0 28-23 51-51 51s-51-23-51-51c0-28 23-51 51-51zm-300-285c0 73 83 145 168 145 85 0 168-72 168-145h28 28c0 112-116 203-224 203-108 0-224-91-224-203h28 28z"/></svg>
	{/if}
	{#if type === 'info'}
		<svg width="35" height="35" viewBox="50 0 1050 1001"><path class="info" transform="matrix(1 0 0 -1 0 1e3)" d="m501 83c-230 0-417 187-417 417 0 230 187 417 417 417 230 0 417-187 417-417 0-230-187-417-417-417zm0 83c184 0 334 149 334 334s-149 334-334 334c-184 0-334-149-334-334s149-334 334-334zm0 563c35 0 63-28 63-63 0-35-28-63-63-63s-63 28-63 63c0 35 28 63 63 63zm-42-209v-250h83v250h-83z"/></svg>
	{/if}
	{#if type === 'success'}
		<svg width="35" height="35" viewBox="50 0 1050 1001"><path class="success" transform="matrix(1 0 0 -1 0 1e3)" d="m501 146c196 0 355 159 355 355 0 196-159 355-355 355-196 0-355-159-355-355 0-196 159-355 355-355zm0 772c230 0 417-187 417-417 0-230-187-417-417-417-230 0-417 187-417 417 0 230 187 417 417 417zm-132-336c28 0 51 23 51 51 0 28-23 51-51 51-28 0-51-23-51-51 0-28 23-51 51-51zm264 0c28 0 51 23 51 51 0 28-23 51-51 51s-51-23-51-51c0-28 23-51 51-51zm-300-141c0-73 83-145 168-145 85 0 168 72 168 145h28 28c0-112-116-203-224-203-108 0-224 91-224 203h28 28z"/></svg>
	{/if}
	<div class="text">{text}</div>
</div>

<style type='text/scss'>
	@import "variables";
	.feedback-box {
		box-sizing: border-box;
		background: #F2F3F4;
		color: #767676;
		font-size: 14px;
		border-left: 3px solid;
		display: flex;
		border-bottom-right-radius: 3px;
		border-top-right-radius: 3px;
		padding: 15px;
		width: 100%;
		&.info {
			border-color: #459FD0;
		}
		&.error {
			border-color: #ED1C24;
		}
		&.success {
			border-color: #3C9700;
		}
		svg {
			display: inline-block;
			vertical-align: middle;
			min-height: 35px;
    		min-width: 35px;
			& > path {
				stroke-width: 0.1;
				stroke-linejoin: round;
			}
			.error {
				fill: #ED1C24;
			}
			.success {
				fill: #3C9700;
			}
			.info {
				fill: #459FD0;
			}
		}
		.text {
			display: flex;
    		align-items: center;
		}
	}
</style>

<script>
	export let type = 'info'; // error, success
	export let text = '';
</script>