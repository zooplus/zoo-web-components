describe('Zoo toggle switch', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-toggle-switch infotext="Additional helpful information for our users">
				<label for="input-toggle" slot="label">Toggle switch</label>
				<input id="input-toggle" slot="input" type="checkbox"/>
			</zoo-toggle-switch>`;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-toggle-switch')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-toggle-switch a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});