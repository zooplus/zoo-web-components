<svelte:options tag="docs-footer"></svelte:options>

<app-context text="Footer component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>footerlinks</b> - an <b>array</b> of objects where each object has the following structure:
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
								<b>copyright</b> - text to be presented as a copyright unde links (foe example, 'zooplus AG')
							</li>
						</ul>
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component does not accept slots.
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}{scriptExample}</pre></code>
		will produce the following:
		<div style="width: 250px;">
			<zoo-footer bind:this={exampleFooter}></zoo-footer>
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let exampleFooter;
	let example = `<div style="width: 250px;">\n  <zoo-footer id="footer"></zoo-footer>\n</div>`;
	let scriptExample = `\n<script>\n  document.getElementById('footer').footerlinks=[{\n    href: 'https://github.com/zooplus/zoo-web-components',\n    text: 'Github',\n    type: 'standard'\n  },\n  {\n    href: 'https://www.npmjs.com/package/@zooplus/zoo-web-components',\n    text: 'NPM',\n    type: 'standard'\n  }];\n<\/script>`;
	onMount(() => {
		list.items = [
			{
				header: 'API'
			},
			{
				header: 'Slots'
			}
		];
		exampleFooter.footerlinks = [
			{
				href: 'https://github.com/zooplus/zoo-web-components',
				text: 'Github',
				type: 'negative'
			},
			{
				href: 'https://www.npmjs.com/package/@zooplus/zoo-web-components',
				text: 'NPM',
				type: 'negative'
			}
		];
	});
</script>