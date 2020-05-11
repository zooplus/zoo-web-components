<svelte:options tag="app-grids"></svelte:options>

<app-context text="Forth section is a showcase of grids"></app-context>

<div class="grids-holder" bind:this="{gridHolder}">
	<h3>Standard grid with pagination and sorting.</h3>
	<zoo-grid bind:this={zooGrid} stickyheader paginator currentpage="5" maxpages="20" resizable
			on:sortChange="{e => handleSortChange(e.detail)}" on:pageChange="{e => handlePageChange(e.detail)}">

		{#each headers as header, idx}
			<div class="header-cell" slot="headercell" sortable={header.sortable ? 'sortable' : null} sortableproperty='{header.sortProperty}'>{header.title}</div>
		{/each}
		{#each data as row} 
			<div class="example-row limited-width" slot="row">
				<div>
					<zoo-checkbox labeltext="Valid">
						<input disabled="{row.status != 'DELIVERED' ? null : true}" checked="{row.valid}" slot="checkboxelement" type="checkbox"/>
					</zoo-checkbox>
				</div>
				<div>{row.createdDate}</div>
				<div>
					<div class="status">
						<zoo-select>
							<select disabled="{row.status == 'DELIVERED' ? true : null}" slot="selectelement" class="item-per-page-selector">
								{#each statuses as status}
									<option selected="{status == row.status}">{status}</option>
								{/each}
							</select>
						</zoo-select>
					</div>
				</div>
				<div>{row.minWeight}</div>
				<div>{row.maxWeight}</div>
				<div class="delivery-date">
					<zoo-input>
						<input disabled="{row.status == 'DELIVERED' ? true : null}" value="{row.deliveryDate}" slot="inputelement" type="date" placeholder="Enter date" />
					</zoo-input>
				</div>
				<div>{row.noOfPieces}</div>
				<div>{row.price}</div>
			</div>
		{/each}

		<div class="item-per-page-selector-holder" slot="pagesizeselector">
			<zoo-select labeltext="Page size" labelposition="left" >
				<select slot="selectelement" class="item-per-page-selector">
					{#each possibleNumberOfItems as number, idx}
						<option selected="{idx == 0}">{number}</option>
					{/each}
				</select>
			</zoo-select>
		</div>
	</zoo-grid>

	<h3>Grid with sticky header and pagination. Grid height and width are limited on the client side.</h3>

	<zoo-grid bind:this={zooGrid} style="max-height: 300px; max-width: 850px; margin: 0 auto; display: block;" stickyheader paginator
		currentpage="5" maxpages="20" on:sortChange="{e => handleSortChange(e.detail)}" on:pageChange="{e => handlePageChange(e.detail)}">
		{#each extendedHeaders as header}
			<div slot="headercell" sortable={header.sortable ? 'sortable' : null} sortableproperty='{header.sortProperty}'>{header.title}</div>
		{/each}

		{#each extendedData as row} 
			<div class="example-row limited-width" slot="row">
				<div>
					<zoo-checkbox labeltext="Valid">
						<input disabled="{row.status != 'DELIVERED' ? null : true}" checked="{row.valid}" slot="checkboxelement" type="checkbox"/>
					</zoo-checkbox>
				</div>
				<div>{row.createdDate}</div>
				<div>{row.status}</div>
				<div>{row.minWeight}</div>
				<div>{row.maxWeight}</div>
				<div>{row.deliveryDate}</div>
				<div>{row.noOfPieces}</div>
				<div>{row.price}</div>
				<div>{row.rating}</div>
				<div style="width: 30px;">
					<zoo-checkbox>
						<input checked="{row.promotion}" slot="checkboxelement" type="checkbox"/>
					</zoo-checkbox>
				</div>
			</div>
		{/each}

		<div class="item-per-page-selector-holder" slot="pagesizeselector">
			<zoo-select labeltext="Page size" labelposition="left" >
				<select slot="selectelement" class="item-per-page-selector">
					{#each possibleNumberOfItems as number, idx}
						<option selected="{idx == 0}">{number}</option>
					{/each}
				</select>
			</zoo-select>
		</div>
	</zoo-grid>

	<h3>Grid with no rows provided.</h3>

	<zoo-grid paginator>
		{#each headers as header}
			<div slot="headercell" sortable={header.sortable ? 'sortable' : null} sortableproperty='{header.sortProperty}'>{header.title}</div>
		{/each}
		<div slot="norecords">
			No records to show!
		</div>
	</zoo-grid>

	<h3>Grid which is loading indefinitely.</h3>

	<zoo-grid loading={true} paginator style="min-height: 200px;">
		{#each headers as header}
			<div slot="headercell" sortable={header.sortable ? 'sortable' : null} sortableproperty='{header.sortProperty}'>{header.title}</div>
		{/each}
		<div slot="norecords">
			
		</div>
	</zoo-grid>
</div>

<style type='text/scss'>
	@import "variables";

	h3 {
		color: $primary-mid;
	}

	.status, .delivery-date {
		margin-right: 10px;
	}

	.example-row {
		&.limited-width {
			min-width: 1024px;
		}

		& > div {
			word-break: break-word;
		}
	}

	.item-per-page-selector-holder {
		max-width: 150px;

		.item-per-page-selector {
			border: $stroked-box-grey-light;
		}
	}
</style>

<script>
	let zooGrid;
	let toast;
	let possibleNumberOfItems = [5, 10, 25, 100];
	let gridHolder;
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
			title: 'Minimum weight'
		},
		{
			title: 'Maximum weight'
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