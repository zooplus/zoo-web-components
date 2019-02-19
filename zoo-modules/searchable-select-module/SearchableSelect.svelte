<svelte:options tag="zoo-log-searchable-select"></svelte:options>
<div class="searchable-select-box">
	<zoo-log-input infotext="{infotext}" valid="{valid}" on:click="{event => handleInputClick(event)}"
		type="text" labeltext="{labeltext}" inputerrormsg="{inputerrormsg}"
		labelposition="{labelposition}" linktext="{linktext}" linkhref="{linkhref}" linktarget="{linktarget}">
		<input slot="inputelement" type="text" placeholder="{placeholder}" bind:this={searchableInput} on:input="{event => handleSearchChange(event)}"/>
	</zoo-log-input>
	<slot bind:this={_selectSlot} name="selectelement"></slot>
</div>

<style type='text/scss'>
	@import "variables";
	.searchable-select-box {
		position: relative;
	}
	::slotted(select) {
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
		margin-top: -20px;
		position: absolute;
		z-index: 2;
	}

	::slotted(select.error) {
		border-color: $error-text-color;
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
	// TODO on ios mobile browsers the select options are not shown for some reason
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

	beforeUpdate(() => {
		if (valid != _prevValid) {
			_prevValid = valid;
			changeValidState(valid);
		}
	});

	onMount(() => {
		_selectSlot.addEventListener("slotchange", e => {
			let select = _selectSlot.assignedNodes()[0];
			_selectElement = select;
			_selectElement.addEventListener('change', event => handleOptionClick(event));
			options = _selectElement.options;
			for (const option of options) {
				option.addEventListener('click', event => handleOptionClick(event));
			}
			_selectElement.addEventListener('blur', event => {
				_hideSelectOptions();
			});
			if (_selectElement.multiple === true) {
				multiple = true;
			}
			_hideSelectOptions();
			changeValidState(valid);
	    });
		searchableInput.addEventListener('focus', event => {
			_selectElement.classList.remove('hidden');
		});
		searchableInput.addEventListener('blur', event => {
			if (event.relatedTarget !== _selectElement) { //chrome, firefox
				_hideSelectOptions();
			}
		});
	});

	const handleSearchChange = event => {
		const inputVal = searchableInput.value;
		for (const option of options) {
			if (option.text.startsWith(inputVal)) option.style.display = 'block';
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
				inputValString += selectedOpts.text + ', ';
			}
			inputValString = inputValString.substr(0, inputValString.length - 2);
			searchableInput.value = inputValString;
		} else {
			searchableInput.value = _selectElement.options[_selectElement.selectedIndex].text;
			_hideSelectOptions();
		}
	}

	const _hideSelectOptions = () => {
		_selectElement.classList.add('hidden');
		if (!multiple) {
			_selectElement.size = 1;
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
</script>