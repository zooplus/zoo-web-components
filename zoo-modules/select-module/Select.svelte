<svelte:options tag="zoo-log-select"></svelte:options>
<div class="box {labelposition}">
	<zoo-log-input-label class="input-label" valid="{valid}" labeltext="{labeltext}">
	</zoo-log-input-label>
	<zoo-log-link class="input-link" href="{linkhref}" target="{linktarget}" type="grey" text="{linktext}" textalign="right">
	</zoo-log-link>
	<span class="input-slot">
		<slot bind:this={_selectSlot} name="selectelement"></slot>
		{#if !_multiple}
		<svg class="angle-up" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 1001" height="21" width="21">
			<path transform="matrix(1 0 0 -1 0 1000)" d="M738.2375000000001 404.5708333333334L679.8458333333334 346.1791666666667L487.9875 538.0374999999999L296.1291666666667 346.1791666666667L237.7375 404.5708333333334L487.9875 654.8208333333332z"/>
		</svg>
		<svg class="angle-down" preserveAspectRatio="xMidYMid meet" viewBox="0 0 970 1001" height="21" width="21">
			<path transform="matrix(1 0 0 -1 0 1000)" d="M738.2375000000001 404.5708333333334L679.8458333333334 346.1791666666667L487.9875 538.0374999999999L296.1291666666667 346.1791666666667L237.7375 404.5708333333334L487.9875 654.8208333333332z"/>
		</svg>
		{/if}
	</span>
	<zoo-log-input-info class="input-info" valid="{valid}" inputerrormsg="{inputerrormsg}" infotext="{infotext}">
	</zoo-log-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	@import "input";
	.angle-up,
	.angle-down {
		position: absolute;
		& > path {
			fill: $matterhorn;
		}
		&.error {
			& > path {
				fill: $error-text-color;
			}
		}
	}
	.angle-up {
	  right: 10px;
	  top: 23%;
	}
	.angle-down {
	  right: 10px;
	  top: 42%;
	  transform: rotate(180deg);
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