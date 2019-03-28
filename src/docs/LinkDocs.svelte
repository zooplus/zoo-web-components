<svelte:options tag="docs-link"></svelte:options>

<app-context text="Link component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<ul>
						<li>
							<b>href</b> - direct link
						</li>
						<li>
							<b>text</b> - text to be displayed as link
						</li>
						<li>
							<b>target</b> - how the link should behave (default - <b>about:blank</b>)
						</li>
						<li>
							<b>type</b> - currently supports 2 values: <b>standard</b> and <b>green</b>, default - <b>standard</b>. Responsible for coloring of the links, standard is white
						</li>
						<li>
							<b>disabled</b> - flag indicating whether the anchor link should be disabled
						</li>
						<li>
							<b>textalign</b> - standard css behaviour. Default value is <b>center</b>
						</li>
					</ul>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component does not accept slots.
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
		will produce the following:
		<div style="width: 250px;">
			<zoo-link href="https://google.com" text="Link to google" type="green"></zoo-link>
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let inputSlotExample = `<slot name="inputelement"></slot>`;
	let example = `<div style="width: 250px;">\n  <zoo-link href="https://google.com" text="Link to google" type="green"></zoo-link>\n</div>`;
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