<svelte:options tag="app-grids"></svelte:options>
<app-context text="Data grids"></app-context>
<div class="grids-holder" bind:this="{gridHolder}">
	<h3>A grid with pagination, resizing, reorder and sorting.</h3>

	<div class="grid-holder">
	<zoo-grid class="limited-width grid-1" stickyheader paginator currentpage="5" maxpages="20" resizable reorderable
			on:sortChange="{e => handleSortChange(e.detail)}" on:pageChange="{e => handlePageChange(e.detail)}">

		{#each headers as header, idx}
			<zoo-grid-header class="header-cell" slot="headercell" sortable={header.sortable} sortableproperty='{header.sortProperty}'>{header.title}</zoo-grid-header>
		{/each}
		{#each data as row, i} 
			<div class="example-row limited-width" slot="row">
				<zoo-checkbox>
					<input id="{i}-first-grid-checkbox" disabled="{row.status != 'DELIVERED' ? null : true}" checked="{row.valid}" slot="checkboxelement" type="checkbox"/>
					<label for="{i}-first-grid-checkbox" slot="checkboxlabel">Valid</label>
				</zoo-checkbox>
				<div>{row.createdDate}</div>
				<zoo-select class="status">
					<select title="Delivery Status" disabled="{row.status == 'DELIVERED' ? true : null}" slot="selectelement" class="item-per-page-selector">
						{#each statuses as status}
							<option selected="{status == row.status}">{status}</option>
						{/each}
					</select>
				</zoo-select>
				<div>{row.minWeight}</div>
				<div>{row.maxWeight}</div>
				<zoo-input class="delivery-date">
					<input title="Delivery Date" disabled="{row.status == 'DELIVERED' ? true : null}" value="{row.deliveryDate}" slot="inputelement" type="date" placeholder="Enter date" />
				</zoo-input>
				<div>{row.noOfPieces}</div>
				<div>{row.price}</div>
			</div>
		{/each}

		<div class="item-per-page-selector-holder" slot="pagesizeselector">
			<zoo-select labelposition="left" >
				<select id="first-grid-page-size" slot="selectelement" class="item-per-page-selector">
					{#each possibleNumberOfItems as number, idx}
						<option selected="{idx == 0}">{number}</option>
					{/each}
				</select>
				<label for="first-grid-page-size" slot="selectlabel">Page size</label>
			</zoo-select>
		</div>
	</zoo-grid>
	</div>

	<h3>Grid with sticky header and pagination. Grid height and width are limited on the client side.</h3>

	<div class="grid-holder" style="max-width: 850px; max-height: 300px;">
		<zoo-grid class="limited-width grid-2" style="min-width: 1024px; margin: 0 auto; display: block;" stickyheader paginator
			currentpage="1" maxpages="4" on:sortChange="{e => handleSortChange(e.detail)}" on:pageChange="{e => handlePageChange(e.detail)}">
			{#each extendedHeaders as header, i}
				<zoo-grid-header slot="headercell" sortable={header.sortable ? 'sortable' : null} sortableproperty='{header.sortProperty}'>{header.title}</zoo-grid-header>
			{/each}

			{#each extendedData as row, i} 
				<div class="example-row limited-width" slot="row">
					<zoo-checkbox labeltext="Valid">
						<input id="{i}-second-grid-checkbox" disabled="{row.status != 'DELIVERED' ? null : true}" checked="{row.valid}" slot="checkboxelement" type="checkbox"/>
						<label for="{i}-second-grid-checkbox" slot="checkboxlabel">Valid</label>
					</zoo-checkbox>
					<div>{row.createdDate}</div>
					<div>{row.status}</div>
					<div>{row.minWeight}</div>
					<div>{row.maxWeight}</div>
					<div>{row.deliveryDate}</div>
					<div>{row.noOfPieces}</div>
					<div>{row.price}</div>
					<div>{row.rating}</div>
					<zoo-checkbox>
						<input id="{i}-second-grid-promo-checkbox" checked="{row.promotion}" slot="checkboxelement" type="checkbox"/>
						<label for="{i}-second-grid-promo-checkbox" slot="checkboxlabel">Promotion</label>
					</zoo-checkbox>
				</div>
			{/each}

			<div class="item-per-page-selector-holder" slot="pagesizeselector">
				<zoo-select labelposition="left" >
					<select id="second-grid-page-size" slot="selectelement" class="item-per-page-selector">
						{#each possibleNumberOfItems as number, idx}
							<option selected="{idx == 0}">{number}</option>
						{/each}
					</select>
					<label for="second-grid-page-size" slot="selectlabel">Page size</label>
				</zoo-select>
			</div>
		</zoo-grid>
	</div>
</div>

<style type='text/scss'>
	@import "variables";

	:host {
		contain: layout;
	}

	h3 {
		color: var(--primary-mid, #{$primary-mid});
	}

	.grids-holder {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.grid-1 {
		--grid-column-sizes: 150px repeat(7, minmax(50px, 1fr)) !important;
	}

	.grid-2 {
		--grid-column-sizes: 150px repeat(9, minmax(50px, 1fr)) !important;
	}

	.grid-holder {
		max-width: 1280px;
		overflow: auto;
		box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
		width: 95%;
	}

	.status, .delivery-date {
		margin-right: 10px;
	}

	.limited-width {
		min-width: 1024px;
	}

	.example-row  > div {
		word-break: break-word;
		flex-grow: 1;
	}

	.item-per-page-selector-holder {
		max-width: 150px;

		.item-per-page-selector {
			border: $stroked-box-grey-light;

			&:focus {
				border: $stroked-box-grey-dark-bold;
			}
		}
	}

	.loading-toggler {
		width: 80px;
	}
</style>

<script>
	let toast;
	let possibleNumberOfItems = [5, 10, 25, 100];
	let gridHolder;
	let loading = false;
	let headers = [
		{
			title: 'Valid'
		},
		{
			title: 'Created date',
			sortable: true,
			sortProperty: 'createdDate'
		},
		{
			title: 'Status',
			sortable: true,
			sortProperty: 'status'
		},
		{
			title: 'Min weight'
		},
		{
			title: 'Max weight'
		},
		{
			title: 'Delivery date',
			sortable: true,
			sortProperty: 'deliveryDate'
		},
		{
			title: '# of pieces'
		},
		{
			title: 'Price'
		}
	];

	let statuses = ['DELIVERED', 'READY', 'PACKING'];

	let extendedHeaders = [...headers, {title: 'Rating'}, {title: 'Promotion'}]

	let today = new Date().toISOString().substr(0, 10);

	let data = [
		{valid: true, createdDate: today, status: 'READY', minWeight: '1 kg', maxWeight: '10 kg', deliveryDate: '', noOfPieces: 5, price: '12 EUR'},
		{valid: true, createdDate: today, status: 'DELIVERED', minWeight: '1 kg', maxWeight: '10 kg', deliveryDate: today, noOfPieces: 5, price: '12 EUR'},
		{valid: true, createdDate: today, status: 'READY', minWeight: '1 kg', maxWeight: '10 kg', deliveryDate: '', noOfPieces: 5, price: '12 EUR'},
		{valid: true, createdDate: today, status: 'DELIVERED', minWeight: '1 kg', maxWeight: '10 kg', deliveryDate: today, noOfPieces: 5, price: '12 EUR'},
		{valid: true, createdDate: today, status: 'READY', minWeight: '1 kg', maxWeight: '10 kg', deliveryDate: '', noOfPieces: 5, price: '12 EUR'}
	];

	let extendedData = [...data].map(el => Object.assign(el, {rating: 3, promotion: false}));

	const handleSortChange = sortState => {
		const toast = document.createElement('zoo-toast');
		toast.text = sortState 
			? 'Sort state was changed. Property: ' + sortState.property + ', direction: ' + sortState.direction
			: 'Sort state was changed. Sort object is undefined.';
		gridHolder.appendChild(toast);
		toast.show();
	};

	const handlePageChange = page => {
		const toast = document.createElement('zoo-toast');
		toast.text = 'Page was changed to: ' + page.pageNumber;
		gridHolder.appendChild(toast);
		toast.show();
	}
</script>