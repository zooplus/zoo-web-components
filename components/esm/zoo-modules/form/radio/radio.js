import { registerComponents } from '../../common/register-components.js';
import { FormElement } from '../common/FormElement.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';

/**
 * @injectHTML
 */
class Radio extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;flex-direction:column;font-size:14px;line-height:20px;--box-shadow-color:#767676;--box-shadow-width:1px;--box-shadow-color2:transparent;--box-shadow-width2:1px}fieldset{border:0;padding:0;margin:0;position:relative}.radio-group{display:flex;padding:11px 0}:host([invalid]){color:var(--warning-mid)}::slotted(input){position:relative;min-width:24px;height:24px;border-radius:50%;margin:0 2px 0 0;padding:4px;background-clip:content-box;appearance:none;outline:0;cursor:pointer;box-shadow:inset 0 0 0 var(--box-shadow-width) var(--box-shadow-color),inset 0 0 0 var(--box-shadow-width2) var(--box-shadow-color2)}:host([invalid]) ::slotted(input){--box-shadow-color:var(--warning-mid)}::slotted(input:focus){--box-shadow-color:var(--primary-mid);--box-shadow-width:2px}::slotted(input:checked){background-color:var(--primary-mid);--box-shadow-color:var(--primary-mid);--box-shadow-width:2px;--box-shadow-width2:4px;--box-shadow-color2:white}:host([invalid]) ::slotted(input:checked){background-color:var(--warning-mid)}::slotted(input:disabled){cursor:not-allowed;background-color:#555;--box-shadow-width:2px;--box-shadow-width2:5px;--box-shadow-color:#555!important}::slotted(label){cursor:pointer;margin:0 5px;align-self:center}:host([labelposition=left]) fieldset{display:grid;grid-gap:3px}:host([labelposition=left]) .radio-group{grid-column:2}:host([labelposition=left]) .radio-group,:host([labelposition=left]) legend{grid-row:1;display:flex;align-items:center}:host([labelposition=left]) legend{display:contents}:host([labelposition=left]) legend zoo-label{display:flex;align-items:center}:host([labelposition=left]) zoo-info[role=status]{grid-row:2;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:3;grid-column:2}</style><fieldset><legend><zoo-label><slot name="label"></slot></zoo-label></legend><div class="radio-group"><slot></slot></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info></fieldset>`;
		registerComponents(InfoMessage, Label);
		this.shadowRoot.querySelector('.radio-group slot').addEventListener('slotchange', e => {
			e.target.assignedElements().forEach(e => e.tagName === 'INPUT' && this.registerElementForValidation(e));
		});
	}
}
if (!window.customElements.get('zoo-radio')) {
	window.customElements.define('zoo-radio', Radio);
}

export { Radio };
//# sourceMappingURL=radio.js.map
