# Checkbox module

## API
- `labeltext` - text to be presented on the right side of the checkbox;
- `valid` - flag which indicates whether the input is valid or not;
- `disabled` - flasg indicating whether the input is disabled;
- `highlighted` - flag indicating whether the outline around the input should be visible (border);

### Slots
This component accept one `<slot name="checkboxelement"></slot>` which is replaced with provided `input` element so that you can catch events from this element.       
Just add `slot` attribute to the `input` you provide for this component, like so: `<input slot="checkboxelement" type="checkbox"/>`;

### States
- `disabled` - the component provides styling for disabled type of `input`. For the styles to be applied just set the `disabled` attribute on slotted `input` element;
- `error` - In order for the `input` to have red border you have to manually set the `error` class for the `input`.

### Example usage 
```
<zoo-log-checkbox highlighted
	labeltext="Example label for this particular checkbox">
	<input slot="checkboxelement" type="checkbox"/>
</zoo-log-checkbox>
```

### Icons
*Does not* require any icons to function.