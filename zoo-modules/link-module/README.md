# Link module

## API
- `href` - direct link;
- `text` - text to be displayed as link;
- `target` - how the link should behave (default - `about:blank`) (optional);
- `type` - currently supports 2 values: `standard` and `green`, default - `standard`. Responsible for coloring of the links, standard is white. (optional).
- `disabled` - flag indicating whether the anchor link should be disabled.;
- `textalign` - standard css behaviour. Default value is `center`;
- `size` - size of the link text. Supports values: `regular`, `bold`, `large`. Default value is `regular`.

## Example usage 
```
<zoo-link 
	href="{footerlink.href}"
	text="{footerlink.text}" >
</zoo-link>
```