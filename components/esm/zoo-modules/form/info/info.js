import { registerComponents } from '../../common/register-components.js';
import { AttentionIcon } from '../../icon/attention-icon/attention-icon.js';

/**
 * @injectHTML
 */
class InfoMessage extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:none;padding:2px;font-size:12px;line-height:16px;color:#555;align-items:center}:host([shown]){display:flex}:host([role=alert][shown]:not([invalid])){display:none}:host([role=alert][invalid][shown]){display:flex;--icon-color:var(--warning-mid)}zoo-attention-icon{align-self:flex-start}</style><zoo-attention-icon aria-hidden="true"></zoo-attention-icon><slot></slot>`;
		registerComponents(AttentionIcon);
		this.shadowRoot.querySelector('slot').addEventListener('slotchange', e => {
			e.target.assignedElements({ flatten: true }).length > 0 ? this.setAttribute('shown', '') : this.removeAttribute('shown');
		});
	}
}
if (!window.customElements.get('zoo-info')) {
	window.customElements.define('zoo-info', InfoMessage);
}

export { InfoMessage };
//# sourceMappingURL=info.js.map
