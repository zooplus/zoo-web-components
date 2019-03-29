<div class="app">
	<app-header></app-header>
	<app-context id="what" text="What is this project?"></app-context>
	<ul class="what-list">
		<li>
			Set of web-components which can be used in any modern UI framework (or without any).
		</li>
		<li>
			The web-component set implements Z+ shop style guide, which is described here: https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens/323893960.
		</li>
		<li>
			Future releases will include more components, ESM support etc.
		</li>
	</ul>
	<div class="page-content">
		<div class="overview">
			<app-form id="app-form"></app-form>
			<hr>
			<app-buttons id="app-buttons"></app-buttons>
			<hr>
			<app-tooltip-and-feedback id="app-tooltip-and-feedback"></app-tooltip-and-feedback>
			<hr>
		</div>
		<div id="when" class="caniuse">
			<app-context text="Where can I use it?"></app-context>
			<p class="ciu_embed" data-feature="shadowdomv1" data-periods="future_1,current,past_1,past_2" data-accessible-colours="false">
				<a href="http://caniuse.com/#feat=shadowdomv1">Can I Use shadowdomv1?</a> Data on support for the shadowdomv1 feature across the major browsers from caniuse.com.
			</p>
			<p class="ciu_embed" data-feature="custom-elementsv1" data-periods="future_1,current,past_1,past_2" data-accessible-colours="false">
				<a href="http://caniuse.com/#feat=custom-elementsv1">Can I Use custom-elementsv1?</a> Data on support for the custom-elementsv1 feature across the major browsers from caniuse.com.
			</p>
			<p class="ciu_embed" data-feature="template" data-periods="future_1,current,past_1,past_2" data-accessible-colours="false">
				<a href="http://caniuse.com/#feat=template">Can I Use template?</a> Data on support for the template feature across the major browsers from caniuse.com.
			</p>
		</div>
		<div id="how" class="spec-docs">
			<app-context text="How can I use it?"></app-context>
			<div class="left-menu">
				{#each doclinks as link}
					<div class="link-wrapper">
						<zoo-link href="{link.href}" target="{link.target}" type="{link.type}" text="{link.text}" textalign="left"></zoo-link>
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
			<docs-theming id="theming-doc"></docs-theming>
			<hr>
		</div>
	</div>
	<zoo-footer class="footer" bind:this={footer} copyright="zooplus AG"></zoo-footer> 
</div>

<style type="text/scss">
	@import "variables";
	.app {
		margin: 0 auto;
		height: 100%;
		display: flex;
		flex-direction: column;
		box-shadow: 15px 0px 40px 0px rgba(85,85,85, 0.3), -15px 0px 40px 0px rgba(85,85,85, 0.3);
	}
	.page-content {
		position: relative;
		display: grid;
		grid-template-columns: 320px 1fr;
		grid-gap: 30px;
		grid-template-areas:
			"overview overview"
			"caniuse caniuse"
			"spec-docs content";
	}
	.what-list {
		color: var(--main-color, #{$main-color});
		font-size: 20px;
	}
	.link-wrapper {
		height: auto;
		padding: 12px;
	}
	.left-menu-separator {
		margin: 0;
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
		height: 500px;
	}
	.content {
		grid-area: content;
	}
	hr {
		color: var(--main-color, #{$main-color});
		margin: 45px 0;
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
			target: '',
			type: 'green',
			text: 'Button Doc'
		},
		{
			href: '#checkbox-doc',
			target: '',
			type: 'green',
			text: 'Checkbox Doc'
		},
		{
			href: '#collapsable-list-doc',
			target: '',
			type: 'green',
			text: 'Collapsable List Doc'
		},
		{
			href: '#feedback-doc',
			target: '',
			type: 'green',
			text: 'Feedback Doc'
		},
		{
			href: '#footer-doc',
			target: '',
			type: 'green',
			text: 'Footer Doc'
		},
		{
			href: '#header-doc',
			target: '',
			type: 'green',
			text: 'Header Doc'
		},
		{
			href: '#input-doc',
			target: '',
			type: 'green',
			text: 'Input Doc'
		},
		{
			href: '#link-doc',
			target: '',
			type: 'green',
			text: 'Link Doc'
		},
		{
			href: '#modal-doc',
			target: '',
			type: 'green',
			text: 'Modal Doc'
		},
		{
			href: '#navigation-doc',
			target: '',
			type: 'green',
			text: 'Navigation Doc'
		},
		{
			href: '#radio-doc',
			target: '',
			type: 'green',
			text: 'Radio Doc'
		},
		{
			href: '#searchable-select-doc',
			target: '',
			type: 'green',
			text: 'Searchable select Doc'
		},
		{
			href: '#select-doc',
			target: '',
			type: 'green',
			text: 'Select Doc'
		},
		{
			href: '#toast-doc',
			target: '',
			type: 'green',
			text: 'Toast Doc'
		},
		{
			href: '#tooltip-doc',
			target: '',
			type: 'green',
			text: 'Tooltip Doc'
		},
		{
			href: '#theming-doc',
			target: '',
			type: 'green',
			text: 'Theming Doc'
		}
	];
	onMount(() => {
		footer.footerlinks = [
			{
				href: 'https://github.com/zooplus/zoo-web-components',
				text: 'Github',
				type: 'standard'
			},
			{
				href: 'https://www.npmjs.com/package/@zooplus/zoo-web-components',
				text: 'NPM',
				type: 'standard'
			},
			{
				href: 'https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens',
				text: 'Style guide',
				type: 'standard'
			}
		];
	});
</script>