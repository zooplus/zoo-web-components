import AbstractControl from '../abstractControl';

/**
 * @injectHTML
 */
export default class Radio extends AbstractControl {
	constructor() {
		super();
	}

	static get observedAttributes() {
		return ['labeltext', 'inputerrormsg', 'infotext', 'invalid'];
	}
	
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (Radio.observedAttributes.includes(attrName)) {
			const fn = this.handlersMap.get(attrName);
			if (fn) {
				fn(newVal);
			}
		}
	}
}
window.customElements.define('zoo-radio', Radio);