import { registerComponents } from '../../common/register-components.js';
import { FormElement } from '../common/FormElement.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';

/**
 * @injectHTML
 */
class ToggleSwitch extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{height:100%;width:100%}div{display:flex;align-items:center;position:relative;height:17px;width:40px;background:#e6e6e6;border-radius:10px;border-width:0;margin:5px 0}::slotted(input){transition:transform .2s;transform:translateX(-30%);width:60%;height:24px;border:1px solid #e6e6e6;border-radius:50%;display:flex;appearance:none;outline:0;cursor:pointer;background:#fff}::slotted(input:checked){transform:translateX(80%);background:var(--primary-mid)}::slotted(input:focus){border:1px solid #767676}::slotted(input:disabled){background:var(--input-disabled,#f2f3f4);cursor:not-allowed}:host([labelposition=left]){display:grid;grid-gap:3px;height:max-content}:host([labelposition=left]) zoo-link{grid-column:2}:host([labelposition=left]) div,:host([labelposition=left]) zoo-label{display:flex;align-items:center;grid-row:1}:host([labelposition=left]) zoo-info[role=status]{grid-row:2;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:3;grid-column:2}</style><zoo-label><slot name="label"></slot></zoo-label><div class="toggle-wrapper"><slot name="input"></slot></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
		registerComponents(InfoMessage, Label);
		this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
			const input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			if (!input) return;
			this.registerElementForValidation(input);

			e.target.parentNode.addEventListener('click', (e) => {
				if (e.target.classList.contains('toggle-wrapper')) {
					input.click();
				}
			});
		});
	}
}

if (!window.customElements.get('zoo-toggle-switch')) {
	window.customElements.define('zoo-toggle-switch', ToggleSwitch);
}

export { ToggleSwitch };
//# sourceMappingURL=toggle-switch.js.map
