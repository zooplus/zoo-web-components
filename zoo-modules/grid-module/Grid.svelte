<svelte:options tag="zoo-grid"/>
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
	@import 'variables';

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

	.header-row {
		min-width: inherit;
		font-size: 12px;
		line-height: 16px;
		font-weight: 600;
		color: #555555;
		box-sizing: border-box;
		z-index: 1;
	}

	.header-row, ::slotted(*[slot="row"]) {
		display: grid;
		grid-template-columns: var(--grid-column-sizes, repeat(var(--grid-column-num), minmax(50px, 1fr)));
		padding: 5px 10px;
		border-bottom: 1px solid rgba(0,0,0, 0.2);
		min-height: 50px;
		font-size: 14px;
		line-height: 20px;
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

	:host(.dragging) ::slotted(*[ondrop]) {
		border-radius: 3px;
		box-shadow: inset 0px 0px 1px 1px rgba(0,0,0,.1);
	}

	:host(.dragging) ::slotted(.drag-over) {
		box-shadow: inset 0px 0px 1px 1px rgba(0,0,0,.4);
	}

	::slotted(*[slot="row"]) {
		overflow: visible;
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

	::slotted(*[slot="headercell"]) {
		display: flex;
		align-items: center;
		flex-grow: 1;
	}

	::slotted(*[slot="row"]:nth-child(odd)) {
		background: #F2F3F4;
	}

	::slotted(*[slot="row"]:hover), ::slotted(*[slot="row"]:focus) {
		background: #E6E6E6;
	}

	::slotted(*[slot="norecords"]) {
		color: var(--warning-dark, #{$warning-dark});
		grid-column: span var(--grid-column-num);
		text-align: center;
		padding: 10px 0;
	}

	zoo-grid-paginator {
		display: grid;
		position: sticky;
		grid-column: span var(--grid-column-num);
		bottom: 0;
		background: #FFFFFF;
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
	let mutationObserver;
	let prevSortedHeader;
	let draggedOverHeader;
	// sortable grid -> set min-width to set width
	// not sortable -> set --grid-column-sizes variable
	onMount(() => {
		const host = gridRoot.getRootNode().host;
		mutationObserver = new MutationObserver(mutationHandler);
		mutationObserver.observe(host, { attributes: true, childList: false, subtree: false });
		headerCellSlot.addEventListener('slotchange', () => {
			const headers = headerCellSlot.assignedNodes();
			host.style.setProperty('--grid-column-num', headers.length);
			host.style.setProperty('--grid-column-sizes', 'repeat(var(--grid-column-num), minmax(50px, 1fr))');
			handleHeaders(headers);
		});

		rowSlot.addEventListener('slotchange', assignColumnNumberToRows);
	});

	const mutationHandler = mutationsList => {
		for(let mutation of mutationsList) {
			const attrName = mutation.attributeName;
			if (attrName == 'resizable' || attrName == 'reorderable') {
				const host = gridRoot.getRootNode().host;
				const headers = headerCellSlot.assignedNodes();
				if (host.hasAttribute('resizable')) {
					handleResizableHeaders(headers, host);
				}
				if (host.hasAttribute('reorderable')) {
					handleDraggableHeaders(headers, host);
				}
			}
		}
	};

	const handleHeaders = headers => {
		let i = 1;
		for (let header of headers) {
			header.setAttribute('column', i);
			i++;
		}
	}

	const handleResizableHeaders = (headers, host) => {
		createResizeObserver(host);
		resizeObserver.disconnect();
		for (let header of headers) {
			resizeObserver.observe(header);
		}
	}

	const handleDraggableHeaders = (headers, host) => {
		for (let header of headers) {
			handleDraggableHeader(header, host);
		}
	}

	const handleDraggableHeader = (header, host) => {
		// avoid attaching multiple eventListeners to the same element
		if (header.getAttribute('reorderable')) return;
		header.setAttribute('reorderable', true);
		header.setAttribute('ondragover', 'event.preventDefault()');
		header.setAttribute('ondrop', 'event.preventDefault()');

		header.addEventListener('dragstart', e => {
			host.classList.add('dragging');
			e.dataTransfer.setData("text/plain", header.getAttribute('column'));
		});
		header.addEventListener('dragend', e => {
			host.classList.remove('dragging');
			draggedOverHeader.classList.remove('drag-over');
		});
		header.addEventListener('dragenter', e => {
			// header is present and drag target is not its child -> some sibling of header
			if (draggedOverHeader && !draggedOverHeader.contains(e.target)) {
				draggedOverHeader.classList.remove('drag-over');
			}
			// already marked
			if (header.classList.contains('drag-over')) {
				return;
			}
			// dragging over a valid drop target or its child
			if (header == e.target || header.contains(e.target)) {
				header.classList.add('drag-over');
				draggedOverHeader = header;
			}
		});
		header.addEventListener('drop', e => {
			const sourceColumn = e.dataTransfer.getData('text');
			const targetColumn = e.target.getAttribute('column');
			if (targetColumn == sourceColumn) {
				return;
			}
			// move headers
			const sourceHeader = host.querySelector(':scope > zoo-grid-header[column="' + sourceColumn + '"]');
			if (targetColumn < sourceColumn) {
				e.target.parentNode.insertBefore(sourceHeader, e.target);
			} else {
				e.target.parentNode.insertBefore(e.target, sourceHeader);
			}
			// move rows
			const allRows = rowSlot.assignedNodes();
			for (const row of allRows) {
				const sourceRowColumn = row.querySelector(':scope > [column="' + sourceColumn + '"]');
				const targetRowColumn = row.querySelector(':scope > [column="' + targetColumn + '"]');
				if (targetColumn < sourceColumn) {
					targetRowColumn.parentNode.insertBefore(sourceRowColumn, targetRowColumn);
				} else {
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
			const rowChildren = row.children;
			for (const child of rowChildren) {
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
		if (resizeObserver) return;
		resizeObserver = new ResizeObserver(debounce(entries => {
			requestAnimationFrame(() => {
				for (const entry of entries) {
					const columnNum = entry.target.getAttribute('column');
					const rowColumns = host.querySelectorAll(':scope > [slot="row"] > [column="' + columnNum + '"] ');
					const headerColumn = host.querySelector(':scope > [column="' + columnNum + '"]');
					const elements = [...rowColumns, headerColumn];
					const width = entry.contentRect.width;
					
					for (const columnEl of elements) {
						columnEl.style.width = width + 'px';
					}
				}
			});
		}, 0));
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
			resizeObserver = null;
		}
		mutationObserver.disconnect();
		mutationObserver = null;
	});
	
</script>