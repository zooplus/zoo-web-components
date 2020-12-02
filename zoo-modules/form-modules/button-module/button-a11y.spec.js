describe('Zoo button', function () {
	it('should pass accessibility tests', async () => {
		await page.evaluate(() => {
			let zoobutton = document.createElement('zoo-button');
			let button = document.createElement('button');
			button.innerHTML = 'button-text';

			zoobutton.appendChild(button);
			document.body.appendChild(zoobutton);
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-button')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log(results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});