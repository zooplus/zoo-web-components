/**
 * @injectHTML
 */
export class AttentionIcon extends HTMLElement {
	constructor() {
		super();
	}
}

if (!window.customElements.get('zoo-attention-icon')) {
	window.customElements.define('zoo-attention-icon', AttentionIcon);
}