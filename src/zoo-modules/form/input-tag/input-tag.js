import { registerComponents } from '../../common/register-components.js';
import { Input } from '../input/input.js';
import { Select } from '../select/select.js';
import { InputTagOption } from './input-tag-option.js';
import { FormElement } from '../common/FormElement.js';
import { CrossIcon } from '../../icon/cross-icon/cross-icon.js';

/**
 * @injectHTML
 */
export class InputTag extends FormElement {
	constructor() {
		super();
		registerComponents(Input, Select, InputTagOption, CrossIcon);
		this.inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		this.inputSlot.addEventListener('slotchange', e => {
			const input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			if (input) {
				this.input = input;
				this.input.addEventListener('input', e => {
					if (e.target.value) {
						this.setAttribute('show-tags', '');
					} else {
						this.removeAttribute('show-tags');
					}
				});
			}
		});
		this.addEventListener('keydown', e => {
			if (e.key === ' ' && e.target.tagName === 'ZOO-TAG') {
				e.preventDefault();
				this.handleTagSelect(e);
			}
		});
		this.shadowRoot.querySelector('slot[name="select"]').addEventListener('slotchange', e => {
			this.select = [...e.target.assignedElements()].find(el => el.tagName === 'SELECT');
			this.select && this.registerElementForValidation(this.select);
		});
		this.shadowRoot.querySelector('slot[name="tag-option"]').addEventListener('click', e => {
			this.handleTagSelect(e);
		});
	}

	handleTagSelect(e) {
		const target = this.getElAsParentBySlotName(e.target, 'tag-option');
		const tag = target.querySelector('zoo-tag');
		const selectedValue = tag.getAttribute('data-value');
		const options = [...this.select.querySelectorAll('option')];
		const matchedOptionIndex = options.findIndex(o => o.value === selectedValue);
		if (matchedOptionIndex > -1 && !this.select.options[matchedOptionIndex].selected) {
			this.select.options[matchedOptionIndex].selected = true;
			this.select.options[matchedOptionIndex].setAttribute('selected', '');
			this.select.dispatchEvent(new Event('input'));
			this.input.value = '';
			const clonedTag = tag.cloneNode(true);
			const crossIcon = document.createElement('zoo-cross-icon');
			crossIcon.setAttribute('tabindex', 0);
			crossIcon.setAttribute('slot', 'post');
			crossIcon.addEventListener('click', () => this.deselectOption(clonedTag, matchedOptionIndex));
			crossIcon.addEventListener('keydown', e => {
				if (e.key === ' ') {
					e.preventDefault();
					this.deselectOption(clonedTag, matchedOptionIndex);
				}
			});
			clonedTag.appendChild(crossIcon);
			this.inputSlot.before(clonedTag);
		}
		this.removeAttribute('show-tags');
		this.input.focus();
	}

	deselectOption(clonedTag, matchedOptionIndex) {
		clonedTag.remove();
		this.select.options[matchedOptionIndex].selected = false;
		this.select.options[matchedOptionIndex].removeAttribute('selected');
		this.select.dispatchEvent(new Event('input'));
		this.input.focus();
	}

	getElAsParentBySlotName(startEl, slotName) {
		if (startEl.getAttribute('slot') === slotName) return startEl;
		let el = startEl.parentElement;
		while (el && el.getAttribute('slot') !== slotName) {
			el = el.parentElement;
		}
		return el;
	}
}
if (!window.customElements.get('zoo-input-tag')) {
	window.customElements.define('zoo-input-tag', InputTag);
}