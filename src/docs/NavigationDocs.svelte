<svelte:options tag="docs-navigation"></svelte:options>

<app-context text="Navigation component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				This component accepts multiple unnamed slots.
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
		<div style="width: 250px">
			<zoo-navigation class="nav">
				<div>
					{#each navlinks as link}
						<zoo-link style="margin-left: 10px;" href="{link.href}" text="{link.text}"></zoo-link>
					{/each}
				</div>
			</zoo-navigation>
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let navlinks = [
		{
			href: 'https://google.com',
			text: 'Google'
		},
		{
			href: 'https://svelte.technology/',
			text: 'Svelte'
		}
	];
	let example = `<div style="width: 250px">\n  <zoo-navigation class="nav">\n    <div>\n      {#each navlinks as link}\n        <zoo-link style="margin-left: 10px;" href="{link.href}" text="{link.text}"></zoo-link>\n      {/each}\n    </div>\n  </zoo-navigation></div>`;
	onMount(() => {
		list.items = [
			{
				header: 'Slots'
			}
		];
	});
</script>