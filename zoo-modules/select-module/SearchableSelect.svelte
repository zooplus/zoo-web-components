<svelte:options tag="zoo-log-searchable-select"></svelte:options>
<div class="searchable-select-box">
	<zoo-log-input infotext="Start typing to limit select options"
		placeholder="{searchableplaceholder}"
		type="text" on:keyup="{event => handleSearchChange(event)}">
		<input slot="inputelement" type="text" placeholder="input" bind:this={searchableInput}/>
	</zoo-log-input>
	<zoo-log-select labeltext="{labeltext}" 
		searchable="{true}"
		labelposition="{labelposition}"
		linktext="{linktext}"
		linkhref="{linkhref}"
		linktarget="{linktarget}"
		inputerrormsg="{inputerrormsg}"
		infotext="{infotext}"
		valid="{valid}">
		<select slot="selectelement" bind:this={_selectSlot} multiple={multiple ? 'true' : null} class="seachable-select">
			{#each options as option}
				<option value="{option.value}">{option.text}</option>
			{/each}
		</select>
	</zoo-log-select>
</div>

<style type='text/scss'>
	.seachable-select {
		padding-top: 50px;
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
	export let searchableplaceholder = '';
	export let multiple = false;
	let searchableInput;
	let _selectSlot;
	let _slottedSelect;
	let _optionsBackup;
	let _prevValid;
	let options = [
		{
			text: 'text',
			value: 'value'
		},
		{
			text: 'random',
			value: 'random'
		}
	];

	beforeUpdate(() => {
		if (valid != _prevValid) {
			_prevValid = valid;
			changeValidState(valid);
		}
	});

	onMount(() => {
		_optionsBackup = options.slice();

		_selectSlot.addEventListener("slotchange", e => {
			let select = _selectSlot.assignedNodes()[0];
			_slottedSelect = select;
			if (select.multiple === true) {
				multiple = true;
			}
			changeValidState(valid);
	    });
	});

	const handleSearchChange = event => {
		const inputVal = searchableInput.value;
		options = _optionsBackup.filter(option => option.text.indexOf(inputVal) != -1);
	};

	const changeValidState = (state) => {
		if (_slottedSelect) {
			if (state === false) {
				_slottedSelect.classList.add('error');
			} else if (state) {
				_slottedSelect.classList.remove('error');
			}
		}
	};
</script>