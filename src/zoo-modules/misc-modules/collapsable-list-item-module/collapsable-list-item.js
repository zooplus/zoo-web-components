/**
 * @injectHTML
 */
export class CollapsableListItem extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		const details = this.shadowRoot.querySelector('details');
		details.addEventListener('toggle', e => {
			this.shadowRoot.host.dispatchEvent(new CustomEvent('toggle', {detail: e.target.open, composed: true}));
		});
	}

	close() {
		this.shadowRoot.querySelector('details').open = false;
	}
}
window.customElements.define('zoo-collapsable-list-item', CollapsableListItem);