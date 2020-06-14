<svelte:options tag="zoo-searchable-select"/>
<div class="box" class:error="{!valid}" class:hidden="{hidden}" class:mobile="{_isMobile}">
	{#if !_isMobile}
		<zoo-input {labelposition} {inputerrormsg} {linktext} {linkhref} {linktarget} {infotext}>
			<label for="input" slot="inputlabel">{labeltext}</label>
			<input id="input" disabled={_selectElement && _selectElement.disabled} slot="inputelement" type="text" {placeholder} bind:this={searchableInput} on:input="{() => handleSearchChange()}"/>
			{#if _valueSelected}
				<svg slot="inputelement" class="close" on:click="{e => handleCrossClick()}" width="20" height="20" viewBox="0 0 24 24">
					<path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/>
				</svg>
			{/if}
			{#if loading}
				<zoo-preloader slot="inputelement"></zoo-preloader>
			{/if}
			{#if tooltipText}
				<zoo-tooltip slot="inputelement" position="right" text="{tooltipText}"></zoo-tooltip>
			{/if}
		</zoo-input>
		<slot bind:this={_selectSlot} name="selectelement"></slot>
	{:else}
		<zoo-select {labelposition} {linktext} {linkhref} {linktarget} {labeltext} {inputerrormsg} {infotext} {valid}>
			<slot bind:this={_selectSlot} name="selectelement" slot="selectelement"></slot>
		</zoo-select>
	{/if}
</div>

<style type='text/scss'>
	@import 'variables';

	:host, .box {
		position: relative;
	}

	.close {
		display: inline-block;
		position: absolute;
		top: 15px;
		right: 14px;
		cursor: pointer;
		background: white;
		z-index: 1;
	}

	.box:hover zoo-tooltip, .box:focus zoo-tooltip {
		display: block;
	}

	zoo-tooltip {
		display: none;

		&:hover, &:focus {
			display: block;
		}
	}

	.mobile ::slotted(select) {
		border-radius: 3px;
		border: 1px solid #767676;
		position: relative;
		top: 0;
	}

	::slotted(select) {
		-webkit-appearance: none;
		-moz-appearance: none;	
		width: 100%;
		background: white;
		padding: 13px 15px;
		border: 1px solid #767676;
		border-bottom-left-radius: 3px;
		border-bottom-right-radius: 3px;
		border-top: none;
		position: absolute;
		z-index: 2;
		top: 60px;
		font-size: 14px;
	}

	.box.hidden ::slotted(select) {
		display: none;
	}

	.box input {
		padding: 13px 25px 13px 15px;
	}

	.box.error input {
		padding: 12px 24px 12px 14px;
		border: $stroked-box-warning-bold;
	}

	.box:focus-within ::slotted(select) {
		border: 2px solid #555555;
		border-top: none;
		padding: 12px 14px;
	}

	.box.mobile:focus-within ::slotted(select) {
		border: 2px solid #555555;
		padding: 12px 14px;
	}

	.box:focus-within input {
		border: 2px solid #555555;
		padding: 12px 24px 12px 14px;
	}

	.box.error ::slotted(select) {
		border: $stroked-box-warning-bold;
		border-top: none;
		padding: 12px 14px;
	}

	::slotted(select:disabled) {
		border: 1px solid #E6E6E6;
		background-color: #F2F3F4;
		color: #767676;
	}

	::slotted(select:disabled:hover) {
		cursor: not-allowed;
	}
</style>

<script>
	import { onMount } from 'svelte';

	export let labelposition = 'top';
	export let labeltext = '';
	export let linktext = '';
	export let linkhref = '';
	export let linktarget = 'about:blank';
	export let inputerrormsg = '';
	export let infotext = '';
	export let valid = true;
	export let placeholder = '';
	export let loading = false;
	let searchableInput;
	let _selectSlot;
	let _selectElement;
	let options;
	let _isMobile;
	let _valueSelected;
	let tooltipText;
	let hidden = true;

	onMount(() => {
		_isMobile = isMobile();
		if (_isMobile) hidden = false;
		// todo support multiple slots
		_selectSlot.addEventListener('slotchange', () => {
			let select = _selectSlot.assignedNodes()[0];
			_selectElement = select;
			options = select.options;
			select.size = 4;
			select.addEventListener('blur', () => _hideSelectOptions());
			select.addEventListener('change', () => handleOptionChange());
			select.addEventListener('change', e => _valueSelected = e.target.value ? true : false);
			select.addEventListener('keydown', e => handleOptionKeydown(e));
		});
		if (searchableInput) {
			searchableInput.addEventListener('focus', () => hidden = false);
			searchableInput.addEventListener('blur', event => {
				if (event.relatedTarget !== _selectElement) {
					_hideSelectOptions();
				}
			});
		}
	});

	const handleSearchChange = () => {
		const inputVal = searchableInput.value.toLowerCase();
		for (const option of options) {
			if (option.text.toLowerCase().indexOf(inputVal) > -1) option.style.display = 'block';
			else option.style.display = 'none';
		}
	};

	const handleOptionKeydown = e => {
		if (e.keyCode && e.keyCode === 13) {
			handleOptionChange();
		}
	}

	export const handleOptionChange = () => {
		if (!_selectElement) {
			return;
		}
		let inputValString = '';
		for (const selectedOpts of _selectElement.selectedOptions) {
			inputValString += selectedOpts.text + ', \n';
		}
		inputValString = inputValString.substr(0, inputValString.length - 3);
		tooltipText = inputValString;
		if (searchableInput) {
			searchableInput.placeholder = inputValString && inputValString.length > 0 ? inputValString : placeholder;
		}
		for (const option of options) {
			option.style.display = 'block';
		}
		if (!_selectElement.multiple) _hideSelectOptions();
	}

	const _hideSelectOptions = () => {
		hidden = true;
		if (searchableInput) {
			searchableInput.value = null;
		}
	}

	const isMobile = () => {
		const index = navigator.appVersion.indexOf("Mobile");
		return (index > -1);
	}

	const handleCrossClick = () => {
		_selectElement.value = null;
		_selectElement.dispatchEvent(new Event("change"));
	}
</script>