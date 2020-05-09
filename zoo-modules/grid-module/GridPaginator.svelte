<svelte:options tag="zoo-grid-paginator"></svelte:options>
<div class="box" bind:this={gridPaginatorRoot}>
	<slot name="pagesizeselector"></slot>
	<div class="btn wall-holder first" class:disabled="{disablePrev}" on:click="{() => goToPage(1)}"></div>
	<div class="btn arrow prev" class:disabled="{disablePrev}" on:click="{() => goToPage(currentpage - 1)}"></div>
	{#if currentpage && maxpages}
		{currentpage} {maxpages}
	{/if}
	<div class="btn arrow next" class:disabled="{disableNext}" on:click="{() => goToPage(currentpage + 1)}"></div>
	<div class="btn wall-holder last" class:disabled="{disableNext}" on:click="{() => goToPage(maxpages)}"></div>
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

			&.disabled {
				cursor: not-allowed;
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
	}
</style>

<script>
	import { afterUpdate, onMount } from 'svelte';
	export let maxpages;
	export let currentpage;
	let gridPaginatorRoot;
	let disablePrev = true;
	let disableNext = true;
	let host;

	onMount(() => {
		host = gridPaginatorRoot.getRootNode().host;
		const wallTemplateContent = gridPaginatorRoot.querySelector('#arrow-limit').content;
		const arrowTemplateContent = gridPaginatorRoot.querySelector('#arrow').content;
		gridPaginatorRoot.querySelector('.btn.first').appendChild(wallTemplateContent.cloneNode(true));
		gridPaginatorRoot.querySelector('.btn.last').appendChild(wallTemplateContent.cloneNode(true));
		gridPaginatorRoot.querySelector('.btn.prev').appendChild(arrowTemplateContent.cloneNode(true));
		gridPaginatorRoot.querySelector('.btn.next').appendChild(arrowTemplateContent.cloneNode(true));
	});
	afterUpdate(() => {
		if (!currentpage || !maxpages) {
			disablePrev = true;
			disableNext = true;
		} else if (currentpage == 1) {
			disablePrev = true;
			disableNext = false;
		} else if (currentpage == maxpages) {
			disableNext = true;
			disablePrev = false;
		} else {
			disablePrev = false;
			disableNext = false;
		}
	});
	const goToPage = (pageNumber) => {
		if (disableNext && disablePrev || disableNext && pageNumber >= currentpage || disablePrev && pageNumber <= 1) {
			return;
		}
		currentpage = pageNumber;
		host.dispatchEvent(new Event('pageChange', {pageNumber: pageNumber}));
	}
</script>