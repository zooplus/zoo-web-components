# Radio module

## API
- `errormsg` `optional` - error message to be presented when input is in invalid state,
- `infotext` `optional` - text to be presented below the input;
- `valid` - flag which indicates whether the input is valid or not;

### Slots
This component accept one `<slot></slot>`. This slot expects you to provide a `template` element with the inputs and label you wish to show.

### Example usage 
```
<zoo-radio valid="{inputState}" errormsg="errormsg">
	<template>
		<input type="radio" id="contactChoice1" name="contact" value="email" disabled>
		<label for="contactChoice1">Email</label>
		<input type="radio" id="contactChoice2" name="contact" value="phone">
		<label for="contactChoice2">Phone</label>
		<input type="radio" id="contactChoice3" name="contact" value="mail">
		<label for="contactChoice3">Mail</label>
	</template>
</zoo-radio>
```

```
<zoo-radio valid="{inputState}" errormsg="errormsg" infotext="infotext">
	<input type="radio" id="contactChoice4" name="contact" value="email" disabled>
	<label for="contactChoice4">Email</label>
	<input type="radio" id="contactChoice5" name="contact" value="phone">
	<label for="contactChoice5">Phone</label>
</zoo-radio>
```