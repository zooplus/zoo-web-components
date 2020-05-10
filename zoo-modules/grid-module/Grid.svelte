<svelte:options tag="zoo-grid"></svelte:options>
<div class="box" bind:this={gridRoot}>
	<div class="header-row" class:sticky="{stickyheader}" bind:this={headerRow}>
		<slot name="headercell" bind:this={headerCellSlot}></slot>
	</div>
	<slot name="row"></slot>
	<slot name="norecords"></slot>
	{#if paginator}
		<slot name="paginator">
			<zoo-grid-paginator class="paginator" {currentpage} {maxpages} on:pageChange="{e => dispatchPageEvent(e)}">
				<slot name="pagesizeselector" slot="pagesizeselector"></slot>
			</zoo-grid-paginator>
		</slot>
	{/if}
</div>

<style type='text/scss'>
	@import "variables";

	.box {
		max-height: inherit;
		overflow: auto;
		box-shadow: $box-shadow-strong;

		.header-row, ::slotted(*[slot="row"]) {
			display: grid;
			grid-template-columns: repeat(var(--grid-columns-num), minmax(50px, 1fr));
			padding: 10px;
			border-bottom: 1px solid rgba(0,0,0, 0.2);
			min-height: 40px;
		}

		::slotted(*[slot="row"]) {
			align-items: center;
		}

		.header-row {
			z-index: 1;

			&.sticky {
				top: 0;
				position: sticky;
				background: white;
			}
		}

		::slotted(.header-cell) {
			display: flex;
			align-items: center;
			padding-right: 5px;
		}

		::slotted(*[slot="row"]:nth-child(odd)) {
			background: $grey-ultralight;
		}

		::slotted(*[slot="row"]:hover) {
			background: $grey-light;
		}

		::slotted(*[slot="norecords"]) {
			color: var(--warning-mid, #{$warning-mid});
			grid-column: span var(--grid-columns-num);
			text-align: center;
			padding: 10px 0;
		}

		.paginator {
			display: block;
			position: sticky;
			grid-column: span var(--grid-columns-num);
			bottom: 0;
			background: $white;
		}
	}
</style>

<script>
	import { onMount } from 'svelte';
	export let currentpage = '';
	export let maxpages = '';
	let stickyheader = false;
	let gridRoot;
	let headerCellSlot;
	let paginator = false;
	let sortableHeaders = [];
	let headerRow;
	let host;
	onMount(() => {
		headerCellSlot.addEventListener("slotchange", () => {
			host = gridRoot.getRootNode().host;
			const headers = headerCellSlot.assignedNodes();
			gridRoot.style.setProperty('--grid-columns-num', headers.length);
			handleHeaders(headers, host);
			
			if (host.hasAttribute('paginator')) {
				paginator = true;
			}
			if (host.hasAttribute('stickyheader')) {
				stickyheader = true;
			}
		});
	});

	const handleHeaders = (headers, host) => {
		for (let header of headers) {
			header.classList.add('header-cell');
			if (header.hasAttribute('sortable')) {
				header.innerHTML = '<zoo-grid-header>' + header.innerHTML + '</zoo-grid-header>';
				header.addEventListener("sortChange", (e) => {
					e.stopPropagation();
					const sortState = e.detail.sortState;
					sortableHeaders.forEach(h => h.discardSort());
					header.children[0].setSort(sortState);
					host.dispatchEvent(new CustomEvent('sortChange', {
						detail: {property: header.getAttribute('sortableproperty'), sortState: sortState}, bubbles: true
					}));
				});
				sortableHeaders.push(header.children[0]);
			}
		}
	}

	const dispatchPageEvent = e => {
		host.dispatchEvent(new CustomEvent('pageChange', {
			detail: {pageNumber: e.detail.pageNumber}, bubbles: true
		}));
	};
	
</script>