<svelte:options tag="zoo-grid-paginator"></svelte:options>
<div class="box" bind:this={gridPaginatorRoot}>
	<slot name="pagesizeselector"></slot>
	<div class="btn prev" class:hidden="{!currentpage || currentpage == 1}" on:click="{() => goToPrevPage()}"></div>
	{#if currentpage && maxpages}
		{currentpage} {maxpages}
	{/if}
	<div class="btn next" class:hidden="{!currentpage || !maxpages || currentpage == maxpages}" on:click="{() => goToNextPage()}"></div>
	<template id="arrow">
		<svg class="nav-arrow" width="28" height="28" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
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

			&.hidden {
				opacity: 0;
			}
		}

		.next svg {
			transform: rotate(-90deg);
		}

		.prev svg {
			transform: rotate(90deg);
		}

		svg {
			fill: $matterhorn;
		}

		.nav-arrow {
			path { fill: var(--main-color, #{$main-color}); }
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
		const arrowTemplateContent = gridPaginatorRoot.querySelector('#arrow').content;
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
	const goToPrevPage = () => {
		if (disablePrev || currentpage <= 1) {
			return;
		}
		goToPage(+currentpage-1);
	}
	const goToNextPage = () => {
		if (disableNext || currentpage == maxpages) {
			return;
		}
		goToPage(+currentpage+1);
	}
	const goToPage = (pageNumber) => {
		currentpage = pageNumber;
		host.dispatchEvent(new Event('pageChange', {pageNumber: pageNumber}));
	}
</script>