import { FormElement } from '../common/FormElement.js';
import { InfoMessage } from '../info/info.js';
import { registerComponents } from '../../common/register-components.js';

/**
 * @injectHTML
 */
class Checkbox extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.checkbox,svg{box-sizing:border-box}:host{display:flex;flex-direction:column;width:100%;font-size:14px;line-height:20px;position:relative;--border:0;--check-color:var(--primary-mid)}:host([disabled]){--check-color:#767676}:host([highlighted]){--border:1px solid var(--check-color)}:host([invalid]){--check-color:var(--warning-mid);--border:2px solid var(--warning-mid)}::slotted(input){width:100%;height:100%;top:0;left:0;position:absolute;display:flex;align-self:flex-start;appearance:none;cursor:pointer;margin:0;border-radius:3px;border:var(--border)}svg{border:1px solid var(--check-color);fill:var(--check-color);border-radius:3px;pointer-events:none;min-width:24px;z-index:1;padding:1px}svg path{display:none}.indeterminate{display:none;background:var(--check-color);fill:white}:host([checked]) svg path{display:flex}:host([checked][indeterminate]) .indeterminate{display:flex}:host([checked][indeterminate]) .checked{display:none}:host(:focus-within) svg{border-width:2px}::slotted(input:focus){border-width:2px}:host([checked]) ::slotted(input){border-width:2px}:host([disabled]) svg{background:var(--input-disabled,#f2f3f4)}.checkbox{display:flex;width:100%;cursor:pointer;align-items:baseline;position:relative}:host([highlighted]) .checkbox{padding:11px 15px}::slotted(label){display:flex;align-self:center;cursor:pointer;margin-left:5px;z-index:1}::slotted(input:disabled),:host([disabled]) ::slotted(label){cursor:not-allowed}</style><div class="checkbox"><slot name="checkbox"></slot><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" class="checked"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg> <svg viewBox="3 3 18 18" width="24" height="24" aria-hidden="true" class="indeterminate"><path d="M19 3H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-2 10H7v-2h10v2z"/></svg><slot name="label"></slot></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
		registerComponents(InfoMessage);
		this.observer = new MutationObserver(mutationsList => {
			for (let mutation of mutationsList) {
				mutation.target.disabled ? this.setAttribute('disabled', '') : this.removeAttribute('disabled');
				mutation.target.hasAttribute('indeterminate') ? this.setAttribute('indeterminate', '') : this.removeAttribute('indeterminate');
			}
		});
		this.shadowRoot.querySelector('slot[name="checkbox"]').addEventListener('slotchange', e => {
			let checkbox = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			if (!checkbox) return;
			checkbox.addEventListener('change', () => {
				checkbox.checked
					? this.setAttribute('checked', '')
					: this.removeAttribute('checked');
			});
			this.registerElementForValidation(checkbox);
			if (checkbox.disabled) this.setAttribute('disabled', '');
			if (checkbox.checked) this.setAttribute('checked', '');
			if (checkbox.hasAttribute('indeterminate')) this.setAttribute('indeterminate', '');
			this.observer.observe(checkbox, { attributes: true, attributeFilter: ['disabled', 'indeterminate'] });
		});
	}

	disconnectedCallback() {
		this.observer.disconnect();
	}
}
if (!window.customElements.get('zoo-checkbox')) {
	window.customElements.define('zoo-checkbox', Checkbox);
}

export { Checkbox };
//# sourceMappingURL=checkbox.js.map
