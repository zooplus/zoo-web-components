import AbstractControl from '../abstractControl';

/**
 * @injectHTML
 */
export default class Input extends AbstractControl {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['labeltext', 'inputerrormsg', 'infotext'];
	}
	
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (Input.observedAttributes.includes(attrName)) {
			const fn = this.handlersMap.get(attrName);
			if (fn) {
				fn(newVal);
			}
		}
	}
}
window.customElements.define('zoo-input', Input);