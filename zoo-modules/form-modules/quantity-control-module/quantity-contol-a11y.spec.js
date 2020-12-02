describe('Zoo quantity control', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-quantity-control infotext="Additional helpful information for our users" increaselabel="increase value" decreaselabel="decrease value">
				<input id="number-input" slot="input" readonly placeholder="0" type="number" step="50"/>
				<label for="number-input" slot="label">Label</label>
			</zoo-quantity-control>`;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-quantity-control')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-quantity-control a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});