# Header module

## API
* `imgsrc` - path to logo of your app;
* `headertext` - text to be displayed next to the logo (optional).

## Slots
This component accept two `<slot name="search"></slot>` and `<slot name="additional"></slot>` which are replaced with provided `HTMLElement` so that you can catch events from this element.       
Just add `slot` attribute to the `HTMLElement` you provide for this component, like so: 
```
<zoo-log-input slot="search">
	<input slot="inputelement" placeholder="Search for more than 8.000 products"/>
	<span class="icon-search-default" slot="inputicon"></span>
</zoo-log-input>
```

## Example usage
To use it in your project add the following to your mark-up file:
```
<zoo-log-header imgsrc="logo.png" headertext="{headertext}">
	<div class="search-field-holder" slot="search">
		<zoo-log-input slot="search">
			<input slot="inputelement" placeholder="Search for more than 8.000 products"/>
			<span class="icon-search-default" slot="inputicon"></span>
		</zoo-log-input>
	</div>
	<div class="header-button-holder" slot="additional">
		<zoo-log-button>
			<button slot="button" class="medium hot header-button" type="button">
				<span class="icon-cart-copy"></span>
				<span class="slotted-span">Shopping Cart</span>
			</button>
		</zoo-log-button>
	</div>
</zoo-log-header>
```