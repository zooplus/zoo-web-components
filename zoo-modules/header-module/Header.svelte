<svelte:options tag="zoo-header"></svelte:options>
<header>
	<slot name="img"></slot>
	<slot name="headertext">
		<h2>{headertext}</h2>
	</slot>
	<slot></slot>
</header>

<style type='text/scss'>
	@import "variables";

	:host {
		contain: style;
	}

	header {
		display: flex;
		align-items: center;
		background: $white;
		padding: 0 25px;
		height: 70px;
	}

	::slotted(img) {
		height: 46px;
		display: inline-block;
		padding: 5px 25px 5px 0;
		cursor: pointer;
		@media only screen and (max-width: 544px) {
			height: 36px;
		}
	}

	::slotted(*[slot="headertext"]), h2 {
		display: inline-block;
		color: var(--primary-mid, #{$primary-mid});
		@media only screen and (max-width: 544px) {
			display: none;
		}
	}
</style>

<script>
	export let headertext = '';
</script>