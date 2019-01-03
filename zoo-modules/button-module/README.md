# Button module

## API
- `type` `optional` - accepts following values: `cold`, `hot`. Default is `cold`;
- `size` `optional` - accepts following values: `small`, `medium`, `big`. Default is `small`;

## Slots
This component accept one `<slot name="button"></slot>` which is replaced with provided `button` element so that you can catch events from this element.       
Just add `slot` attribute to the `button` you provide for this component, like so: `<button slot="button">Button</button>`;

## States
- `disabled` - the component provides styling for disabled type of input. For the styles to be applied just set the `disabled` attribute on slotted `button` element;

## Example usage 
```
<zoo-log-button>
	<button slot="button" class="medium hot header-button" type="button">
		<span class="icon-cart-copy"></span>
		<span class="slotted-span">Shopping Cart</span>
	</button>
</zoo-log-button>
```