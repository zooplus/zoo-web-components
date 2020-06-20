class GridHeader extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		let replaceMe;
	}

	connectedCallback() {
		const host = this.shadowRoot.host;
		host.addEventListener('dragend', () => host.removeAttribute('draggable'));
		this.shadowRoot.querySelector('.swap').addEventListener('mousedown', () => this.toggleHostDraggable());
		this.shadowRoot.querySelector('.arrow').addEventListener('click', () => this.handleSortClick());
		this.sortState = undefined;
	}

	handleSortClick() {
		if (!this.sortState) {
			this.sortState = 'desc';
		} else if (this.sortState == 'desc') {
			this.sortState = 'asc';
		} else if (this.sortState = 'asc') {
			this.sortState = undefined;
		}
		this.shadowRoot.querySelector('.arrow').sortState = this.sortState;
		const host = this.shadowRoot.host;
		host.dispatchEvent(new CustomEvent('sortChange', {detail: {sortState: this.sortState, header: host}, bubbles: true}));
	}

	toggleHostDraggable() {
		this.shadowRoot.host.setAttribute('draggable', true);
	}
	static get observedAttributes() {
		return ['sortState', 'sortable', 'reorderable'];
	}
	get sortState() {
		return this.getAttribute('sortState');
	}
	set sortState(sortState) {
		if (sortState) {
			this.setAttribute('sortState', sortState);
		} else {
			this.removeAttribute('sortState');
		}
	}
	get sortable() {
		return this.getAttribute('sortable');
	}
	set sortable(sortable) {
		if (sortable) {
			this.setAttribute('sortable', sortable);
		} else {
			this.removeAttribute('sortable');
		}
	}
	get reorderable() {
		return this.getAttribute('reorderable');
	}
	set reorderable(reorderable) {
		if (reorderable) {
			this.setAttribute('reorderable', reorderable);
		} else {
			this.removeAttribute('reorderable');
		}
	}
}

window.customElements.define('zoo-grid-header', GridHeader);