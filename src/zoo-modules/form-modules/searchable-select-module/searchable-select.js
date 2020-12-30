import FormElement from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class SearchableSelect extends FormElement {
	constructor() {
		super();
		this.observer = new MutationObserver(this.mutationCallback.bind(this));
		this.input = this.shadowRoot.querySelector('input');
		this.input.addEventListener('input', () => this.handleSearchChange());
		this.shadowRoot.querySelector('.cross').addEventListener('click', () => {
			this.select.value = null;
			this.select.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
		});
		
		const selectSlot = this.shadowRoot.querySelector('slot[name="select"]');
		selectSlot.addEventListener('slotchange', e => {
			e.stopPropagation();
			this.select = [...selectSlot.assignedElements()].find(el => el.tagName === 'SELECT');
			if (this.select) {
				this.registerElementForValidation(this.select);
				this.select.addEventListener('change', () => {
					this.handleOptionChange();
					this.valueChange();
				});
				this.select.size = 4;
				this.observer.observe(this.select, { attributes: true, attributeFilter: ['disabled'] });
				this.valueChange();
				this.slotChange();
			}
		});

		const inputSlot = this.shadowRoot.querySelector('slot[name="input"]');
		inputSlot.addEventListener('slotchange', e => {
			e.stopPropagation();
			this.input = [...inputSlot.assignedElements()].find(el => el.tagName === 'INPUT');
			if (this.input) {
				this.inputPlaceholderFallback = this.input.placeholder;
				this.input.addEventListener('input', () => this.handleSearchChange());
				this.slotChange();
			}
		});
	}
	// TODO in v9 drop nested default input and force user to define label for both select and input, while showing only legend
	static get observedAttributes() {
		return ['invalid', 'placeholder', 'closeicontitle'];
	}
	handlePlaceholder(newVal) {
		const input = this.shadowRoot.querySelector('input');
		if (input && newVal) input.placeholder = newVal;
		this.inputPlaceholderFallback = newVal;
	}

	mutationCallback(mutationsList) {
		for (let mutation of mutationsList) {
			this.input.disabled = mutation.target.disabled;
		}
	}

	slotChange() {
		if (this.input && this.select) {
			this.handleOptionChange();
			this.input.disabled = this.select.disabled;
		}
	}

	valueChange() {
		this.select.value ? this.setAttribute('value-selected', '') : this.removeAttribute('value-selected');
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'placeholder') {
			this.handlePlaceholder(newVal);
		} else if (attrName === 'invalid') {
			const input = this.shadowRoot.querySelector('zoo-input');
			if (input) {
				if (this.hasAttribute('invalid')) {
					input.setAttribute('invalid', '');
				} else {
					input.removeAttribute('invalid');
				}
			}
		} else if (attrName === 'closeicontitle') {
			this.shadowRoot.querySelector('zoo-cross-icon').setAttribute('title', newVal);
		}
	}

	handleSearchChange() {
		const inputVal = this.input.value.toLowerCase();
		const options = this.select.querySelectorAll('option');
		for (const option of options) {
			if (option.text.toLowerCase().indexOf(inputVal) > -1) option.style.display = 'block';
			else option.style.display = 'none';
		}
	}

	handleOptionChange() {
		let inputValString = '';
		for (const selectedOpts of this.select.selectedOptions) {
			inputValString += selectedOpts.text + ', \n';
		}
		inputValString = inputValString.substr(0, inputValString.length - 3);
		const showTooltip = inputValString && inputValString.length > 0;
		this.input.placeholder = showTooltip ? inputValString : this.inputPlaceholderFallback;
		if (showTooltip) {
			this.input.value = null;
			this.tooltip = this.tooltip || this.createTooltip();
			this.tooltip.setAttribute('text', inputValString);
			this.shadowRoot.querySelector('zoo-input').appendChild(this.tooltip);
		} else if (this.tooltip) {
			this.tooltip.remove();
		}
	}

	createTooltip() {
		const tooltip = document.createElement('zoo-tooltip');
		tooltip.slot = 'additional';
		tooltip.setAttribute('position', 'right');
		return tooltip;
	}
}
window.customElements.define('zoo-searchable-select', SearchableSelect);