/**
 * @injectHTML
 * https://github.com/whatwg/html/issues/6226
 * which leads to https://github.com/WICG/webcomponents/issues/59
 */
export class ZooGrid extends HTMLElement {
	constructor() {
		super();
		const headerSlot = this.shadowRoot.querySelector('slot[name="headercell"]');
		headerSlot.addEventListener('slotchange', this.debounce(() => {
			const headers = headerSlot.assignedElements();
			this.style.setProperty('--grid-column-num', headers.length);
			headers.forEach((header, i) => {
				header.setAttribute('column', i+1);
				header.setAttribute('role', 'columnheader');
			});
			if (this.hasAttribute('reorderable')) {
				headers.forEach(header => this.handleDraggableHeader(header));
			}
		}));
		const rowSlot = this.shadowRoot.querySelector('slot[name="row"]');
		rowSlot.addEventListener('slotchange', this.debounce(() => {
			rowSlot.assignedElements().forEach(row => {
				row.setAttribute('role', 'row');
				[...row.children].forEach((child, i) => {
					child.setAttribute('column', i+1);
					child.setAttribute('role', 'cell');
				});
			});
		}));
		this.addEventListener('sortChange', e => {
			if (this.prevSortedHeader && !e.target.isEqualNode(this.prevSortedHeader)) {
				this.prevSortedHeader.removeAttribute('sortstate');
			}
			this.prevSortedHeader = e.target;
		});
	}

	static get observedAttributes() {
		return ['currentpage', 'maxpages', 'resizable', 'reorderable', 'prev-page-title', 'next-page-title'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'resizable' && this.hasAttribute('resizable')) {
			this.resizeObserver = this.resizeObserver || new ResizeObserver(this.debounce(this.resizeCallback.bind(this)));
			this.shadowRoot.querySelector('slot[name="headercell"]').assignedElements().forEach(header => this.resizeObserver.observe(header));
		} else if (attrName == 'reorderable' && this.hasAttribute('reorderable')) {
			this.shadowRoot.querySelector('slot[name="headercell"]').assignedElements().forEach(header => this.handleDraggableHeader(header));
		} else if (['maxpages', 'currentpage', 'prev-page-title', 'next-page-title'].includes(attrName)) {
			this.shadowRoot.querySelector('zoo-paginator').setAttribute(attrName, newVal);
		}
	}
	resizeCallback(entries) {
		entries.forEach(entry => {
			const columnNum = entry.target.getAttribute('column');
			const width = entry.contentRect.width;
			this.querySelectorAll(`[column="${columnNum}"]`)
				.forEach(columnEl => columnEl.style.width = `${width}px`);
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

		header.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', header.getAttribute('column')));
		// drag enter fires before dragleave, so stagger this function
		header.addEventListener('dragenter', this.debounce(() => {
			header.classList.add('drag-over');
			this.prevDraggedOverHeader = header;
		}));
		header.addEventListener('dragleave', () => header.classList.remove('drag-over'));
		header.addEventListener('drop', e => {
			this.prevDraggedOverHeader.classList.remove('drag-over');
			const sourceColumn = e.dataTransfer.getData('text');
			const targetColumn = e.target.getAttribute('column');
			if (targetColumn == sourceColumn) return;
			// move columns
			this.querySelectorAll(`[column="${sourceColumn}"]`).forEach(source => {
				const target = source.parentElement.querySelector(`[column="${targetColumn}"]`);
				targetColumn > sourceColumn ? target.after(source) : target.before(source);
			});
			// reassign indexes for row cells
			this.shadowRoot.querySelector('slot[name="row"]').assignedElements()
				.forEach(row => [...row.children].forEach((child, i) => child.setAttribute('column', i+1)));
		});
	}

	disconnectedCallback() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	}
}

window.customElements.define('zoo-grid', ZooGrid);