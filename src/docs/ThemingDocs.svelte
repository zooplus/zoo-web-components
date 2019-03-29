<svelte:options tag="docs-theming"></svelte:options>

<app-context text="Theming API."></app-context>
<div class="doc-element">
	<div class="list">
		Theming can be achieved by using CSS Custom Properties <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/--*" target="about:blank">docs</a>.
		API describes possible variables which are understood by the library.
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>--main-color</b> - 
					</li>
					<li>
						<b>--main-color-light</b> - 
					</li>
					<li>
						<b>--main-color-dark</b> - 
					</li>
					<li>
						<b>--secondary-color</b> - 
					</li>
					<li>
						<b>--secondary-color-light</b> - 
					</li>
					<li>
						<b>--secondary-color-dark</b> - 
					</li>
				</ul>
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		Example with a preprocessor:
		<code><pre>{exampleScss}</pre></code>
		Example with pure css:
		<code><pre>{exampleCss}</pre></code>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
import { onMount } from 'svelte';
	let list;
	let exampleScss = `@import "variables";\n:root {\n  --main-color: #{$main-color};\n  --main-color-light: #{$main-color-light};\n  --main-color-dark: #{$main-color-dark};\n  --secondary-color: #{$secondary-color};\n  --secondary-color-light: #{$secondary-color-light};\n  --secondary-color-dark: #{$secondary-color-dark};\n}`;
	let exampleCss = `:root {\n  --main-color: #040C40;\n  --main-color-light: #040C40;\n  --main-color-dark: #020729;\n  --secondary-color: #5D4200;\n  --secondary-color-light: #745300;\n  --secondary-color-dark: #3B2B00;\n}`;
	onMount(() => {
		list.items = [{header: 'API'}];
	});
</script>