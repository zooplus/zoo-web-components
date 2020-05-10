<svelte:options tag="zoo-grid"></svelte:options>
<div class="box" bind:this={gridRoot}>
	<div class="header-row" class:sticky="{stickyheader}">
		<slot name="headercell" bind:this={headerCellSlot}></slot>
	</div>
	<slot name="row"></slot>
	<slot name="norecords"></slot>
	{#if paginator}
		<slot name="paginator">
			<zoo-grid-paginator class="paginator" {currentpage} {maxpages}>
				<slot name="pagesizeselector" slot="pagesizeselector"></slot>
			</zoo-grid-paginator>
		</slot>
	{/if}
</div>

<style type='text/scss'>
	@import "variables";

	.box {
		max-height: inherit;
		overflow: auto;
		box-shadow: 0 5px 5px -3px rgba(0,0,0,.2),0 8px 10px 1px rgba(0,0,0,.14),0 3px 14px 2px rgba(0,0,0,.12);

		.header-row, ::slotted(*[slot="row"]) {
			display: grid;
			grid-template-columns: repeat(var(--grid-columns-num), minmax(50px, 1fr));
			padding: 10px;
			border-bottom: 1px solid rgba(0,0,0, 0.2);
		}

		::slotted(*[slot="row"]) {
			align-items: center;
		}

		.header-row {
			z-index: 1;

			&.sticky {
				top: 0;
				position: sticky;
				background: white;
			}
		}

		::slotted(.header-cell) {
			display: flex;
			align-items: center;
			padding-right: 5px;
		}

		::slotted(*[slot="row"]:nth-child(odd)) {
			background: $grey-ultralight;
		}

		::slotted(*[slot="row"]:hover) {
			background: $grey-light;
		}

		::slotted(*[slot="norecords"]) {
			color: var(--warning-mid, #{$warning-mid});
			grid-column: span var(--grid-columns-num);
			text-align: center;
			padding: 10px 0;
		}

		.paginator {
			grid-column: span var(--grid-columns-num);
		}
	}
</style>

<script>
	import { onMount } from 'svelte';
	export let currentpage;
	export let maxpages;
	let stickyheader = false;
	let gridRoot;
	let headerCellSlot;
	let paginator = false;
	onMount(() => {
		headerCellSlot.addEventListener("slotchange", () => {
			const host = gridRoot.getRootNode().host;
			const headers = headerCellSlot.assignedNodes();
			gridRoot.style.setProperty('--grid-columns-num', headers.length);
			for (const header of headers) {
				header.classList.add('header-cell');
				if (header.hasAttribute('sortable')) {
					header.innerHTML = '<zoo-grid-header>' + header.innerHTML + '</zoo-grid-header>';
				}
			}
			if (host.hasAttribute('paginator')) {
				paginator = true;
			}
			if (host.hasAttribute('stickyheader')) {
				stickyheader = true;
			}
		});
	});
	
</script>