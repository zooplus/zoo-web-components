import { ArrowDownIcon } from '../../icon/arrow-icon/arrow-icon.js';
import { registerComponents } from '../../common/register-components.js';

/**
 * @injectHTML
 */
class Paginator extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.box,button,nav{display:flex}:host{min-width:inherit;display:none}.box{align-items:center;font-size:14px;width:max-content;position:var(--paginator-position, 'initial');right:var(--right, 'unset')}:host([currentpage]){display:flex}nav{align-items:center;border:1px solid #e6e6e6;border-radius:5px;padding:15px}button{cursor:pointer;opacity:1;transition:opacity .1s;background:0 0;border:0;padding:0;font-size:inherit;border-radius:5px;margin:0 2px}button:active{opacity:.5}button:focus,button:hover{background:#f2f3f4}button.hidden{display:none}.page-element{padding:4px 8px}.page-element.active{background:var(--primary-ultralight);color:var(--primary-dark)}zoo-arrow-icon{pointer-events:none}.prev zoo-arrow-icon{transform:rotate(90deg)}.next zoo-arrow-icon{transform:rotate(-90deg)}</style><div class="box"><slot name="pagesizeselector"></slot><nav><button type="button" class="prev"><zoo-arrow-icon title="prev page"></zoo-arrow-icon></button> <button type="button" class="next"><zoo-arrow-icon title="next page"></zoo-arrow-icon></button></nav></div><template id="dots"><div class="page-element-dots">...</div></template><template id="pages"><button type="button" class="page-element"></button></template>`;
		registerComponents(ArrowDownIcon);
		this.prev = this.shadowRoot.querySelector('.prev');
		this.next = this.shadowRoot.querySelector('.next');
		this.dots = this.shadowRoot.querySelector('#dots').content;
		this.pages = this.shadowRoot.querySelector('#pages').content;

		this.shadowRoot.addEventListener('click', e => {
			const pageNumber = e.target.getAttribute('page');
			if (pageNumber) {
				this.goToPage(pageNumber);
			} else if (e.target.classList.contains('prev')) {
				this.goToPage(+this.getAttribute('currentpage')-1);
			} else if (e.target.classList.contains('next')) {
				this.goToPage(+this.getAttribute('currentpage')+1);
			}
		});
	}

	goToPage(pageNumber) {
		this.setAttribute('currentpage', pageNumber);
		this.dispatchEvent(new CustomEvent('pageChange', {
			detail: {pageNumber: pageNumber}, bubbles: true, composed: true
		}));
	}

	static get observedAttributes() {
		return ['maxpages', 'currentpage', 'prev-page-title', 'next-page-title'];
	}
	handleHideShowArrows() {
		if (this.getAttribute('currentpage') == 1) {
			this.prev.classList.add('hidden');
		} else {
			this.prev.classList.remove('hidden');
		}
		if (+this.getAttribute('currentpage') >= +this.getAttribute('maxpages')) {
			this.next.classList.add('hidden');
		} else {
			this.next.classList.remove('hidden');
		}
	}
	rerenderPageButtons() {
		this.shadowRoot.querySelectorAll('*[class^="page-element"]').forEach(n => n.remove());
		const pageNum = +this.getAttribute('currentpage');
		const maxPages = this.getAttribute('maxpages');
		for (let page=maxPages;page>0;page--) {
			//first, previous, current, next or last page
			if (page == 1 || page == pageNum - 1 || page == pageNum || page == pageNum + 1 || page == maxPages) {
				const pageNode = this.pages.cloneNode(true).firstElementChild;
				pageNode.setAttribute('page', page);
				pageNode.setAttribute('title', page);
				if (pageNum == page) {
					pageNode.classList.add('active');
				}
				pageNode.textContent = page;
				this.prev.after(pageNode);
			} else if (page == pageNum-2 || pageNum+2 == page) {
				this.prev.after(this.dots.cloneNode(true));
			}
		}
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'currentpage' || attrName == 'maxpages') {
			this.handleHideShowArrows();
			this.rerenderPageButtons();
		} else if (attrName === 'prev-page-title') {
			this.shadowRoot.querySelector('.prev zoo-arrow-icon').setAttribute('title', newVal);
		} else if (attrName === 'next-page-title') {
			this.shadowRoot.querySelector('.next zoo-arrow-icon').setAttribute('title', newVal);
		}
	}
}
if (!window.customElements.get('zoo-paginator')) {
	window.customElements.define('zoo-paginator', Paginator);
}

export { Paginator };
//# sourceMappingURL=paginator.js.map
