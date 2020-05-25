<svelte:options tag="app-form"></svelte:options>
<app-context text="First section is a showcase of different form elements like `input`, `textarea`, `select`."></app-context>
<form class="form">
	<zoo-input linktext="Forgotten your password?" linkhref="https://google.com" linktarget="about:blank"
			   valid="{inputState}" inputerrormsg="invalid" infotext="Additional helpful information for our users">
		<input id="input-type-text" slot="inputelement" type="text" placeholder="input" />
		<label for="input-type-text" slot="inputlabel">Input type text</label>
	</zoo-input>
	<zoo-input linkhref="https://google.com" linktarget="about:blank" infotext="Additional helpful information for our users">
		<input id="input-type-number" slot="inputelement" type="number" placeholder="input" />
		<label for="input-type-number" slot="inputlabel">Input type number</label>
	</zoo-input>
	<zoo-input linktext="Native date picker -> click me" linkhref="https://github.com/jcgertig/date-input-polyfill"
			   linktarget="about:blank" infotext="Click on input to show context menu with date selection">
		<input id="input-type-date" slot="inputelement" type="date" placeholder="Enter date" />
		<label for="input-type-date" slot="inputlabel">Input type date</label>
	</zoo-input>
	<zoo-input infotext="Select time">
		<input id="input-type-time" slot="inputelement" type="time" placeholder="Enter time" />
		<label for="input-type-time" slot="inputlabel">Input type date</label>
	</zoo-input>
	<zoo-input>
		<input id="input-disabled" disabled slot="inputelement" type="text"/>
		<label for="input-disabled" slot="inputlabel">Disabled input</label>
	</zoo-input>
	<zoo-input valid="{inputState}">
		<textarea id="textarea" slot="inputelement" placeholder="Textarea"></textarea>
		<label for="textarea" slot="inputlabel">Textarea</label>
	</zoo-input>
	<zoo-select linktext="Documentation link" linkhref="https://google.com" linktarget="about:blank" valid="{inputState}" inputerrormsg="Value is required" infotext="Additional helpful information for our users">
		<select id="multiselect" slot="selectelement" multiple>
			<option class="placeholder" value="" disabled selected>Placeholder</option>
			<option>1</option>
			<option>2</option>
			<option>3</option>
		</select>
		<label for="multiselect" slot="selectlabel">Multiselect</label>
	</zoo-select>
	<zoo-select valid="{inputState}" inputerrormsg="Value is required" infotext="Additional helpful information for our users">
		<select id="standard-select" slot="selectelement">
			<option class="placeholder" value="" disabled selected>Placeholder</option>
			<option>1</option>
			<option>2</option>
			<option>3</option>
		</select>
		<label for="standard-select" slot="selectlabel">Standard select</label>
	</zoo-select>
	<zoo-searchable-select valid="{inputState}" inputerrormsg="Value is invalid" labeltext="Searchable multiple select" placeholder="Placeholder" infotext="Additional helpful information for our users which is a long text.">
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
	<zoo-select>
		<select id="disabled-select" disabled slot="selectelement">
			<option class="placeholder" value="" disabled selected>Placeholder</option>
			<option>1</option>
			<option>2</option>
			<option>3</option>
		</select>
		<label for="disabled-select" slot="selectlabel">Disabled select</label>
	</zoo-select>
	<zoo-select loading="{true}">
		<select id="loading-select" slot="selectelement">
			<option value=""></option>
		</select>
		<label for="loading-select" slot="selectlabel">Loading select</label>
	</zoo-select>
	<zoo-checkbox highlighted="{true}" valid="{inputState}" inputerrormsg="error">
		<input id="checkbox" slot="checkboxelement" type="checkbox"/>
		<label for="checkbox" slot="checkboxlabel">An example checkbox</label>
	</zoo-checkbox>
	<zoo-checkbox highlighted="{true}">
		<input id="disabled-checkbox" disabled slot="checkboxelement" type="checkbox"/>
		<label for="disabled-checkbox" slot="checkboxlabel">Disabled checkbox</label>
	</zoo-checkbox>
	<zoo-checkbox valid="{inputState}" inputerrormsg="error">
		<input id="long-label-checkbox" slot="checkboxelement" type="checkbox"/>
		<label for="long-label-checkbox" slot="checkboxlabel">Not highlighted checkbox with a long label that short be wrapped around checkbox like this</label>
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
	<zoo-button type="secondary" size="medium" on:click="{changeState}">
		<span slot="buttoncontent" class="slotted-span">Trigger invalid state!</span>
	</zoo-button>
</div>

<style type='text/scss'>
	:host {
		contain: layout;
	}

	.form {
		flex: 1 0 auto;
		margin: 20px auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		grid-template-rows: 120px 150px 150px 100px 80px 100px;
		@media only screen and (max-width: 544px) {
			width: 300px;
			grid-template-columns: auto;
		}
		@media only screen and (max-width: 812px) {
			grid-template-rows: 120px 150px 120px 120px 80px 100px;
		}

		grid-gap: 20px;
	}

	.submit {
		display: flex;
		justify-content: center;
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
