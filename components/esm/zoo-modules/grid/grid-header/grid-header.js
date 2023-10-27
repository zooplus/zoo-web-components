import { ArrowDownIcon } from '../../icon/arrow-icon/arrow-icon.js';
import { registerComponents } from '../../common/register-components.js';

/**
 * @injectHTML
 */
class GridHeader extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;align-items:center;width:100%;height:100%}button{display:none;width:24px;opacity:0;transition:opacity .1s;margin-left:5px;padding:0;border:0;cursor:pointer;border-radius:5px;background:var(--input-disabled,#f2f3f4);--icon-color:black}button:active{opacity:.5;transform:translateY(1px)}button:focus{opacity:1}:host(:hover) button{opacity:1}.swap{cursor:grab}.swap:active{cursor:grabbing}:host([reorderable]) .swap,:host([sortable]) .sort{display:flex}:host([sortstate=asc]) .sort{transform:rotate(180deg)}:host([sortstate]) .sort{opacity:1;background:#f2f3f4}</style><slot></slot><button type="button" class="sort"><zoo-arrow-icon title="sort icon"></zoo-arrow-icon></button> <button type="button" class="swap"><svg viewBox="0 0 24 24" width="24" height="24"><title>swap icon</title><path d="M7 11l-4 4 4 4v-3h7v-2H7v-3zm14-2l-4-4v3h-7v2h7v3l4-4z"/></svg></button>`;
		registerComponents(ArrowDownIcon);
		this.addEventListener('dragend', () => this.removeAttribute('draggable'));
		this.shadowRoot.querySelector('.swap').addEventListener('mousedown', () => this.setAttribute('draggable', true));
		this.shadowRoot.querySelector('.sort').addEventListener('click', () => this.handleSortClick());
	}

	static get observedAttributes() {
		return ['sort-title', 'swap-title'];
	}

	handleSortClick() {
		if (!this.hasAttribute('sortstate')) {
			this.setAttribute('sortstate', 'desc');
		} else if (this.getAttribute('sortstate') == 'desc') {
			this.setAttribute('sortstate', 'asc');
		} else if (this.getAttribute('sortstate') == 'asc') {
			this.removeAttribute('sortstate');
		}
		const detail = this.hasAttribute('sortstate')
			? { property: this.getAttribute('sortableproperty'), direction: this.getAttribute('sortstate') }
			: undefined; 
		this.dispatchEvent(new CustomEvent('sortChange', {detail: detail, bubbles: true, composed: true }));
	}

	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName === 'sort-title') {
			this.shadowRoot.querySelector('zoo-arrow-icon').setAttribute('title', newVal);
		} else if (attrName === 'swap-title') {
			this.shadowRoot.querySelector('.swap title').textContent = newVal;
			this.shadowRoot.querySelector('.swap').setAttribute('title', newVal);
		}
	}
}

if (!window.customElements.get('zoo-grid-header')) {
	window.customElements.define('zoo-grid-header', GridHeader);
}

export { GridHeader };
//# sourceMappingURL=grid-header.js.map
