describe('Zoo grid row', function() {
	it('should properly render row details', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
                <zoo-grid-row>
                    <div slot="row-details">
                        <div>Valid</div>
                        <div>2020-05-20</div>
                        <div>Grid Row Expand</div>
                        <div>5kg</div>
                    </div>
                </zoo-grid-row>
            `;

			const row = document.querySelector('zoo-grid-row');
			const rowDetails = row.shadowRoot.querySelector('*[name="row-details"]').assignedElements();

			return rowDetails.map(singleRow => singleRow.textContent)[0];
		});
		expect(result).toContain('Valid');
		expect(result).toContain('2020-05-20');
		expect(result).toContain('Grid Row Expand');
		expect(result).toContain('5kg');
	});

	it('should properly render expandable content if expanded attribute exists', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
                <zoo-grid-row>
                    <div slot="row-details">
                        <div>Valid</div>
                        <div>2020-05-20</div>
                        <div>Grid Row Expand</div>
                        <div>5kg</div>
                    </div>
                    <div slot="row-content" expanded>
						<div>Content Row</div>
					</div>
                </zoo-grid-row>
            `;

			const row = document.querySelector('zoo-grid-row');
			const content = row.shadowRoot.querySelector('slot[name="row-content"]').assignedElements()[0];


			const style = window.getComputedStyle(content);
			return style.height;
		});
		expect(result).toEqual('150px');
	});

	it('should not render expandable content if expanded attribute does not exists', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
                <zoo-grid-row>
                    <div slot="row-details">
                        <div>Valid</div>
                        <div>2020-05-20</div>
                        <div>Grid Row Expand</div>
                        <div>5kg</div>
                    </div>
                    <div slot="row-content">
						<div>Content Row</div>
					</div>
                </zoo-grid-row>
            `;

			const row = document.querySelector('zoo-grid-row');
			const content = row.shadowRoot.querySelector('slot[name="row-content"]').assignedElements()[0];


			const style = window.getComputedStyle(content);
			return style.height;
		});
		expect(result).toEqual('0px');
	});
});