class GridHeader extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		let replaceMe;
		this.prev = shadowRoot.querySelector('.btn.prev');
		this.next = shadowRoot.querySelector('.btn.next');
	}

	connectedCallback() {
		const root = this.shadowRoot;
		const arrowTemplateContent = root.querySelector('#arrow').content;
		this.prev.appendChild(arrowTemplateContent.cloneNode(true));
		this.next.appendChild(arrowTemplateContent.cloneNode(true));
		this.prev.addEventListener('click', () => this.goToPage(+this.currentpage-1));
		this.next.addEventListener('click', () => this.goToPage(+this.currentpage+1));
		this.shadowRoot.querySelector('.paging').addEventListener('click', e => {
			const target = e.target.getAttribute('page');
			if (target) {
				this.goToPage(target);
			}
		});
	}
	goToPage(pageNumber) {
		this.currentpage = pageNumber;
		this.shadowRoot.host.dispatchEvent(new CustomEvent('pageChange', {
			detail: {pageNumber: pageNumber}, bubbles: true, compose: true
		}));
	}

	static get observedAttributes() {
		return ['maxpages', 'currentpage'];
	}
	get maxpages() {
		return this.getAttribute('maxpages');
	}
	set maxpages(maxpages) {
		if (maxpages) {
			this.setAttribute('maxpages', maxpages);
		} else {
			this.removeAttribute('maxpages');
		}
	}
	get currentpage() {
		return this.getAttribute('currentpage');
	}
	set currentpage(currentpage) {
		if (currentpage) {
			this.setAttribute('currentpage', currentpage);
		} else {
			this.removeAttribute('currentpage');
		}
	}
	handleHideShowArrows() {
		if (this.currentpage == 1) {
			this.prev.classList.add('hidden');
		} else {
			this.prev.classList.remove('hidden');
		}
		if (+this.currentpage >= +this.maxpages) {
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
		const pageNum = +this.currentpage;
		const dots = root.querySelector('#dots').content;
		const pages = root.querySelector('#pages').content;
		for (let page=this.maxpages;page>0;page--) {
			//first, previous, current, next or last page
			if (page == 1 || page == pageNum - 1 || page == pageNum || page == pageNum + 1 || page == this.maxpages) {
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
window.customElements.define('zoo-grid-paginator', GridHeader);