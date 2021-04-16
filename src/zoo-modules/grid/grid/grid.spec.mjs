/* eslint-disable no-undef */
describe('Zoo grid', function () {
	it('should create default grid', async () => {
		const rowsLength = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-grid currentpage="3" maxpages="20">
				<zoo-grid-header slot="headercell">Created date</zoo-grid-header>
				<zoo-grid-header slot="headercell">Min weight</zoo-grid-header>
				<zoo-grid-header slot="headercell">Price</zoo-grid-header>
		
				<div slot="row"><div>2020-05-05</div><div>30 kg</div><div>20 EUR</div></div>
				<div slot="row"><div>2020-05-10</div><div>23 kg</div><div>15 EUR</div></div>
				<div slot="row"><div>2020-05-15</div><div>10 kg</div><div>5 EUR</div></div>
		
				<zoo-select labelposition="left" slot="pagesizeselector">
					<select id="grid-page-size" slot="select">
						<option selected>5</option>
						<option>10</option>
						<option>25</option>
					</select>
					<label for="grid-page-size" slot="label">Page Size</label>
				</zoo-select>
			</zoo-grid>
			`;
			const grid = document.querySelector('zoo-grid');
			const rows = grid.shadowRoot.querySelector('*[name="row"]').assignedElements();
			return rows.length;
		});
		expect(rowsLength).toEqual(3);
	});

	it('should remove sort state from previously sorted header', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-grid currentpage="3" maxpages="20">
				<zoo-grid-header slot="headercell" sortable="true" sortableproperty="createdDate">Created date</zoo-grid-header>
				<zoo-grid-header slot="headercell" sortable="true" sortableproperty="minWeight">Min weight</zoo-grid-header>
		
				<div slot="row">
					<div>2020-05-05</div>
					<div>30 kg</div>
				</div>
			</zoo-grid>
			`;
			const firstHeader = document.querySelector('zoo-grid-header');
			const arrow = firstHeader.shadowRoot.querySelector('.sort');
			arrow.dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 10));

			const firstHeaderFirstSortState = firstHeader.getAttribute('sortstate');

			const secondHeader = document.querySelectorAll('zoo-grid-header')[1];
			const secondArrow = secondHeader.shadowRoot.querySelector('.sort');
			secondArrow.dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 10));

			const firstHeaderSecondSortState = firstHeader.getAttribute('sortstate');
			const secondHeaderSortState = secondHeader.getAttribute('sortstate');
			return {
				firstHeaderFirstSortState: firstHeaderFirstSortState,
				firstHeaderSecondSortState: firstHeaderSecondSortState,
				secondHeaderSortState: secondHeaderSortState
			};
		});
		expect(ret.firstHeaderFirstSortState).toEqual('desc');
		expect(ret.firstHeaderSecondSortState).toEqual(null);
		expect(ret.secondHeaderSortState).toEqual('desc');
	});

	it('should switch columns on drop when dropping to column to right', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-grid currentpage="3" maxpages="20" reorderable>
				<zoo-grid-header slot="headercell" id="first">Created date</zoo-grid-header>
				<zoo-grid-header slot="headercell" id="second">Min weight</zoo-grid-header>
		
				<div slot="row">
					<div>2020-05-05</div>
					<div>30 kg</div>
				</div>
			</zoo-grid>
			`;
			const grid = document.querySelector('zoo-grid');
			await new Promise(r => setTimeout(r, 50));
			
			const headerOne = document.querySelector('zoo-grid-header[column="1"]');
			const headerOneId = headerOne.getAttribute('id');
			const headerTwo = document.querySelector('zoo-grid-header[column="2"]');
			const headerTwoId = headerTwo.getAttribute('id');

			grid.handleDrop({
				target: headerTwo,
				dataTransfer: { getData: () => 1 }
			});
			await new Promise(r => setTimeout(r, 50));

			const headerIdsAfterDrop = [...document.querySelectorAll('zoo-grid-header')].map(h => h.getAttribute('id'));
			return {
				headerIds: [headerOneId, headerTwoId],
				headerIdsAfterDrop: headerIdsAfterDrop
			};
		});
		expect(ret.headerIds).toEqual(['first', 'second']);
		expect(ret.headerIdsAfterDrop).toEqual(['second', 'first']);
	});

	it('should switch columns on drop when dropping to column to left', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-grid currentpage="3" maxpages="20" reorderable>
				<zoo-grid-header slot="headercell" id="first">Created date</zoo-grid-header>
				<zoo-grid-header slot="headercell" id="second">Min weight</zoo-grid-header>
		
				<div slot="row">
					<div>2020-05-05</div>
					<div>30 kg</div>
				</div>
			</zoo-grid>
			`;
			const grid = document.querySelector('zoo-grid');
			await new Promise(r => setTimeout(r, 50));
			
			const headerOne = document.querySelector('zoo-grid-header[column="1"]');
			const headerOneId = headerOne.getAttribute('id');
			const headerTwo = document.querySelector('zoo-grid-header[column="2"]');
			const headerTwoId = headerTwo.getAttribute('id');

			grid.handleDrop({
				target: headerOne,
				dataTransfer: { getData: () => 2 }
			});
			await new Promise(r => setTimeout(r, 50));

			const headerIdsAfterDrop = [...document.querySelectorAll('zoo-grid-header')].map(h => h.getAttribute('id'));
			return {
				headerIds: [headerOneId, headerTwoId],
				headerIdsAfterDrop: headerIdsAfterDrop
			};
		});
		expect(ret.headerIds).toEqual(['first', 'second']);
		expect(ret.headerIdsAfterDrop).toEqual(['second', 'first']);
	});

	it('should not switch columns when dropped on same column as start', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-grid currentpage="3" maxpages="20" reorderable>
				<zoo-grid-header slot="headercell" id="first">Created date</zoo-grid-header>
				<zoo-grid-header slot="headercell" id="second">Min weight</zoo-grid-header>
		
				<div slot="row">
					<div>2020-05-05</div>
					<div>30 kg</div>
				</div>
			</zoo-grid>
			`;
			const grid = document.querySelector('zoo-grid');
			await new Promise(r => setTimeout(r, 50));
			
			const headerOne = document.querySelector('zoo-grid-header[column="1"]');
			const headerOneId = headerOne.getAttribute('id');
			const headerTwo = document.querySelector('zoo-grid-header[column="2"]');
			const headerTwoId = headerTwo.getAttribute('id');

			grid.handleDrop({
				target: headerOne,
				dataTransfer: { getData: () => 1 }
			});
			await new Promise(r => setTimeout(r, 50));

			const headerIdsAfterDrop = [...document.querySelectorAll('zoo-grid-header')].map(h => h.getAttribute('id'));
			return {
				headerIds: [headerOneId, headerTwoId],
				headerIdsAfterDrop: headerIdsAfterDrop
			};
		});
		expect(ret.headerIds).toEqual(['first', 'second']);
		expect(ret.headerIdsAfterDrop).toEqual(['first', 'second']);
	});

	it('should not show paginator when currentpage or maxpages is not defined and page size selector is supplied', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-grid reorderable>
				<zoo-grid-header slot="headercell" id="first">Created date</zoo-grid-header>
				<zoo-grid-header slot="headercell" id="second">Min weight</zoo-grid-header>
		
				<div slot="row">
					<div>2020-05-05</div>
					<div>30 kg</div>
				</div>
				<zoo-select slot="pagesizeselector">
					<select slot="select">
						<option selected>5</option>
					</select>
				</zoo-select>
			</zoo-grid>
			`;
			const grid = document.querySelector('zoo-grid');
			await new Promise(r => setTimeout(r, 10));
			
			const paginator = grid.shadowRoot.querySelector('zoo-paginator');
			await new Promise(r => setTimeout(r, 10));

			return paginator.style.display;
		});
		expect(ret).toEqual('');
	});

	it('should create grid with zoo-grid-row components', async () => {
		const rowsLength = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-grid currentpage="3" maxpages="20">
				<zoo-grid-header slot="headercell">Created date</zoo-grid-header>
				<zoo-grid-header slot="headercell">Min weight</zoo-grid-header>
				<zoo-grid-header slot="headercell">Price</zoo-grid-header>
		
				<zoo-grid-row slot="row">
                    <div slot="row-details">
                        <div>2020-05-20</div>
                        <div>5kg</div>
                        <div>3.56</div>
                    </div>
                </zoo-grid-row>
                
                <zoo-grid-row slot="row">
                    <div slot="row-details">
                        <div>2020-05-21</div>
                        <div>10kg</div>
                        <div>2.39</div>
                    </div>
                </zoo-grid-row>
                
                <zoo-grid-row slot="row">
                    <div slot="row-details">
                        <div>2020-05-23</div>
                        <div>56kg</div>
                        <div>203.42</div>
                    </div>
                </zoo-grid-row>
		
				<zoo-select labelposition="left" slot="pagesizeselector">
					<select id="grid-page-size" slot="select">
						<option selected>5</option>
						<option>10</option>
						<option>25</option>
					</select>
					<label for="grid-page-size" slot="label">Page Size</label>
				</zoo-select>
			</zoo-grid>
			`;
			const grid = document.querySelector('zoo-grid');
			const rows = grid.shadowRoot.querySelector('*[name="row"]').assignedElements();
			return rows.length;
		});
		expect(rowsLength).toEqual(3);
	});
});