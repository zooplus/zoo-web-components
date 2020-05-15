# Header module

## API
* `imgsrc` - path to logo of your app;
* `headertext` - text to be displayed next to the logo (optional).

## Slots
This component accepts `<slot name="content"></slot>` which is replaced with provided `HTMLElement` so that you can catch events from this element.       
Just add `slot` attribute to the `HTMLElement` you provide for this component, like so: 
```
<zoo-input>
	<input slot="inputelement" placeholder="Search for more than 8.000 products"/>
</zoo-input>
```

## Example usage
To use it in your project add the following to your mark-up file:
```
<zoo-header imgsrc="logo.png" headertext="{headertext}">
	<div class="search-field-holder">
		<div class="header-search">
			<zoo-input>
				<input slot="inputelement" placeholder="Search for more than 8.000 products"/>
			</zoo-input>
		</div>
		<div class="header-button">
			<zoo-button>
				<button slot="button" type="button">
					<span class="icon-cart-copy"></span>
					<span class="slotted-span">Shopping Cart</span>
				</button>
			</zoo-button>
		</div>
	</div>
</zoo-header>
```