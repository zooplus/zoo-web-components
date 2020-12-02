describe('Zoo toast', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(async() => {
			document.body.innerHTML = `<zoo-toast id="toast" text="Search for more than 8.000 products." closelabel="close popup"></zoo-toast>`;
			document.querySelector('#toast').show();
			// wait for animation to finish
			await new Promise(res => {
				setTimeout(() => res(), 300);
			});
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-toast')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-toast a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});