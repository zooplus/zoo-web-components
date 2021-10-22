import { registerComponents } from '../../common/register-components.js';
import { FormElement } from '../common/FormElement.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';

/**
 * @injectHTML
 */
export class ToggleSwitch extends FormElement {
	constructor() {
		super();
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