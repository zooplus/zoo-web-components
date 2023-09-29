/**
 * @injectHTML
 */
class Toast extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:none;top:20px;right:20px;position:fixed;z-index:var(--zoo-toast-z-index,10001);contain:layout;--color-ultralight:var(--info-ultralight);--color-mid:var(--info-mid);--svg-padding:0}:host([type=error]){--color-ultralight:var(--warning-ultralight);--color-mid:var(--warning-mid)}:host([type=success]){--color-ultralight:var(--primary-ultralight);--color-mid:var(--primary-mid)}div{max-width:330px;min-height:50px;box-shadow:0 5px 5px -3px rgb(0 0 0 / 20%),0 8px 10px 1px rgb(0 0 0 / 14%),0 3px 14px 2px rgb(0 0 0 / 12%);border-left:3px solid var(--color-mid);display:flex;align-items:center;word-break:break-word;font-size:14px;line-height:20px;padding:15px;transition:transform .3s,opacity .4s;opacity:0;transform:translate3d(100%,0,0);background:var(--color-ultralight);border-radius:5px}svg{padding-right:10px;min-width:48px;fill:var(--color-mid)}.show{opacity:1;transform:translate3d(0,0,0)}</style><div><svg width="30" height="30" viewBox="0 0 24 24"><path d="M14.2 21c.4.1.6.6.5 1a2.8 2.8 0 01-5.4 0 .7.7 0 111.4-.5 1.3 1.3 0 002.6 0c.1-.4.5-.6 1-.5zM12 0c.4 0 .8.3.8.8v1.5c4.2.4 7.4 3.9 7.4 8.2 0 3 .3 5.1.8 6.5l.4 1v.2c.6.4.3 1.3-.4 1.3H3c-.6 0-1-.7-.6-1.2.1-.2.4-.6.6-1.5.5-1.5.7-3.6.7-6.3 0-4.3 3.3-7.8 7.6-8.2V.8c0-.5.3-.8.7-.8zm0 3.8c-3.7 0-6.7 3-6.8 6.7a24.2 24.2 0 01-1 7.5h15.5l-.2-.5c-.5-1.6-.8-3.8-.8-7 0-3.7-3-6.8-6.7-6.8z"/></svg><slot name="content"></slot></div>`;
	}
	
	connectedCallback() {
		this.hidden = true;
		this.timeout = this.getAttribute('timeout') || 3;
		this.setAttribute('role', 'alert');
	}
	
	show() {
		if (!this.hidden) return;
		this.style.display = 'block';
		this.timeoutVar = setTimeout(() => {
			this.hidden = !this.hidden;
			this.toggleToastClass();
			this.timeoutVar = setTimeout(() => {
				if (this && !this.hidden) {
					this.hidden = !this.hidden;
					this.timeoutVar = setTimeout(() => {this.style.display = 'none';}, 300);
					this.toggleToastClass();
				}
			}, this.timeout * 1000);
		}, 30);
	}
	close() {
		if (this.hidden) return;
		clearTimeout(this.timeoutVar);
		setTimeout(() => {
			if (this && !this.hidden) {
				this.hidden = !this.hidden;
				setTimeout(() => {this.style.display = 'none';}, 300);
				this.toggleToastClass();
			}
		}, 30);
	}

	toggleToastClass() {
		const toast = this.shadowRoot.querySelector('div');
		toast.classList.toggle('show');
	}
}

if (!window.customElements.get('zoo-toast')) {
	window.customElements.define('zoo-toast', Toast);
}

export { Toast };
//# sourceMappingURL=toast.js.map
