<div class="app">
	<app-header></app-header>
	<main>
		<app-context id="what" text="What is this project?"></app-context>
		<ul class="what-list">
			<li>
				Set of web-components which can be used in any modern UI framework (or without any).
			</li>
			<li>
				The web-component set implements Z+ shop style guide.
			</li>
		</ul>
		<div class="page-content">
			<div class="overview">
				<app-form></app-form>
				<hr>
				<app-buttons></app-buttons>
				<hr>
				<app-grids></app-grids>
			</div>
			<div id="when" class="caniuse">
				<app-context text="When can I use it?" backbtn="{true}"></app-context>
				<aside>Although safari is marked as partially supporting these features, this project does not use any features that do not work in Safari.</aside>
				<br>
				<div class="desktop">
					<p class="ciu_embed" data-feature="shadowdomv1" data-periods="future_1,current,past_1,past_2" data-accessible-colours="false">
						<a href="http://caniuse.com/#feat=shadowdomv1">Can I Use shadowdomv1?</a> Data on support for the shadowdomv1 feature across the major browsers from caniuse.com.
					</p>
					<p class="ciu_embed" data-feature="custom-elementsv1" data-periods="future_1,current,past_1,past_2" data-accessible-colours="false">
						<a href="http://caniuse.com/#feat=custom-elementsv1">Can I Use custom-elementsv1?</a> Data on support for the custom-elementsv1 feature across the major browsers from caniuse.com.
					</p>
				</div>
				<div class="mobile">
					<div class="back-btn">
						<zoo-button>
							<span slot="buttoncontent"><a href="http://caniuse.com/#feat=shadowdomv1" target="about:blank">Can I Use shadowdomv1?</a></span>
						</zoo-button>
					</div>
					<div class="back-btn">
						<zoo-button>
							<span slot="buttoncontent"><a href="http://caniuse.com/#feat=custom-elementsv1" target="about:blank">Can I Use custom-elementsv1?</a></span>
						</zoo-button>
					</div>
				</div>
			</div>
			<div id="how" class="spec-docs">
				<app-context text="How can I use it?" backbtn="{true}"></app-context>
				<div class="external-docs">
					Documentation for each component is available at
					<zoo-link href="https://zooplus.github.io/zoo-web-components-docs/index.html" text="Docs page" size="large" type="primary"></zoo-link>
				</div>
			</div>
		</div>
	</main>
	<zoo-footer class="footer" copyright="zooplus AG">
		{#each footerlinks as footerlink}
			<zoo-link href="{footerlink.href}" target="{footerlink.target}" type="{footerlink.type}"
				disabled="{footerlink.disabled}" text="{footerlink.text}">
			</zoo-link>
		{/each}
	</zoo-footer> 
</div>

<style type="text/scss">
	@import "variables";

	.external-docs {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.app {
		margin: 0 auto;
		height: 100%;
		display: flex;
		flex-direction: column;
		box-shadow: $box-shadow;
	}

	.page-content {
		position: relative;
		display: grid;
		grid-template-columns: 1fr;
		grid-gap: 30px;
		grid-template-areas: "overview"
		"caniuse"
		"spec-docs";

		@media only screen and (max-width: 850px) {
			grid-template-columns: minmax(320px, 90%);
			justify-content: center;
		}
	}

	.what-list {
		color: var(--primary-mid, #{$primary-mid});
		font-size: 20px;
	}

	#when {
		aside {
			color: var(--primary-dark, #{$primary-dark});
			text-align: center;
		}

		.desktop {
			@media only screen and (max-width: 850px) {
				display: none;
			}
		}

		.mobile {
			display: none;
			@media only screen and (max-width: 850px) {
				display: block;
			}
		}

		.back-btn {
			width: 280px;
			margin: 10px auto;

			a {
				text-decoration: none;
				color: white;
			}
		}
	}

	.link-wrapper {
		height: auto;
		transition: color 0.3s, background-color 0.3s;

		&:hover {
			background-color: rgba(0, 0, 0, 0.1);
			color: white;
		}

		a {
			color: var(--primary-mid, $primary-mid);
			padding: 12px;
			display: block;
			text-decoration: none;
		}
	}

	.overview {
		grid-area: overview;
		max-width: 1280px;
		width: 100%;
		flex: 1 0 auto;
		margin: 0 auto;
	}

	.caniuse {
		grid-area: caniuse;
		width: 100%;
		flex: 1 0 auto;
	}

	.caniuse p {
		max-width: 1280px;
		margin: 0 auto;
	}

	.spec-docs {
		grid-area: spec-docs;
		margin-bottom: 50px;
	}

	hr {
		border-color: var(--primary-mid, #{$primary-mid});
		margin: 45px 0;
		opacity: 0.3;
	}

	.footer {
		flex-shrink: 0;
	}
</style>

<script>
	let footerlinks = [
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
	let doclinks = [
		{
			href: '#theming-doc',
			text: 'Theming'
		}
	];
</script>