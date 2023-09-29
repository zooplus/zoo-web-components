/**
 * @injectHTML
 */
class Tooltip extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>.tip,.tooltip-content{background:#fff;box-shadow:0 4px 15px 0 rgb(0 0 0 / 10%)}:host{display:grid;position:absolute;width:max-content;z-index:var(--zoo-tooltip-z-index,9997);pointer-events:none;color:#000;--tip-bottom:0;--tip-right:unset;--tip-justify:center}:host([position=top]){bottom:170%;--tip-bottom:calc(0% - 8px)}:host([position=right]){justify-content:end;left:102%;bottom:25%;--tip-bottom:unset;--tip-justify:start;--tip-right:calc(100% - 8px)}:host([position=bottom]){bottom:-130%;--tip-bottom:calc(100% - 8px)}:host([position=left]){justify-content:start;left:-101%;bottom:25%;--tip-bottom:unset;--tip-justify:end;--tip-right:-8px}.tip{justify-self:var(--tip-justify);align-self:center;position:absolute;width:16px;height:16px;transform:rotate(45deg);z-index:-1;right:var(--tip-right);bottom:var(--tip-bottom)}.tooltip-content{display:grid;padding:10px;font-size:12px;line-height:16px;font-weight:initial;position:relative;border-radius:5px;pointer-events:initial}.tooltip-content span{white-space:pre}</style><div class="tooltip-content"><slot></slot><div class="tip"></div></div>`;
	}
}

if (!window.customElements.get('zoo-tooltip')) {
	window.customElements.define('zoo-tooltip', Tooltip);
}

export { Tooltip };
//# sourceMappingURL=tooltip.js.map
