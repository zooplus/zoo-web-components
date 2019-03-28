<svelte:options tag="docs-collapsable-list"></svelte:options>
<app-context text="Collapsable List component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>items</b> - array of objects of with one field <code>header: string</code>
					</li>
					<li>
						<b>highlighted</b> - flag indicating whether the outline around the input should be visible (border)
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component accepts multiple <b>{listSlotText}</b> which are replaced with provided <b>elements</b>.
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}{scriptExample}</pre></code>
		will produce the following:
		<div style="width: 250px;">
			<zoo-collapsable-list bind:this={exampleList}>
				<zoo-collapsable-list-item slot="item0">
					<span>inner item0</span>
				</zoo-collapsable-list-item>
				<zoo-collapsable-list-item slot="item1">
					<span>inner item1</span>
				</zoo-collapsable-list-item>
			</zoo-collapsable-list>
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let listSlotText = `<slot name="item{idx}"></slot>`;
	let example = `<div style="width: 250px;">\n  <zoo-collapsable-list id="list">\n    <zoo-collapsable-list-item slot="item0">\n      <span>inner item0</span>\n    </zoo-collapsable-list-item>\n    <zoo-collapsable-list-item slot="item1">\n      <span>inner item1</span>\n    </zoo-collapsable-list-item>\n  </zoo-collapsable-list>\n</div>`;
	let scriptExample = `\n<script>\n  document.getElementById('list').items=[{header: item0}, {header: item1}];\n<\/script>`;
	let exampleList;
	onMount(() => {
		list.items = [
			{
				header: 'API'
			},
			{
				header: 'Slots'
			}
		];
		exampleList.items = [
			{
				header: 'item0'
			},
			{
				header: 'item1'
			}
		];
	});
</script>