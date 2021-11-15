import { CollapsableListItem } from '../collapsable-list-item/collapsable-list-item.js';
import { registerComponents } from '../../common/register-components.js';

/**
 * @injectHTML
 */
export class CollapsableList extends HTMLElement {
	constructor() {
		super();
		registerComponents(CollapsableListItem);
		const slot = this.shadowRoot.querySelector('slot');
		slot.addEventListener('slotchange', () => {
			const items = slot.assignedElements();

			items.forEach(item => item.addEventListener('toggle', e => {
				if (!e.detail || this.hasAttribute('disable-autoclose')) return;
				items.forEach(i => !i.isEqualNode(item) && i.close());
			}));


			items.forEach((item) => {
				if (item.hasAttribute('opened-by-default')) {
					item.details.open = true;
				}
			});
		});
	}
}
if (!window.customElements.get('zoo-collapsable-list')) {
	window.customElements.define('zoo-collapsable-list', CollapsableList);
}