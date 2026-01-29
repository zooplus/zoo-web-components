/**
 * @injectHTML
 */
class GridRow extends HTMLElement {
	constructor() {
		super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{contain:layout;position:relative;flex-wrap:wrap;--grid-column-sizes:1fr}::slotted([slot=row-details]){display:var(--zoo-grid-row-display,grid);grid-template-columns:var(--grid-details-column-sizes,repeat(var(--grid-column-num),minmax(50px,1fr)));min-height:50px;align-items:center;flex:1 0 100%}::slotted([slot=row-content]){height:0;overflow:hidden;background-color:#fff;padding:0 10px;width:100%}::slotted([slot=row-content][expanded]){height:var(--grid-row-content-height,auto);border-bottom:2px solid rgb(0 0 0 / 20%);padding:10px;margin:4px}</style><slot name="row-details"></slot><slot name="row-content"></slot>`;
	}
}

if (!window.customElements.get('zoo-grid-row')) {
	window.customElements.define('zoo-grid-row', GridRow);
}

export { GridRow };
//# sourceMappingURL=grid-row.js.map
