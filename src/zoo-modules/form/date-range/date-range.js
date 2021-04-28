import { registerComponents } from '../../common/register-components.js';
import { FormElement } from '../common/FormElement.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';
import { Input } from '../input/input.js';

/**
 * @injectHTML
 */
export class DateRange extends FormElement {
	constructor() {
		super();
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