<svelte:options tag="docs-feedback"></svelte:options>
<app-context text="Feedback component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>text</b> - text to be presented in the feedback box
					</li>
					<li>
						<b>type</b> - type of the feedback. Possible values are: <b>error</b>, <b>info</b>, <b>success</b>. Default is <b>info</b>;
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component accepts unnamed slots.
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
		will produce the following:
		<div style="width: 250px;">
			<zoo-feedback text="This is an info message."></zoo-feedback>
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
	let example = `<div style="width: 250px;">\n  <zoo-feedback text="This is an info message."></zoo-feedback>\n</div>`;
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