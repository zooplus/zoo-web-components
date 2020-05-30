<Context text="Form elements"/>
<form class="form">
	<zoo-input linktext="Forgotten your password?" linkhref="https://google.com" linktarget="about:blank"
			   infotext="Additional helpful information for our users">
		<input id="input-type-text" slot="inputelement" type="text" placeholder="input" />
		<label for="input-type-text" slot="inputlabel">Input type text</label>
	</zoo-input>
	<zoo-input linktext="Learn your HTML and don't overcomplicate" linktarget="about:blank"
			   linkhref="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist"
			   infotext="Possible values: Dog, Cat, Small Pet, Bird, Aquatic">
		<input id="input-type-number" slot="inputelement" placeholder="input" list="animals"/>
		<label for="input-type-number" slot="inputlabel">Autocomplete</label>
	</zoo-input>
	<datalist id="animals">
		<option value="Dog">
		<option value="Cat">
		<option value="Small Pet">
		<option value="Bird">
		<option value="Aquatic">
	</datalist>
	<zoo-input linktext="Native date picker polyfill on Github" linkhref="https://github.com/jcgertig/date-input-polyfill"
			   linktarget="about:blank" infotext="Click on input to show context menu with date selection">
		<input id="input-type-date" slot="inputelement" type="date" placeholder="Enter date" />
		<label for="input-type-date" slot="inputlabel">Input type date</label>
	</zoo-input>
	<zoo-input infotext="Select time">
		<input id="input-type-time" slot="inputelement" type="time" placeholder="Enter time" />
		<label for="input-type-time" slot="inputlabel">Input type time</label>
	</zoo-input>
	<zoo-input>
		<textarea id="textarea" slot="inputelement" placeholder="Textarea"></textarea>
		<label for="textarea" slot="inputlabel">Textarea</label>
	</zoo-input>
	<zoo-select linktext="Documentation link" linkhref="https://google.com" linktarget="about:blank" infotext="Additional helpful information for our users">
		<select id="multiselect" slot="selectelement" multiple>
			<option class="placeholder" value="" disabled selected>Placeholder</option>
			<option>1</option>
			<option>2</option>
			<option>3</option>
		</select>
		<label for="multiselect" slot="selectlabel">Multiselect</label>
	</zoo-select>
	<zoo-select infotext="Additional helpful information for our users">
		<select id="standard-select" slot="selectelement">
			<option class="placeholder" value="" disabled selected>Placeholder</option>
			<option>1</option>
			<option>2</option>
			<option>3</option>
		</select>
		<label for="standard-select" slot="selectlabel">Standard select</label>
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
	<zoo-checkbox highlighted="{true}" inputerrormsg="error">
		<input id="checkbox" slot="checkboxelement" type="checkbox"/>
		<label for="checkbox" slot="checkboxlabel">An example checkbox</label>
	</zoo-checkbox>
	<zoo-checkbox highlighted="{true}">
		<input id="disabled-checkbox" disabled slot="checkboxelement" type="checkbox"/>
		<label for="disabled-checkbox" slot="checkboxlabel">Disabled checkbox</label>
	</zoo-checkbox>
	<zoo-radio infotext="infotext" labeltext="Label text">
		<input type="radio" id="contactChoice1" name="contact" value="email" disabled>
		<label for="contactChoice1">Email</label>
		<input type="radio" id="contactChoice2" name="contact" value="phone">
		<label for="contactChoice2">Phone</label>
		<input type="radio" id="contactChoice3" name="contact" value="mail">
		<label for="contactChoice3">Mail</label>
	</zoo-radio>
</form>

<style>
	.form {
		flex: 1 0 auto;
		margin: 20px auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		grid-template-rows: 120px 150px 150px 100px;
		grid-gap: 20px;
	}
</style>

<script>
	import Context from './Context.svelte';
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
</script>
