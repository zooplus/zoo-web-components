import { registerComponents } from '../../common/register-components.js';
import { CrossIcon } from '../../icon/cross-icon/cross-icon.js';
import { FormElement } from '../common/FormElement.js';
import { Input } from '../input/input.js';
import { Select } from '../select/select.js';
import { Preloader } from '../../misc/preloader/preloader.js';
import { Tooltip } from '../../misc/tooltip/tooltip.js';

/**
 * @injectHTML
 */
class SearchableSelect extends FormElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box}.cross{display:none;position:absolute;top:12px;right:14px;cursor:pointer;border:0;padding:0;background:0 0}.cross.hidden,:host([value-selected]) .cross.hidden{display:none}:host([value-selected]) .cross{display:flex}zoo-tooltip{display:none}:host(:focus) zoo-tooltip,:host(:hover) zoo-tooltip{display:grid}zoo-select{border-top:none;position:absolute;z-index:2;top:59%;display:none;--icons-display:none}:host(:focus-within) zoo-select{display:grid}slot[name=selectlabel]{display:none}:host(:focus-within) slot[name=selectlabel]{display:block}:host(:focus-within) ::slotted(select){border-top-left-radius:0;border-top-right-radius:0;border:2px solid #555;border-top:none!important}:host([invalid]) ::slotted(select){border:2px solid var(--warning-mid)}zoo-preloader{display:none}:host([loading]) zoo-preloader{display:flex}::slotted([slot=inputlabel]),::slotted([slot=selectlabel]){position:absolute;overflow:hidden;clip:rect(0 0 0 0);height:1px;width:1px;margin:-1px;padding:0;border:0}zoo-link{align-items:flex-start;text-align:right;max-width:max-content;justify-self:flex-end;padding:0}zoo-label,zoo-link{grid-row:1}zoo-input{grid-gap:0;grid-column:span 2;position:relative}:host(:focus-within) ::slotted(input){border:2px solid #555;padding:12px 14px}:host([invalid]) ::slotted(input){border:2px solid var(--warning-mid);padding:12px 14px}:host([labelposition=left]) zoo-link{grid-column:2}:host([labelposition=left]) zoo-input,:host([labelposition=left]) zoo-label{display:flex;align-items:center;grid-row:2}:host([labelposition=left]) zoo-info[role=status]{grid-row:3;grid-column:2}:host([labelposition=left]) zoo-info[role=alert]{grid-row:4;grid-column:2}zoo-info{grid-column:span 2}</style><zoo-label><slot name="legend"><slot name="label"></slot></slot></zoo-label><zoo-link><slot name="link" slot="anchor"></slot></zoo-link><zoo-input><zoo-preloader slot="additional"></zoo-preloader><slot slot="input" name="input"></slot><button slot="additional" class="cross" type="button"><zoo-cross-icon></zoo-cross-icon></button><slot name="inputlabel" slot="additional"></slot><zoo-select slot="additional"><slot name="select" slot="select"></slot></zoo-select></zoo-input><slot name="selectlabel"></slot><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info>`;
		registerComponents(Input, Select, Preloader, CrossIcon, Tooltip);
		this.observer = new MutationObserver(mutationsList => {
			for (let mutation of mutationsList) {
				this.input.disabled = mutation.target.disabled;
				const crossIcon = this.shadowRoot.querySelector('.cross');
				if (mutation.target.disabled) {
					crossIcon.classList.add('hidden');
				} else {
					crossIcon.classList.remove('hidden');
				}
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
if (!window.customElements.get('zoo-searchable-select')) {
	window.customElements.define('zoo-searchable-select', SearchableSelect);
}

export { SearchableSelect };
//# sourceMappingURL=searchable-select.js.map
