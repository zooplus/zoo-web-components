<svelte:options tag="zoo-collapsable-list"/>
<slot bind:this={itemSlot}></slot>

<style>
	:host {
		display: flex;
		flex-direction: column;
	}
</style>

<script>
	import { onMount } from 'svelte';
	let itemSlot;
	let prevActiveItem;

	onMount(() => {
		itemSlot.addEventListener('slotchange', () => {
			const items = itemSlot.assignedNodes();
			items[0].setAttribute('active', true);
			prevActiveItem = items[0];

			for (const item of items) {
				item.addEventListener('click', () => {
					if (item.hasAttribute('active')) return;
					prevActiveItem.removeAttribute('active');
					prevActiveItem = item;
					item.setAttribute('active', true);
				});
			}
		});
	});
</script>