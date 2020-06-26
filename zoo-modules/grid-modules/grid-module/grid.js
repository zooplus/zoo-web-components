/**
 * @injectHTML
 */
class Grid extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['currentpage', 'maxpages', 'loading', 'resizable', 'reorderable'];
	}
	get maxpages() {
		return this.getAttribute('maxpages');
	}
	set maxpages(maxpages) {
		if (maxpages) {
			this.setAttribute('maxpages', maxpages);
		} else {
			this.removeAttribute('maxpages');
		}
	}
	get currentpage() {
		return this.getAttribute('currentpage');
	}
	set currentpage(currentpage) {
		if (currentpage) {
			this.setAttribute('currentpage', currentpage);
		} else {
			this.removeAttribute('currentpage');
		}
	}
	get loading() {
		return this.hasAttribute('loading');
	}
	set loading(loading) {
		if (loading) {
			this.setAttribute('loading', loading);
		} else {
			this.removeAttribute('loading');
		}
	}

	connectedCallback() {
		const root = this.shadowRoot;
		const headerSlot = root.querySelector('slot[name="headercell"]');
		headerSlot.addEventListener('slotchange', () => {
			const headers = headerSlot.assignedNodes();
			this.style.setProperty('--grid-column-num', headers.length);
			this.handleHeaders(headers);
			if (this.hasAttribute('resizable')) {
				this.handleResizableHeaders();
				setTimeout(() => {
					this.shadowRoot.host.setAttribute('resizable-ready', true);
				});
			} else {
				this.shadowRoot.host.removeAttribute('resizable-ready');
			}
			if (this.hasAttribute('reorderable')) {
				this.handleDraggableHeaders();
			}
		});
		root.querySelector('slot[name="row"]').addEventListener('slotchange', () => this.assignColumnNumberToRows());
		root.querySelector('.box').addEventListener('sortChange', e => this.handleSortChange(e));
		const paginator = root.querySelector('zoo-grid-paginator')
		if (paginator) {
			paginator.addEventListener('pageChange', e => this.dispatchPageEvent(e));
		}
	}

	handleHeaders(headers) {
		let i = 1;
		for (let header of headers) {
			header.setAttribute('column', i);
			i++;
		}
	}

	assignColumnNumberToRows() {
		const allRows = this.shadowRoot.querySelector('slot[name="row"]').assignedNodes();
		for (const row of allRows) {
			let i = 1;
			const rowChildren = row.children;
			for (const child of rowChildren) {
				child.setAttribute('column', i);
				i++;
			}
		}
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (attrName == 'resizable') {
			if (this.hasAttribute('resizable')) {
				this.handleResizableHeaders();
				setTimeout(() => {
					this.shadowRoot.host.setAttribute('resizable-ready', true);
				});
			} else {
				this.shadowRoot.host.removeAttribute('resizable-ready');
			}
		}
		if (attrName == 'reorderable' && this.hasAttribute('reorderable')) {
			this.handleDraggableHeaders();
		}
		if (attrName == 'maxpages') {
			const paginator = this.shadowRoot.querySelector('zoo-grid-paginator');
			if (paginator) {
				paginator.maxpages = newVal;
			}
		}
		if (attrName == 'currentpage') {
			const paginator = this.shadowRoot.querySelector('zoo-grid-paginator');
			if (paginator) {
				paginator.currentpage = newVal;
			}
		}
	}
	handleResizableHeaders() {
		this.createResizeObserver();
		this.resizeObserver.disconnect();
		const headers = this.shadowRoot.querySelector('slot[name="headercell"]').assignedNodes();
		for (let header of headers) {
			this.resizeObserver.observe(header);
		}
	}
	createResizeObserver() {
		if (this.resizeObserver) return;
		this.resizeObserver = new ResizeObserver(this.debounce(entries => {
			requestAnimationFrame(() => {
				const host = this.shadowRoot.host;
				for (const entry of entries) {
					const columnNum = entry.target.getAttribute('column');
					const rowColumns = host.querySelectorAll(`:scope > [slot="row"] > [column="${columnNum}"]`);
					const headerColumn = host.querySelector(`:scope > [column="${columnNum}"]`);
					const elements = [...rowColumns, headerColumn];
					const width = entry.contentRect.width;
					
					for (const columnEl of elements) {
						columnEl.style.width = `${width}px`;
					}
				}
			});
		}, 10));
	}
	debounce(func, wait) {
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
	}

	handleDraggableHeaders() {
		const headers = this.shadowRoot.querySelector('slot[name="headercell"]').assignedNodes();
		const host = this.shadowRoot.host;
		for (let header of headers) {
			this.handleDraggableHeader(header, host);
		}
	}

	handleDraggableHeader(header, host) {
		// avoid attaching multiple eventListeners to the same element
		if (header.getAttribute('reorderable')) return;
		header.setAttribute('reorderable', true);
		header.setAttribute('ondragover', 'event.preventDefault()');
		header.setAttribute('ondrop', 'event.preventDefault()');

		header.addEventListener('dragstart', e => {
			this.classList.add('dragging');
			e.dataTransfer.setData("text/plain", header.getAttribute('column'));
		});
		header.addEventListener('dragend', e => {
			this.classList.remove('dragging');
			this.draggedOverHeader.classList.remove('drag-over');
		});
		header.addEventListener('dragenter', e => {
			// header is present and drag target is not its child -> some sibling of header
			if (this.draggedOverHeader && !this.draggedOverHeader.contains(e.target)) {
				this.draggedOverHeader.classList.remove('drag-over');
			}
			// already marked
			if (header.classList.contains('drag-over')) {
				return;
			}
			// dragging over a valid drop target or its child
			if (header == e.target || header.contains(e.target)) {
				header.classList.add('drag-over');
				this.draggedOverHeader = header;
			}
		});
		header.addEventListener('drop', e => {
			const sourceColumn = e.dataTransfer.getData('text');
			const targetColumn = e.target.getAttribute('column');
			if (targetColumn == sourceColumn) {
				return;
			}
			// move headers
			const sourceHeader = this.querySelector(`:scope > zoo-grid-header[column="${sourceColumn}"]`);
			if (targetColumn < sourceColumn) {
				e.target.parentNode.insertBefore(sourceHeader, e.target);
			} else {
				e.target.parentNode.insertBefore(e.target, sourceHeader);
			}
			// move rows
			const allRows = this.shadowRoot.querySelector('slot[name="row"]').assignedNodes();
			for (const row of allRows) {
				const sourceRowColumn = row.querySelector(`:scope > [column="${sourceColumn}"]`);
				const targetRowColumn = row.querySelector(`:scope > [column="${targetColumn}"]`);
				if (targetColumn < sourceColumn) {
					targetRowColumn.parentNode.insertBefore(sourceRowColumn, targetRowColumn);
				} else {
					targetRowColumn.parentNode.insertBefore(targetRowColumn, sourceRowColumn);
				}
			}
			this.assignColumnNumberToRows();
		});
	}

	dispatchPageEvent(e) {
		this.shadowRoot.host.dispatchEvent(new CustomEvent('pageChange', {
			detail: {pageNumber: e.detail.pageNumber}, bubbles: true
		}));
	};

	handleSortChange(e) {
		e.stopPropagation();
		const header = e.detail.header;
		const sortState = e.detail.sortState;
		if (this.prevSortedHeader && !header.isEqualNode(this.prevSortedHeader)) {
			this.prevSortedHeader.sortState = undefined;
		}
		this.prevSortedHeader = header;
		const detail = sortState ? {property: header.getAttribute('sortableproperty'), direction: sortState} : undefined;
		this.shadowRoot.host.dispatchEvent(new CustomEvent('sortChange', {
			detail: detail, bubbles: true
		}));
	}

	disconnectedCallback() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
	}
}

window.customElements.define('zoo-grid', Grid);