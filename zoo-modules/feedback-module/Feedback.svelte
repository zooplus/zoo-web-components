<svelte:options tag="zoo-feedback"></svelte:options>
<div class="box {type}">
	{#if type === 'error'}
		<svg width="30" height="30" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><circle cx="15.5" cy="9.5" r="1.5"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-6c-2.33 0-4.32 1.45-5.12 3.5h1.67c.69-1.19 1.97-2 3.45-2s2.75.81 3.45 2h1.67c-.8-2.05-2.79-3.5-5.12-3.5z"/></svg>
	{/if}
	{#if type === 'info'}
		<svg width="30" height="30" viewBox="0 0 24 24"><path d="M14.25 15.75a.75.75 0 1 1 0 1.5h-.75A2.25 2.25 0 0 1 11.25 15v-3.75h-.75a.75.75 0 0 1 0-1.5h.75a1.5 1.5 0 0 1 1.5 1.5V15c0 .414.336.75.75.75h.75zM11.625 6a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25zm8.86-2.485c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0zm-1.06 1.06c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85z"/></svg>
	{/if}
	{#if type === 'success'}
		<svg width="30" height="30" viewBox="0 0 24 24">
		<path d="M20.485 3.515c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0zm-1.06 1.06c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85zM9.375 9a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0zm7.5 0a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0zm.501 5.667a.75.75 0 1 1 1.344.666 7.502 7.502 0 0 1-13.444 0 .75.75 0 0 1 1.344-.666 6.002 6.002 0 0 0 10.756 0z"/>
		</svg>
	{/if}
	<span class="text">{text}</span>
</div>

<style type='text/scss'>
	@import "variables";

	.box {
		box-sizing: border-box;
		background: $anti-flash-white;
		color: $matterhorn;
		font-size: 14px;
		border-left: 3px solid;
		display: flex;
		align-items: center;
		border-bottom-right-radius: 3px;
		border-top-right-radius: 3px;
		width: 100%;
		height: 100%;
		padding: 5px 0;

		&.info {
			border-color: $info-color;

			svg {fill: $info-color;}
		}

		&.error {
			border-color: $error-text-color;

			svg {fill: $error-text-color;}
		}

		&.success {
			border-color: $main-color;

			svg {fill: $main-color;}
		}

		svg {
			min-width: 30px;
			min-height: 30px;
			padding: 0 15px;
		}

		.text {
			display: flex;
			flex-direction: row;
			align-items: center;
			height: 100%;
			overflow: auto;
			box-sizing: border-box;
			padding: 5px 5px 5px 0;
		}
	}
</style>

<script>
	export let type = 'info'; // error, success
	export let text = '';
</script>