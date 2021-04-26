import { debounce } from '../../helpers/debounce.js';
import { Paginator } from '../../misc/paginator/paginator.js';
import { GridHeader } from '../grid-header/grid-header.js';
import { GridRow } from '../grid-row/grid-row.js';
import { registerComponents } from '../../common/register-components.js';
/**
 * @injectHTML
 * https://github.com/whatwg/html/issues/6226
 * which leads to https://github.com/WICG/webcomponents/issues/59
 */

export class ZooGrid extends HTMLElement {
	constructor() {
		super();
		registerComponents(Paginator, GridHeader, GridRow);
		const headerSlot = this.shadowRoot.querySelector('slot[name="headercell"]');
		headerSlot.addEventListener('slotchange', debounce(() => {
			const headers = headerSlot.assignedElements();
			this.style.setProperty('--grid-column-num', headers.length);
			headers.forEach((header, i) => {
				header.setAttribute('column', i+1);
				header.setAttribute('role', 'columnheader');
			});
			if (this.hasAttribute('reorderable')) {
				headers.forEach(header => this.handleDraggableHeader(header));
			}
			if (this.hasAttribute('resizable')) {
				this.handleResizableAttributeChange();
			}
		}));
		const rowSlot = this.shadowRoot.querySelector('slot[name="row"]');
		rowSlot.addEventListener('slotchange', debounce(() => {
			rowSlot.assignedElements().forEach(row => {
				row.setAttribute('role', 'row');
				if (row.tagName === 'ZOO-GRID-ROW') {
					[...row.querySelector('*[slot="row-details"]').children].forEach((child, i) => {
						child.setAttribute('column', i+1);
						child.setAttribute('role', 'cell');
					});
				} else {
					[...row.children].forEach((child, i) => {
						child.setAttribute('column', i+1);
						child.setAttribute('role', 'cell');
					});
				}
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
		if (attrName == 'resizable') {
			this.handleResizableAttributeChange();
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
			const columns = this.querySelectorAll(`[column="${columnNum}"]`);
			columns.forEach(columnEl => columnEl.style.width = `${width}px`);
		});
	}

	handleResizableAttributeChange() {
		if (this.hasAttribute('resizable')) {
			this.resizeObserver = this.resizeObserver || new ResizeObserver(debounce(this.resizeCallback.bind(this)));
			this.shadowRoot.querySelector('slot[name="headercell"]').assignedElements().forEach(header => this.resizeObserver.observe(header));
		}
	}

	handleDraggableHeader(header) {
		// avoid attaching multiple eventListeners to the same element
		if (header.hasAttribute('reorderable')) return;
		header.setAttribute('reorderable', '');
		header.setAttribute('ondragover', 'event.preventDefault()');
		header.setAttribute('ondrop', 'event.preventDefault()');

		header.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', header.getAttribute('column')));
		// drag enter fires before dragleave, so stagger this function
		header.addEventListener('dragenter', debounce(() => {
			header.classList.add('drag-over');
			this.prevDraggedOverHeader = header;
		}));
		header.addEventListener('dragleave', () => header.classList.remove('drag-over'));
		header.addEventListener('drop', e => this.handleDrop(e));
	}

	handleDrop(e) {
		this.prevDraggedOverHeader && this.prevDraggedOverHeader.classList.remove('drag-over');
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
			.forEach(row => {
				if (row.tagName === 'ZOO-GRID-ROW') {
					[...row.shadowRoot.querySelector('slot[name="row-details"]').assignedElements()[0].children]
						.forEach((child, i) => child.setAttribute('column', i+1));
				} else {
					[...row.children].forEach((child, i) => child.setAttribute('column', i+1));
				}
			});
	}

	disconnectedCallback() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	}
}

if (!window.customElements.get('zoo-grid')) {
	window.customElements.define('zoo-grid', ZooGrid);
}