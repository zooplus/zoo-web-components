# Checkbox module

## API
- `labeltext` - text to be presented on the right side of the checkbox;
- `valid` - flag which indicates whether the input is valid or not;
- `disabled` - flasg indicating whether the input is disabled;
- `highlighted` - flag indicating whether the outline around the input should be visible (border);

## Slots
This component accepts the following slots:
- `<slot name="checkboxelement"></slot>` which is replaced with provided `input` element so that you can catch events from this element.        
- `<slot name="checkboxlabel"></slot>` which is replaced with provided `label` element for a11y reasons.

## States
- `disabled` - the component provides styling for disabled type of `input`. For the styles to be applied just set the `disabled` attribute on slotted `input` element;

## Example usage 
```
<zoo-checkbox highlighted
	labeltext="Example label for this particular checkbox">
	<input slot="checkboxelement" type="checkbox"/>
</zoo-checkbox>
```