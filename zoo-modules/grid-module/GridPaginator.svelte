<svelte:options tag="zoo-grid-paginator"/>
<div class="box" bind:this={gridPaginatorRoot} class:hidden="{!currentpage || !maxpages}">
	<slot name="pagesizeselector"></slot>
	<nav class="paging">
		<div class="btn prev" class:hidden="{!currentpage || currentpage == 1}" on:click="{() => goToPrevPage()}"></div>
		{#each Array(+maxpages).fill().map((_, i) => i+1) as page}
			<!-- first, previous, current, next or last page -->
			{#if page == 1 || page == +currentpage - 1 || page == +currentpage || page == +currentpage + 1 || page == maxpages}
				<div class="page-element" on:click="{() => goToPage(page)}" class:active="{page == currentpage}">{page}</div>
			{:else if page == +currentpage-2 || +currentpage+2 == page}
				<div class="page-element-dots">...</div>
			{/if}
		{/each}
		<div class="btn next" class:hidden="{!currentpage || !maxpages || currentpage == maxpages}" on:click="{() => goToNextPage()}"></div>
		<template id="arrow">
			<style>
				.btn.next svg {transform: rotate(-90deg);}

				.btn.prev svg {transform: rotate(90deg);}
			</style>
			<svg class="arrow" width="24" height="24" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
		</template>
	</nav>
</div>

<style type='text/scss'>
	@import "variables";

	:host {
		padding: 10px;
		min-width: inherit;
		border-top: $stroked-box-grey-light;
	}

	.box {
		display: flex;
		font-size: $p1-size;
		width: max-content;
		right: 10px;
		justify-self: flex-end;
		position: sticky;

		&.hidden {
			display: none;
		}
	}

	.paging {
		display: flex;
		align-items: center;
		border: $stroked-box-grey-light;
		border-radius: $input-border-radius;
		margin: 3px 0 3px 20px;
		padding: 0 15px;
	}

	.btn {
		display: flex;
		cursor: pointer;
		opacity: 1;
		transition: opacity 0.1s;

		&:active {
			opacity: 0.5;
		}

		&.hidden {
			display: none;
		}

		&.next {
			margin-left: 5px;
		}

		&.prev {
			margin-right: 10px;
		}
	}

	svg {
		fill: $grey-dark;
	}

	.arrow {
		path { fill: var(--primary-mid, #{$primary-mid}); }
	}

	.page-element {
		cursor: pointer;

		&:hover, &:focus {
			background: $grey-ultralight;
		}

		&.active {
			background: var(--primary-ultralight, #{$primary-ultralight});
			color: var(--primary-mid, #{$primary-mid});
		}
	}

	.page-element, .page-element-dots {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: $input-border-radius;
		margin-right: 5px;
		padding: 4px 8px;
	}

	.page-element-dots {
		display: flex;
	}
</style>

<script>
	import { onMount } from 'svelte';
	export let maxpages = 0;
	export let currentpage = 0;
	let gridPaginatorRoot;

	onMount(() => {
		const arrowTemplateContent = gridPaginatorRoot.querySelector('#arrow').content;
		gridPaginatorRoot.querySelector('.btn.prev').appendChild(arrowTemplateContent.cloneNode(true));
		gridPaginatorRoot.querySelector('.btn.next').appendChild(arrowTemplateContent.cloneNode(true));
	});
	const goToPrevPage = () => goToPage(+currentpage-1)
	const goToNextPage = () => goToPage(+currentpage+1)
	const goToPage = pageNumber => {
		currentpage = pageNumber;
		gridPaginatorRoot.getRootNode().host.dispatchEvent(new CustomEvent('pageChange', {
			detail: {pageNumber: pageNumber}, bubbles: true, compose: true
		}));
	}
</script>