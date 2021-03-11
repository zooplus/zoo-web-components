/**
 * @injectHTML
 */
export class GridHeader extends HTMLElement {
	constructor() {
		super();
		this.addEventListener('dragend', () => this.removeAttribute('draggable'));
		this.shadowRoot.querySelector('.swap').addEventListener('mousedown', () => this.setAttribute('draggable', true));
		this.shadowRoot.querySelector('.sort').addEventListener('click', () => this.handleSortClick());
	}

	static get observedAttributes() {
		return ['sort-title', 'swap-title'];
	}

	handleSortClick() {
		if (!this.hasAttribute('sortstate')) {
			this.setAttribute('sortstate', 'desc');
		} else if (this.getAttribute('sortstate') == 'desc') {
			this.setAttribute('sortstate', 'asc');
		} else if (this.getAttribute('sortstate') == 'asc') {
			this.removeAttribute('sortstate');
		}
		const detail = this.hasAttribute('sortstate')
			? { property: this.getAttribute('sortableproperty'), direction: this.getAttribute('sortstate') }
			: undefined; 
		this.dispatchEvent(new CustomEvent('sortChange', {detail: detail, bubbles: true, composed: true }));
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName === 'sort-title') {
			this.shadowRoot.querySelector('zoo-arrow-icon').setAttribute('title', newVal);
		} else if (attrName === 'swap-title') {
			this.shadowRoot.querySelector('.swap title').textContent = newVal;
			this.shadowRoot.querySelector('.swap').setAttribute('title', newVal);
		}
	}
}

window.customElements.define('zoo-grid-header', GridHeader);