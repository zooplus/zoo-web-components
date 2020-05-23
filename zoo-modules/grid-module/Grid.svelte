<svelte:options tag="zoo-grid"></svelte:options>
<div class="box" bind:this={gridRoot}>
	{#if loading}
		<div class="loading-shade"></div>
		<zoo-spinner></zoo-spinner>
	{/if}
	<div class="header-row" on:sortChange="{e => handleSortChange(e)}">
		<slot name="headercell" bind:this={headerCellSlot}></slot>
	</div>
	<slot name="row" bind:this={rowSlot}></slot>
	<slot name="norecords"></slot>
	<slot name="paginator">
		<zoo-grid-paginator {currentpage} {maxpages} on:pageChange="{e => dispatchPageEvent(e)}">
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
	}

	.loading-shade {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 56px;
		z-index: 9998;
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
		grid-template-columns: var(--grid-column-sizes, repeat(var(--grid-column-num), minmax(50px, 1fr)));
		padding: 5px 10px;
		border-bottom: 1px solid rgba(0,0,0, 0.2);
		min-height: 50px;
		font-size: $p1-size;
		line-height: $p1-line-height;
	}

	:host([resizable]) {
		.header-row, ::slotted(*[slot="row"]) {
			display: flex;
		}

		::slotted(*[slot="headercell"]) {
			overflow: auto;
			resize: horizontal;
			height: inherit;
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

	::slotted(*[slot="headercell"]) {
		display: flex;
		align-items: center;
		flex-grow: 1;
	}

	::slotted(*[slot="row"]:nth-child(odd)) {
		background: $grey-ultralight;
	}

	::slotted(*[slot="row"]:hover) {
		background: $grey-light;
	}

	::slotted(*[slot="norecords"]) {
		color: var(--warning-mid, #{$warning-mid});
		grid-column: span var(--grid-column-num);
		text-align: center;
		padding: 10px 0;
	}

	zoo-grid-paginator {
		display: grid;
		position: sticky;
		grid-column: span var(--grid-column-num);
		bottom: 0;
		background: $white;
	}
</style>

<script>
	import { onMount, onDestroy } from 'svelte';
	export let currentpage = '';
	export let maxpages = '';
	export let loading = false;
	let gridRoot;
	let headerCellSlot;
	let rowSlot;
	let resizeObserver;
	let prevSortedHeader;
	let dragEventListenersInitialized = false;
	// sortable grid -> set min-width to set width
	// not sortable -> set --grid-column-sizes variable
	onMount(() => {
		headerCellSlot.addEventListener("slotchange", () => {
			const host = gridRoot.getRootNode().host;
			const headers = headerCellSlot.assignedNodes();
			host.style.setProperty('--grid-column-num', headers.length);
			host.style.setProperty('--grid-column-sizes', 'repeat(var(--grid-column-num), minmax(50px, 1fr))');
			handleHeaders(headers, host, host.hasAttribute('resizable'), host.hasAttribute('dragndrop'));
		});

		rowSlot.addEventListener("slotchange", () => {
			assignColumnNumberToRows();
		});
	});

	const handleHeaders = (headers, host, resizable, draggable) => {
		if (resizable) {
			if (!resizeObserver) {
				createResizeObserver(host);
			} else {
				resizeObserver.disconnect();
			}
		}
		let i = 1;
		for (let header of headers) {
			header.setAttribute('column', i);
			if (resizable) resizeObserver.observe(header);
			if (!dragEventListenersInitialized && draggable) handleDraggableHeader(header, host);
			i++;
		}
		dragEventListenersInitialized = true;
	}

	// todo currently it reverses the order from target column to source column
	// make it inject column before target and leave the order of the rest intact.
	const handleDraggableHeader = (header, host) => {
		header.addEventListener('dragstart', e => e.dataTransfer.setData("text/plain", header.getAttribute('column')));
		header.setAttribute('ondragover', 'event.preventDefault()');
		header.setAttribute('ondrop', 'event.preventDefault()');
		header.addEventListener('drop', e => {
			// replace headers
			const sourceColumn = e.dataTransfer.getData('text');
			const targetColumn = e.target.getAttribute('column');
			const sourceHeader = host.querySelector('zoo-grid-header[column="' + sourceColumn + '"]');
			if (targetColumn < sourceColumn) {
				e.target.parentNode.insertBefore(sourceHeader, e.target);
			} else if (targetColumn > sourceColumn) {
				e.target.parentNode.insertBefore(e.target, sourceHeader);
			}
			// replace rows
			const allRows = rowSlot.assignedNodes();
			for (const row of allRows) {
				const sourceRowColumn = row.querySelector('[column="' + sourceColumn + '"]');
				const targetRowColumn = row.querySelector('[column="' + targetColumn + '"]');
				if (targetColumn < sourceColumn) {
					targetRowColumn.parentNode.insertBefore(sourceRowColumn, targetRowColumn);
				} else if (targetColumn > sourceColumn) {
					targetRowColumn.parentNode.insertBefore(targetRowColumn, sourceRowColumn);
				}
			}
			assignColumnNumberToRows();
		});
	}

	const assignColumnNumberToRows = () => {
		const allRows = rowSlot.assignedNodes();
		for (const row of allRows) {
			let i = 1;
			for (const child of row.children) {
				child.setAttribute('column', i);
				i++;
			}
		}
	}

	const handleSortChange = e => {
		e.stopPropagation();
		const header = e.detail.header;
		const sortState = e.detail.sortState;
		if (prevSortedHeader && !header.isEqualNode(prevSortedHeader)) {
			prevSortedHeader.sortState = undefined;
		}
		prevSortedHeader = header;
		const detail = sortState ? {property: header.getAttribute('sortableproperty'), direction: sortState} : undefined;
		gridRoot.getRootNode().host.dispatchEvent(new CustomEvent('sortChange', {
			detail: detail, bubbles: true
		}));
	}

	const createResizeObserver = host => {
		resizeObserver = new ResizeObserver(debounce(entries => {
			for (const entry of entries) {
				const columnElements =  host.querySelectorAll('[column="' + entry.target.getAttribute('column') + '"]');
				const width = entry.contentRect.width;
				requestAnimationFrame(() => {
					for (const columnEl of columnElements) {
						columnEl.style.width = width + 'px';
					}
				});
			}
		}, 250));
	}

	const debounce = (func, wait) => {
		let timeout;
		return function() {
			const later = () => {
				timeout = null;
				func.apply(this, arguments);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (!timeout) func.apply(this, arguments);
		};
	};

	const dispatchPageEvent = e => {
		const host = gridRoot.getRootNode().host;
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