describe('Zoo button', function () {
	it('should pass accessibility tests', async () => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-button>
				<button type="button">Grey theme</button>
			</zoo-button>`;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-button')
		`);

		// Get the results from `axe.run()`.
		let results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-button a11y violations', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});