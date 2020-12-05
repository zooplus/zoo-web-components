describe('Zoo quantity control', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-quantity-control increaselabel="increase value" decreaselabel="decrease value">
				<input id="number-input" slot="input" readonly placeholder="0" type="number" step="50"/>
				<label for="number-input" slot="label">Label</label>
			</zoo-quantity-control>`;
			return await axe.run('zoo-quantity-control');
		});
		if (results.violations.length) {
			console.log('zoo-quantity-control a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});