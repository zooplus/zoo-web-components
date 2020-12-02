describe('Zoo segmented buttons', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-segmented-buttons style="width: 600px">
				<zoo-button type="primary">
					<button type="button">Button 1</button>
				</zoo-button>
				<zoo-button>
					<button type="button">Button 2</button>
				</zoo-button>
				<zoo-button>
					<button type="button">Button 3</button>
				</zoo-button>
			</zoo-segmented-buttons>`;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-segmented-buttons')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-segmented-buttons a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});