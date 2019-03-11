# Searchable Select module

## API
- `labelposition` `optional` - accepts following values: `top`, `left`. Default is `top`;
- `labeltext` `optional` - text to be presented as the label of the input;
- `linktext` `optional` - what text to present as a link text,
- `linkhref` `optional` - where the link should lead,
- `linktarget` `optional` - target of the anchor link, default is `about:blank`,
- `inputerrormsg` `optional` - error message to be presented when input is in invalid state,
- `infotext` `optional` - text to be presented below the input;
- `valid` - flag which indicates whether the input is valid or not;
- `placeholder` - text which should be displayed inside input used for searching.

### Slots
This component accept one `<slot name="selectelement"></slot>` which is replaced with provided `select` element so that you can catch events from this element.       
Just add `slot` attribute to the `select` you provide for this component, like so: `<select slot="selectelement">`;

### States
- `disabled` - the component provides styling for disabled type of `select`. For the styles to be applied just set the `disabled` attribute on slotted `select` element;

### Misc
This component relies on `change` event dispatched every time someone or something changes the value of the select. For example, in angular `form.reset()` removes values from select element, but it does not fire `change` event. So you have to trigger it manually. 

### Example usage 
```
<zoo-searchable-select labeltext="Searchable select" placeholder="Placeholder">
	<select multiple slot="selectelement">
		{#each options as option}
			<option value="{option.value}" style="display: {option.display}">
				{option.text}
			</option>
		{/each}
	</select>
</zoo-searchable-select>
```