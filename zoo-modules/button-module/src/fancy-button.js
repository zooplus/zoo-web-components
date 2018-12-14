export default class FancyButton extends HTMLButtonElement {
	constructor() {
		super();
		console.log('constructor');
		console.log(this);
		this.addEventListener('click', e => {
			console.log('clicked');
			this.drawRipple(e.offsetX, e.offsetY)
		});
	}

	connectedCallback() {
		console.log('connected');
	}

	adoptedCallback() {
		console.log('adopted');
	}

	// Material design ripple animation.
	drawRipple(x, y) {
		console.log('drawing ripple');
		let div = document.createElement('div');
		div.classList.add('ripple');
		this.appendChild(div);
		div.style.top = `${y - div.clientHeight / 2}px`;
		div.style.left = `${x - div.clientWidth / 2}px`;
		div.style.backgroundColor = 'currentColor';
		div.classList.add('run');
		div.addEventListener('transitionend', e => div.remove());
	}
}

customElements.define('fancy-button', FancyButton, { extends: 'button' });