# Input module

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
This component accept one `<slot name="inputelement"></slot>` which is replaced with provided `input` element so that you can catch events from this element.       
Just add `slot` attribute to the `input` you provide for this component, like so: `<input slot="inputelement">`;

### States
- `disabled` - the component provides styling for disabled type of input. For the styles to be applied just set the `disabled` attribute on slotted `input` element;

### Example usage 
```
<zoo-log-input labeltext="Very long label which should test how it behaves Label" 
	linktext="Forgotten your password?"
	linkhref="https://google.com"
	linktarget="about:blank"
	valid="{false}"
	infotext="Additional helpful information for our users" >
	<input slot="inputelement" type="number" placeholder="input" class:error="true"/>
</zoo-log-input>
```