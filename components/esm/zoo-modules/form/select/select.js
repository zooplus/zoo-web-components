import { registerComponents } from '../../common/register-components.js';
import { ArrowDownIcon } from '../../icon/arrow-icon/arrow-icon.js';
import { Link } from '../../misc/link/link.js';
import { Preloader } from '../../misc/preloader/preloader.js';
import { FormElement } from '../common/FormElement.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';

/**
 * @injectHTML
 */
class Select extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box;--icons-display:flex}zoo-arrow-icon{position:absolute;right:10px;display:var(--icons-display);pointer-events:none}:host([invalid]) zoo-arrow-icon{--icon-color:var(--warning-mid)}:host([disabled]) zoo-arrow-icon{--icon-color:#666}::slotted(select){appearance:none;width:100%;font-size:14px;line-height:20px;padding:13px 25px 13px 15px;border:1px solid #767676;border-radius:5px;color:#555;outline:0;box-sizing:border-box}::slotted(select:disabled){border:1px solid #e6e6e6;background:var(--input-disabled,#f2f3f4);color:#666}::slotted(select:disabled:hover){cursor:not-allowed}::slotted(select:focus){border:2px solid #555;padding:12px 24px 12px 14px}:host([invalid]) ::slotted(select){border:2px solid var(--warning-mid);padding:12px 24px 12px 14px}.content{display:flex;justify-content:stretch;align-items:center;position:relative;grid-column:span 2}zoo-info{grid-column:span 2}:host([multiple]) zoo-arrow-icon{display:none}zoo-link{text-align:right;max-width:max-content;justify-self:flex-end;padding:0}zoo-preloader{display:none}:host([loading]) zoo-preloader{display:flex}:host([labelposition=left]) zoo-link{grid-column:2}:host([labelposition=left]) .content,:host([labelposition=left]) zoo-label{display:flex;align-items:center;grid-row:2}:host([labelposition=left]) zoo-info[role=status]{grid-row:3;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:4;grid-column:2}</style><zoo-label><slot name="label"></slot></zoo-label><zoo-link><slot name="link" slot="anchor"></slot></zoo-link><div class="content"><zoo-preloader></zoo-preloader><slot name="select"></slot><zoo-arrow-icon aria-hidden="true"></zoo-arrow-icon></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
		registerComponents(InfoMessage, Label, Link, Preloader, ArrowDownIcon);
		this.observer = new MutationObserver(mutationsList => {
			for(let mutation of mutationsList) {
				const attr = mutation.attributeName;
				mutation.target[attr] ? this.setAttribute(attr, '') : this.removeAttribute(attr);
			}
		});
		this.shadowRoot.querySelector('slot[name="select"]').addEventListener('slotchange', e => {
			let select = [...e.target.assignedElements()].find(el => el.tagName === 'SELECT');
			if (!select) return;
			if (select.multiple) this.setAttribute('multiple', '');
			if (select.disabled) this.setAttribute('disabled', '');
			this.registerElementForValidation(select);
			this.observer.observe(select, { attributes: true, attributeFilter: ['disabled', 'multiple'] });
		});
	}

	disconnectedCallback() {
		this.observer.disconnect();
	}
}
if (!window.customElements.get('zoo-select')) {
	window.customElements.define('zoo-select', Select);
}

export { Select };
//# sourceMappingURL=select.js.map
