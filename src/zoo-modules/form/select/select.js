import { registerComponents } from '../../common/register-components.js';
import { ArrowDownIcon } from '../../icon/arrow-icon/arrow-icon.js';
import { Link } from '../../misc/link/link.js';
import { Preloader } from '../../misc/preloader/preloader.js';
import { FormElement } from '../common/FormElement.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';

/**
 * @injectHTML
 */
export class Select extends FormElement {
	constructor() {
		super();
		registerComponents(InfoMessage, Label, Link, Preloader, ArrowDownIcon);
		this.observer = new MutationObserver(mutationsList => {
			for(let mutation of mutationsList) {
				const attr = mutation.attributeName;
				mutation.target[attr] ? this.setAttribute(attr, '') : this.removeAttribute(attr);
			}
		});
		this.shadowRoot.querySelector('slot[name="select"]').addEventListener('slotchange', e => {
			let select = [...e.target.assignedElements()].find(el => el.tagName === 'SELECT');
			if (!select) return;
			if (select.multiple) this.setAttribute('multiple', '');
			if (select.disabled) this.setAttribute('disabled', '');
			this.registerElementForValidation(select);
			this.observer.observe(select, { attributes: true, attributeFilter: ['disabled', 'multiple'] });
		});
	}

	disconnectedCallback() {
		this.observer.disconnect();
	}
}
if (!window.customElements.get('zoo-select')) {
	window.customElements.define('zoo-select', Select);
}