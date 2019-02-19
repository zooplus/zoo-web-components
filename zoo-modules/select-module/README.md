# Select module

## API
- `labelposition` `optional` - accepts following values: `top`, `left`. Default is `top`;
- `labeltext` `optional` - text to be presented as the label of the input;
- `linktext` `optional` - what text to present as a link text,
- `linkhref` `optional` - where the link should lead,
- `linktarget` `optional` - target of the anchor link, default is `about:blank`,
- `inputerrormsg` `optional` - error message to be presented when input is in invalid state,
- `infotext` `optional` - text to be presented below the input;
- `valid` - flag which indicates whether the input is valid or not;

### Slots
This component accept one `<slot name="selectelement"></slot>` which is replaced with provided `select` element so that you can catch events from this element.       
Just add `slot` attribute to the `select` you provide for this component, like so: `<select slot="selectelement">`;

### States
- `disabled` - the component provides styling for disabled type of `select`. For the styles to be applied just set the `disabled` attribute on slotted `select` element;

### Example usage 
```
<zoo-log-select labeltext="Very long label which should test how it behaves Label" 
	linktext="Forgotten your password?"
	linkhref="https://google.com"
	linktarget="about:blank"
	valid="{true}"
	inputerrormsg="Value is required"
	infotext="Additional helpful information for our users" >
	<select slot="selectelement">
		<option class="placeholder" value="" disabled selected>Placeholder</option>
		<option>1</option>
		<option>2</option>
		<option>3</option>
	</select>
</zoo-log-select>
```