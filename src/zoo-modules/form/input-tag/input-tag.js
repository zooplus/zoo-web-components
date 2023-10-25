import { registerComponents } from '../../common/register-components.js';
import { InputTagOption } from './input-tag-option.js';
import { FormElement } from '../common/FormElement.js';
import { CrossIcon } from '../../icon/cross-icon/cross-icon.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';
import { debounce } from '../../helpers/debounce';

/**
 * @injectHTML
 */
export class InputTag extends FormElement {
	constructor() {
		super();
		registerComponents(Label, InfoMessage, InputTagOption, CrossIcon);
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

		this.tagOptionSlot = this.shadowRoot.querySelector('slot[name="tag-option"]');
		this.tagOptionSlot.addEventListener('slotchange', debounce(() => {
			this.handleInitialValues();
		}));

		this.addEventListener('keydown', e => {
			if ((e.key === ' ' || e.key === 'Enter')
				&& (e.target.tagName === 'ZOO-TAG' || e.target.tagName === 'ZOO-INPUT-TAG-OPTION')) {
				e.preventDefault();
				this.toggleOptionSelect(e);
			}
		});
		this.shadowRoot.querySelector('slot[name="select"]').addEventListener('slotchange', e => {
			this.select = [...e.target.assignedElements()].find(el => el.tagName === 'SELECT');
			this.select && this.registerElementForValidation(this.select);
		});
		this.shadowRoot.querySelector('slot[name="tag-option"]').addEventListener('click', e => {
			this.toggleOptionSelect(e, true);
		});
	}

	static get observedAttributes() {
		return [...super.observedAttributes, 'data-initial-value'];
	}

	attributeChangedCallback(name, oldValue) {
		if (name === 'invalid') {
			super.attributeChangedCallback();
		} else if (name === 'data-initial-value' && oldValue != null) {
			this.handleInitialValues();
		}
	}

	toggleOptionSelect(e, withFocusOnInput = false) {
		const target = this.getElAsParentBySlotName(e.target, 'tag-option');
		if (target && target.hasAttribute('selected')) {
			const dataElem = target.querySelector('[data-value]');
			const tagInInput = this.shadowRoot.querySelector(`zoo-tag[data-value="${dataElem.getAttribute('data-value')}"] zoo-cross-icon`);
			tagInInput.dispatchEvent(new Event('click'));
		} else if(target) {
			this.handleTagSelect(target);
		}
		if (withFocusOnInput) {
			this.input.focus();
		}
	}

	handleTagSelect(tagOptionSlot) {
		const optionElement = tagOptionSlot.querySelector('zoo-tag, [data-option-content]');
		const selectedValue = optionElement.getAttribute('data-value');
		const options = [...this.select.querySelectorAll('option')];
		const matchedOptionIndex = options.findIndex(o => o.value === selectedValue);
		const hideOptionsAfterSelect = !this.hasAttribute('show-tags-after-select');

		if (matchedOptionIndex > -1 && !this.select.options[matchedOptionIndex].selected) {
			this.select.options[matchedOptionIndex].selected = true;
			this.select.options[matchedOptionIndex].setAttribute('selected', '');
			this.select.dispatchEvent(new Event('input'));
			if (hideOptionsAfterSelect) {
				this.input.value = '';
			}
			optionElement.parentElement.setAttribute('selected', '');
			optionElement.parentElement.setAttribute('aria-selected', 'true');
			let tagElementFromSelection = this.createSelectedTagElement(optionElement, matchedOptionIndex);
			this.inputSlot.before(tagElementFromSelection);
		}
		if (hideOptionsAfterSelect) {
			this.removeAttribute('show-tags');
		}
	}

	createSelectedTagElement(selectedOptionElement, matchedOptionIndex) {
		let tagElementForInput;
		const dataValue = selectedOptionElement.getAttribute('data-value');
		if(selectedOptionElement.tagName === 'ZOO-TAG') {
			tagElementForInput = selectedOptionElement.cloneNode(true);
		} else {
			tagElementForInput = document.createElement('ZOO-TAG');
			tagElementForInput.setAttribute('slot', 'tag');
			tagElementForInput.setAttribute('type', 'tag');
			tagElementForInput.setAttribute('data-value', dataValue);
			tagElementForInput.setAttribute('tabindex', '0');
			tagElementForInput.insertAdjacentHTML('beforeend', `<span slot="content">${dataValue}</span>`);
		}

		const crossIcon = document.createElement('zoo-cross-icon');
		crossIcon.setAttribute('tabindex', '0');
		crossIcon.setAttribute('slot', 'post');
		crossIcon.addEventListener('click', () => this.deselectOption(tagElementForInput, matchedOptionIndex, selectedOptionElement));
		crossIcon.addEventListener('keydown', e => {
			if (e.key === ' ' || e.key === 'Enter') {
				e.preventDefault();
				this.deselectOption(tagElementForInput, matchedOptionIndex, selectedOptionElement);
			}
		});
		tagElementForInput.appendChild(crossIcon);
		return tagElementForInput;
	}

	handleInitialValues() {
		let tagOptions = [];
		[].push.apply(tagOptions, this.children);
		tagOptions = tagOptions.filter(el => el.tagName === 'ZOO-INPUT-TAG-OPTION');
		const defaultValues = this.hasAttribute('data-initial-value')
			? this.getAttribute('data-initial-value')
				.split(',')
				.map(value => value.trim())
				.filter(value => !!value)
			: null;
		if (tagOptions && defaultValues && defaultValues.length) {
			tagOptions.forEach((tagOption) => {
				if (!tagOption.hasAttribute('selected') && defaultValues.includes([...tagOption.children][0].getAttribute('data-value'))) {
					this.handleTagSelect(tagOption);
				}
			});
		}
	}

	deselectOption(tagElementForInput, matchedOptionIndex, selectedOptionElement) {
		tagElementForInput.remove();
		this.select.options[matchedOptionIndex].selected = false;
		this.select.options[matchedOptionIndex].removeAttribute('selected');
		this.select.dispatchEvent(new Event('input'));
		if (selectedOptionElement) {
			selectedOptionElement.parentElement.removeAttribute('selected');
			selectedOptionElement.parentElement.setAttribute('aria-selected', 'false');
		}
	}

	clearSelection() {
		this.shadowRoot.querySelectorAll('#input-wrapper > zoo-tag').forEach(el => el.remove());
		this.select.querySelectorAll(':checked').forEach(option => {
			option.selected = false;
			option.removeAttribute('selected');
		});
		this.shadowRoot.querySelectorAll('slot[name="tag-option"]').forEach(slot =>
			slot.assignedElements().forEach(tagOption => {
				tagOption.removeAttribute('selected');
				tagOption.setAttribute('aria-selected', 'false');
			}));
		this.input.value = '';
		this.select.dispatchEvent(new Event('input'));
		this.input.dispatchEvent(new Event('input'));
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