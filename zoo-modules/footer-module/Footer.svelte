<svelte:options tag="zoo-footer"></svelte:options>
<footer>
	<nav>
		<slot></slot>
	</nav>
	{#if copyright}
		<div class="footer-copyright">
			© {copyright} {currentYear}
		</div>
	{/if}
</footer>

<style type='text/scss'>
	@import "variables";

	:host {
		contain: style;
	}

	nav {
		display: flex;
		background-image: linear-gradient(left, var(--primary-mid, #{$primary-mid}), var(--primary-light, #{$primary-light}));
		background-image: -webkit-linear-gradient(left, var(--primary-mid, #{$primary-mid}), var(--primary-light, #{$primary-light}));
		justify-content: center;
		padding: 10px 30px;
		flex-wrap: wrap;
	}

	.footer-copyright {
		font-size: $p2-size;
		line-height: $p2-line-height;
		text-align: left;
		background: $white;
		color: $grey-dark;
		padding: 10px 0 10px 30px;
		@media only screen and (max-width: 544px) {
			text-align: center;
			padding: 10px 0;
		}
	}
</style>

<script>
	export let copyright = '';
	let currentYear = new Date().getFullYear();
</script>