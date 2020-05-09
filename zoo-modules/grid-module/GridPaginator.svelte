<svelte:options tag="zoo-grid-paginator"></svelte:options>
<div class="box" bind:this={gridPaginatorRoot}>
	<slot name="pagesizeselector"></slot>
	<div class="btn wall-holder first"></div>
	<div class="btn arrow prev"></div>
	<div class="btn arrow next"></div>
	<div class="btn wall-holder last"></div>
	<template id="arrow-limit">
		<svg width="28" height="28" viewBox="0 0 24 24">
			<path d="M18.4 16.6L13.8 12l4.6-4.6L17 6l-6 6 6 6zM6 6h2v12H6z"/>
			<path d="M24 24H0V0h24v24z" fill="none"/>
		</svg>
	</template>
	<template id="arrow">
		<svg width="28" height="28" viewBox="0 0 24 24">
			<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
		</svg>
	</template>
</div>

<style type='text/scss'>
	@import "variables";

	.box {
		display: flex;
		justify-content: end;
		align-items: center;
		padding: 10px 15px 10px 0;

		.btn {
			display: flex;
			cursor: pointer;
			opacity: 1;
			transition: opacity 0.1s;
			margin-left: 10px;

			&:active {
				opacity: 0.5;
			}
		}

		.next svg {
			transform: rotate(-90deg);
		}

		.prev svg {
			transform: rotate(90deg);
		}

		.last svg {
			transform: rotate(180deg);
		}

		svg {
			fill: $matterhorn;
		}

		zoo-select {
			// width: 200px;
		}
	}
</style>

<script>
	import { onMount } from 'svelte';

	let gridPaginatorRoot;

	onMount(() => {
		const wallTemplate = gridPaginatorRoot.querySelector('#arrow-limit');
		const arrowTemplate = gridPaginatorRoot.querySelector('#arrow');
		gridPaginatorRoot.querySelector('.btn.first').appendChild(wallTemplate.content.cloneNode(true));
		gridPaginatorRoot.querySelector('.btn.last').appendChild(wallTemplate.content.cloneNode(true));
		gridPaginatorRoot.querySelector('.btn.prev').appendChild(arrowTemplate.content.cloneNode(true));
		gridPaginatorRoot.querySelector('.btn.next').appendChild(arrowTemplate.content.cloneNode(true));
	});
</script>