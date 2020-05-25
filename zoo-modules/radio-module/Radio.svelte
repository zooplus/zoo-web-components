<svelte:options tag="zoo-radio"></svelte:options>
<div class="box">
	<zoo-input-label {labeltext}></zoo-input-label>
	<span class="template-slot {valid ? '' : 'error'}">
		<slot bind:this={_templateSlot}></slot>
	</span>
	<zoo-input-info {valid} inputerrormsg="{errormsg}" {infotext}></zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";

	:host {
		display: flex;
		flex-direction: column;
	}

	.template-slot {
		display: flex;
		padding: 11px 0;
		font-size: $p1-size;
		line-height: $p1-line-height;
	}

	::slotted(input[type="radio"]) {
		position: relative;
		border: $stroked-box-grey;
		border-color: var(--primary-mid, #{$primary-mid});
		min-width: 24px;
		height: 24px;
		border-radius: 50%;
		margin: 0 2px 0 0;
		padding: 3px;
		background-clip: content-box;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		outline: none;
		cursor: pointer;
	}

	::slotted(input[type="radio"]:focus) {
		border-width: 2px;
	}

	::slotted(input[type="radio"]:checked) {
		background-color: var(--primary-mid, #{$primary-mid});
	}

	::slotted(input[type="radio"]:disabled) {
		cursor: not-allowed;
		border-color: $grey-mid;
		background-color: $grey-light;
	}

	.error ::slotted(input[type="radio"]:checked) {
		background-color: var(--warning-mid, #{$warning-mid});
	}

	.error ::slotted(input[type="radio"]) {
		border-color: var(--warning-mid, #{$warning-mid});
	}

	::slotted(label) {
		cursor: pointer;
		margin: 0 5px;
		align-self: center;
	}

	.error ::slotted(label) {
		color: var(--warning-mid, #{$warning-mid});
	}
</style>

<script>
	import { onMount } from 'svelte';

	export let valid = true;
	export let errormsg = '';
	export let infotext = '';
	export let labeltext = '';
	let _templateSlot;
	let clone;
	  
	onMount(() => {
		// todo support multiple slots
		_templateSlot.addEventListener("slotchange", () => {
			if (!clone) {
				const template = _templateSlot.assignedNodes()[0];
				if (template.content) {
					clone = template.content.cloneNode(true);
					_templateSlot.getRootNode().querySelector('slot').assignedNodes()[0].remove();
					_templateSlot.getRootNode().host.appendChild(clone);
				}
			}
		});
	});
</script>