<svelte:options tag="zoo-collapsible-list-item"></svelte:options>
<ul>
	<li>
		<slot></slot>
	</li>
</ul>

<style type="text/scss">
	@import "variables";
	ul {
		padding: 0;
		li {
			list-style-type: none;
		}
	}
</style>

<script>
</script>