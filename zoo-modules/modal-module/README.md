# Modal module

## API
- `headertext` - text to be displayed as modal's header;

## Slots
This component accept one `<slot name="content"></slot>` which is replaced with provided `HTMLElement` element so that you can catch events from this element.       
Just add `slot` attribute to the `HTMLElement` you provide for this component, like so: `<div slot="content">I am a div!</div>`;

## Example usage 
```
<zoo-log-modal style="display: none" headertext="Your basket contains licensed items" ref:modal on:modalClosed="handleModalClosed(event)">
	<div slot="content">
		<zoo-log-feedback 
		type="info" 
		text="This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered.">
		</zoo-log-feedback>
		<br>
		<zoo-log-select labeltext="This product is for" 
			valid="{true}">
			<select slot="selectelement">
				<option class="placeholder" value="" disabled selected>Doge</option>
				<option>Doge</option>
				<option>Catz</option>
				<option>Snek</option>
			</select>
		</zoo-log-select>
		<br>
		<zoo-log-checkbox highlighted
			labeltext="I understand and confirm that ALL of the above statements are true">
			<input slot="checkboxelement" type="checkbox"/>
		</zoo-log-checkbox>
		<br>
		<zoo-log-button>
			<button slot="button" class="medium hot" type="button">
				<span class="slotted-span">Add to cart</span>
			</button>
		</zoo-log-button>
	</div>
</zoo-log-modal>
```