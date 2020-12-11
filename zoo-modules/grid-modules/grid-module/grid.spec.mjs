describe('Zoo paginator', function () {
	it('should create default grid', async () => {
		const rowsLength = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-grid currentpage="3" maxpages="20" reorderable stickyheader>
				<zoo-grid-header slot="headercell" sortable="true" sortableproperty="createdDate">Created date</zoo-grid-header>
				<zoo-grid-header slot="headercell" sortable="true" sortableproperty="minWeight">Min weight</zoo-grid-header>
				<zoo-grid-header slot="headercell">Price</zoo-grid-header>
		
				<div slot="row"><div>2020-05-05</div><div>30 kg</div><div>20 EUR</div></div>
				<div slot="row"><div>2020-05-10</div><div>23 kg</div><div>15 EUR</div></div>
				<div slot="row"><div>2020-05-15</div><div>10 kg</div><div>5 EUR</div></div>
		
				<div slot="pagesizeselector">
					<zoo-select labelposition="left">
						<select id="grid-page-size" slot="select">
							<option selected>5</option>
							<option>10</option>
							<option>25</option>
						</select>
						<label for="grid-page-size" slot="label">Page Size</label>
					</zoo-select>
				</div>
			</zoo-grid>
			`;
			const grid = document.querySelector('zoo-grid');
			const rows = grid.shadowRoot.querySelector('*[name="row"]').assignedElements();
			return rows.length;
		});
		expect(rowsLength).toEqual(3);
	});
});