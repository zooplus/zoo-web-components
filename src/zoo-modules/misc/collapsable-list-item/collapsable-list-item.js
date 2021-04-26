/**
 * @injectHTML
 */
export class CollapsableListItem extends HTMLElement {
	constructor() {
		super();
		this.details = this.shadowRoot.querySelector('details');
		this.details.addEventListener('toggle', e => {
			this.shadowRoot.host.dispatchEvent(new CustomEvent('toggle', {detail: e.target.open, composed: true}));
		});
	}

	close() {
		this.details.open = false;
	}
}
if (!window.customElements.get('zoo-collapsable-list-item')) {
	window.customElements.define('zoo-collapsable-list-item', CollapsableListItem);
}