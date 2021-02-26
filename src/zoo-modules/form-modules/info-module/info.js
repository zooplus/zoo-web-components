/**
 * @injectHTML
 */
export class InfoMessage extends HTMLElement {
	constructor() {
		super();
		this.shadowRoot.querySelector('slot').addEventListener('slotchange', e => {
			e.target.assignedElements({ flatten: true }).length > 0 ? this.setAttribute('shown', '') : this.removeAttribute('shown');
		});
	}
}
window.customElements.define('zoo-info', InfoMessage);