/**
 * @injectHTML
 */
class CollapsableListItem extends HTMLElement {
	constructor() {
		super();
	}
	static get observedAttributes() {
		return ['active'];
	}
	get active() {
		return this.hasAttribute('active');
	}
	set active(active) {
		if (active) {
			this.setAttribute('active', '');
		} else {
			this.removeAttribute('active');
		}
	}
}
window.customElements.define('zoo-collapsable-list-item', CollapsableListItem);