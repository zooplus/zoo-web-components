<svelte:options tag="zoo-log-searchable-select"></svelte:options>
<div class="searchable-select-box">
	<zoo-log-input infotext="Start typing to limit select options"
		type="text" on:keyup="{event => handleSearchChange(event)}" labeltext="{labeltext}">
		<input slot="inputelement" type="text" placeholder="{placeholder}" bind:this={searchableInput}/>
	</zoo-log-input>
	<select bind:this={_selectElement} multiple={multiple ? 'true' : null} class="seachable-select hidden">
		{#each options as option}
			<option value="{option.value}">{option.text}</option>
		{/each}
	</select>
</div>

<style type='text/scss'>
	@import "variables";
	.seachable-select {
		border: none;
		-webkit-appearance: none;
		-moz-appearance: none;	
		text-indent: 1px;
		text-overflow: '';
		width: 100%;
		padding: 13px 15px;
		border: 1px solid;
		border-color: $border-color;
		border-radius: 3px;
		border-top: none;
		margin-top: -30px;
		z-index: 2;
		background: white;

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
			// changeValidState(valid);
		}
	});

	onMount(() => {
		_optionsBackup = options.slice();

		searchableInput.addEventListener('focus', event => {
			console.log(event);
			_selectElement.classList.remove('hidden');
			// _selectElement.focus();
		});
		searchableInput.addEventListener('blur', event => {
			console.log(event);
			_selectElement.classList.add('hidden');
		});
	});

	const handleSearchChange = event => {
		const inputVal = searchableInput.value;
		options = _optionsBackup.filter(option => option.text.indexOf(inputVal) != -1);
	};
</script>