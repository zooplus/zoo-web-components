<svelte:options tag="zoo-header"></svelte:options>
<div class="box" bind:this={_headerRoot}>
	<img importance="high" class="app-logo" src="{imgsrc}" alt="{imgalt}" bind:this={_img}/>
	<span class="app-name">{headertext}</span>
	<slot></slot>
</div>

<style type='text/scss'>
	@import "variables";

	:host {
		contain: style;
	}

	.box {
		display: flex;
		align-items: center;
		background: $white;
		padding: 0 25px;
		height: 70px;
	}

	.app-logo {
		height: 46px;
		display: inline-block;
		padding: 5px 25px 5px 0;
		cursor: pointer;
		@media only screen and (max-width: 544px) {
			height: 36px;
		}
	}

	.app-name {
		display: inline-block;
		color: var(--primary-mid, #{$primary-mid});
		font-size: $h2-size;
		line-height: $h2-line-height;
		padding: 0 25px 0 0;
		@media only screen and (max-width: 544px) {
			display: none;
		}
	}
</style>

<script>
	import { onMount } from 'svelte';
	export let headertext = '';
	export let imgsrc = '';
	export let imgalt = '';
	let _headerRoot;
	let _img;
	let host;

	onMount(() => {
		host = _headerRoot.getRootNode().host;
		_img.addEventListener("click", () => host.dispatchEvent(new Event("logoClicked")));
	});

</script>