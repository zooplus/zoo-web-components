import { debounce } from '../../helpers/debounce.js';
import { Button } from '../button/button.js';
import { registerComponents } from '../../common/register-components.js';

/**
 * @injectHTML
 */
class ButtonGroup extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;opacity:0;border:1px solid #b8b8b8;border-radius:5px;padding:2px 0;justify-content:flex-end;width:fit-content}::slotted(zoo-button){min-width:50px;padding:0 2px}</style><slot></slot>`;
		registerComponents(Button);
	}

	connectedCallback() {
		const buttonGroup = this.shadowRoot.querySelector('slot');
		this.registerSlotChangeListener(buttonGroup);
		this.registerButtonChangeHandler(buttonGroup);
	}

	registerSlotChangeListener(buttonGroup) {
		buttonGroup.addEventListener('slotchange', debounce(() => {
			buttonGroup.assignedElements().forEach((button, index) => {
				this.handleButtonInitialState(button, index);
			});
			this.style.opacity = '1';
		}));
	}

	registerButtonChangeHandler(buttonGroup) {
		this.addEventListener('click', (ev) => {
			const buttonIndex = buttonGroup.assignedElements().indexOf(ev.target.parentNode);
			if (buttonIndex > -1 && this.activeIndex !== buttonIndex) {
				this.deactivateButton(buttonGroup.assignedElements()[this.activeIndex]);
				this.activateButton(ev.target.parentNode, buttonIndex);
			}
		});
	}

	handleButtonInitialState(button, buttonIndex) {
		if (button.hasAttribute('data-active')) {
			this.activateButton(button, buttonIndex);
		} else {
			this.deactivateButton(button);
		}
	}

	activateButton(button, buttonIndex) {
		const activeType = this.getAttribute('active-type');
		button.setAttribute('type', activeType);
		this.activeIndex = buttonIndex;
	}

	deactivateButton(button) {
		const inactiveType = this.getAttribute('inactive-type');
		button.setAttribute('type', inactiveType);
	}
}

if (!window.customElements.get('zoo-button-group')) {
	window.customElements.define('zoo-button-group', ButtonGroup);
}

export { ButtonGroup };
//# sourceMappingURL=button-group.js.map
