<svelte:options tag="docs-searchable-select"></svelte:options>

<app-context text="Searchable select component API."></app-context>
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
					<li>
						<b>placeholder</b> - text which should be displayed inside input used for searching
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
			<zoo-searchable-select labeltext="Searchable select" placeholder="Placeholder">
				<select multiple slot="selectelement">
					<option value="1">1</option>
					<option value="2">2</option>
				</select>
			</zoo-searchable-select>
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
	let example = `<div style="width: 250px;">\n  <zoo-searchable-select labeltext="Searchable select" placeholder="Placeholder">\n    <select multiple slot="selectelement">\n      <option value="1">1</option>\n      <option value="2">2</option>\n    </select>\n  </zoo-searchable-select>\n</div>`;
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