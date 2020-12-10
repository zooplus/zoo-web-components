/**
 * @injectHTML
 */
export default class Paginator extends HTMLElement {
	constructor() {
		super();
		this.prev = this.shadowRoot.querySelector('.btn.prev');
		this.next = this.shadowRoot.querySelector('.btn.next');
	}

	connectedCallback() {
		this.prev.addEventListener('click', () => this.goToPage(+this.getAttribute('currentpage')-1));
		this.next.addEventListener('click', () => this.goToPage(+this.getAttribute('currentpage')+1));
		this.shadowRoot.querySelector('.paging').addEventListener('click', e => {
			const target = e.target.getAttribute('page');
			if (target) {
				this.goToPage(target);
			}
		});
	}
	goToPage(pageNumber) {
		this.setAttribute('currentpage', pageNumber);
		this.dispatchEvent(new CustomEvent('pageChange', {
			detail: {pageNumber: pageNumber}, bubbles: true, compose: true
		}));
	}

	static get observedAttributes() {
		return ['maxpages', 'currentpage'];
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
		const root = this.shadowRoot;
		const oldNodes = root.querySelectorAll('.temp');
		for (const node of oldNodes) {
			node.remove();
		}
		const pageNum = +this.getAttribute('currentpage');
		const dots = root.querySelector('#dots').content;
		const pages = root.querySelector('#pages').content;
		const maxPages = this.getAttribute('maxpages');
		for (let page=maxPages;page>0;page--) {
			//first, previous, current, next or last page
			if (page == 1 || page == pageNum - 1 || page == pageNum || page == pageNum + 1 || page == maxPages) {
				const pageNode = pages.cloneNode(true).firstElementChild;
				pageNode.setAttribute('page', page);
				if (pageNum == page) {
					pageNode.classList.add('active');
				}
				pageNode.innerHTML = page;
				this.prev.parentNode.insertBefore(pageNode, this.prev.nextSibling);
			} else if (page == pageNum-2 || pageNum+2 == page) {
				this.prev.parentNode.insertBefore(dots.cloneNode(true), this.prev.nextSibling);
			}
		}
	}
	attributeChangedCallback(attrName, oldVal, newVal) {
		if (oldVal == newVal) return;
		if (attrName == 'currentpage' || attrName == 'maxpages') {
			this.handleHideShowArrows();
			if (oldVal != newVal) {
				this.rerenderPageButtons();
			}
		}
	}
}
window.customElements.define('zoo-paginator', Paginator);