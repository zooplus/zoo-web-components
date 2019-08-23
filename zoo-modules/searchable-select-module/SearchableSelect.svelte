<svelte:options tag="zoo-searchable-select"></svelte:options>
<div class="box">
	{#if !_isMobile}
		{#if tooltipText}
			<zoo-tooltip class="selected-options" position="right" text="{tooltipText}" folding="{true}">
			</zoo-tooltip>
		{/if}
		<zoo-input class:mobile="{_isMobile}" infotext="{infotext}" valid="{valid}" on:click="{() => openSearchableSelect()}"
			type="text" labeltext="{labeltext}" inputerrormsg="{inputerrormsg}"
			labelposition="{labelposition}" linktext="{linktext}" linkhref="{linkhref}" linktarget="{linktarget}">
			<input slot="inputelement" type="text" placeholder="{placeholder}" bind:this={searchableInput} on:input="{() => handleSearchChange()}"/>
			<div slot="inputelement" class="close" on:click="{e => handleCrossClick()}">
				{#if _valueSelected}
					<svg width="14" height="14" viewBox="0 0 24 24"><path d="M10.94 12L.22 1.28A.75.75 0 0 1 1.28.22L12 10.94 22.72.22a.75.75 0 0 1 1.06 1.06L13.06 12l10.72 10.72a.75.75 0 0 1-1.06 1.06L12 13.06 1.28 23.78a.75.75 0 0 1-1.06-1.06L10.94 12z"/></svg>
				{/if}
			</div>
			<span slot="inputelement">
				{#if loading}
					<zoo-preloader></zoo-preloader>
				{/if}
			</span>
		</zoo-input>
		<slot bind:this={_selectSlot} name="selectelement"></slot>
	{:else}
		<zoo-select labelposition="{labelposition}" linktext="{linktext}" linkhref="{linkhref}" linktarget="{linktarget}"
			labeltext="{labeltext}" inputerrormsg="{inputerrormsg}" infotext="{infotext}" valid="{valid}">
			<slot bind:this={_selectSlot} name="selectelement" slot="selectelement"></slot>
		</zoo-select>
	{/if}
</div>

<style type='text/scss'>
	@import "variables";

	.close {
		display: inline-block;
		position: absolute;
		top: 34%;
		right: 4%;
		cursor: pointer;
	}

	:host {
		position: relative;
	}

	.box {
		position: relative;

		&:hover {
			.selected-options {
				display: block;
				animation: fadeTooltipIn 0.2s;
			}
		}
	}

	.selected-options {
		display: none;

		&:hover {
			display: block;
		}
	}

	::slotted(select.searchable-zoo-select) {
		-webkit-appearance: none;
		-moz-appearance: none;	
		text-indent: 1px;
		text-overflow: '';
		width: 100%;
		padding: 13px 15px;
		border: 2px solid;
		color: $matterhorn;
		border-bottom-left-radius: 3px;
		border-bottom-right-radius: 3px;
		border-top: none;
		position: absolute;
		z-index: 2;
		top: 60px;
		font-size: 13px;
	}

	::slotted(select.error) {
		border-color: $error-text-color;
		transition: border-color 0.3s ease;
	}

	::slotted(select.hidden) {
		display: none;
	}

	::slotted(select:disabled) {
		border-color: #e6e6e6;
		background-color: #f2f3f4;
		color: #97999c;
	}

	::slotted(select:disabled:hover) {
		cursor: not-allowed;
	}
</style>

<script>
	import { onMount, beforeUpdate } from 'svelte';

	export let labelposition = "top";
	export let labeltext = "";
	export let linktext = "";
	export let linkhref = "";
	export let linktarget = "about:blank";
	export let inputerrormsg = "";
	export let infotext = "";
	export let valid = true;
	export let placeholder = '';
	export let loading = false;
	let multiple = false;
	let searchableInput;
	let _selectSlot;
	let _selectElement;
	let _prevValid;
	let options;
	let _isMobile;
	let _valueSelected;
	let tooltipText;

	beforeUpdate(() => {
		if (valid != _prevValid) {
			_prevValid = valid;
			changeValidState(valid);
		}
	});

	onMount(() => {
		_isMobile = isMobile();
		_selectSlot.addEventListener("slotchange", () => {
			let select = _selectSlot.assignedNodes()[0];
			_selectElement = select;
			options = _selectElement.options;
			if (!options || options.length < 1) {
				tooltipText = null;
			}
			_selectElement.addEventListener('blur', () => {
				_hideSelectOptions();
			});
			if (_selectElement.multiple === true) {
				multiple = true;
			}
			_selectElement.addEventListener('change', () => handleOptionChange());
			_selectElement.addEventListener('keydown', e => handleOptionKeydown(e));

			if (_selectElement.disabled) {
				searchableInput.setAttribute('disabled', true);
			}

			_selectElement.classList.add('searchable-zoo-select');
			_selectElement.addEventListener('change', e => _valueSelected = e.target.value ? true : false);
			_hideSelectOptions();
			changeValidState(valid);
	    });
		searchableInput.addEventListener('focus', () => {
			_selectElement.classList.remove('hidden');
			openSearchableSelect();
		});
		searchableInput.addEventListener('blur', event => {
			if (event.relatedTarget !== _selectElement) {
				_hideSelectOptions();
			}
		});
	});

	const handleSearchChange = () => {
		const inputVal = searchableInput.value.toLowerCase();
		for (const option of options) {
			if (option.text.toLowerCase().indexOf(inputVal) > -1) option.style.display = 'block';
			else option.style.display = 'none';
		}
	};

	const openSearchableSelect = () => {
		if (!multiple) {
			_selectElement.size = 4;
		}
	}

	const handleOptionKeydown = e => {
		if (e.keyCode && e.keyCode === 13) {
			handleOptionChange();
		}
	}

	export const handleOptionChange = () => {
		let inputValString = '';
		for (const selectedOpts of _selectElement.selectedOptions) {
			inputValString += selectedOpts.text + ', \n';
		}
		inputValString = inputValString.substr(0, inputValString.length - 3);
		tooltipText = inputValString;
		searchableInput.placeholder = inputValString && inputValString.length > 0 ? inputValString : placeholder;
		for (const option of options) {
			option.style.display = 'block';
		}
		if (!multiple) _hideSelectOptions();
	}

	const _hideSelectOptions = () => {
		_selectElement.classList.add('hidden');
		searchableInput.value = null;
	}

	const changeValidState = (state) => {
		if (_selectElement && state !== undefined) {
			if (state === false) {
				_selectElement.classList.add('error');
			} else if (state) {
				_selectElement.classList.remove('error');
			}
			valid = state;
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