<svelte:options tag="zoo-select"></svelte:options>
<div class="box {labelposition} {linkAbsentClass}">
	<zoo-input-label class="input-label" valid="{valid}" labeltext="{labeltext}">
	</zoo-input-label>
	<zoo-link class="input-link" href="{linkhref}" target="{linktarget}" type="grey" text="{linktext}" textalign="right">
	</zoo-link>
	<span class="input-slot">
		<slot bind:this={_selectSlot} name="selectelement"></slot>
		{#if !_multiple}
			<svg class="arrows {!valid ? 'error' : ''}" viewBox="0 0 24 24" width="16" height="16"><path d="M12 1.75L6.545 7.516a.75.75 0 1 1-1.09-1.03l5.47-5.78A1.499 1.499 0 0 1 13.06.69l5.485 5.793a.75.75 0 0 1-1.09 1.031L12 1.751zM6.545 16.486L12 22.249l5.455-5.764a.75.75 0 0 1 1.09 1.03l-5.47 5.78a1.499 1.499 0 0 1-2.135.014l-5.485-5.793a.75.75 0 0 1 1.09-1.031z"/></svg>
			{#if loading}
				<zoo-preloader></zoo-preloader>
			{/if}
			{#if _valueSelected}
				<div class="close" on:click="{e => handleCrossClick()}">
					<svg width="14" height="14" viewBox="0 0 24 24"><path d="M10.94 12L.22 1.28A.75.75 0 0 1 1.28.22L12 10.94 22.72.22a.75.75 0 0 1 1.06 1.06L13.06 12l10.72 10.72a.75.75 0 0 1-1.06 1.06L12 13.06 1.28 23.78a.75.75 0 0 1-1.06-1.06L10.94 12z"/></svg>
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

	.close, .arrows {
		position: absolute;
		right: 9px;
		top: 17px;
	}

	.close {
		display: inline-block;
		cursor: pointer;
		right: 28px;
	}

	.arrows {
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
		padding: 13px 40px 13px 15px;
		border: 1px solid;
		border-color: $border-color;
		border-radius: 3px;
		color: $matterhorn;
		outline: none;
		box-sizing: border-box;
		font-size: 13px;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
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
		padding: 12px 40px 12px 14px;
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
	let linkAbsentClass = "";

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
			if (!linktext) {
				linkAbsentClass = "link-absent";
			}
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
	};

	const handleCrossClick = () => {
		_slottedSelect.value = null;
		_slottedSelect.dispatchEvent(new Event("change"));
	}
</script>
