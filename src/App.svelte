<div class="app">
	<app-header></app-header>
	<zoo-grid bind:this={zooGrid} style="padding: 10px; max-height: 300px;" stickyheader paginator currentpage="5" maxpages="20">
		<div slot="headercell" sortable>Actions</div>
		<div slot="headercell">Created Date</div>
		<div slot="headercell">Status</div>
		<div slot="headercell">From Date</div>
		<div slot="headercell">Creator Name</div>
		<div slot="headercell">Supplier</div>
		<div slot="headercell">Fulfillment Center</div>
		<div slot="headercell">Article Importance Lower Bound %</div>

		<div slot="row">
			<zoo-feedback type="info" text="This is an info message.">
			</zoo-feedback>
			<div>cell2</div>
			<div>cell3</div>
			<div>cell4</div>
			<div>cell5</div>
			<zoo-select labeltext="This product is for">
				<select slot="selectelement">
					<option class="placeholder" value="" disabled selected>Doge</option>
					<option>Doge</option>
					<option>Catz</option>
					<option>Snek</option>
				</select>
			</zoo-select>
			<div>cell7</div>
			<div>cell8</div>
		</div>
		<div slot="row">
			<div>cell9</div>
			<div>cell10</div>
			<div>cell11</div>
			<div>cell12</div>
			<div>cell13</div>
			<div>cell14</div>
			<div>cell15</div>
			<div>cell16</div>
		</div>
		<div slot="row">
			<div>cell9</div>
			<div>cell10</div>
			<div>cell11</div>
			<div>cell12</div>
			<div>cell13</div>
			<div>cell14</div>
			<div>cell15</div>
			<div>cell16</div>
		</div>
		<div slot="row">
			<div>cell9</div>
			<div>cell10</div>
			<div>cell11</div>
			<div>cell12</div>
			<div>cell13</div>
			<div>cell14</div>
			<div>cell15</div>
			<div>cell16</div>
		</div>
		<div slot="row">
			<div>cell9</div>
			<div>cell10</div>
			<div>cell11</div>
			<div>cell12</div>
			<div>cell13</div>
			<div>cell14</div>
			<div>cell15</div>
			<div>cell16</div>
		</div>

		<zoo-select labeltext="Items per page" labelposition="left" slot="pagesizeselector">
			<select slot="selectelement">
				{#each possibleNumberOfItems as number, idx}
					<option selected="{idx == 0}">{number}</option>
				{/each}
			</select>
		</zoo-select>
	</zoo-grid>

	<zoo-grid bind:this={zooGrid} style="padding: 10px; max-height: 300px;" stickyheader paginator>
		<div slot="headercell" sortable>Actions</div>
		<div slot="headercell">Created Date</div>
		<div slot="headercell">Status</div>
		<div slot="headercell">From Date</div>
		<div slot="headercell">Creator Name</div>
		<div slot="headercell">Supplier</div>
		<div slot="headercell">Fulfillment Center</div>
		<div slot="headercell">Article Importance Lower Bound %</div>
		<div slot="norecords">
			No records to show!
		</div>
	</zoo-grid>
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
			<app-form id="app-form"></app-form>
			<hr>
			<app-buttons id="app-buttons"></app-buttons>
			<hr>
			<app-tooltip-and-feedback id="app-tooltip-and-feedback"></app-tooltip-and-feedback>
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
				<div class="back-btn">
					<zoo-button>
						<span slot="buttoncontent"><a href="http://caniuse.com/#feat=template" target="about:blank">Can I Use template?</a> </span>
					</zoo-button>
				</div>
			</div>
		</div>
		<div id="how" class="spec-docs">
			<app-context text="How can I use it?" backbtn="{true}"></app-context>
			<div class="left-menu">
				{#each doclinks as link}
					<div class="link-wrapper">
						<a href="{link.href}" target="{link.target}">{link.text}</a>
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
		color: var(--main-color, #{$main-color});
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
			color: var(--main-color, $main-color);
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
		border-color: var(--main-color, #{$main-color});
		margin: 45px 0;
		opacity: 0.3;
	}

	.footer {
		flex-shrink: 0;
	}
</style>

<script>
	import { onMount } from 'svelte';
	let possibleNumberOfItems = [5, 10, 25, 100];
	let zooGrid;
	let footer;
	let doclinks = [
		{
			href: '#button-doc',
			target: '',
			text: 'Button'
		},
		{
			href: '#checkbox-doc',
			target: '',
			text: 'Checkbox'
		},
		{
			href: '#collapsable-list-doc',
			target: '',
			text: 'Collapsable List'
		},
		{
			href: '#feedback-doc',
			target: '',
			text: 'Feedback'
		},
		{
			href: '#footer-doc',
			target: '',
			text: 'Footer'
		},
		{
			href: '#header-doc',
			target: '',
			text: 'Header'
		},
		{
			href: '#input-doc',
			target: '',
			text: 'Input'
		},
		{
			href: '#link-doc',
			target: '',
			text: 'Link'
		},
		{
			href: '#modal-doc',
			target: '',
			text: 'Modal'
		},
		{
			href: '#navigation-doc',
			target: '',
			text: 'Navigation'
		},
		{
			href: '#radio-doc',
			target: '',
			text: 'Radio'
		},
		{
			href: '#searchable-select-doc',
			target: '',
			text: 'Searchable select'
		},
		{
			href: '#select-doc',
			target: '',
			text: 'Select'
		},
		{
			href: '#toast-doc',
			target: '',
			text: 'Toast'
		},
		{
			href: '#tooltip-doc',
			target: '',
			text: 'Tooltip'
		},
		{
			href: '#theming-doc',
			target: '',
			text: 'Theming'
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
			}
		];
	});
</script>