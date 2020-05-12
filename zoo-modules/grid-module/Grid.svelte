<svelte:options tag="zoo-grid"></svelte:options>
<div class="box" bind:this={gridRoot}>
	{#if loading}
		<div class="loading-shade"></div>
		<zoo-spinner></zoo-spinner>
	{/if}
	<div class="header-row">
		<slot name="headercell" bind:this={headerCellSlot}></slot>
	</div>
	<slot name="row" bind:this={rowSlot}></slot>
	<slot name="norecords"></slot>
	<slot name="paginator">
		<zoo-grid-paginator class="paginator" {currentpage} {maxpages} on:pageChange="{e => dispatchPageEvent(e)}">
			<slot name="pagesizeselector" slot="pagesizeselector"></slot>
		</zoo-grid-paginator>
	</slot>
</div>

<style type='text/scss'>
	@import "variables";

	:host {
		contain: layout;
	}

	.box {
		position: relative;
		max-height: inherit;
		max-width: inherit;
		min-height: inherit;
		min-width: inherit;
		overflow: auto;
	}

	.loading-shade {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 56px;
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		background: rgba(0, 0, 0, 0.15);
		pointer-events: none;
	}

	::slotted(*[slot="row"]) {
		overflow: visible;
	}

	.header-row {
		min-width: inherit;
		font-size: $p2-size;
		line-height: $p2-line-height;
		font-weight: 600;
		color: $grey-dark;
		box-sizing: border-box;
	}

	.header-row, ::slotted(*[slot="row"]) {
		display: grid;
		grid-template-columns: var(--grid-columns-sizes);
		padding: 5px;
		border-bottom: 1px solid rgba(0,0,0, 0.2);
		min-height: 50px;
		font-size: $p1-size;
		line-height: $p1-line-height;
	}

	:host([resizable]) {
		.header-row, ::slotted(*[slot="row"]) {
			display: flex;
		}

		::slotted(.header-cell) {
			overflow: auto;
			resize: horizontal;
		}
	}

	::slotted(*[slot="row"]) {
		align-items: center;
		box-sizing: border-box;
	}

	::slotted(*[slot="row"] *[column]) {
		align-items: center;
	}

	:host([stickyheader]) .header-row {
		top: 0;
		position: sticky;
		background: white;
	}

	.header-row {
		z-index: 1;
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
		display: none;
		position: sticky;
		grid-column: span var(--grid-columns-num);
		bottom: 0;
		background: $white;
	}

	:host([paginator]) zoo-grid-paginator {
		display: block;
	}
</style>

<script>
	import { onMount, onDestroy } from 'svelte';
	export let currentpage = '';
	export let maxpages = '';
	export let loading = false;
	let gridRoot;
	let headerCellSlot;
	let sortableHeaders = [];
	let host;
	let rowSlot;
	let resizeObserver;
	onMount(() => {
		headerCellSlot.addEventListener("slotchange", () => {
			host = gridRoot.getRootNode().host;
			const headers = headerCellSlot.assignedNodes();
			host.style.setProperty('--grid-columns-num', headers.length);
			host.style.setProperty('--grid-columns-sizes', 'repeat(var(--grid-columns-num), minmax(50px, 1fr))');
			handleHeaders(headers, host, host.hasAttribute('resizable'));
		});

		rowSlot.addEventListener("slotchange", () => {
			const exampleRow = rowSlot.assignedNodes()[0];
			const minWidth = window.getComputedStyle(exampleRow).getPropertyValue('min-width');
			const allRows = rowSlot.assignedNodes();
			for (const row of allRows) {
				let i = 1;
				for (const child of row.children) {
					child.setAttribute('column', i);
					child.style.flexGrow = 1;
					i++;
				}
			}
		});
	});

	const handleHeaders = (headers, host, applyResizeLogic) => {
		let i = 1;
		for (let header of headers) {
			header.classList.add('header-cell');
			header.style.flexGrow = 1;
			header.setAttribute('column', i);
			if (header.hasAttribute('sortable')) {
				handleSortableHeader(header);
			}
			i++;
		}
		if (applyResizeLogic) handleResizableHeaders(headers);
	}

	const handleSortableHeader = header => {
		header.innerHTML = '<zoo-grid-header>' + header.innerHTML + '</zoo-grid-header>';
		header.addEventListener("sortChange", (e) => {
			e.stopPropagation();
			const sortState = e.detail.sortState;
			sortableHeaders.forEach(h => h.discardSort());
			header.children[0].setSort(sortState);
			const detail = sortState ? {property: header.getAttribute('sortableproperty'), direction: sortState} : undefined;
			host.dispatchEvent(new CustomEvent('sortChange', {
				detail: detail, bubbles: true
			}));
		});
		sortableHeaders.push(header.children[0]);
	}

	const handleResizableHeaders = headers => {
		// only first run will iterate over whole grid
		resizeObserver = new ResizeObserver(debounce(entries => {
			for (const entry of entries) {
				const columnElements =  host.querySelectorAll('[column="' + entry.target.getAttribute('column') + '"]');
				for (const columnEl of columnElements) {
					columnEl.style.width = entry.contentRect.width + 'px';
				}
			}
		}, 200));
		for (let header of headers) {
			resizeObserver.observe(header);
		}
	}

	const debounce = (func, wait, immediate) => {
		let timeout;
		return function() {
			const context = this, args = arguments;
			const later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			const callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	};

	const dispatchPageEvent = e => {
		host.dispatchEvent(new CustomEvent('pageChange', {
			detail: {pageNumber: e.detail.pageNumber}, bubbles: true
		}));
	};

	onDestroy(() => {
		if(resizeObserver) {
			resizeObserver.disconnect();
		}
	});
	
</script>