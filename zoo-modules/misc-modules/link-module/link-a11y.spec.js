describe('Zoo link', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-link>
				<a slot="anchor" href="https://github.com/zooplus/zoo-web-components" target="about:blank">Github</a>
			</zoo-link>`;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-link')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-link a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});