<svelte:options tag="zoo-footer"></svelte:options>
<div class="footer-links">
	<div class="list-holder">
		<ul>
			{#each footerlinks as footerlink}
			<li>
				<zoo-link href="{footerlink.href}" target="{footerlink.target}" type="{footerlink.type}"
				disabled="{footerlink.disabled}" text="{footerlink.text}">
				</zoo-link>
			</li>
			{/each}
		</ul>
	</div>
</div>
{#if copyright}
	<div class="footer-copyright">
		© {copyright} {currentYear}
	</div>
{/if}

<style type='text/scss'>
	@import "variables";

	:host {
		contain: style;
	}

	.footer-links {
		display: flex;
		background-image: linear-gradient(left, var(--main-color, #{$main-color}), var(--main-color-light, #{$main-color-light}));
		background-image: -webkit-linear-gradient(left, var(--main-color, #{$main-color}), var(--main-color-light, #{$main-color-light}));
		justify-content: center;
		padding: 10px 30px;
		flex-wrap: wrap;

		.list-holder {
			position: relative;
			overflow: hidden;

			ul {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: center;
				list-style: none;
				margin-left: -1px;
				padding-left: 0;
				margin-top: 0;
				margin-bottom: 0;

				li {
					flex-grow: 1;
					flex-basis: auto;
					margin: 5px 0;
					padding: 0 5px;
					text-align: center;
					border-left: 1px solid #e6e6e6;
				}
			}
		}
	}

	.footer-copyright {
		font-size: $p2-size;
		line-height: $p2-line-height;
		text-align: left;
		background: $white;
		color: $matterhorn;
		padding: 10px 0 10px 30px;
		@media only screen and (max-width: 544px) {
			text-align: center;
			padding: 10px 0;
		}
	}
</style>

<script>
	export let footerlinks = [];
	export let copyright = '';
	let currentYear = new Date().getFullYear();
</script>