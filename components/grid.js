/**
 * @injectHTML
 * https://github.com/whatwg/html/issues/6226
 * which leads to https://github.com/WICG/webcomponents/issues/59
 */
class ZooGrid extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.box,.header-row{min-width:inherit}:host{contain:layout}.box{position:relative;max-height:inherit;max-width:inherit;min-height:inherit}.loading-shade{display:none;position:absolute;left:0;top:0;right:0;z-index:9998;justify-content:center;height:100%;background:rgba(0,0,0,.15);pointer-events:none}.header-row,zoo-paginator{z-index:2;box-sizing:border-box;background:#fff}:host([loading]) .loading-shade{display:flex}.header-row{font-weight:600;color:#555}.header-row,::slotted([slot=row]){display:grid;grid-template-columns:var(--grid-column-sizes,repeat(var(--grid-column-num),minmax(50px,1fr)));padding:5px 10px;border-bottom:1px solid rgba(0,0,0,.2);min-height:50px;font-size:14px;line-height:20px}::slotted([slot=row]){overflow:visible;align-items:center;box-sizing:border-box}:host([resizable]) .header-row,:host([resizable]) ::slotted([slot=row]){display:flex}:host([resizable]) ::slotted([slot=headercell]){overflow:auto;resize:horizontal;height:inherit}::slotted(.drag-over){box-shadow:inset 0 0 1px 1px rgba(0,0,0,.4)}::slotted([slot=row][column]){align-items:center}:host([stickyheader]) .header-row{top:0;position:sticky}::slotted([slot=row]:nth-child(odd)){background:#f2f3f4}::slotted([slot=row]:focus),::slotted([slot=row]:hover){background:#e6e6e6}::slotted([slot=norecords]){color:var(--warning-dark);grid-column:span var(--grid-column-num);text-align:center;padding:10px 0}zoo-paginator{display:flex;position:sticky;bottom:0;width:100%;justify-content:flex-end;padding:10px;border-top:1px solid #e6e6e6;--paginator-position:sticky;--right:10px}::slotted(zoo-select){margin-right:20px}</style><div class="box"><div class="loading-shade"><zoo-spinner></zoo-spinner></div><div class="header-row"><slot name="headercell"></slot></div><slot name="row"></slot><slot name="norecords"></slot><zoo-paginator><slot name="pagesizeselector" slot="pagesizeselector"></slot></zoo-paginator></div>`;
	}

	// TODO in v9 remove currentpage and maxpages and use only paginator for that
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
		this.addEventListener('sortChange', e => this.handleSortChange(e));
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
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
		header.addEventListener('dragenter', this.debounce(() => header.classList.add('drag-over')));
		header.addEventListener('dragleave', () => header.classList.remove('drag-over'));
		header.addEventListener('drop', e => this.handleDrop(e));
	}

	handleDrop(e) {
		this.shadowRoot.querySelector('slot[name="headercell"]').assignedElements().forEach(h => h.classList.remove('drag-over'));
		const sourceColumn = e.dataTransfer.getData('text');
		const targetColumn = e.target.getAttribute('column');
		if (targetColumn == sourceColumn) return;
		// move columns
		this.querySelectorAll(`[column="${sourceColumn}"]`).forEach(source => {
			const target = source.parentElement.querySelector(`[column="${targetColumn}"]`);
			targetColumn > sourceColumn ? target.after(source) : target.before(source);
		});
		// reassign indexes for row cells
		const allRows = this.shadowRoot.querySelector('slot[name="row"]').assignedElements();
		allRows.forEach(row => [].forEach.call(row.children, (child, i) => child.setAttribute('column', i+1)));
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

export { ZooGrid };
//# sourceMappingURL=grid.js.map
