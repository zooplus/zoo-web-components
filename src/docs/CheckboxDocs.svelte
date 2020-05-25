<svelte:options tag="docs-checkbox"></svelte:options>
<app-context text="Checkbox component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>labeltext</b> - text to be presented on the right side of the checkbox;
					</li>
					<li>
						<b>valid</b> - flag which indicates whether the input is valid or not;
					</li>
					<li>
						<b>disabled</b> - flag indicating whether the input is disabled.
					</li>
					<li>
						<b>highlighted</b> - flag indicating whether the outline around the input should be visible (border).
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component accepts the following slots:
				<ul>
					<li>
						<b>{inputSlotText}</b> - replaced with provided <b>input</b> so that you can catch events/provide your css/attach framework specific directives from/to this element.<br>
					</li>
					<li>
						<b>{labelSlotText}</b> - replaced with provided <b>label</b> for a11y reasons.
					</li>
				</ul>
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
		will produce the following:
		<div style="width: 250px;">
			<zoo-checkbox highlighted="true">
				<input id="checkbox" slot="checkboxelement" type="checkbox"/>
				<label for="checkbox" slot="checkboxlabel">Example label for this particular checkbox</label>
			</zoo-checkbox>
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let inputSlotText = `<slot name="checkboxelement"></slot>`;
	let labelSlotText = `<slot name="checkboxlabel"></slot>`;
	let example = `<div style="width: 250px;">\n  <zoo-checkbox highlighted="true">\n    <input id="checkbox" slot="checkboxelement" type="checkbox"/>\n    <label for="checkbox" slot="checkboxlabel">Example label for this particular checkbox</label>\n  </zoo-checkbox>\n</div>`;
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