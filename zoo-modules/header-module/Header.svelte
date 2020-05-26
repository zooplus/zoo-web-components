<svelte:options tag="zoo-header"></svelte:options>
<header bind:this={_headerRoot}>
	<img importance="high" src="{imgsrc}" alt="{imgalt}" bind:this={_img}/>
	<h2>{headertext}</h2>
	<slot></slot>
</header>

<style type='text/scss'>
	@import "variables";

	:host {
		contain: style;
	}

	header {
		display: flex;
		align-items: center;
		background: $white;
		padding: 0 25px;
		height: 70px;
	}

	img {
		height: 46px;
		display: inline-block;
		padding: 5px 25px 5px 0;
		cursor: pointer;
		@media only screen and (max-width: 544px) {
			height: 36px;
		}
	}

	h2 {
		display: inline-block;
		color: var(--primary-mid, #{$primary-mid});
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

	onMount(() => {
		const host = _headerRoot.getRootNode().host;
		_img.addEventListener("click", () => host.dispatchEvent(new Event("logoClicked")));
	});

</script>