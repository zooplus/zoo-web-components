<svelte:options tag="zoo-checkbox"></svelte:options>
<div class="box" class:disabled="{_slottedInput && _slottedInput.disabled}" on:click="{e => handleClick(e)}">
	<div class="checkbox" class:clicked="{_clicked}" class:highlighted="{highlighted}" class:error="{!valid}">
		<slot name="checkboxelement" bind:this={_inputSlot}></slot>
		<slot name="checkboxlabel" bind:this={_labelSlot}>
			<span>{labeltext}</span>
		</slot>
	</div>
	<zoo-input-info {valid} {inputerrormsg} {infotext}></zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	
	:host {
		contain: layout;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
	}

	.box {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		box-sizing: border-box;
		cursor: pointer;
		font-size: $p1-size;
		line-height: $p1-line-height;
	}

	.checkbox {
		display: flex;
		width: 100%;
		box-sizing: border-box;
		padding: 6px 0;
	}

	.highlighted {
		border: $stroked-box-grey-light;
		border-radius: $input-border-radius;
		padding: 6px 15px;

		&.clicked {
			border: $stroked-box-success-bold;
		}

		&.error {
			border: $stroked-box-warning-bold;
		}

		&.error, &.clicked {
			padding: 5px 14px;
		}
	}

	span {
		display: flex;
		align-items: center;
	}

	zoo-input-info {
		display: flex;
		align-self: flex-start;
		margin-top: 2px;
	}
	
	::slotted(input[type="checkbox"]) {
		position: relative;
		display: flex;
		margin: 0 10px 0 0;
		-webkit-appearance: none;
		-moz-appearance: none;
		outline: none;
		cursor: pointer;
	}

	::slotted(input[type="checkbox"]:checked), ::slotted(input[type="checkbox"]:focus) {
		margin: 0 9px 0 0;
	}

	::slotted(input[type="checkbox"])::before {
		display: inline-block;
		width: 24px;
		height: 24px;
		content: "";
		border-radius: 3px;
		border: $stroked-box-grey;
		background: transparent;
		margin: 1px;
	}

	::slotted(input[type="checkbox"]:focus)::before {
		border: $stroked-box-grey-bold;
		margin: 0 1px 0 0;
	}

	::slotted(input[type="checkbox"]:checked)::before {
		border: $stroked-box-success-bold;
		margin: 0 1px 0 0;
	}

	::slotted(input[type="checkbox"]:checked)::after {
		content: "";
		position: absolute;
		top: 4px;
		left: 10px;
		width: 6px;
		height: 14px;
		border-bottom: 2px solid;
		border-right: 2px solid;
		transform: rotate(40deg);
		color: var(--primary-mid, #{$primary-mid});
	}

	::slotted(input[type="checkbox"]:disabled) {
		cursor: not-allowed;
	}

	::slotted(input[type="checkbox"]:disabled)::before {
		border-color: $grey-light;
		background-color: $grey-ultralight;
	}

	::slotted(input[type="checkbox"]:disabled)::after {
		color: $grey-mid;
	}

	::slotted(label) {
		display: flex;
		align-items: center;
		cursor: pointer;
	}

	.disabled, .disabled ::slotted(label) {
		cursor: not-allowed;
	}

	.error {
		::slotted(input[type="checkbox"])::before {
			border-color: var(--warning-mid, #{$warning-mid});
		}

		::slotted(input[type="checkbox"]:checked)::after {
			color: var(--warning-mid, #{$warning-mid});
		}
	}
</style>

<script>
	import { onMount } from 'svelte';

	export let labeltext = '';
	export let valid = true;
	export let highlighted = false;
	export let inputerrormsg = '';
	export let infotext = '';
	let _clicked = false;
	let _slottedInput;
	let _inputSlot;
	let _labelSlot;
	let labelPresent = false;

	const handleClick = e => {
		// browser should handle it
		if (labelPresent) {
			_clicked = _slottedInput.checked;
			return;
		}
		// replicate browser behaviour
		if (_slottedInput.disabled) {
			e.preventDefault();
			return;
		}
		if (e.target != _slottedInput) {
			_slottedInput.checked = !_slottedInput.checked;
		}
		_clicked = _slottedInput.checked;
	};
	  
	onMount(() => {
		// todo support multiple slots
		_inputSlot.addEventListener("slotchange", () => {
			_slottedInput = _inputSlot.assignedNodes()[0];
			_clicked = _slottedInput.checked;
		});
		_labelSlot.addEventListener("slotchange", () => labelPresent = _labelSlot.assignedNodes()[0] ? true : false);
		_inputSlot.addEventListener('keypress', e => {
			if (e.keyCode === 13) {
				_slottedInput.click();
			}
		});
	});
</script>