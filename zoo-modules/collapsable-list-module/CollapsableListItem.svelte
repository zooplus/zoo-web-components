<svelte:options tag="zoo-collapsable-list-item"></svelte:options>
<ul>
	<li>
		<slot></slot>
	</li>
</ul>

<style type="text/scss">
	ul {
		padding: 0;

		li {
			list-style-type: none;
		}
	}
</style>