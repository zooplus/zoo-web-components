<svelte:options tag="zoo-log-input"></svelte:options>
<div class="box {labelposition}">
	<zoo-log-input-label class="input-label" valid="{valid}" labeltext="{labeltext}">
	</zoo-log-input-label>
	<zoo-log-link class="input-link" href="{linkhref}" target="{linktarget}" type="grey" text="{linktext}" textalign="right">
	</zoo-log-link>
	<span class="input-slot">
		<slot bind:this={_inputSlot} name="inputelement"></slot>
		{#if valid}
		<slot name="inputicon"></slot>
		{/if} {#if !valid}
		<svg class="error-triangle" width="35" height="35" viewBox="50 -180 1050 1401">
			<path transform="matrix(1 0 0 -1 0 1e3)" d="m460.31 846.55l-367.78-650.39c-22.02-38.973-2.7578-71.037 43.33-71.037h729.22c46.13 0 65.518 31.78 43.33 71.037l-367.78 650.39c-22.02 38.973-58.164 39.217-80.309 0zm-10.78-193.24h101.83l-10.195-264.16h-81.479l-10.195 264.16h0.041783zm50.935-447.03c-34.597 0-62.676 27.31-62.676 60.959 0 33.649 28.079 60.959 62.676 60.959 34.597 0 62.676-27.31 62.676-60.959 0-33.649-28.079-60.959-62.676-60.959z"/>
		</svg>
		{/if}
	</span>
	<zoo-log-input-info class="input-info" valid="{valid}" inputerrormsg="{inputerrormsg}" infotext="{infotext}">
	</zoo-log-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	@import "input";
	.error-triangle {
	  position: absolute;
	  right: 0;
	  top: 0;
	  padding: 6px;
	  color: $error-text-color;
	  & > path {
		  fill: $error-text-color;
	  }
	}
	//If a single selector is not supported by the browser, then the whole selector list gets ignored.
	.input-slot.style-scope.zoo-log-input > *:first-child {
	  width: 100%;
	  font-size: 14px;
	  line-height: 20px;
	  padding: 13px 35px 13px 15px;
	  border: 1px solid;
	  border-color: $border-color;
	  border-radius: 3px;
	  color: $matterhorn;
	  outline: none;
	  box-sizing: border-box;
	  text-overflow: ellipsis;
	  -moz-appearance: textfield;
	}
	::slotted(input), 
	::slotted(textarea) {
	  width: 100%;
	  font-size: 14px;
	  line-height: 20px;
	  padding: 13px 35px 13px 15px;
	  border: 1px solid;
	  border-color: $border-color;
	  border-radius: 3px;
	  color: $matterhorn;
	  outline: none;
	  box-sizing: border-box;
	  text-overflow: ellipsis;
	  -moz-appearance: textfield;
	}
	::slotted(input)::-webkit-inner-spin-button {
	  -webkit-appearance: none;
	  margin: 0;
	}
	::slotted(input)::-webkit-outer-spin-button {
	  -webkit-appearance: none;
	  margin: 0;
	}
	.input-slot.style-scope.zoo-log-input > *:first-child::placeholder, 
	::slotted(input::placeholder),
	::slotted(textarea::placeholder) {
	  color: $placeholder-color;
	  opacity: 1;
	}
	.input-slot.style-scope.zoo-log-input > *:first-child:disabled, 
	::slotted(input:disabled),
	::slotted(textarea:disabled) {
	  border-color: #e6e6e6;
	  background-color: #f2f3f4;
	  color: #97999c;
	  cursor: not-allowed;
	}
	.input-slot.style-scope.zoo-log-input > *:first-child:focus, 
	::slotted(input:focus),
	::slotted(textarea:focus) {
	  border: 2px solid;
	  padding: 12px 34px 12px 14px;
	}
	.input-slot.style-scope.zoo-log-input > *:first-child.error, 
	::slotted(input.error),
	::slotted(textarea.error) {
	  border: 2px solid;
	  padding: 12px 34px 12px 14px;
	  border-color: $error-text-color;
	}
</style>

<script>
	import { beforeUpdate, onMount } from 'svelte';

	export let labelposition = "top";
	export let labeltext = "";
	export let linktext = "";
	export let linkhref = "";
	export let linktarget = "about:blank";
	export let inputerrormsg = "";
	export let infotext = "";
	export let valid = true;
	let _slottedInput;
	let _prevValid;
	let _inputSlot;

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

	const changeValidState = (valid) => {
		if (_slottedInput) {
			if (valid === false) {
				_slottedInput.classList.add('error');
			} else if (valid) {
				_slottedInput.classList.remove('error');
			}
		}
	}
</script>