import { registerComponents } from '../../common/register-components.js';
import { InputTagOption } from './input-tag-option.js';
import { FormElement } from '../common/FormElement.js';
import { CrossIcon } from '../../icon/cross-icon/cross-icon.js';
import { InfoMessage } from '../info/info.js';
import { Label } from '../label/label.js';
import { debounce } from '../../helpers/debounce.js';

/**
 * @injectHTML
 */
class InputTag extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box;--input-tag-padding-top-bottom-default:13px;--input-tag-padding-left-right-default:15px;--input-tag-padding-reduced:calc(var(--input-tag-padding-top-bottom, var(--input-tag-padding-top-bottom-default)) - 1px) calc(var(--input-tag-padding-left-right, var(--input-tag-padding-left-right-default)) - 1px)}#input-wrapper{display:flex;flex-wrap:wrap;align-items:center;height:max-content;gap:5px;font-size:14px;line-height:20px;padding:var(--input-tag-padding-top-bottom,var(--input-tag-padding-top-bottom-default)) var(--input-tag-padding-left-right,var(--input-tag-padding-left-right-default));border:1px solid #767676;border-radius:5px;color:#555;box-sizing:border-box;grid-column:span 2;position:relative;overflow:visible}:host(:focus-within) #input-wrapper{border:2px solid #555;padding:var(--input-tag-padding-reduced)}:host([show-tags]) #input-wrapper{z-index:2}:host([invalid]) #input-wrapper{border:2px solid var(--warning-mid);padding:var(--input-tag-padding-reduced)}::slotted(input){border:0;min-width:50px;flex:1 0 auto;outline:0;font-size:14px;line-height:20px;color:#555}zoo-label{grid-row:1}#tag-options{display:none;position:absolute;flex-wrap:wrap;background:#fff;padding:5px var(--input-tag-padding-left-right,var(--input-tag-padding-left-right-default));border:1px solid #555;border-radius:0 0 3px 3px;left:-1px;top:calc(90% + 2px);border-top:0;width:calc(100% + 2px);box-sizing:border-box;max-height:var(--input-tag-options-max-height,fit-content);overflow:var(--input-tag-options-overflow,auto)}:host(:focus-within) #tag-options,:host([invalid]) #tag-options{border-width:2px;width:calc(100% + 4px);left:-2px;padding-left:calc(var(--input-tag-padding-left-right,var(--input-tag-padding-left-right-default)) - 1px);padding-right:calc(var(--input-tag-padding-left-right,var(--input-tag-padding-left-right-default)) - 1px)}:host([invalid]) #tag-options{border-color:var(--warning-mid)}:host([show-tags]) #tag-options{display:flex}::slotted([slot=select]){display:none}zoo-info{grid-column:span 2}zoo-cross-icon{cursor:pointer;--icon-color:var(--primary-mid)}::slotted(zoo-input-tag-option){box-sizing:border-box;width:100%}::slotted(zoo-input-tag-option:hover),::slotted(zoo-input-tag-option[selected]:hover){background:var(--item-hovered,#e6e6e6)}::slotted(zoo-input-tag-option[selected]){background:var(--primary-ultralight)}</style><zoo-label><slot name="label"></slot></zoo-label><div id="input-wrapper"><slot name="input"></slot><div id="tag-options"><slot name="tag-option"></slot><slot name="no-results"></slot></div></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info><slot name="select"></slot>`;
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
		crossIcon.setAttribute('role', 'button');
		crossIcon.setAttribute('aria-label', 'Deselect ' + dataValue);
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

export { InputTag };
//# sourceMappingURL=input-tag.js.map
