# Header module

## API
* `imgsrc` - path to logo of your app;
* `headertext` - text to be displayed next to the logo (optional).

## Slots
This component accepts `<slot name="content"></slot>` which is replaced with provided `HTMLElement` so that you can catch events from this element.       
Just add `slot` attribute to the `HTMLElement` you provide for this component, like so: 
```
<zoo-log-input slot="content">
	<input slot="inputelement" placeholder="Search for more than 8.000 products"/>
	<span class="icon-search-default" slot="inputicon"></span>
</zoo-log-input>
```

## Example usage
To use it in your project add the following to your mark-up file:
```
<zoo-log-header imgsrc="logo.png" headertext="{headertext}">
	<div class="search-field-holder" slot="content">
		<div class="header-search">
			<zoo-log-input>
				<input slot="inputelement" placeholder="Search for more than 8.000 products"/>
				<span class="icon-search-default" slot="inputicon"></span>
			</zoo-log-input>
		</div>
		<div class="header-button">
			<zoo-log-button>
				<button slot="button" class="medium hot" type="button">
					<span class="icon-cart-copy"></span>
					<span class="slotted-span">Shopping Cart</span>
				</button>
			</zoo-log-button>
		</div>
	</div>
</zoo-log-header>
```