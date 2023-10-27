import { FormElement } from '../common/FormElement.js';
import { registerComponents } from '../../common/register-components.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';

/**
 * @injectHTML
 */
class QuantityControl extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{--input-length:1ch}div{height:36px;display:flex}::slotted(button){border-width:0;min-width:30px;min-height:30px;background:var(--primary-mid);display:flex;align-items:center;justify-content:center;padding:4px;cursor:pointer;stroke-width:1.5;stroke:#FFF}::slotted(button[slot=decrease]){border-radius:5px 0 0 5px}::slotted(button[slot=increase]){border-radius:0 5px 5px 0}::slotted(button:disabled){background:var(--input-disabled,#f2f3f4);cursor:not-allowed}::slotted(input){width:var(--input-length);min-width:30px;font-size:14px;line-height:20px;margin:0;border:none;color:#555;outline:0;box-sizing:border-box;appearance:textfield;text-align:center}:host([labelposition=left]){display:grid;grid-gap:3px;height:max-content}:host([labelposition=left]) zoo-link{grid-column:2}:host([labelposition=left]) div,:host([labelposition=left]) zoo-label{display:flex;align-items:center;grid-row:1}:host([labelposition=left]) zoo-info[role=status]{grid-row:2;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:3;grid-column:2}</style><zoo-label><slot name="label"></slot></zoo-label><div><slot name="decrease"></slot><slot name="input"></slot><slot name="increase"></slot></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
		registerComponents(InfoMessage, Label);
		this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
			this.input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			if (!this.input) return;
			this.registerElementForValidation(this.input);
			this.setInputWidth();
		});

		this.shadowRoot.querySelector('slot[name="increase"]')
			.addEventListener('slotchange', e => this.handleClick(true, e.target.assignedElements()[0]));
		
		this.shadowRoot.querySelector('slot[name="decrease"]')
			.addEventListener('slotchange', e => this.handleClick(false, e.target.assignedElements()[0]));
	}

	setInputWidth() {
		const length = this.input.value ? this.input.value.length || 1 : 1;
		this.style.setProperty('--input-length', length + 1 + 'ch');
	}

	handleClick(increment, el) {
		if (!el) return;
		el.addEventListener('click', () => {
			const step = this.input.step || 1;
			this.input.value = this.input.value || 0;
			this.input.value -= increment ? -step : step;
			this.input.dispatchEvent(new Event('change'));
			this.setInputWidth();
		});
	}
}

if (!window.customElements.get('zoo-quantity-control')) {
	window.customElements.define('zoo-quantity-control', QuantityControl);
}

export { QuantityControl };
//# sourceMappingURL=quantity-control.js.map
