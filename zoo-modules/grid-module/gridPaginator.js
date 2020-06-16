class GridHeader extends HTMLElement {
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			padding: 10px;
			min-width: inherit;
			border-top: 1px solid #E6E6E6;
		}
	
		.box {
			display: flex;
			font-size: 14px;
			width: max-content;
			right: 10px;
			justify-self: flex-end;
			position: sticky;
		}

		:host(:not[currentpage]) .box {
			display: none;
		}
	
		.paging {
			display: flex;
			align-items: center;
			border: 1px solid #E6E6E6;
			border-radius: 5px;
			margin: 3px 0 3px 20px;
			padding: 0 15px;
		}
	
		.btn {
			display: flex;
			cursor: pointer;
			opacity: 1;
			transition: opacity 0.1s;
		}
		.btn:active {
			opacity: 0.5;
		}
		.btn.hidden {
			display: none;
		}
		.btn.next {
			margin-left: 5px;
		}
		.btn.prev {
			margin-right: 10px;
		}
	
		svg {
			fill: #555555;
		}
	
		.arrow path { fill: var(--primary-mid, #3C9700); }
	
		.page-element {
			cursor: pointer;
		}
		.page-element:hover, .page-element:focus {
			background: #F2F3F4;
		}
		.page-element.active {
			background: var(--primary-ultralight, #EBF4E5);
			color: var(--primary-mid, #3C9700);
		}
	
		.page-element, .page-element-dots {
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 5px;
			margin-right: 5px;
			padding: 4px 8px;
		}
	
		.page-element-dots {
			display: flex;
		}
		.btn.next svg {transform: rotate(-90deg);}
		.btn.prev svg {transform: rotate(90deg);}
		</style>
		<div class="box">
			<slot name="pagesizeselector"></slot>
			<nav class="paging">
				<div class="btn prev"></div>
				<div class="btn next"></div>
			</nav>
		</div>
		<template id="dots">
			<div class="temp page-element-dots">...</div>
		</template>
		<template id="pages">
			<div class="temp page-element"></div>
		</template>
		<template id="arrow">
			<svg class="arrow" width="24" height="24" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
		</template>`;
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