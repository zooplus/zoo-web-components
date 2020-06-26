import AbstractControl from '../abstractControl';
/**
 * @injectHTML
 */
class Input extends AbstractControl {
	constructor() {
		super();
	}
	static get observedAttributes() {
		return ['labeltext', 'linktext', 'linkhref', 'linktarget', 'inputerrormsg', 'infotext', 'invalid'];
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