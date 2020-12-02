describe('Zoo navigation', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(async() => {
			document.body.innerHTML = `
			<zoo-navigation>
				<a href="http://caniuse.com/#feat=shadowdomv1" target="about:blank">Can I use shadowdomv1?</a>
				<a href="http://caniuse.com/#feat=custom-elementsv1" target="about:blank">Can I use custom-elementsv1?</a>
				<a href="https://zooplus.github.io/zoo-web-components-docs/index.html" target="about:blank">Documentation</a>
			</zoo-navigation>`;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-navigation')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-navigation a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});