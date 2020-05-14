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
						<b>--primary-mid</b> - default color #3C9700;
					</li>
					<li>
						<b>--primary-light</b> - default color #66B100;
					</li>
					<li>
						<b>--primary-ultralight</b> - default color #EBF4E5;
					</li>
					<li>
						<b>--primary-dark</b> - default color #286400;
					</li>
					<li>
						<b>--secondary-mid</b> - default color #FF6200;
					</li>
					<li>
						<b>--secondary-light</b> - default color #FF8800;
					</li>
					<li>
						<b>--secondary-ultralight</b> - default color #FFF0E7;
					</li>
					<li>
						<b>--secondary-dark</b> - default color #CC4E00;
					</li>
					<li>
						<b>--warning-ultralight</b> - default color #FDE8E9;
					</li>
					<li>
						<b>--warning-mid</b> - default color #ED1C24;
					</li>
					<li>
						<b>--warning-dark</b> - default color #BD161C;
					</li>
					<li>
						<b>--success-ultralight</b> - default color #EBF4E5;
					</li>
					<li>
						<b>--success-mid</b> - default color #3C9700;
					</li>
					<li>
						<b>--info-ultralight</b> - default color #ECF5FA;
					</li>
					<li>
						<b>--info-mid</b> - default color #459FD0;
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
	let exampleScss = `@import "variables";\n:root {\n  --primary-mid: #{$primary-mid};\n  --primary-light: #{$primary-light};\n  --primary-dark: #{$primary-dark};\n  --secondary-mid: #{$secondary-mid};\n  --secondary-light: #{$secondary-light};\n  --secondary-dark: #{$secondary-dark};\n}`;
	let exampleCss = `:root {\n  --primary-mid: #040C40;\n  --primary-light: #040C40;\n  --primary-dark: #020729;\n  --secondary-mid: #5D4200;\n  --secondary-light: #745300;\n  --secondary-dark: #3B2B00;\n}`;
	onMount(() => {
		list.items = [{header: 'API'}];
	});
</script>