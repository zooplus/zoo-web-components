import { ArrowDownIcon } from '../../icon/arrow-icon/arrow-icon.js';
import { registerComponents } from '../../common/register-components.js';

/**
 * @injectHTML
 */
export class Paginator extends HTMLElement {
	constructor() {
		super();
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