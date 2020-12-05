/**
 * @injectHTML
 */
export default class GridHeader extends HTMLElement {
	constructor() {
		super();
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
		} else if (this.sortState == 'asc') {
			this.sortState = undefined;
		}
		this.shadowRoot.querySelector('.arrow').sortState = this.sortState;
		const host = this.shadowRoot.host;
		host.dispatchEvent(new CustomEvent('sortChange', {detail: {sortState: this.sortState, header: host}, bubbles: true}));
	}

	toggleHostDraggable() {
		this.shadowRoot.host.setAttribute('draggable', true);
	}
}

window.customElements.define('zoo-grid-header', GridHeader);