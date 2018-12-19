# Link module

TODO: using this module with footer module will cause error to be thrown, thus blocking the UI. Fix this.

## API
- `href` - direct link;
- `text` - text to be displayed as link;
- `target` - how the link should behave (default - `about:blank`) (optional);
- `type` - currently supports 2 values: `standard` and `green`, default - `standard`. Responsible for coloring of the links, standard is white. (optional).
- `disabled` - flag indicating whether the anchor link should be disabled.

### Example usage 
```
<zoo-log-link 
	href="{footerlink.href}"
	text="{footerlink.text}" >
</zoo-log-link>
```

### Icons
*Does not* require any icons to function.