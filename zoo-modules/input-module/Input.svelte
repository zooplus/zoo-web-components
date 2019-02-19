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
		<svg class="error-triangle" preserveAspectRatio="xMidYMid meet" viewBox="50 0 1050 1001" height="35" width="35">
			<path transform="matrix(1 0 0 -1 0 1000)" d="M460.3054664541667 846.5536808895833L92.5213660204167 196.1624790124998C70.5011181875 157.1893990333333 89.7636122716667 125.125 135.8515312320834 125.125L865.0685460083333 125.125C911.1982462916666 125.125 930.5860939375 156.9049231749999 908.3987078833334 196.1624790124998L540.6146078666667 846.5536808895833C518.5943596166667 885.5267600345833 482.4510691 885.77059571 460.3054664541667 846.5536808895833zM449.5251552458334 653.3138557779166L551.3531356666667 653.3138557779166L541.1578005166667 389.1584697L459.6787069875 389.1584697L449.4833718375001 653.3138557779166L449.5251552458334 653.3138557779166zM500.4600392458333 206.2816630875C465.8627598625 206.2816630875 437.7838089625 233.5912662416668 437.7838089625 267.240598625C437.7838089625 300.8899310083333 465.8627598625 328.1995341625001 500.4600392458333 328.1995341625001C535.0573144583334 328.1995341625001 563.1362653583334 300.8899310083333 563.1362653583334 267.240598625C563.1362653583334 233.5912662416668 535.0573144583334 206.2816630875 500.4600392458333 206.2816630875z"/>
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