import { registerComponents } from '../../common/register-components.js';
import { FormElement } from '../common/FormElement.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';

/**
 * @injectHTML
 */
export class Radio extends FormElement {
	constructor() {
		super();
		registerComponents(InfoMessage, Label);
		this.shadowRoot.querySelector('.radio-group slot').addEventListener('slotchange', e => {
			e.target.assignedElements().forEach(e => e.tagName === 'INPUT' && this.registerElementForValidation(e));
		});
	}
}
if (!window.customElements.get('zoo-radio')) {
	window.customElements.define('zoo-radio', Radio);
}