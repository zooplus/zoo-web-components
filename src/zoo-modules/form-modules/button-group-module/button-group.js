import { debounce } from '../../helpers/debounce';
/**
 * @injectHTML
 */
export class ButtonGroup extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.buttonGroup.addEventListener('slotchange', debounce(() => {
			this.buttonGroupElements.forEach((button, index) => {
				if (button.hasAttribute('data-active')) {
					this.activateButton(button, index);
				} else {
					this.deactivateButton(button);
				}

				this.registerButtonClickHandler(button, index);
			});

			this.shadowRoot.querySelector('.button-group-container').style.display = 'flex';
		}));
	}

	activateButton(button, buttonIndex) {
		button.setAttribute('type', this.activeType);
		this.activeIndex = buttonIndex;
	}

	deactivateButton(button) {
		button.setAttribute('type', this.inactiveType);
	}

	registerButtonClickHandler(button, buttonIndex) {
		button.addEventListener('click', (ev) => {
			if (this.activeIndex !== buttonIndex) {
				this.deactivateButton(this.buttonGroupElements[this.activeIndex]);
				this.activateButton(ev.target.parentNode, buttonIndex);
			}
		});
	}

	get buttonGroup() {
		return this.shadowRoot.querySelector('slot[name="buttons"]');
	}

	get buttonGroupElements() {
		return this.buttonGroup.assignedElements();
	}

	get activeType() {
		return this.getAttribute('active-type');
	}

	get inactiveType() {
		return this.getAttribute('inactive-type');
	}
}

window.customElements.define('zoo-button-group', ButtonGroup);
