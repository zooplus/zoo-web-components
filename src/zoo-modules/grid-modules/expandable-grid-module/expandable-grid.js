/**
 * @injectHTML
 * https://github.com/whatwg/html/issues/6226
 * which leads to https://github.com/WICG/webcomponents/issues/59
 */
import { debounce } from '../../../../../zoo-web-components/src/zoo-modules/helpers/debounce';

export class ZooExpandableGrid extends HTMLElement {
	constructor() {
		super();

		this.registerHeaderSlotChangeEvent();
		this.registerRowsSlotChangeEvent();
		this.registerSortChangeEvent();
	}

	static get observedAttributes() {
		return ['currentpage', 'maxpages', 'resizable', 'reorderable', 'prev-page-title', 'next-page-title'];
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'resizable' && this.hasAttribute('resizable')) {
			this.resizeObserver = this.resizeObserver || new ResizeObserver(debounce(this.resizeCallback.bind(this)));
			this.headerSlotElements.forEach(header => this.resizeObserver.observe(header));
			this.expandableRowsElements.forEach(row => row.setAttribute('resizable', true));
		} else if (attrName == 'reorderable' && this.hasAttribute('reorderable')) {
			this.headerSlotElements.forEach(header => this.handleDraggableHeader(header));
		} else if (['maxpages', 'currentpage', 'prev-page-title', 'next-page-title'].includes(attrName)) {
			this.shadowRoot.querySelector('zoo-paginator').setAttribute(attrName, newVal);
		}
	}

	registerHeaderSlotChangeEvent() {
		this.headerSlot.addEventListener('slotchange', debounce(() => {
			this.style.setProperty('--grid-column-num', this.headerSlotElements.length);
			this.setColumnsAndRoleAttrs(this.headerSlotElements, 'columnheader');
			this.handleReorderableAttribute();
		}));
	}

	registerRowsSlotChangeEvent() {
		this.expandableRows.addEventListener('slotchange', debounce(() => {
			this.expandableRowsElements.forEach(row => {
				const rowDetails = row.shadowRoot.querySelector('slot[name="row-details"]').assignedElements()[0];
				rowDetails.setAttribute('role', 'row');
				this.setColumnsAndRoleAttrs([...rowDetails.children], 'cell');
			});
		}));
	}

	registerSortChangeEvent() {
		this.addEventListener('sortChange', e => {
			if (this.prevSortedHeader && !e.target.isEqualNode(this.prevSortedHeader)) {
				this.prevSortedHeader.removeAttribute('sortstate');
			}
			this.prevSortedHeader = e.target;
		});
	}

	resizeCallback(entries) {
		entries.forEach(entry => {
			const columnIndex = entry.target.getAttribute('column');
			const width = entry.contentRect.width;
			this.querySelectorAll(`[column="${columnIndex}"]`)
				.forEach(columnEl => {
					return columnEl.style.width = `${width}px`;
				});
		});
	}

	handleDraggableHeader(header) {
		// avoid attaching multiple eventListeners to the same element
		if (header.hasAttribute('reorderable')) {
			return;
		}

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

		if (targetColumn == sourceColumn) {
			return;
		}

		this.moveColumns(sourceColumn, targetColumn);
		this.reassignColumnIndexesAfterDrop();
	}

	moveColumns(sourceColumn, targetColumn) {
		this.querySelectorAll(`[column="${sourceColumn}"]`).forEach(source => {
			const target = source.parentElement.querySelector(`[column="${targetColumn}"]`);
			targetColumn > sourceColumn ? target.after(source) : target.before(source);
		});
	}

	reassignColumnIndexesAfterDrop() {
		this.expandableRowsElements.forEach(row => [
			...row.shadowRoot.querySelector('slot[name="row-details"]').assignedElements()[0].children
		].forEach((child, i) => child.setAttribute('column', i+1)));
	}

	handleReorderableAttribute() {
		if (this.hasAttribute('reorderable')) {
			this.headerSlotElements.forEach(header => this.handleDraggableHeader(header));
		}
	}

	setColumnsAndRoleAttrs(elements, role) {
		elements.forEach((element, i) => {
			element.setAttribute('column', i+1);
			element.setAttribute('role', role);
		});
	}

	disconnectedCallback() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	}

	get headerSlot() {
		return this.shadowRoot.querySelector('slot[name="headercell"]');
	}

	get headerSlotElements() {
		return this.headerSlot.assignedElements();
	}

	get expandableRows() {
		return this.shadowRoot.querySelector('slot[name="expandable-row"]');
	}

	get expandableRowsElements() {
		return this.expandableRows.assignedElements();
	}
}

window.customElements.define('zoo-expandable-grid', ZooExpandableGrid);