/**
 * @injectHTML
 */
export default class GridHeader extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.addEventListener('dragend', () => this.removeAttribute('draggable'));
		this.shadowRoot.querySelector('.swap').addEventListener('mousedown', () => this.setAttribute('draggable', true));
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
		this.dispatchEvent(new CustomEvent('sortChange', {detail: {sortState: this.getAttribute('sortstate'), header: this}, bubbles: true}));
	}
}

window.customElements.define('zoo-grid-header', GridHeader);