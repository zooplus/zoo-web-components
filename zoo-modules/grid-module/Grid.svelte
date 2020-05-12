<svelte:options tag="zoo-grid"></svelte:options>
<div class="box" bind:this={gridRoot}>
	{#if loading}
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

	.box {
		position: relative;
		max-height: inherit;
		max-width: inherit;
		min-height: inherit;
		min-width: inherit;
		overflow: auto;
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
		grid-template-columns: repeat(var(--grid-columns-num), minmax(50px, 1fr));
		padding: 10px;
		border-bottom: 1px solid rgba(0,0,0, 0.2);
		min-height: 40px;
		font-size: $p1-size;
		line-height: $p1-line-height;
	}

	:host([resizable]) {
		.header-row, ::slotted(*[slot="row"]) {
			display: flex;
			padding: 10px;
			border-bottom: 1px solid rgba(0,0,0, 0.2);
			min-height: 50px;
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
	let applyResizeLogic = false;
	onMount(() => {
		headerCellSlot.addEventListener("slotchange", () => {
			host = gridRoot.getRootNode().host;
			const headers = headerCellSlot.assignedNodes();
			gridRoot.style.setProperty('--grid-columns-num', headers.length);
			if (host.hasAttribute('resizable')) {
				applyResizeLogic = true;
			}
			handleHeaders(headers, host);
		});

		rowSlot.addEventListener("slotchange", () => {
			const exampleRow = rowSlot.assignedNodes()[0];
			const minWidth = window.getComputedStyle(exampleRow).getPropertyValue('min-width');
			if (applyResizeLogic) {
				const allRows = rowSlot.assignedNodes();
				for (const row of allRows) {
					let i = 1;
					for (const child of row.children) {
						child.setAttribute('column', i);
						child.style.flexGrow = 1;
						i++;
					}
				}
			}
		});
	});

	const handleHeaders = (headers, host) => {
		let i = 1;
		for (let header of headers) {
			header.classList.add('header-cell');
			if (applyResizeLogic) {
				header.style.flexGrow = 1;
				header.setAttribute('column', i);
				i++;
			}
			if (header.hasAttribute('sortable')) {
				handleSortableHeader(header);
			}
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