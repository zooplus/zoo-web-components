<svelte:options tag="zoo-feedback"></svelte:options>
<div class="box {type}">
	{#if type === 'error'}
		<svg width="35" height="35" viewBox="50 0 1050 1001"><path transform="matrix(1 0 0 -1 0 1e3)" d="m501 146c196 0 355 159 355 355 0 196-159 355-355 355-196 0-355-159-355-355 0-196 159-355 355-355zm0 772c230 0 417-187 417-417 0-230-187-417-417-417-230 0-417 187-417 417 0 230 187 417 417 417zm-132-336c28 0 51 23 51 51 0 28-23 51-51 51-28 0-51-23-51-51 0-28 23-51 51-51zm264 0c28 0 51 23 51 51 0 28-23 51-51 51s-51-23-51-51c0-28 23-51 51-51zm-300-285c0 73 83 145 168 145 85 0 168-72 168-145h28 28c0 112-116 203-224 203-108 0-224-91-224-203h28 28z"/></svg>
	{/if}
	{#if type === 'info'}
		<svg width="35" height="35" viewBox="0 0 35 35"><path transform="matrix(1.4 0 0 1.4 -2 1)" d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>
	{/if}
	{#if type === 'success'}
		<svg width="35" height="35" viewBox="50 0 1050 1001">
		<path transform="matrix(1 0 0 -1 0 1e3)" d="m501 146c196 0 355 159 355 355 0 196-159 355-355 355-196 0-355-159-355-355 0-196 159-355 355-355zm0 772c230 0 417-187 417-417 0-230-187-417-417-417-230 0-417 187-417 417 0 230 187 417 417 417zm-132-336c28 0 51 23 51 51 0 28-23 51-51 51-28 0-51-23-51-51 0-28 23-51 51-51zm264 0c28 0 51 23 51 51 0 28-23 51-51 51s-51-23-51-51c0-28 23-51 51-51zm-300-141c0-73 83-145 168-145 85 0 168 72 168 145h28 28c0-112-116-203-224-203-108 0-224 91-224 203h28 28z"/>
		</svg>
	{/if}
	<div class="text">{text}</div>
</div>

<style type='text/scss'>
	@import "variables";
	.box {
		box-sizing: border-box;
		background: #F2F3F4;
		color: #767676;
		font-size: 14px;
		border-left: 3px solid;
		display: flex;
		align-items: center;
		border-bottom-right-radius: 3px;
		border-top-right-radius: 3px;
		padding: 15px;
		width: 100%;
		height: 100%;
		&.info {
			border-color: #459FD0;
			svg {fill: #459FD0;}
		}
		&.error {
			border-color: #ED1C24;
			svg {fill: #ED1C24;}
		}
		&.success {
			border-color: #3C9700;
			svg {fill: #3C9700;}
		}
		svg {
			min-height: 35px;
    		min-width: 35px;
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