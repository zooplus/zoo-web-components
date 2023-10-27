/**
 * @injectHTML
 */
class Button extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:flex;max-width:330px;min-height:36px;position:relative;--color-light:var(--primary-light);--color-mid:var(--primary-mid);--color-dark:var(--primary-dark);--text-normal:white;--text-active:white;--background:linear-gradient(to right, var(--color-mid), var(--color-light));--border:0}:host([type=secondary]){--color-light:var(--secondary-light);--color-mid:var(--secondary-mid);--color-dark:var(--secondary-dark)}:host([type=hollow]){--text-normal:var(--color-mid);--background:transparent;--border:2px solid var(--color-mid)}:host([type=grayscale]){--background:transparent;--color-mid:transparent;--color-dark:transparent;--border:0;--text-normal:#767676;--text-active:#9E9E9E}:host([type=transparent]){--text-normal:var(--color-mid);--background:transparent}::slotted(button){display:flex;align-items:center;justify-content:center;color:var(--text-normal);border:var(--border);border-radius:5px;cursor:pointer;width:100%;min-height:100%;font-size:14px;line-height:20px;font-weight:700;background:var(--background)}::slotted(button:focus),::slotted(button:hover){background:var(--color-mid);color:var(--text-active)}::slotted(button:active){background:var(--color-dark);color:var(--text-active)}::slotted(button:disabled){cursor:not-allowed;--background:var(--input-disabled, #F2F3F4);--color-mid:var(--input-disabled, #F2F3F4);--color-dark:var(--input-disabled, #F2F3F4);--text-normal:#767676;--text-active:#767676;--border:1px solid #E6E6E6}</style><slot></slot>`;
	}
}
if (!window.customElements.get('zoo-button')) {
	window.customElements.define('zoo-button', Button);
}

export { Button };
//# sourceMappingURL=button.js.map
