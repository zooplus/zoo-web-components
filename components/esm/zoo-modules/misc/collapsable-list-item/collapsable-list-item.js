/**
 * @injectHTML
 */
class CollapsableListItem extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{padding:0 10px;display:flex;flex-direction:column}:host([border-visible]){margin:8px 0}details{padding:10px}:host([border-visible]) details{color:var(--primary-dark);border:1px solid var(--primary-mid);border-radius:3px}details[open]{color:var(--primary-dark);border:1px solid var(--primary-mid);border-radius:3px}summary{cursor:pointer;color:var(--primary-mid);font-weight:700}</style><details><summary><slot name="header"></slot></summary><slot name="content"></slot></details>`;
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

export { CollapsableListItem };
//# sourceMappingURL=collapsable-list-item.js.map
