<svelte:options tag="zoo-select"></svelte:options>
<div class="box {labelposition} {linkAbsentClass}">
	<zoo-input-label class="input-label" {labeltext}>
	</zoo-input-label>
	<zoo-link class="input-link" href="{linkhref}" target="{linktarget}" type="{linktype}" text="{linktext}" textalign="right">
	</zoo-link>
	<div class="input-slot">
		<slot bind:this={_selectSlot} name="selectelement"></slot>
		{#if !_multiple}
			<svg class="arrows {_disabled ? 'disabled' : ''}" width="24" height="24" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
			{#if loading}
				<zoo-preloader></zoo-preloader>
			{/if}
			{#if _valueSelected}
				<div class="close" on:click="{e => handleCrossClick()}">
					<svg width="20" height="20" viewBox="0 0 24 24">
						<path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/>
					</svg>
				</div>
			{/if}
		{/if}
	</div>
	<zoo-input-info class="input-info" valid="{valid}" inputerrormsg="{inputerrormsg}" infotext="{infotext}">
	</zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	@import "input";

	.close, .arrows {
		position: absolute;
		right: 9px;
		top: 12px;
	}

	.close {
		display: inline-block;
		cursor: pointer;
		right: 28px;
		top: 14px;
	}

	.arrows {
		path {
			fill: var(--primary-mid, #{$primary-mid});
		}

		&.disabled path {
			fill: $grey-light;
		}
	}

	::slotted(select) {
		-webkit-appearance: none;
		-moz-appearance: none;
		width: 100%;
		background: white;
		font-size: $p1-size;
		line-height: $p1-line-height;
		padding: 13px 40px 13px 15px;
		border: 1px solid;
		border-color: $grey-dark;
		border-radius: $input-border-radius;
		color: $grey-dark;
		outline: none;
		box-sizing: border-box;
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
		border-color: var(--warning-mid, #{$warning-mid});
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
	export let loading = false;
	export let linktype = "green";
	let _prevValid;
	let _multiple = false;
	let _slottedSelect;
	let _selectSlot;
	let _valueSelected;
	let _disabled;
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
			if (select.disabled === true) {
				_disabled = true;
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
