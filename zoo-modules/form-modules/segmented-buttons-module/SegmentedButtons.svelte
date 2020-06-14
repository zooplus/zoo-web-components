<svelte:options tag="zoo-segmented-buttons"/>
<div>
	<slot bind:this={btnSlot}></slot>
</div>

<style type='text/scss'>
	@import 'variables';

	:host {
		display: flex;
		height: 46px;
	}

	div {
		display: flex;
		justify-content: space-between;
		width: 100%;
		height: 100%;
		border: 1px solid;
		border-radius: 5px;
		padding: 2px;
	}

	::slotted(zoo-button) {
		display: inline-flex;
		flex-grow: 1;
	}

	::slotted(zoo-button[type="primary"]) {
		padding: 0 2px;
	}

</style>

<script>
	import { onMount } from 'svelte'; 
	let btnSlot;
	let prevActiveBtn;
	onMount(() => {
		btnSlot.addEventListener('slotchange', () => {
			const buttons = btnSlot.assignedNodes().filter(e => e.tagName === 'ZOO-BUTTON');
			for (const btn of buttons) {
				if (!btn.hasAttribute('type')) {
					btn.setAttribute('type', 'empty');
				}
				if (btn.getAttribute('type') !== 'empty') {
					prevActiveBtn = btn;
				}
			}
			btnSlot.getRootNode().host.addEventListener('click', e => {
				if (buttons.includes(e.target)) {
					if (prevActiveBtn) {
						prevActiveBtn.setAttribute('type', 'empty');
					}
					prevActiveBtn = e.target;
					prevActiveBtn.setAttribute('type', 'primary');
				}
			});
		});
	});
</script>