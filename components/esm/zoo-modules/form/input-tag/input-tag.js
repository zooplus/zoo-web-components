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
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>#input-wrapper,#tag-options{gap:5px;box-sizing:border-box}#input-wrapper,zoo-info{grid-column:span 2}:host{display:grid;grid-gap:3px;width:100%;height:max-content;box-sizing:border-box}#input-wrapper{display:flex;flex-wrap:wrap;align-items:center;height:max-content;font-size:14px;line-height:20px;padding:13px 15px;border:1px solid #767676;border-radius:5px;color:#555;position:relative;overflow:visible}:host(:focus-within) #input-wrapper{border:2px solid #555;padding:12px 14px}:host([show-tags]) #input-wrapper{z-index:2}:host([invalid]) #input-wrapper{border:2px solid var(--warning-mid);padding:12px 14px}::slotted(input){border:0;min-width:50px;flex:1 0 auto;outline:0;font-size:14px;line-height:20px;color:#555}zoo-label{grid-row:1}#tag-options{display:none;position:absolute;flex-wrap:wrap;background:#fff;padding:5px;border:1px solid #555;border-radius:0 0 3px 3px;left:-1px;top:90%;border-top:0;width:calc(100% + 2px)}:host(:focus-within) #tag-options,:host([invalid]) #tag-options{border-width:2px;width:calc(100% + 4px);left:-2px}:host([invalid]) #tag-options{border-color:var(--warning-mid)}:host([show-tags]) #tag-options{display:flex}::slotted([slot=select]){display:none}zoo-cross-icon{cursor:pointer;--icon-color:var(--primary-mid)}::slotted(zoo-input-tag-option){flex:1 0 30%}</style><zoo-label><slot name="label"></slot></zoo-label><div id="input-wrapper"><slot name="input"></slot><div id="tag-options"><slot name="tag-option"></slot><slot name="no-results"></slot></div></div><zoo-info role="status"><slot name="info"></slot></zoo-info><zoo-info role="alert"><slot name="error"></slot></zoo-info><slot name="select"></slot>`;
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

	handleInitialValues() {
		const tagOptions = [...this.children].filter(el => el.tagName === 'ZOO-INPUT-TAG-OPTION');
		const defaultValues = this.hasAttribute('data-initial-value')
			? this.getAttribute('data-initial-value')
				.split(',')
				.map(value => value.trim())
			: null;
		if (tagOptions && defaultValues) {
			[...tagOptions].forEach((tagOption) => {
				if (defaultValues.includes([...tagOption.children][0].getAttribute('data-value'))) {
					this.handleTagSelect({
						target: tagOption
					});
				}
			});
		}
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

export { InputTag };
//# sourceMappingURL=input-tag.js.map
