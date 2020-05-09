<svelte:options tag="app-form"></svelte:options>
<app-context text="First section is a showcase of different form elements like `input`, `textarea`, `select`."></app-context>
<form class="form">
	<zoo-input labeltext="Input type text" linktext="Forgotten your password?" linkhref="https://google.com" linktarget="about:blank"
			   valid="{inputState}" inputerrormsg="invalid" infotext="Additional helpful information for our users">
		<input slot="inputelement" type="text" placeholder="input" />
	</zoo-input>
	<zoo-input labeltext="Input type number" linkhref="https://google.com" linktarget="about:blank"
			   infotext="Additional helpful information for our users">
		<input slot="inputelement" type="number" placeholder="input" />
	</zoo-input>
	<zoo-input labeltext="This input has type date" linktext="Native date picker -> click me" linkhref="https://github.com/jcgertig/date-input-polyfill"
			   linktarget="about:blank" infotext="Click on input to show context menu with date selection">
		<input slot="inputelement" type="date" placeholder="Enter date" />
	</zoo-input>
	<zoo-input labeltext="This input has type time" infotext="Select time">
		<input slot="inputelement" type="time" placeholder="Enter time" />
	</zoo-input>
	<zoo-input labeltext="Textarea example" valid="{inputState}">
		<textarea slot="inputelement" placeholder="Textarea"></textarea>
	</zoo-input>
	<zoo-select labeltext="Multiselect" linktext="Documentation link" linkhref="https://google.com" linktarget="about:blank" valid="{inputState}" inputerrormsg="Value is required" infotext="Additional helpful information for our users">
		<select slot="selectelement" multiple>
			<option class="placeholder" value="" disabled selected>Placeholder</option>
			<option>1</option>
			<option>2</option>
			<option>3</option>
		</select>
	</zoo-select>
	<zoo-select labeltext="Standard select" valid="{inputState}" inputerrormsg="Value is required" infotext="Additional helpful information for our users">
		<select slot="selectelement">
			<option class="placeholder" value="" disabled selected>Placeholder</option>
			<option>1</option>
			<option>2</option>
			<option>3</option>
		</select>
	</zoo-select>
	<zoo-searchable-select labeltext="Searchable multiple select" placeholder="Placeholder" infotext="Additional helpful information for our users which is a long text.">
		<select multiple slot="selectelement">
			{#each options as option}
				<option value="{option.value}">
					{option.text}
				</option>
			{/each}
		</select>
	</zoo-searchable-select>
	<zoo-searchable-select labeltext="Searchable select" placeholder="Placeholder" infotext="Additional helpful information for our users.">
		<select slot="selectelement">
			{#each options as option}
				<option value="{option.value}">
					{option.text}
				</option>
			{/each}
		</select>
	</zoo-searchable-select>
	<zoo-select labeltext="Disabled select" valid="{inputState}" inputerrormsg="Value is required">
		<select disabled slot="selectelement">
			<option class="placeholder" value="" disabled selected>Placeholder</option>
			<option>1</option>
			<option>2</option>
			<option>3</option>
		</select>
	</zoo-select>
	<zoo-checkbox highlighted="{true}" valid="{inputState}" labeltext="An example checkbox with some additional event handling of clicks inside">
		<input slot="checkboxelement" type="checkbox"/>
	</zoo-checkbox>
	<zoo-radio valid="{inputState}" errormsg="errormsg" infotext="infotext" labeltext="Label text">
		<template>
			<input type="radio" id="contactChoice1" name="contact" value="email" disabled>
			<label for="contactChoice1">Email</label>
			<input type="radio" id="contactChoice2" name="contact" value="phone">
			<label for="contactChoice2">Phone</label>
			<input type="radio" id="contactChoice3" name="contact" value="mail">
			<label for="contactChoice3">Mail</label>
		</template>
	</zoo-radio>

	<zoo-radio valid="{inputState}" errormsg="errormsg" infotext="infotext">
		<input type="radio" id="contactChoice4" name="contact" value="email" disabled>
		<label for="contactChoice4">Email</label>
		<input type="radio" id="contactChoice5" name="contact" value="phone">
		<label for="contactChoice5">Phone</label>
	</zoo-radio>
</form>
<div class="submit">
	<zoo-button type="hot" size="medium" on:click="{changeState}">
		<span slot="buttoncontent" class="slotted-span">Trigger invalid state!</span>
	</zoo-button>
</div>

<style type='text/scss'>
	.form {
		flex: 1 0 auto;
		margin: 20px auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		grid-template-rows: 120px 150px 120px 80px;
		@media only screen and (max-width: 544px) {
			width: 300px;
			grid-template-columns: auto;
		}
		@media only screen and (max-width: 812px) {
			grid-template-rows: 120px 150px 120px 120px;
		}

		grid-gap: 20px;
	}

	.submit {
		width: 250px;
		height: 50px;
		margin: 0 auto;
	}
</style>

<script>
	let options = [
		{
			text: 'text',
			value: 'value'
		},
		{
			text: 'raNdOm',
			value: 'random'
		},
		{
			text: 'random1',
			value: 'random1'
		},
		{
			text: 'random2',
			value: 'random2'
		}
	];
	let inputState = true;
	const changeState = () => {
		inputState = !inputState;
	}
</script>
