/**
 * @injectHTML
 */
class GridHeader extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;align-items:center;width:100%;height:100%}svg,zoo-arrow-icon{display:none;min-width:20px;width:20px;opacity:0;transition:opacity .1s;margin-left:5px;border-radius:5px;background:#f2f3f4;--icon-color:black}zoo-arrow-icon{cursor:pointer;transform:rotate(0)}zoo-arrow-icon:active{opacity:.5;transform:translateY(1px)}:host(:hover) svg,:host(:hover) zoo-arrow-icon{opacity:1}.swap{cursor:grab}.swap:active{cursor:grabbing}:host([reorderable]) .swap,:host([sortable]) zoo-arrow-icon{display:flex}:host([sortstate=asc]) zoo-arrow-icon{transform:rotate(180deg)}:host([sortstate]) zoo-arrow-icon{opacity:1;background:#f2f3f4}</style><slot></slot><zoo-arrow-icon></zoo-arrow-icon><svg class="swap" viewBox="0 0 24 24" width="18" height="18"><path d="M7 11l-4 4 4 4v-3h7v-2H7v-3zm14-2l-4-4v3h-7v2h7v3l4-4z"/></svg>`;
	}

	connectedCallback() {
		this.addEventListener('dragend', () => this.removeAttribute('draggable'));
		this.shadowRoot.querySelector('.swap').addEventListener('mousedown', () => this.setAttribute('draggable', true));
		this.shadowRoot.querySelector('zoo-arrow-icon').addEventListener('click', () => this.handleSortClick());
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
}

window.customElements.define('zoo-grid-header', GridHeader);

export { GridHeader };
//# sourceMappingURL=grid-header.js.map
