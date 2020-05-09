<svelte:options tag="docs-button"></svelte:options>

<app-context text="Button component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>type</b> - accepts following values: <b>cold</b>, <b>hot</b>, <b>hollow</b>. Default is <b>cold</b>;
					</li>
					<li>
						<b>size</b> - accepts following values: <b>small</b>, <b>medium</b>, <b>big</b>. Default is <b>small</b>;
					</li>
					<li>
						<b>disabled</b> - whether the button should be disabled or not.
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component accept one <b>{buttonSlotText}</b> which is replaced with provided <b>element</b> so that you can catch events/provide your css/attach framework specific directives from/to this element.     
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
		will produce the following:
		<div style="width: 250px;">
			<zoo-button type="hot" size="medium">
				<span slot="buttoncontent">Shopping Cart</span>
			</zoo-button>
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let buttonSlotText = `<slot name="buttoncontent"></slot>`;
	let example = `<div style="width: 250px;">\n  <zoo-button type="hot" size="medium">\n    <span slot="buttoncontent">Shopping Cart</span>\n  </zoo-button>\n</div>`;
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