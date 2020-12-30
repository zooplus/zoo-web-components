/**
 * @injectHTML
 */
export class InfoMessage extends HTMLElement {
	constructor() {
		super();
		this.setAttribute('hidden', '');
		this.shadowRoot.querySelector('slot').addEventListener('slotchange', e => {
			const nodes = e.target.assignedElements();
			[...nodes].some(n => n.tagName !== 'SLOT') && this.removeAttribute('hidden');
		});
	}
}
window.customElements.define('zoo-info', InfoMessage);