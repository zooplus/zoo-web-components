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
	}

	::slotted(input[type="radio"]) {
		position: relative;
		margin: 0;
		-webkit-appearance: none;
		-moz-appearance: none;
		outline: none;
		cursor: pointer;
	}

	::slotted(input[type="radio"]):focus::before {
		border-color: $grey-dark;
	}

	::slotted(input[type="radio"])::before {
		position: relative;
		display: inline-block;
		width: 16px;
		height: 16px;
		content: "";
		border-radius: 50%;
		border: 2px solid var(--primary-mid, #{$primary-mid});
		background: white;
	}

	::slotted(input[type="radio"]:checked)::before {
		background: white;
	}

	::slotted(input[type="radio"]:checked)::after, ::slotted(input[type="radio"]:focus)::after {
		content: "";
		position: absolute;
		top: 5px;
		left: 5px;
		width: 6px;
		height: 6px;
		transform: rotate(40deg);
		color: var(--primary-mid, #{$primary-mid});
		border: 2px solid;
		border-radius: 50%;
	}

	::slotted(input[type="radio"]:checked)::after {
		background: var(--primary-mid, #{$primary-mid});
	}

	::slotted(input[type="radio"]:focus)::after {
		background: $grey-light;
		color: $grey-light;
	}

	::slotted(input:focus)::before {
		border-color: $grey-dark;
	}

	::slotted(label) {
		cursor: pointer;
		margin: 0 5px;
		align-self: center;
	}

	::slotted(input[type="radio"]:disabled) {
		cursor: not-allowed;
	}

	::slotted(input[type="radio"]:disabled)::before {
		border-color: $grey-mid;
		background-color: $grey-light;
	}

	.template-slot.error {
		::slotted(input[type="radio"])::before {
			border-color: var(--warning-mid, #{$warning-mid});
		}

		::slotted(label) {
			color: var(--warning-mid, #{$warning-mid});
		}
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