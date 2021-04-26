import { AttentionIcon } from '../../icon/attention-icon/attention-icon.js';
import { registerComponents } from '../../common/register-components.js';

/**
 * @injectHTML
 */
class Feedback extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;align-items:center;box-sizing:border-box;font-size:14px;line-height:20px;border-left:3px solid var(--info-mid);width:100%;height:100%;padding:5px 0;background:var(--info-ultralight);border-radius:5px;--svg-fill:var(--info-mid)}:host([type=error]){background:var(--warning-ultralight);border-color:var(--warning-mid);--svg-fill:var(--warning-mid)}:host([type=success]){background:var(--primary-ultralight);border-color:var(--primary-mid);--svg-fill:var(--primary-mid)}zoo-attention-icon{padding:0 10px 0 15px;--icon-color:var(--svg-fill);--width:30px;--height:30px}::slotted(*){display:flex;align-items:center;height:100%;overflow:auto;box-sizing:border-box;padding:5px 5px 5px 0}</style><zoo-attention-icon></zoo-attention-icon><slot></slot>`;
		registerComponents(AttentionIcon);
	}
}

if (!window.customElements.get('zoo-feedback')) {
	window.customElements.define('zoo-feedback', Feedback);
}

export { Feedback };
//# sourceMappingURL=feedback.js.map
