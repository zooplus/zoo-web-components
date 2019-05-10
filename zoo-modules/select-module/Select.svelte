<svelte:options tag="zoo-select"></svelte:options>
<div class="box {labelposition}">
	<zoo-input-label class="input-label" valid="{valid}" labeltext="{labeltext}">
	</zoo-input-label>
	<zoo-link class="input-link" href="{linkhref}" target="{linktarget}" type="grey" text="{linktext}" textalign="right">
	</zoo-link>
	<span class="input-slot">
		<slot bind:this={_selectSlot} name="selectelement"></slot>
		{#if !_multiple}
			<svg class="arrows {!valid ? 'error' : ''}" viewBox="0 -150 1000 1101" width="25" height="25"><path d="M417 667L456 628 328 501 456 373 417 334 250 501 417 667zM584 667L751 501 584 334 545 373 673 501 545 628 584 667z"/></svg>
			{#if loading}
				<zoo-preloader></zoo-preloader>
			{/if}
			{#if _valueSelected}
				<div class="close" on:click="{e => handleCrossClick()}">
					<svg width="18" height="18" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
				</div>
			{/if}
		{/if}
	</span>
	<zoo-input-info class="input-info" valid="{valid}" inputerrormsg="{inputerrormsg}" infotext="{infotext}">
	</zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	@import "input";

	.close {
		display: inline-block;
		position: absolute;
		top: 33%;
		right: 7%;
		cursor: pointer;
	}

	.arrows {
		position: absolute;
		right: 5px;
		top: 13px;
		transform: rotate(90deg);

		& > path {
			fill: $matterhorn;
		}

		&.error {
			& > path {
				fill: $error-text-color;
			}
		}
	}

	::slotted(select) {
		-webkit-appearance: none;
		-moz-appearance: none;
		width: 100%;
		background: white;
		line-height: 20px;
		padding: 13px 15px;
		border: 1px solid;
		border-color: $border-color;
		border-radius: 3px;
		color: $matterhorn;
		outline: none;
		box-sizing: border-box;
		font-size: 13px;
		overflow: auto;
	}

	::slotted(select:disabled) {
		border-color: #e6e6e6;
		background-color: #f2f3f4;
		color: #97999c;
	}

	::slotted(select:disabled:hover) {
		cursor: not-allowed;
	}

	::slotted(select:focus) {
		border: 2px solid;
		padding: 12px 14px;
	}

	::slotted(select.error) {
		border: 2px solid;
		padding: 12px 14px;
		border-color: $error-text-color;
		transition: border-color 0.3s ease;
	}
</style>

<script>
	import { beforeUpdate, onMount } from 'svelte';

	export let labelposition = "top";
	export let labeltext = "";
	export let linktext = "";
	export let linkhref = "";
	export let linktarget= "about:blank";
	export let inputerrormsg = "";
	export let infotext = "";
	export let valid = true;
	export let showicons = true;
	export let loading = false;
	let _prevValid;
	let _multiple = false;
	let _slottedSelect;
	let _selectSlot;
	let _valueSelected;

	beforeUpdate(() => {
		if (valid != _prevValid) {
			_prevValid = valid;
			changeValidState(valid);
		}
	});
	  
	onMount(() => {
		_selectSlot.addEventListener("slotchange", () => {
			let select = _selectSlot.assignedNodes()[0];
			_slottedSelect = select;
			if (select.multiple === true) {
				_multiple = true;
			}
			_slottedSelect.addEventListener('change', e => _valueSelected = e.target.value ? true : false);
			changeValidState(valid);
	    });
	});

	const changeValidState = (valid) => {
		if (_slottedSelect) {
			if (!valid) {
				_slottedSelect.classList.add('error');
			} else if (valid) {
				_slottedSelect.classList.remove('error');
			}
		}
	}

	const handleCrossClick = () => {
		_slottedSelect.value = null;
		_slottedSelect.dispatchEvent(new Event("change"));
	}
</script>