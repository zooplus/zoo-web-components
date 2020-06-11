<h2>Data grids</h2>
<h3>A grid with pagination, resizing, reorder and sorting.</h3>

<div class="grid-holder">
<zoo-grid stickyheader currentpage="5" maxpages="20" resizable reorderable on:sortChange="{e => handleSortChange(e.detail)}" on:pageChange="{e => handlePageChange(e.detail)}">
	{#each headers as header}
		<zoo-grid-header slot="headercell" sortable={header.sortable} sortableproperty='{header.sortProperty}'>{header.title}</zoo-grid-header>
	{/each}
	{#each data as row, i} 
		<div slot="row">
			<zoo-checkbox>
				<input id="{i}-checkbox" disabled="{row.status != 'DELIVERED' ? null : true}" checked slot="checkboxelement" type="checkbox"/>
				<label for="{i}-checkbox" slot="checkboxlabel">Valid</label>
			</zoo-checkbox>
			<div>{row.createdDate}</div>
			<zoo-select>
				<select title="Delivery Status" disabled="{row.status == 'DELIVERED' ? true : null}" slot="selectelement">
					<option selected>DELIVERED</option>
					<option>READY</option>
					<option>PACKING</option>
				</select>
			</zoo-select>
			<div>{row.maxWeight}</div>
			<zoo-input>
				<input title="Delivery Date" disabled="{row.status == 'DELIVERED' ? true : null}" value="{row.deliveryDate}" slot="inputelement" type="date"/>
			</zoo-input>
			<div>{row.noOfPieces}</div>
			<div>{row.price}</div>
		</div>
	{/each}
	<zoo-select labelposition="left" slot="pagesizeselector">
		<select id="first-grid-page-size" slot="selectelement">
			<option selected>5</option>
			<option selected>10</option>
			<option selected>25</option>
			<option selected>100</option>
		</select>
		<label for="first-grid-page-size" slot="selectlabel">Page size</label>
	</zoo-select>
</zoo-grid>
</div>

<h3>Grid with sticky header and pagination. Grid height and width are limited on the client side.</h3>

<div class="grid-holder" style="max-width: 850px; max-height: 300px;">
	<zoo-grid stickyheader currentpage="1" maxpages="4" on:pageChange="{e => handlePageChange(e.detail)}">
		{#each headers as header}
			<zoo-grid-header slot="headercell">{header.title}</zoo-grid-header>
		{/each}
		<zoo-grid-header slot="headercell">Rating</zoo-grid-header>
		<zoo-grid-header slot="headercell">Promotion</zoo-grid-header>
		{#each extendedData as row, i} 
			<div slot="row">
				<zoo-checkbox>
					<input id="{i}-second-grid-checkbox" disabled="{row.status != 'DELIVERED' ? null : true}" checked slot="checkboxelement" type="checkbox"/>
					<label for="{i}-second-grid-checkbox" slot="checkboxlabel">Valid</label>
				</zoo-checkbox>
				<div>{row.createdDate}</div>
				<div>{row.status}</div>
				<div>{row.maxWeight}</div>
				<div>{row.deliveryDate}</div>
				<div>{row.noOfPieces}</div>
				<div>{row.price}</div>
				<div>{row.rating}</div>
				<zoo-checkbox>
					<input id="{i}-promo-checkbox" slot="checkboxelement" type="checkbox"/>
					<label for="{i}-promo-checkbox" slot="checkboxlabel">Promotion</label>
				</zoo-checkbox>
			</div>
		{/each}
		<zoo-select labelposition="left" slot="pagesizeselector">
			<select id="second-grid-page-size" slot="selectelement">
				<option selected>5</option>
				<option selected>10</option>
				<option selected>25</option>
				<option selected>100</option>
			</select>
			<label for="second-grid-page-size" slot="selectlabel">Page size</label>
		</zoo-select>
	</zoo-grid>
</div>

<script>
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
	let today = new Date().toISOString().substr(0, 10);
	let data = [
		{createdDate: today, status: 'READY', maxWeight: '10 kg', deliveryDate: '', noOfPieces: 5, price: '12 EUR'},
		{createdDate: today, status: 'DELIVERED', maxWeight: '10 kg', deliveryDate: today, noOfPieces: 5, price: '12 EUR'},
		{createdDate: today, status: 'READY', maxWeight: '10 kg', deliveryDate: '', noOfPieces: 5, price: '12 EUR'},
		{createdDate: today, status: 'DELIVERED', maxWeight: '10 kg', deliveryDate: today, noOfPieces: 5, price: '12 EUR'},
		{createdDate: today, status: 'READY', maxWeight: '10 kg', deliveryDate: '', noOfPieces: 5, price: '12 EUR'}
	];
	let extendedData = data.map(el => Object.assign(el, {rating: 3, promotion: false}));

	const handleSortChange = sortState => {
		let toast = document.createElement('zoo-toast');
		toast.text = sortState 
			? 'Sort state was changed. Property: ' + sortState.property + ', direction: ' + sortState.direction
			: 'Sort state was changed. Sort object is undefined.';
		document.body.appendChild(toast);
		toast.show();
	};

	const handlePageChange = page => {
		let toast = document.createElement('zoo-toast');
		toast.text = 'Page was changed to: ' + page.pageNumber;
		document.body.appendChild(toast);
		toast.show();
	}
</script>