<svelte:options tag="docs-header"></svelte:options>

<app-context text="Header component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>imgsrc</b> - path to logo of your app
					</li>
					<li>
						<b>imgalt</b> - text to be displayed when logo cannot be found
					</li>
					<li>
						<b>headertext</b> - text to be displayed next to the logo
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component accepts unnamed slots, which will be rendered to the right after logo or text.
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
		will produce the following:
		<div style="width: 250px;">
			<zoo-header imgsrc="logo.png" imgalt="zooplus" headertext="App name">
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let example = `<div style="width: 250px;">\n  <zoo-header imgsrc="logo.png" imgalt="imgalt" headertext="App name"></zoo-header>\n</div>`;
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