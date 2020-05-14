## API
- `text` - text to be presented in the feedback box;
- `type` - type of the feedback. Possible values are: `error`, `info`, `success`. Default is `info`;

### Slots
This component accept one `<slot></slot>` which is replaced with provided `arbitrary` element.       
Just add `slot` attribute to the `arbitrary element` you provide for this component, like so: `<zoo-feedback><span>Hello</span></zoo-feedback>`;

## Example usage 
```
<zoo-feedback 
	type="info" 
	text="This is an info message.">
</zoo-feedback>
```