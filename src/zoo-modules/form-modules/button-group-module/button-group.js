import { debounce } from '../../helpers/debounce';
/**
 * @injectHTML
 */
export class ButtonGroup extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		const buttonGroup = this.shadowRoot.querySelector('slot[name="buttons"]');
		buttonGroup.addEventListener('slotchange', debounce(() => {
			buttonGroup.assignedElements().forEach((button, index) => {
				this.handleButtonInitialState(button, index);
				this.registerButtonClickHandler(button, index);
			});

			this.shadowRoot.querySelector('.button-group-container').style.display = 'flex';
		}));
	}

	handleButtonInitialState(button, buttonIndex) {
		if (button.hasAttribute('data-active')) {
			this.activateButton(button, buttonIndex);
		} else {
			this.deactivateButton(button);
		}
	}

	registerButtonClickHandler(button, buttonIndex) {
		const buttonGroup = this.shadowRoot.querySelector('slot[name="buttons"]');

		button.addEventListener('click', (ev) => {
			if (this.activeIndex !== buttonIndex) {
				this.deactivateButton(buttonGroup.assignedElements()[this.activeIndex]);
				this.activateButton(ev.target.parentNode, buttonIndex);
			}
		});
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

window.customElements.define('zoo-button-group', ButtonGroup);
