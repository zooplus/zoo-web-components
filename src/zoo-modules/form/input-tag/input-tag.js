import { registerComponents } from '../../common/register-components.js';
import { Input } from '../input/input.js';
import { Select } from '../select/select.js';
import { CrossIcon } from '../../icon/cross-icon/cross-icon.js';
import { InputTagOption } from './input-tag-option.js';
import { FormElement } from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class InputTag extends FormElement {
	constructor() {
		super();
		registerComponents(Input, Select, InputTagOption);
		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', e => {
			this.input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			this.input.addEventListener('input', e => {
				if (e.target.value) {
					this.setAttribute('show-tags', '');
				} else {
					this.removeAttribute('show-tags');
				}
			});
			this.input.addEventListener('blur', e => {
				const focusWithinShadowRoot = this.shadowRoot.contains(document.activeElement);
				const focusWithinLightDom = this.contains(document.activeElement);
				if (!focusWithinShadowRoot && !focusWithinLightDom) {
					// this.removeAttribute('show-tags');
				}
			});
		});
		
		this.shadowRoot.querySelector('slot[name="select"]').addEventListener('slotchange', e => {
			this.select = [...e.target.assignedElements()].find(el => el.tagName === 'SELECT');
			this.select && this.registerElementForValidation(this.select);
		});

		const tagOptionSlot = this.shadowRoot.querySelector('slot[name="tag-option"]');
		tagOptionSlot.addEventListener('slotchange', e => {
			tagOptionSlot.addEventListener('click', e => {
				const target = this.getElAsParentBySlotName(e.target, 'tag-option');
				const tag = target.querySelector('zoo-tag');
				const selectedValue = tag.getAttribute('data-value');
				const options = [...this.select.querySelectorAll('option')];
				const matchedOptionIndex = options.findIndex(o => o.value === selectedValue);
				if (matchedOptionIndex > -1) {
					if (!this.select.options[matchedOptionIndex].selected) {
						this.select.options[matchedOptionIndex].selected = true;
						this.select.options[matchedOptionIndex].setAttribute('selected', '');
						this.select.dispatchEvent(new Event('input'));
						this.input.value = '';
						const clonedTag = tag.cloneNode(true);
						const crossIcon = document.createElement('zoo-cross-icon');
						crossIcon.setAttribute('slot', 'post');
						crossIcon.addEventListener('click', () => {
							clonedTag.remove();
							this.select.options[matchedOptionIndex].selected = false;
							this.select.options[matchedOptionIndex].removeAttribute('selected');
							this.select.dispatchEvent(new Event('input'));
						});
						clonedTag.appendChild(crossIcon);
						inputSlot.before(clonedTag);
					}
				}
				this.removeAttribute('show-tags');
				this.input.focus();
			});
		});
	}

	getElAsParentBySlotName(startEl, slotName) {
		if (startEl.getAttribute('slot') === slotName) return startEl;
		let el = startEl.parentElement;
		while (el.getAttribute('slot') !== slotName) {
			el = el.parentElement;
		}
		return el;
	}
}
if (!window.customElements.get('zoo-input-tag')) {
	window.customElements.define('zoo-input-tag', InputTag);
}