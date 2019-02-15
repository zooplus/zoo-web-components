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
		<select slot="selectelement">
			{#each options as option}
				<option value="{option.value}">{option.text}</option>
			{/each}
		</select>
	</zoo-log-select>
</div>

<style>
</style>
<script>
	import { onMount } from 'svelte';

	export let labelposition = "top";
	export let labeltext = "";
	export let linktext = "";
	export let linkhref = "";
	export let linktarget = "about:blank";
	export let inputerrormsg = "";
	export let infotext = "";
	export let valid = true;
	export let searchableplaceholder = '';
	let searchableInput;
	let _slottedSelect;
	let _optionsBackup;
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

	onMount(() => {
		_optionsBackup = options.slice();
	});

	const handleSearchChange = event => {
		const inputVal = searchableInput.value;
		console.log(inputVal);
		options = _optionsBackup.filter(option => option.text.indexOf(inputVal) != -1);
	};
</script>