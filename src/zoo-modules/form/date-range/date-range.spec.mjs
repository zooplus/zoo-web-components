describe('Zoo date range', function () {
	it('mark component as invalid when min > max', async () => {
		const invalid = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-date-range>
				<label slot="label">Date range selector</label>
				<input slot="date-from" type="date">
				<input slot="date-to" type="date">
				</zoo-date-range>
				`;
			await new Promise(r => setTimeout(r, 10));
			const dateRange = document.querySelector('zoo-date-range');

			const dateFrom = dateRange.shadowRoot.querySelector('slot[name="date-from"]').assignedElements()[0];
			dateFrom.value = '2021-04-26';
			dateFrom.dispatchEvent(new Event('input', {bubbles: true}));
			await new Promise(r => setTimeout(r, 10));
			
			const dateTo = dateRange.shadowRoot.querySelector('slot[name="date-to"]').assignedElements()[0];
			dateTo.value = '2021-04-25';
			dateTo.dispatchEvent(new Event('input', {bubbles: true}));
			await new Promise(r => setTimeout(r, 10));
				
			const invalid = document.querySelector('zoo-date-range').hasAttribute('invalid');
			return invalid;
		});
		expect(invalid).toBeTrue();
	});

	it('mark component as invalid when max < min', async () => {
		const invalid = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-date-range>
					<label slot="label">Date range selector</label>
					<input slot="date-from" type="date">
					<input slot="date-to" type="date">
				</zoo-date-range>
				`;
			await new Promise(r => setTimeout(r, 10));
			const dateRange = document.querySelector('zoo-date-range');

			const dateTo = dateRange.shadowRoot.querySelector('slot[name="date-to"]').assignedElements()[0];
			dateTo.value = '2021-04-27';
			dateTo.dispatchEvent(new Event('input', {bubbles: true}));
			await new Promise(r => setTimeout(r, 10));
			
			const dateFrom = dateRange.shadowRoot.querySelector('slot[name="date-from"]').assignedElements()[0];
			dateFrom.value = '2021-04-28';
			dateFrom.dispatchEvent(new Event('input', {bubbles: true}));
			await new Promise(r => setTimeout(r, 10));

			const invalid = document.querySelector('zoo-date-range').hasAttribute('invalid');
			return invalid;
		});
		expect(invalid).toBeTrue();
	});
});