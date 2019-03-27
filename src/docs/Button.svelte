<svelte:options tag="docs-button"></svelte:options>

<div class="context">
	<h2>Button component API.</h2>
</div>

<details>
    <summary>API</summary>
    <pre>
    - `type` `optional` - accepts following values: `cold`, `hot`. Default is `cold`;
	- `size` `optional` - accepts following values: `small`, `medium`, `big`. Default is `small`;
	- `disabled` - whether the button should be disabled or not.
	</pre>
</details>

<details>
    <summary>Slots</summary>
    This component accept one `<slot name="buttoncontent"></slot>` which is replaced with provided `element` so that you can catch events from this element.     
</details>

<details>
    <summary>States</summary>
    - `disabled` - the component provides styling for disabled type of input. For the styles to be applied just set the `disabled` attribute on slotted `button` element;.     
</details>

<details>
    <summary>Example usage </summary>
    <code>
		<pre>
			{example}
		</pre>
	</code>
</details>

<style>

</style>

<script>
	let example = `
		<zoo-button type="hot" size="medium">
			<div slot="buttoncontent">
				<span class="icon-cart-copy"></span>
				<span class="slotted-span">Shopping Cart</span>
			</div>
		</zoo-button>
	`
</script>