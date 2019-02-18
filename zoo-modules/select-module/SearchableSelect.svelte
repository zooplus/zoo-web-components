<svelte:options tag="zoo-log-searchable-select"></svelte:options>
<div class="searchable-select-box">
	<zoo-log-input infotext="Start typing to limit select options" valid="{valid}" on:click="{event => handleInputClick(event)}"
		type="text" on:keyup="{event => handleSearchChange(event)}" labeltext="{labeltext}">
		<input slot="inputelement" type="text" placeholder="{placeholder}" bind:this={searchableInput}/>
	</zoo-log-input>
	<select bind:this={_selectElement} multiple={multiple ? 'true' : null} class="seachable-select hidden">
		{#each options as option}
			<option on:click="{event => handleOptionClick(event)}" value="{option.value}" style="display: {option.display}">
				{option.text}
			</option>
		{/each}
	</select>
</div>

<style type='text/scss'>
	@import "variables";
	.searchable-select-box {
		position: relative;
	}
	.seachable-select {
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
		margin-top: -30px;
		position: absolute;
		z-index: 2;

		&.hidden {
			display: none;
		}
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
	export let multiple = false;
	let searchableInput;
	let _selectElement;
	let _prevValid;
	let options = [
		{
			text: 'text',
			value: 'value'
		},
		{
			text: 'random',
			value: 'random'
		},
		{
			text: 'random',
			value: 'random'
		}
	];

	beforeUpdate(() => {
		if (valid != _prevValid) {
			_prevValid = valid;
			// changeValidState(valid);
		}
	});

	onMount(() => {
		searchableInput.addEventListener('focus', event => {
			_selectElement.classList.remove('hidden');
		});
		searchableInput.addEventListener('blur', event => {
			if (event.relatedTarget !== _selectElement || // safari
				(event.explicitOriginalTarget && event.explicitOriginalTarget.parentNode !== _selectElement)) { //chrome, firefox
				_hideSelectOptions();
			}
		});
		_selectElement.addEventListener('blur', event => {
			_hideSelectOptions();
		});
	});

	const handleSearchChange = event => {
		const inputVal = searchableInput.value;
		options.forEach(option => {
			if (option.text.startsWith(inputVal)) option.display = 'block';
			else option.display = 'none';
		});
		options = options.slice();
	};

	const handleInputClick = event => {
		if (!multiple) {
			_selectElement.size = 4;
		}
	}

	const handleOptionClick = event => {
		if (multiple) {
			let inputValString = '';
			for (const iterator of _selectElement.selectedOptions) {
				inputValString += iterator.text + ', ';
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
</script>