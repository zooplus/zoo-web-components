describe('Zoo checkbox', () => {
	it('should be a11y', async () => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-checkbox>
				<input id="checkbox" checked slot="checkboxelement" type="checkbox"/>
				<label for="checkbox" slot="checkboxlabel">Valid</label>
			</zoo-checkbox>`;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-checkbox')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-checkbox a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});