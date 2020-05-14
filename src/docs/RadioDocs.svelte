<svelte:options tag="docs-radio"></svelte:options>

<app-context text="Radio component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>errormsg</b> - error message to be presented when input is in invalid state
					</li>
					<li>
						<b>infotext</b> - text to be presented below the input
					</li>
					<li>
						<b>valid</b> - flag which indicates whether the input is valid or not
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component accepts multiple unnamed slots.
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
		will produce the following:
		<div style="width: 250px;">
			<zoo-radio infotext="infotext" labeltext="Label text">
				<input type="radio" id="contactChoice4" name="contact" value="email" disabled>
				<label for="contactChoice4">Email</label>
				<input type="radio" id="contactChoice5" name="contact" value="phone">
				<label for="contactChoice5">Phone</label>
			</zoo-radio>
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let example = `<div style="width: 250px;">\n  <zoo-radio infotext="infotext">\n    <input type="radio" id="contactChoice4" name="contact" value="email" disabled>\n    <label for="contactChoice4">Email</label>\n    <input type="radio" id="contactChoice5" name="contact" value="phone">\n    <label for="contactChoice5">Phone</label>\n  </zoo-radio>\n</div>`;
	onMount(() => {
		list.items = [
			{
				header: 'API'
			},
			{
				header: 'Slots'
			}
		];
	});
</script>