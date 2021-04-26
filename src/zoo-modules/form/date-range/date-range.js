import { registerComponents } from '../../common/register-components.js';
import { FormElement } from '../common/FormElement.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';

/**
 * @injectHTML
 */
export class DateRange extends FormElement {
	constructor() {
		super();
		registerComponents(InfoMessage, Label);
		const slottedInputs = {};
		this.shadowRoot.querySelector('slot[name="date-from"]')
			.addEventListener('slotchange', e => this.handleAndSaveSlottedInputAs(e, 'dateFrom', slottedInputs));
		this.shadowRoot.querySelector('slot[name="date-to"]')
			.addEventListener('slotchange', e => this.handleAndSaveSlottedInputAs(e, 'dateTo', slottedInputs));
		this.addEventListener('input', e => {
			const dateInputFrom = slottedInputs.dateFrom;
			const dateInputTo = slottedInputs.dateTo;
			if (dateInputFrom.value) {
				dateInputTo.setAttribute('min', dateInputFrom.value);
			} else {
				dateInputTo.removeAttribute('min');
			}
			if (dateInputTo.value) {
				dateInputFrom.setAttribute('max', dateInputTo.value);
			} else {
				dateInputTo.removeAttribute('max');
			}
		});
	}

	handleAndSaveSlottedInputAs(e, propName, slottedInputs) {
		let input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
		slottedInputs[propName] = input;
		input && this.registerElementForValidation(input);
	}
}
if (!window.customElements.get('zoo-date-range')) {
	window.customElements.define('zoo-date-range', DateRange);
}