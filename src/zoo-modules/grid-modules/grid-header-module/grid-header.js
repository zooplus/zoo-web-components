/**
 * @injectHTML
 */
export class GridHeader extends HTMLElement {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['sorttitle', 'swaptitle'];
	}

	connectedCallback() {
		this.addEventListener('dragend', () => this.removeAttribute('draggable'));
		this.shadowRoot.querySelector('.swap').addEventListener('mousedown', () => this.setAttribute('draggable', true));
		this.shadowRoot.querySelector('.sort').addEventListener('click', () => this.handleSortClick());
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
		if (attrName === 'sorttitle') {
			this.shadowRoot.querySelector('zoo-arrow-icon').setAttribute('title', newVal);
			this.shadowRoot.querySelector('.sort').setAttribute('title', newVal);
		} else if (attrName === 'swaptitle') {
			this.shadowRoot.querySelector('.swap title').innerHTML = newVal;
			this.shadowRoot.querySelector('.swap').setAttribute('title', newVal);
		}
	}
}

window.customElements.define('zoo-grid-header', GridHeader);