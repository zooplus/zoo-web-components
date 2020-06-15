class GridHeader extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			display: flex;
			align-items: center;
			width: 100%;
			height: 100%;
		}
		.box {
			display: flex;
			align-items: center;
			width: 100%;
			height: 100%;
		}
		.box:hover svg, .box:focus svg {
			opacity: 1;
		}
		:host([sortable]) .arrow, :host([reorderable]) .swap {
			display: flex;
		}
		.arrow, .swap {
			display: none;
			min-width: 20px;
			width: 20px;
			opacity: 0;
			transition: opacity 0.1s;
			margin-left: 5px;
			border-radius: 5px;
			background: #F2F3F4;
		}
		.arrow {
			cursor: pointer;
			transform: rotate(0deg);
		}
		.swap {
			cursor: grab;
		}
		.swap:active {
			cursor: grabbing;
		}
		:host([sortstate='asc']) .arrow {
			transform: rotate(180deg);
		}
		:host([sortstate]) .arrow {
			opacity: 1;
			background: #F2F3F4;
		}
		.arrow:active {
			opacity: 0.5;
			transform: translateY(1px);
		}
		</style>
		<div class="box">
			<slot></slot>
			<svg class="arrow" width="24" height="24" viewBox="0 0 24 24">
				<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
			</svg>
			<svg class="swap" viewBox="0 0 24 24" width="18" height="18">
				<path d="M0 0h24v24H0V0z" fill="none"/><path d="M7 11l-4 4 4 4v-3h7v-2H7v-3zm14-2l-4-4v3h-7v2h7v3l4-4z"/>
			</svg>
		</div>`;
	}

	connectedCallback() {
		const host = this.shadowRoot.host;
		host.addEventListener('dragend', () => host.removeAttribute('draggable'));
		this.shadowRoot.querySelector('.swap').addEventListener('mousedown', () => this.toggleHostDraggable());
		this.shadowRoot.querySelector('.arrow').addEventListener('click', () => this.handleSortClick());
		this.sortState = undefined;
	}

	handleSortClick() {
		if (!this.sortState) {
			this.sortState = 'desc';
		} else if (this.sortState == 'desc') {
			this.sortState = 'asc';
		} else if (this.sortState = 'asc') {
			this.sortState = undefined;
		}
		this.shadowRoot.querySelector('.arrow').sortState = this.sortState;
		const host = this.shadowRoot.host;
		host.dispatchEvent(new CustomEvent('sortChange', {detail: {sortState: this.sortState, header: host}, bubbles: true}));
	}

	toggleHostDraggable() {
		this.shadowRoot.host.setAttribute('draggable', true);
	}
	static get observedAttributes() {
		return ['sortState', 'sortable', 'reorderable'];
	}
	get sortState() {
		return this.getAttribute('sortState');
	}
	set sortState(sortState) {
		if (sortState) {
			this.setAttribute('sortState', sortState);
		} else {
			this.removeAttribute('sortState');
		}
	}
	get sortable() {
		return this.getAttribute('sortable');
	}
	set sortable(sortable) {
		if (sortable) {
			this.setAttribute('sortable', sortable);
		} else {
			this.removeAttribute('sortable');
		}
	}
	get reorderable() {
		return this.getAttribute('reorderable');
	}
	set reorderable(reorderable) {
		if (reorderable) {
			this.setAttribute('reorderable', reorderable);
		} else {
			this.removeAttribute('reorderable');
		}
	}
}

window.customElements.define('zoo-grid-header', GridHeader);