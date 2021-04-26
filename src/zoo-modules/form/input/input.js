import { FormElement } from '../common/FormElement.js';
import { registerComponents } from '../../common/register-components.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';
import { Link } from '../../misc/link/link.js';

/**
 * @injectHTML
 */
export class Input extends FormElement {
	constructor() {
		super();
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