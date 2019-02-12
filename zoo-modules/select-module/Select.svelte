<svelte:options tag="zoo-log-select"></svelte:options>
<div class="select-box {labelposition}">
	<span class="input-label">
		{#if labeltext}
		<div class="label" class:error="{!valid}">
			<span>{labeltext}</span>
		</div>
		{/if}
	</span>
	<span class="input-link">
		<zoo-log-link href="{linkhref}" target="{linktarget}" type="grey" text="{linktext}" textalign="right"></zoo-log-link>
	</span>
	<span class="input-slot">
		<slot bind:this={_selectSlot} name="selectelement"></slot>
		{#if !_multiple}
		<span class="icon-angle-up" class:error="{!valid}"></span>
		<span class="icon-angle-down" class:error="{!valid}"></span>
		{/if}
	</span>
	<span class="input-info">
		<zoo-log-input-info valid="{valid}" inputerrormsg="{inputerrormsg}" infotext="{infotext}"></zoo-log-input-info>
	</span>
</div>

<style type='text/scss'>
	@import "variables";
	@import "input";
	.icon-angle-up,
	.icon-angle-down {
	  color: $matterhorn;
	  pointer-events: none;
	  &.error {
	    color: $error-text-color;
	  }
	}
	.icon-angle-up:before {
	  content: "\EA05";
	  position: absolute;
	  right: 3%;
	  top: 28%;
	}
	.icon-angle-down:before {
	  content: "\EA02";
	  position: absolute;
	  right: 3%;
	  top: 42%;
	}
	::slotted(select) {
	  -webkit-appearance: none;
	  -moz-appearance: none;
	  width: 100%;
	  background: white;
	  font-size: 14px;
	  line-height: 20px;
	  padding: 13px 15px;
	  border: 1px solid;
	  border-color: $border-color;
	  border-radius: 3px;
	  color: $matterhorn;
	  outline: none;
	  box-sizing: border-box;
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
	let _prevValid;
	let _multiple = false;
	let _slottedSelect;
	let _selectSlot;

	beforeUpdate(() => {
		if (valid != _prevValid) {
			_prevValid = valid;
			changeValidState(valid);
		}
	});
	  
	onMount(() => {
		_selectSlot.addEventListener("slotchange", e => {
			let select = _selectSlot.assignedNodes()[0];
			_slottedSelect = select;
			if (select.multiple === true) {
				_multiple = true;
			}
			changeValidState(valid);
	    });
	});

	const changeValidState = (state) => {
		if (_slottedSelect) {
			if (state === false) {
				_slottedSelect.classList.add('error');
			} else if (state) {
				_slottedSelect.classList.remove('error');
			}
		}
	}
</script>