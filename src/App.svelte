<div class="app">
	<app-header></app-header>
	<div class="content">
		<app-form id="app-form"></app-form>
		<hr>
		<app-buttons id="app-buttons"></app-buttons>
		<hr>
		<app-tooltip-and-feedback id="app-tooltip-and-feedback"></app-tooltip-and-feedback>
		<hr>
		<!-- <docs-button></docs-button> -->
	</div>
	<zoo-footer class="footer" bind:this={footer}></zoo-footer> 
</div>

<style>
	.app {
		margin: 0 auto;
		height: 100%;
		display: flex;
		flex-direction: column;
		box-shadow: 15px 0px 40px 0px rgba(85,85,85, 0.3), -15px 0px 40px 0px rgba(85,85,85, 0.3);
	}
	.content {
		max-width: 1280px;
		width: 100%;
		flex: 1 0 auto;
		margin: 0 auto;
	}
	hr {
		display: absolute;
		color: #3C9700;
		margin: 45px 0;
	}
	.footer {
		flex-shrink: 0;
	}
</style>

<script>
	import { onMount } from 'svelte';
	let footer;
	onMount(() => {
		setTimeout(() => {
			footer.footerlinks = [
				{
					href: 'https://github.com/zooplus/zoo-web-components',
					text: 'Github',
					type: 'standard'
				},
				{
					href: 'https://www.npmjs.com/package/@zooplus/zoo-web-components',
					text: 'NPM',
					type: 'standard'
				},
				{
					href: 'https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens',
					text: 'Style guide',
					type: 'standard'
				}
			];
		}, 200);
	});
</script>