<svelte:options tag="zoo-checkbox"></svelte:options>
<div class="box {_clicked ? 'clicked':''} {highlighted ? 'highlighted':''}" class:error="{!valid}" class:disabled="{disabled}" on:click="{e => handleClick(e)}">
	<label class="input-slot">
		<slot name="checkboxelement" on:click="{e => handleSlotClick(e)}" bind:this={_inputSlot}></slot>
		<span class="input-label">
			{labeltext}
		</span>
	</label>
	<zoo-input-info class="input-info" valid="{valid}" {inputerrormsg} {infotext}></zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	
	:host {
		margin-top: 21px;
		contain: layout;
	}

	.box {
		width: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
		box-sizing: border-box;
		cursor: pointer;

		&.highlighted {
			border: $stroked-box-grey-light;
			border-radius: $input-border-radius;
			padding: 6px 15px;

			&.clicked {
				border: $stroked-box-success-bold;
				padding: 5px 14px;

				.input-slot .input-label {
					left: 8px;
				}
			}

			&.error {
				border: $stroked-box-warning-bold;
				padding: 5px 14px;
			}
		}

		&.disabled {
			cursor: not-allowed;

			.input-slot {
				cursor: not-allowed;
			}
		}

	}

	.input-slot {
		width: 100%;
		display: flex;
		flex-direction: row;
		cursor: pointer;
		align-items: center;
		font-size: $p1-size;
		line-height: $p1-line-height;
	}

	.input-label {
		display: flex;
		align-items: center;
		position: relative;
		left: 10px;
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

	.box.error {
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
	export let disabled = false;
	export let highlighted = false;
	export let inputerrormsg = '';
	export let infotext = '';
	let _clicked = false;
	let _slottedInput;
	let _inputSlot;

	const handleClick = (event) => {
		if (disabled) {
			event.preventDefault();
			return;
		}
		event.stopImmediatePropagation();
		_slottedInput.click();
	};

	const handleSlotClick = (event) => {
		if (disabled) {
			event.preventDefault();
			return;
		}
		_clicked = !_clicked;
		event.stopImmediatePropagation();
	};
	  
	onMount(() => {
		_inputSlot.addEventListener("slotchange", () => {
			_slottedInput = _inputSlot.assignedNodes()[0];
			if (_slottedInput.checked) {
				_clicked = true;
			}
			if (_slottedInput.disabled) {
				disabled = true;
			}
		});
		_inputSlot.addEventListener('keypress', e => {
			if (e.keyCode === 13) {
				_slottedInput.click();
			}
		});
	});
</script>