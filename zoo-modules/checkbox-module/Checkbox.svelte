<svelte:options tag="zoo-checkbox"></svelte:options>
<div class="box" class:disabled="{_slottedInput && _slottedInput.disabled}" on:click="{e => handleClick(e)}">
	<div class="checkbox" class:clicked="{_clicked}" class:highlighted="{highlighted}" class:error="{!valid}">
		<slot name="checkboxelement" on:click="{e => handleSlotClick(e)}" bind:this={_inputSlot}></slot>
		<span>{labeltext}</span>
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
		margin-bottom: 2px;
		position: relative;
		box-sizing: border-box;
		cursor: pointer;
		font-size: $p1-size;
		line-height: $p1-line-height;

		&.disabled {
			cursor: not-allowed;
		}
	}

	.checkbox {
		display: flex;
		width: 100%;
		box-sizing: border-box;
		padding: 6px 15px;


		&.clicked {
			padding: 4px 14px;

			span {
				left: 8px;
			}
		}

		&.error {
			padding: 5px 14px;

			&.clicked {
				padding: 4px 14px;
			}
		}
	}

	.highlighted {
		border: $stroked-box-grey-light;
		border-radius: $input-border-radius;

		&.clicked {
			border: $stroked-box-success-bold;
		}
	}

	.highlighted.error {
		border: $stroked-box-warning-bold;
	}

	span {
		display: flex;
		align-items: center;
		position: relative;
		left: 10px;
	}

	zoo-input-info {
		display: flex;
		align-self: flex-start;
		margin-top: 2px;
	}
	
	::slotted(input[type="checkbox"]) {
		position: relative;
		margin: 0;
		-webkit-appearance: none;
		-moz-appearance: none;
		outline: none;
		cursor: pointer;
	}

	::slotted(input[type="checkbox"])::before {
		position: relative;
		display: inline-block;
		width: 24px;
		height: 24px;
		content: "";
		border-radius: 3px;
		border: $stroked-box-grey;
		background: transparent;
	}

	::slotted(input[type="checkbox"]:focus)::before {
		border: $stroked-box-grey-bold;
	}

	::slotted(input[type="checkbox"]:checked)::before {
		background: transparent;
		border: $stroked-box-success-bold;
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

	.error {
		::slotted(input[type="checkbox"])::before {
			border-color: var(--warning-mid, #{$warning-mid});
			transition: border-color 0.3s ease;
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

	const handleClick = (event) => {
		if (_slottedInput.disabled) {
			event.preventDefault();
			return;
		}
		event.stopImmediatePropagation();
		_slottedInput.click();
	};

	const handleSlotClick = (event) => {
		if (_slottedInput.disabled) {
			event.preventDefault();
			return;
		}
		_clicked = !_clicked;
		event.stopImmediatePropagation();
	};
	  
	onMount(() => {
		// todo support multiple slots
		_inputSlot.addEventListener("slotchange", () => _slottedInput = _inputSlot.assignedNodes()[0]);
		_inputSlot.addEventListener('keypress', e => {
			if (e.keyCode === 13) {
				_slottedInput.click();
			}
		});
	});
</script>