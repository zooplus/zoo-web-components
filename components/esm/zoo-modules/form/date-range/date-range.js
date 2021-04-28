import { registerComponents } from '../../common/register-components.js';
import { FormElement } from '../common/FormElement.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';
import { Input } from '../input/input.js';

/**
 * @injectHTML
 */
class DateRange extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.content,zoo-info{grid-column:span 2}:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box}fieldset{border:0;padding:0;margin:0;position:relative}:host([invalid]) ::slotted(input){border:2px solid var(--warning-mid);padding:12px 14px}.content{display:flex;justify-content:space-between}.content zoo-input{width:49%}</style><fieldset><legend><zoo-label><slot name="label"></slot></zoo-label></legend><div class="content"><zoo-input><slot slot="input" name="date-from"></slot></zoo-input><zoo-input><slot slot="input" name="date-to"></slot></zoo-input></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info></fieldset>`;
		registerComponents(InfoMessage, Label, Input);
		const slottedInputs = {};
		this.shadowRoot.querySelector('slot[name="date-from"]')
			.addEventListener('slotchange', e => this.handleAndSaveSlottedInputAs(e, 'dateFrom', slottedInputs));
		this.shadowRoot.querySelector('slot[name="date-to"]')
			.addEventListener('slotchange', e => this.handleAndSaveSlottedInputAs(e, 'dateTo', slottedInputs));
		this.addEventListener('input', () => {
			const dateInputFrom = slottedInputs.dateFrom;
			const dateInputTo = slottedInputs.dateTo;
			if (dateInputFrom.value && dateInputTo.value && dateInputFrom.value > dateInputTo.value) {
				this.setInvalid();
			} else if (dateInputFrom.validity.valid && dateInputTo.validity.valid) {
				this.setValid();
			}
		});
	}

	handleAndSaveSlottedInputAs(e, propName, slottedInputs) {
		const input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
		slottedInputs[propName] = input;
		input && this.registerElementForValidation(input);
	}
}
if (!window.customElements.get('zoo-date-range')) {
	window.customElements.define('zoo-date-range', DateRange);
}

export { DateRange };
//# sourceMappingURL=date-range.js.map
