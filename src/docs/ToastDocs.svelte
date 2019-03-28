<svelte:options tag="docs-toast"></svelte:options>

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
						<b>type</b> - type of the toast. Possible values are: <b>error</b>, <b>info</b>, <b>success</b>. Default is <b>info</b>
					</li>
					<li>
						<b>timeout</b> - how long the toast should be visible for (in seconds)
					</li>
					<li>
						<b>show()</b> - <b>function</b> to show the toast. Multiple calls to this functions until the toast is hidden will be ignored
					</li>
					<li>
						<b>hide()</b> - <b>function</b> to hide the toast. Multiple calls to this functions until the toast is shown will be ignored
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component does not accept slots.
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
	let example = `<zoo-toast type="info" text="This is an info message."></zoo-toast>`;
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