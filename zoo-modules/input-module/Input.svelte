<svelte:options tag="zoo-input"></svelte:options>
<div class="box {labelposition} {linkAbsentClass}">
	<zoo-input-label class="input-label" {labeltext}>
	</zoo-input-label>
	<zoo-link class="input-link" href="{linkhref}" target="{linktarget}" type="{linktype}" text="{linktext}" textalign="right">
	</zoo-link>
	<span class="input-slot {nopadding ? 'no-padding': ''}">
		<slot bind:this={_inputSlot} name="inputelement"></slot>
		{#if valid}
			<slot name="inputicon"></slot>
		{/if}
		{#if !valid}
			<svg class="error-circle" width="22" height="22" viewBox="0 0 24 24"><path d="M12 15.75a1.125 1.125 0 1 1 .001 2.25A1.125 1.125 0 0 1 12 15.75H12zm.75-2.25a.75.75 0 1 1-1.5 0V5.25a.75.75 0 1 1 1.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/></svg>
		{/if}
	</span>
	<zoo-input-info class="input-info" valid="{valid}" inputerrormsg="{inputerrormsg}" infotext="{infotext}">
	</zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	@import "input";

	.error-circle {
		animation: hideshow 0.5s ease;
		position: absolute;
		right: 0;
		top: 0;
		padding: 11px;
		color: $error-text-color;
		pointer-events: none;

		& > path {
			fill: $error-text-color;
		}
	}

	::slotted(input),
	::slotted(textarea) {
		width: 100%;
		font-size: $p1-size;
		line-height: $p1-line-height;
		padding: 13px 35px 13px 15px;
		margin: 0;
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
	export let linktype = "green";
	let _slottedInput;
	let _prevValid;
	let _inputSlot;
	let linkAbsentClass = "";

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
			if (!linktext) {
				linkAbsentClass = "link-absent";
			}
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
