<svelte:options tag="zoo-log-searchable-select"></svelte:options>
<div class="searchable-select-box">
	{#if !_isMobile}
		{#if tooltipText}
			<zoo-log-tooltip class="selected-options" position="right" text="{tooltipText}" folding="{true}">
			</zoo-log-tooltip>
		{/if}
		<zoo-log-input class:mobile="{_isMobile}" infotext="{infotext}" valid="{valid}" on:click="{event => handleInputClick(event)}"
			type="text" labeltext="{labeltext}" inputerrormsg="{inputerrormsg}"
			labelposition="{labelposition}" linktext="{linktext}" linkhref="{linkhref}" linktarget="{linktarget}">
			<input slot="inputelement" type="text" placeholder="{placeholder}" bind:this={searchableInput} on:input="{event => handleSearchChange(event)}"/>
		</zoo-log-input>
		<slot bind:this={_selectSlot} name="selectelement"></slot>
	{:else}
		<zoo-log-select labelposition="{labelposition}" linktext="{linktext}" linkhref="{linkhref}" linktarget="{linktarget}"
			labeltext="{labeltext}" inputerrormsg="{inputerrormsg}" infotext="{infotext}" valid="{valid}">
			<slot bind:this={_selectSlot} name="selectelement" slot="selectelement"></slot>
		</zoo-log-select>
	{/if}
</div>

<style type='text/scss'>
	@import "variables";
	:host {
		position: relative;
	}
	.searchable-select-box {
		position: relative;
		&:hover {
			.selected-options {
				display: block;
			}
		}
	}
	.selected-options {
		display: none;
		&:hover {
			display: block;
		}
	}
	::slotted(select.searchable-zoo-log-select) {
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
	let multiple = false;
	let searchableInput;
	let _selectSlot;
	let _selectElement;
	let _prevValid;
	let options;
	let _isMobile;
	let tooltipText;

	beforeUpdate(() => {
		if (valid != _prevValid) {
			_prevValid = valid;
			changeValidState(valid);
		}
	});

	onMount(() => {
		_isMobile = isMobile();
		_selectSlot.addEventListener("slotchange", e => {
			let select = _selectSlot.assignedNodes()[0];
			_selectElement = select;
			_selectElement.addEventListener('change', event => handleOptionClick(event));
			options = _selectElement.options;
			for (const option of options) {
				option.addEventListener('click', event => handleOptionClick(event));
			}
			if (!options || options.length < 1) {
				tooltipText = null;
			}
			_selectElement.addEventListener('blur', event => {
				_hideSelectOptions();
			});
			if (_selectElement.multiple === true) {
				multiple = true;
			}
			_selectElement.classList.add('searchable-zoo-log-select');
			_hideSelectOptions();
			changeValidState(valid);
	    });
		searchableInput.addEventListener('focus', event => {
			_selectElement.classList.remove('hidden');
		});
		searchableInput.addEventListener('blur', event => {
			if (event.relatedTarget !== _selectElement) {
				_hideSelectOptions();
			}
		});
	});

	const handleSearchChange = event => {
		const inputVal = searchableInput.value.toLowerCase();
		for (const option of options) {
			if (option.text.toLowerCase().startsWith(inputVal)) option.style.display = 'block';
			else option.style.display = 'none';
		}
	};

	const handleInputClick = event => {
		if (!multiple) {
			_selectElement.size = 4;
		}
	}

	const handleOptionClick = event => {
		if (multiple) {
			let inputValString = '';
			for (const selectedOpts of _selectElement.selectedOptions) {
				inputValString += selectedOpts.text + ', \n';
			}
			inputValString = inputValString.substr(0, inputValString.length - 3);
			tooltipText = inputValString;
			searchableInput.placeholder = inputValString && inputValString.length > 0 ? inputValString : placeholder;
		} else {
			searchableInput.value = _selectElement.options[_selectElement.selectedIndex].text;
			_hideSelectOptions();
		}
	}

	const _hideSelectOptions = () => {
		_selectElement.classList.add('hidden');
		if (!multiple) {
			_selectElement.size = 1;
		} else {
			searchableInput.value = null;
		}
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
</script>