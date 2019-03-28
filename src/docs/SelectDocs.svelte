<svelte:options tag="docs-select"></svelte:options>

<app-context text="Select component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>labelposition</b> - accepts following values: <b>top</b>, <b>left</b>. Default is <b>top</b>
					</li>
					<li>
						<b>labeltext</b> - text to be presented as the label of the input
					</li>
					<li>
						<b>linktext</b> - text to be presented as a link text
					</li>
					<li>
						<b>linkhref</b> - where the link should lead
					</li>
					<li>
						<b>linktarget</b> - target of the anchor link, default is <b>about:blank</b>
					</li>
					<li>
						<b>inputerrormsg</b> - error message to be presented when input is in invalid state
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
				This component accepts one slot {inputSlotExample}.
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
		will produce the following:
		<div style="width: 250px;">
			<zoo-select labeltext="Select label" infotext="Additional helpful information for our users">
				<select slot="selectelement">
					<option class="placeholder" value="" disabled selected>Placeholder</option>
					<option>1</option>
					<option>2</option>
					<option>3</option>
				</select>
			</zoo-select>
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let inputSlotExample = `<slot name="selectelement"></slot>`;
	let example = `<div style="width: 250px;">\n  <zoo-select labeltext="Select label" infotext="Additional helpful information for our users">\n    <select slot="selectelement">\n      <option class="placeholder" value="" disabled selected>Placeholder</option>\n      <option>1</option>\n      <option>2</option>\n      <option>3</option>\n    </select>\n  </zoo-select>\n</div>`;
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