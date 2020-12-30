/**
 * @injectHTML
 */
export class Paginator extends HTMLElement {
	constructor() {
		super();
		this.prev = this.shadowRoot.querySelector('.prev');
		this.next = this.shadowRoot.querySelector('.next');
		this.dots = this.shadowRoot.querySelector('#dots').content;
		this.pages = this.shadowRoot.querySelector('#pages').content;

		this.prev.addEventListener('click', () => this.goToPage(+this.getAttribute('currentpage')-1));
		this.next.addEventListener('click', () => this.goToPage(+this.getAttribute('currentpage')+1));
		this.shadowRoot.addEventListener('click', e => {
			const target = e.target.getAttribute('page');
			if (target) {
				this.goToPage(target);
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
		return ['maxpages', 'currentpage', 'prevpagetitle', 'nextpagetitle'];
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
				pageNode.innerHTML = page;
				this.prev.nextSibling.before(pageNode);
			} else if (page == pageNum-2 || pageNum+2 == page) {
				this.prev.nextSibling.before(this.dots.cloneNode(true));
			}
		}
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (attrName == 'currentpage' || attrName == 'maxpages') {
			this.handleHideShowArrows();
			this.rerenderPageButtons();
		} else if (attrName === 'prevpagetitle') {
			this.shadowRoot.querySelector('.prev zoo-arrow-icon').setAttribute('title', newVal);
		} else if (attrName === 'nextpagetitle') {
			this.shadowRoot.querySelector('.next zoo-arrow-icon').setAttribute('title', newVal);
		}
	}
}
window.customElements.define('zoo-paginator', Paginator);