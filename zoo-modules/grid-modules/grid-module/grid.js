/**
 * @injectHTML
 * https://github.com/whatwg/html/issues/6226
 * which leads to https://github.com/WICG/webcomponents/issues/59
 */
export default class ZooGrid extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['currentpage', 'maxpages', 'resizable', 'reorderable'];
	}

	connectedCallback() {
		const root = this.shadowRoot;
		const headerSlot = root.querySelector('slot[name="headercell"]');
		headerSlot.addEventListener('slotchange', this.debounce(() => {
			const headers = headerSlot.assignedElements();
			this.style.setProperty('--grid-column-num', headers.length);
			headers.forEach((header, i) => header.setAttribute('column', i+1));
			if (this.hasAttribute('reorderable')) {
				headers.forEach(header => this.handleDraggableHeader(header));
			}
		}));
		const rowSlot = root.querySelector('slot[name="row"]');
		rowSlot.addEventListener('slotchange', this.debounce(() => {
			rowSlot.assignedElements().forEach(row => [].forEach.call(row.children, (child, i) => child.setAttribute('column', i+1)));
		}));
		root.querySelector('.box').addEventListener('sortChange', e => this.handleSortChange(e));
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		// TODO resizable attr is fucking up something
		if (attrName == 'resizable' && this.hasAttribute('resizable')) {
			this.resizeObserver = this.resizeObserver || new ResizeObserver(this.debounce(this.resizeCallback.bind(this)));
			this.resizeObserver.disconnect();
			this.shadowRoot.querySelector('slot[name="headercell"]').assignedElements().forEach(header => this.resizeObserver.observe(header));
		}
		if (attrName == 'reorderable' && this.hasAttribute('reorderable')) {
			const headers = this.shadowRoot.querySelector('slot[name="headercell"]').assignedElements();
			headers.forEach(header => this.handleDraggableHeader(header));
		}
		if (attrName == 'maxpages' || attrName == 'currentpage') {
			const paginator = this.shadowRoot.querySelector('zoo-paginator');
			if (paginator && !paginator.hasAttribute(attrName)) {
				paginator.setAttribute(attrName, newVal);
			}
		}
	}
	resizeCallback(entries) {
		entries.forEach(entry => {
			const columnNum = entry.target.getAttribute('column');
			const width = entry.contentRect.width;
			const rowColumns = this.querySelectorAll(`[slot="row"] > [column="${columnNum}"]`);
			const headerColumn = this.querySelector(`[column="${columnNum}"]`);
			[...rowColumns, headerColumn].forEach(columnEl => columnEl.style.width = `${width}px`);
		});
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

	handleDraggableHeader(header) {
		// avoid attaching multiple eventListeners to the same element
		if (header.hasAttribute('reorderable')) return;
		header.setAttribute('reorderable', '');
		header.setAttribute('ondragover', 'event.preventDefault()');
		header.setAttribute('ondrop', 'event.preventDefault()');

		header.addEventListener('dragstart', e => {
			this.classList.add('dragging');
			e.dataTransfer.setData('text/plain', header.getAttribute('column'));
		});
		header.addEventListener('dragend', () => {
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
			const sourceHeader = this.querySelector(`zoo-grid-header[column="${sourceColumn}"]`);
			if (targetColumn < sourceColumn) {
				e.target.parentNode.insertBefore(sourceHeader, e.target);
			} else {
				e.target.parentNode.insertBefore(e.target, sourceHeader);
			}
			// move rows
			const allRows = this.shadowRoot.querySelector('slot[name="row"]').assignedElements();
			allRows.forEach(row => {
				const sourceRowColumn = row.querySelector(`[column="${sourceColumn}"]`);
				const targetRowColumn = row.querySelector(`[column="${targetColumn}"]`);
				if (targetColumn < sourceColumn) {
					targetRowColumn.parentNode.insertBefore(sourceRowColumn, targetRowColumn);
				} else {
					targetRowColumn.parentNode.insertBefore(targetRowColumn, sourceRowColumn);
				}
				sourceRowColumn.setAttribute('column', targetColumn);
				targetRowColumn.setAttribute('column', sourceColumn);
			});
		});
	}

	handleSortChange(e) {
		if (this.prevSortedHeader && !e.target.isEqualNode(this.prevSortedHeader)) {
			this.prevSortedHeader.removeAttribute('sortstate');
		}
		this.prevSortedHeader = e.target;
	}

	disconnectedCallback() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
	}
}

window.customElements.define('zoo-grid', ZooGrid);