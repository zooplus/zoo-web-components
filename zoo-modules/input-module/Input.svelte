<svelte:options tag="zoo-input"></svelte:options>
<div class="box {labelposition}">
	<zoo-input-label class="input-label" valid="{valid}" labeltext="{labeltext}">
	</zoo-input-label>
	<zoo-link class="input-link" href="{linkhref}" target="{linktarget}" type="grey" text="{linktext}" textalign="right">
	</zoo-link>
	<span class="input-slot {nopadding ? 'no-padding': ''}">
		<slot bind:this={_inputSlot} name="inputelement"></slot>
		{#if valid}
		<slot name="inputicon"></slot>
		{/if} {#if !valid}
		<svg class="error-triangle" width="24" height="24" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
		{/if}
	</span>
	<zoo-input-info class="input-info" valid="{valid}" inputerrormsg="{inputerrormsg}" infotext="{infotext}">
	</zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	@import "input";

	.error-triangle {
		animation: hideshow 0.5s ease;
		position: absolute;
		right: 0;
		top: 0;
		padding: 11px;
		color: $error-text-color;

		& > path {
			fill: $error-text-color;
		}
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

	::slotted(input::placeholder),
	::slotted(textarea::placeholder) {
		color: $placeholder-color;
		opacity: 1;
	}

	::slotted(input:disabled),
	::slotted(textarea:disabled) {
		border-color: #e6e6e6;
		background-color: #f2f3f4;
		color: #97999c;
		cursor: not-allowed;
	}

	::slotted(input:focus),
	::slotted(textarea:focus) {
		border: 2px solid;
		padding: 12px 34px 12px 14px;
	}

	::slotted(input.error),
	::slotted(textarea.error) {
		transition: border-color 0.3s ease;
		border: 2px solid;
		padding: 12px 34px 12px 14px;
		border-color: $error-text-color;
	}

	::slotted(input[type='date']), ::slotted(input[type='time']) {
		-webkit-appearance: none;
	}

	.input-slot.no-padding ::slotted(input) {
		padding: 0;
	}
	@keyframes hideshow {
		0% { opacity: 0; }

		100% { opacity: 1; }
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
	export let nopadding = false;
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
		_inputSlot.addEventListener("slotchange", () => {
			let nodes = _inputSlot.assignedNodes();
			_slottedInput = nodes[0];
			changeValidState(valid);
	    });
	});

	const changeValidState = (valid) => {
		if (_slottedInput) {
			if (!valid) {
				_slottedInput.classList.add('error');
			} else if (valid) {
				_slottedInput.classList.remove('error');
			}
		}
	}
</script>