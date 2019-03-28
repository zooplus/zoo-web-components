<svelte:options tag="docs-tooltip"></svelte:options>

<app-context text="Toast component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>text</b> - text to be presented in the toast box
					</li>
					<li>
						<b>position</b> - Possible values are: <b>top</b>, <b>right</b>, <b>bottom</b> or <b>left</b>. Default is <b>top</b>
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component either renders a unnamed slot or presents text supplied as an attribute.
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let inputSlotExample = `<slot name="inputelement"></slot>`;
	let example = `<zoo-button>\n  <div slot="buttoncontent">\n    Disabled :(\n    <zoo-tooltip text="Tooltip text"></zoo-tooltip>\n  </div>\n</zoo-button>`;
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