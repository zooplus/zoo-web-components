import { debounce } from '../../helpers/debounce';
/**
 * @injectHTML
 */
export class ButtonGroup extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		const buttonGroup = this.shadowRoot.querySelector('slot');
		buttonGroup.addEventListener('slotchange', debounce(() => {
			buttonGroup.assignedElements().forEach((button, index) => {
				this.handleButtonInitialState(button, index);
			});
			this.style.opacity = '1';
		}));

		this.registerButtonChangeHandler();
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

	registerButtonChangeHandler() {
		const buttonGroup = this.shadowRoot.querySelector('slot');

		this.addEventListener('click', (ev) => {
			const buttonIndex = buttonGroup.assignedElements().indexOf(ev.target.parentNode);
			if (buttonIndex > -1 && this.activeIndex !== buttonIndex) {
				this.deactivateButton(buttonGroup.assignedElements()[this.activeIndex]);
				this.activateButton(ev.target.parentNode, buttonIndex);
			}
		});
	}
}

window.customElements.define('zoo-button-group', ButtonGroup);
