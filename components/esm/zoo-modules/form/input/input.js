import { FormElement } from '../common/FormElement.js';
import { registerComponents } from '../../common/register-components.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';
import { Link } from '../../misc/link/link.js';

/**
 * @injectHTML
 */
class Input extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.content,zoo-info{grid-column:span 2}:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box}::slotted(input),::slotted(textarea){width:100%;font-size:14px;line-height:20px;padding:13px 15px;margin:0;border:1px solid #767676;border-radius:5px;color:#555;outline:0;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis}:host([invalid]) ::slotted(input),:host([invalid]) ::slotted(textarea){border:2px solid var(--warning-mid);padding:12px 14px}::slotted(input[type=date]),::slotted(input[type=time]){-webkit-logical-height:48px;max-height:48px}::slotted(input::placeholder),::slotted(textarea::placeholder){color:#767676}::slotted(input:disabled),::slotted(textarea:disabled){border:1px solid #e6e6e6;background:var(--input-disabled,#f2f3f4);color:#767676;cursor:not-allowed}::slotted(input:focus),::slotted(textarea:focus){border:2px solid #555;padding:12px 14px}.content{display:flex}zoo-link{text-align:right;max-width:max-content;justify-self:flex-end;padding:0}:host([labelposition=left]) zoo-link{grid-column:2}:host([labelposition=left]) .content,:host([labelposition=left]) zoo-label{display:flex;align-items:center;grid-row:2}:host([labelposition=left]) zoo-info[role=status]{grid-row:3;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:4;grid-column:2}</style><zoo-label><slot name="label"></slot></zoo-label><zoo-link><slot name="link" slot="anchor"></slot></zoo-link><div class="content"><slot name="input"></slot><slot name="additional"></slot></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
		registerComponents(InfoMessage, Label, Link);
		this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
			let input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			input && this.registerElementForValidation(input);
		});
	}
}
if (!window.customElements.get('zoo-input')) {
	window.customElements.define('zoo-input', Input);
}

export { Input };
//# sourceMappingURL=input.js.map
