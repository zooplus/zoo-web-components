import { FormElement } from '../common/FormElement.js';

/**
 * @injectHTML
 */
export class SearchableSelect extends FormElement {
	constructor() {
		super();
		this.observer = new MutationObserver(mutationsList => {
			for (let mutation of mutationsList) {
				this.input.disabled = mutation.target.disabled;
			}
		});
		this.shadowRoot.querySelector('.cross').addEventListener('click', () => {
			if (this.select.disabled) return;
			this.select.value = null;
			this.select.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
		});
		
		this.shadowRoot.querySelector('slot[name="select"]').addEventListener('slotchange', e => {
			this.select = [...e.target.assignedElements()].find(el => el.tagName === 'SELECT');
			if (!this.select) return;
			this.registerElementForValidation(this.select);
			this.select.addEventListener('change', () => {
				this.handleOptionChange();
				this.valueChange();
			});
			this.select.size = 4;
			this.observer.observe(this.select, { attributes: true, attributeFilter: ['disabled'] });
			this.valueChange();
			this.slotChange();
		});

		this.shadowRoot.querySelector('slot[name="input"]').addEventListener('slotchange', e => {
			this.input = [...e.target.assignedElements()].find(el => el.tagName === 'INPUT');
			if (!this.input) return;
			this.inputPlaceholderFallback = this.input.placeholder;
			this.input.addEventListener('input', () => this.handleSearchChange());
			this.slotChange();
		});
	}
	
	static get observedAttributes() {
		return ['closeicontitle'];
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
		this.shadowRoot.querySelector('zoo-cross-icon').setAttribute('title', newVal);
	}

	handleSearchChange() {
		const inputVal = this.input.value.toLowerCase();
		this.select.querySelectorAll('option').forEach(option => {
			if (option.text.toLowerCase().indexOf(inputVal) > -1) option.style.display = 'block';
			else option.style.display = 'none';
		});
	}

	handleOptionChange() {
		let inputValString = [...this.select.selectedOptions].map(o => o.text).join(', \n');
		this.input.placeholder = inputValString || this.inputPlaceholderFallback;
		if (inputValString) {
			this.input.value = null;
			this.tooltip = this.tooltip || this.createTooltip();
			this.tooltip.textContent = inputValString;
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

	disconnectedCallback() {
		this.observer.disconnect();
	}
}
window.customElements.define('zoo-searchable-select', SearchableSelect);