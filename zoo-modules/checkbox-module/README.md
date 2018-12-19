# Checkbox module

## API
- `labeltext` - text to be presented on the right side of the checkbox;
- `valid` - flag which indicates whether the input is valid or not;
- `disabled` - flasg indicating whether the input is disabled;
- `highlighted` - flag indicating whether the outline around the input should be visible (border);

### Example usage 
```
<zoo-log-checkbox highlighted
	labeltext="Example label for this particular checkbox">
	<input slot="checkboxelement" type="checkbox"/>
</zoo-log-checkbox>
```

### Icons
*Does not* require any icons to function.