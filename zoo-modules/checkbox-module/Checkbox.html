<svelte:options tag="zoo-log-checkbox"></svelte:options>
<div class="checkbox-box {_clicked ? 'clicked':''} {highlighted ? 'highlighted':''}" class:error="{!valid}" class:disabled="{disabled}">
	<label class="input-slot" on:click="{e => handleClick(e)}">
		<slot name="checkboxelement" on:click="{e => handleSlotClick(e)}" bind:this={_inputSlot}></slot>
		<span class="input-label">
			{labeltext}
		</span>
	</label>
</div>

<style type='text/scss'>
	@import "variables";
	.checkbox-box {
	  width: 100%;
	  display: flex;
	  position: relative;
	  box-sizing: border-box;
	  cursor: pointer;
	  &.highlighted {
	    border: 2px solid;
	    border-color: $whisper;
	    border-radius: 3px;
	    padding: 13px 15px;
	  }
	  &.clicked {
	    border-color: $main-color;
	  }
	  &.error {
	    border-color: $error-text-color;
	    .input-slot {
	      .input-label {
	        color: $error-text-color;
	      }
	    }
	  }
	  &.disabled {
	    cursor: not-allowed;
	    .input-slot {
	      cursor: not-allowed;
	      .input-label {
	        color: $grey-chateau;
	      }
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
	  width: 16px;
	  height: 16px;
	  content: "";
	  border-radius: 3px;
	  border: 2px solid #3c9700;
	  background: white;
	}
	::slotted(input[type="checkbox"]:checked)::before {
	  background: $main-color;
	}
	::slotted(input[type="checkbox"]:checked)::after {
	  content: "";
	  position: absolute;
	  top: 3px;
	  left: 7px;
	  width: 4px;
	  height: 8px;
	  border-bottom: 2px solid;
	  border-right: 2px solid;
	  transform: rotate(40deg);
	  color: white;
	}

	::slotted(input[type="checkbox"]:disabled) {
	  cursor: not-allowed;
	}
	::slotted(input[type="checkbox"]:disabled)::before {
	  border-color: $grey;
	  background-color: $whisper;
	}
	::slotted(input[type="checkbox"].error)::before {
	  border-color: $error-text-color;
	}
</style>

<script>
	import { beforeUpdate, onMount } from 'svelte';

	export let labeltext = '';
	export let valid = true;
	export let disabled = false;
	export let highlighted = false;
	let _clicked = false;
	let _slottedInput;
	let _prevValid;
	let _inputSlot;

	const handleClick = (event) => {
		if (disabled) {
			event.stopPropagation();
			event.preventDefault();
			return;
		}
		event.stopImmediatePropagation();
		_clicked = !_clicked;
		_slottedInput.click();
	};

	const handleSlotClick = (event) => {
		if (disabled) {
			event.stopPropagation();
			event.preventDefault();
			return;
		}
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
		_inputSlot.addEventListener("slotchange", e => {
			let nodes = _inputSlot.assignedNodes();
			_slottedInput = nodes[0];
			changeValidState(valid);
	    });
	});
</script>