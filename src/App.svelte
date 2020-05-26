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
				<app-tooltip-and-feedback></app-tooltip-and-feedback>
				<hr>
				<app-grids></app-grids>
				<hr>
				<app-links></app-links>
				<hr>
			</div>
			<div id="when" class="caniuse">
				<app-context text="When can I use it?" backbtn="{true}"></app-context>
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
				<div class="left-menu">
					{#each doclinks as link}
						<div class="link-wrapper">
							<a href="{link.href}">{link.text}</a>
						</div>
						<hr class="left-menu-separator">
					{/each}
				</div>
			</div>
			<div class="content">
				<docs-button  id="button-doc"></docs-button>
				<hr>
				<docs-checkbox id="checkbox-doc"></docs-checkbox>
				<hr>
				<docs-collapsable-list id="collapsable-list-doc"></docs-collapsable-list>
				<hr>
				<docs-feedback id="feedback-doc"></docs-feedback>
				<hr>
				<docs-footer id="footer-doc"></docs-footer>
				<hr>
				<docs-header id="header-doc"></docs-header>
				<hr>
				<docs-input id="input-doc"></docs-input>
				<hr>
				<docs-link id="link-doc"></docs-link>
				<hr>
				<docs-modal id="modal-doc"></docs-modal>
				<hr>
				<docs-navigation id="navigation-doc"></docs-navigation>
				<hr>
				<docs-radio id="radio-doc"></docs-radio>
				<hr>
				<docs-searchable-select id="searchable-select-doc"></docs-searchable-select>
				<hr>
				<docs-select id="select-doc"></docs-select>
				<hr>
				<docs-toast id="toast-doc"></docs-toast>
				<hr>
				<docs-tooltip id="tooltip-doc"></docs-tooltip>
				<hr>
				<docs-grid id="grid-doc"></docs-grid>
				<hr>
				<docs-theming id="theming-doc"></docs-theming>
				<hr>
			</div>
		</div>
	</main>
	<zoo-footer class="footer" bind:this={footer} copyright="zooplus AG"></zoo-footer> 
</div>

<style type="text/scss">
	@import "variables";

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
		grid-template-columns: 340px 1fr;
		grid-gap: 30px;
		grid-template-areas: "overview overview"
		"caniuse caniuse"
		"spec-docs content";

		@media only screen and (max-width: 850px) {
			grid-template-areas: "overview"
			"caniuse"
			"spec-docs" 
			"content";
			grid-template-columns: minmax(320px, 90%);
			justify-content: center;
		}
	}

	.what-list {
		color: var(--primary-mid, #{$primary-mid});
		font-size: 20px;
	}

	#when {
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

	.left-menu {	
		.left-menu-separator {
			margin: 0;
		}
		@media only screen and (max-width: 850px) {
			display: none;
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
		position: sticky;
		top: 0;
		height: 200px;
	}

	.content {
		grid-area: content;
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
	import { onMount } from 'svelte';
	let footer;
	let doclinks = [
		{
			href: '#button-doc',
			text: 'Button'
		},
		{
			href: '#checkbox-doc',
			text: 'Checkbox'
		},
		{
			href: '#collapsable-list-doc',
			text: 'Collapsable List'
		},
		{
			href: '#feedback-doc',
			text: 'Feedback'
		},
		{
			href: '#footer-doc',
			text: 'Footer'
		},
		{
			href: '#header-doc',
			text: 'Header'
		},
		{
			href: '#input-doc',
			text: 'Input'
		},
		{
			href: '#link-doc',
			text: 'Link'
		},
		{
			href: '#modal-doc',
			text: 'Modal'
		},
		{
			href: '#navigation-doc',
			text: 'Navigation'
		},
		{
			href: '#radio-doc',
			text: 'Radio'
		},
		{
			href: '#searchable-select-doc',
			text: 'Searchable select'
		},
		{
			href: '#select-doc',
			text: 'Select'
		},
		{
			href: '#toast-doc',
			text: 'Toast'
		},
		{
			href: '#tooltip-doc',
			text: 'Tooltip'
		},
		{
			href: '#grid-doc',
			text: 'Grid'
		},
		{
			href: '#theming-doc',
			text: 'Theming'
		}
	];
	onMount(() => {
		footer.footerlinks = [
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