# Modal module

## API
- `headertext` - text to be displayed as modal's header;

## Slots
This component accept one `<slot name="content"></slot>` which is replaced with provided `HTMLElement` element so that you can catch events from this element.       
Just add `slot` attribute to the `HTMLElement` you provide for this component, like so: `<div>I am a div!</div>`;

## Example usage 
```
<zoo-modal style="display: none" headertext="Your basket contains licensed items" ref:modal on:modalClosed="handleModalClosed(event)">
	<div>
		<zoo-feedback 
		type="info" 
		text="This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered.">
		</zoo-feedback>
		<br>
		<zoo-select labeltext="This product is for" 
			valid="{true}">
			<select slot="selectelement">
				<option class="placeholder" value="" disabled selected>Doge</option>
				<option>Doge</option>
				<option>Catz</option>
				<option>Snek</option>
			</select>
		</zoo-select>
		<br>
		<zoo-checkbox highlighted
			labeltext="I understand and confirm that ALL of the above statements are true">
			<input slot="checkboxelement" type="checkbox"/>
		</zoo-checkbox>
		<br>
		<zoo-button>
			<button slot="button" type="button">
				<span class="slotted-span">Add to cart</span>
			</button>
		</zoo-button>
	</div>
</zoo-modal>
```