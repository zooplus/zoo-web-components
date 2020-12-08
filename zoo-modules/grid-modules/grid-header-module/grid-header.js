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
	}

	handleSortClick() {
		if (!this.hasAttribute('sortstate')) {
			this.setAttribute('sortstate', 'desc');
		} else if (this.getAttribute('sortstate') == 'desc') {
			this.setAttribute('sortstate', 'asc');
		} else if (this.getAttribute('sortstate') == 'asc') {
			this.removeAttribute('sortstate');
		}
		const host = this.shadowRoot.host;
		host.dispatchEvent(new CustomEvent('sortChange', {detail: {sortState: this.getAttribute('sortstate'), header: host}, bubbles: true}));
	}

	toggleHostDraggable() {
		this.shadowRoot.host.setAttribute('draggable', true);
	}
}

window.customElements.define('zoo-grid-header', GridHeader);