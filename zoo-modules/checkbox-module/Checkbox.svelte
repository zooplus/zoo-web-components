<svelte:options tag="zoo-checkbox"></svelte:options>
<div class="box" class:disabled="{_slottedInput && _slottedInput.disabled}" on:click="{e => handleClick(e)}">
	<div class="checkbox" class:clicked="{_clicked}" class:highlighted="{highlighted}" class:error="{!valid}">
		<slot name="checkboxelement" bind:this={_inputSlot}></slot>
		<svg class="check" viewBox="0 0 24 24" width="22" height="22"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
		<slot name="checkboxlabel" bind:this={_labelSlot}>
			<label>{labeltext}</label>
		</slot>
	</div>
	<zoo-input-info {valid} {inputerrormsg} {infotext}></zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	
	:host {
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
		padding: 11px 15px;
	}

	.highlighted {
		border: $stroked-box-grey-light;
		border-radius: $input-border-radius;

		&.clicked {
			border: $stroked-box-success-bold;
		}

		&.error {
			border: $stroked-box-warning-bold;
		}

		&.error, &.clicked {
			padding: 10px 14px;
		}
	}

	label {
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
		min-width: 24px;
		height: 24px;
		border-radius: 3px;
		border: $stroked-box-grey;
		margin: 0 10px 0 0;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		outline: none;
		cursor: pointer;
	}

	::slotted(input[type="checkbox"]:checked) {
		border: $stroked-box-success;
	}

	::slotted(input[type="checkbox"]:focus) {
		border-width: 2px;
	}

	::slotted(input[type="checkbox"]:disabled) {
		border-color: $grey-light;
		background-color: $grey-ultralight;
		cursor: not-allowed;
	}

	.check {
		display: none;
		position: absolute;
		margin: 1px;
	}

	.clicked .check {
		display: flex;
		fill: var(--primary-mid, #{$primary-mid});
	}

	.disabled .check {
		fill: $grey-mid;
	}

	.error .check {
		fill: var(--warning-mid, #{$warning-mid});
	}

	.error {
		::slotted(input[type="checkbox"]), ::slotted(input[type="checkbox"]:checked) {
			border-color: var(--warning-mid, #{$warning-mid});
		}
	}

	::slotted(label) {
		display: flex;
		align-items: center;
		cursor: pointer;
	}

	.disabled, .disabled ::slotted(label) {
		cursor: not-allowed;
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

	const handleClick = e => {
		// browser should handle it
		if (e.target == _labelSlot.assignedNodes()[0]) {
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
		_inputSlot.addEventListener('keypress', e => {
			if (e.keyCode === 13) {
				_slottedInput.click();
			}
		});
	});
</script>