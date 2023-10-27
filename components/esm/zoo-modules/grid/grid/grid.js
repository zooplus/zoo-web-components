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

class ZooGrid extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout;position:relative;display:block}.loading-shade{display:none;position:absolute;left:0;top:0;right:0;z-index:var(--zoo-grid-z-index,9998);justify-content:center;height:100%;background:rgb(0 0 0 / 15%);pointer-events:none}.footer,.header-row{z-index:2;background:#fff;box-sizing:border-box}:host([loading]) .loading-shade{display:flex}.header-row{min-width:inherit;font-weight:600;color:#555}.header-row,::slotted([slot=row]){display:grid;grid-template-columns:var(--grid-column-sizes,repeat(var(--grid-column-num),minmax(50px,1fr)));padding:5px 10px;border-bottom:1px solid;min-height:50px;font-size:14px;line-height:20px}::slotted([slot=row]){overflow:visible;align-items:center;box-sizing:border-box}:host([resizable]){--zoo-grid-row-display:flex}:host([resizable]) .header-row,:host([resizable]) ::slotted([slot=row]){display:flex}:host([resizable]) ::slotted([slot=headercell]){overflow:auto;resize:horizontal;height:inherit}::slotted(.drag-over){box-shadow:inset 0 0 1px 1px rgb(0 0 0 / 40%)}:host([stickyheader]) .header-row{top:var(--grid-stickyheader-position-top,0);position:sticky}::slotted([slot=row]:nth-child(odd)){background:#f2f3f4}::slotted([slot=row]:focus),::slotted([slot=row]:hover){background:var(--item-hovered,#e6e6e6)}::slotted([slot=norecords]){color:var(--warning-dark);grid-column:span var(--grid-column-num);text-align:center;padding:10px 0}.footer{display:flex;position:sticky;bottom:0;width:100%;border-top:1px solid #e6e6e6;padding:10px}slot[name=footer-content]{display:flex;flex-grow:1}::slotted([slot=footer-content]){justify-self:flex-start}zoo-paginator{position:sticky;right:10px;justify-content:flex-end}slot[name=pagesizeselector]{display:block;margin-right:20px}</style><div class="loading-shade"><zoo-spinner></zoo-spinner></div><div class="header-row" role="row"><slot name="headercell"></slot></div><slot name="row" role="rowgroup"></slot><slot name="norecords"></slot><div class="footer"><slot name="footer-content"></slot><zoo-paginator><slot name="pagesizeselector" slot="pagesizeselector"></slot></zoo-paginator></div>`;
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

export { ZooGrid };
//# sourceMappingURL=grid.js.map
