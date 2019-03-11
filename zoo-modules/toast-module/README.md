# Radio module

## API
- `text` - text to be presented in the toast box;
- `type` - type of the toast. Possible values are: `error`, `info`, `success`. Default is `info`;
- `timeout` - how long the toast should be visible for (in seconds);
- `show` - `function` to show the toast. Multiple callings to this functions until the toast is hidden will be ignored;
- `hide` - `function` to hide the toast. Multiple callings to this functions until the toast is shown will be ignored;

## Example usage 
```
<zoo-toast 
	type="info" 
	text="This is an info message.">
</zoo-toast>
```