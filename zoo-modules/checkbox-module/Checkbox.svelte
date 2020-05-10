<svelte:options tag="zoo-checkbox"></svelte:options>
<div class="box {_clicked ? 'clicked':''} {highlighted ? 'highlighted':''} {_focused ? 'focused':''}" class:error="{!valid}" class:disabled="{disabled}" on:click="{e => handleClick(e)}">
	<label class="input-slot">
		<slot name="checkboxelement" on:click="{e => handleSlotClick(e)}" bind:this={_inputSlot}></slot>
		<span class="input-label">
			{labeltext}
		</span>
	</label>
	<zoo-input-info class="input-info" valid="{valid}" inputerrormsg="{inputerrormsg}" infotext="{infotext}"></zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	
	:host {
		margin-top: 21px;
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
			padding: 12px 15px;

			&.clicked {
				border: $stroked-box-success-bold;
			}

			&.error {
				border: $stroked-box-warning-bold;
			}
		}

		&.disabled {
			cursor: not-allowed;

			.input-slot {
				cursor: not-allowed;
			}
		}

		.input-slot {
			width: 100%;
			display: flex;
			flex-direction: row;
			cursor: pointer;

			.input-label {
				display: flex;
				align-items: center;
				position: relative;
				left: 5px;
			}
		}
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
		border: $stroked-box-success-bold;
		background: white;
	}

	::slotted(input[type="checkbox"]:checked)::before {
		background: white;
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

	::slotted(input[type="checkbox"]:checked.error)::after {
		color: var(--warning-mid, #{$warning-mid});
	}

	::slotted(input[type="checkbox"]:disabled)::before {
		border-color: $grey-light;
		background-color: $grey-ultralight;
	}

	::slotted(input[type="checkbox"]:disabled)::after {
		color: $grey-mid;
	}

	::slotted(input[type="checkbox"].error)::before {
		border-color: var(--warning-mid, #{$warning-mid});
		transition: border-color 0.3s ease;
	}
</style>

<script>
	import { beforeUpdate, onMount } from 'svelte';

	export let labeltext = '';
	export let valid = true;
	export let disabled = false;
	export let highlighted = false;
	export let inputerrormsg = '';
	export let infotext = '';
	let _clicked = false;
	let _slottedInput;
	let _prevValid;
	let _inputSlot;
	let _focused = false;

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

	const changeValidState = (state) => {
		if (_slottedInput) {
			if (state === false) {
				_slottedInput.classList.add("error");
			} else if (state === true) {
				_slottedInput.classList.remove("error");
			}
		}
	}

	beforeUpdate(() => {
		if (valid != _prevValid) {
			_prevValid = valid;
			changeValidState(valid);
		}
	});
	  
	onMount(() => {
		_inputSlot.addEventListener("slotchange", () => {
			_slottedInput = _inputSlot.assignedNodes()[0];
			_slottedInput.addEventListener('focus', () => {
				_focused = true;
			});
			_slottedInput.addEventListener('blur', () => {
				_focused = false;
			});
			if (_slottedInput.checked) {
				_clicked = true;
			}
			if (_slottedInput.disabled) {
				disabled = true;
			}
			changeValidState(valid);
		});
		_inputSlot.addEventListener('keypress', e => {
			if (e.keyCode === 13) {
				_slottedInput.click();
			}
		});
	});
</script>