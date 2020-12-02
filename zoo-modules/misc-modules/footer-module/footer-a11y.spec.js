describe('Zoo footer', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-footer id="how" copyright="zooplus AG">
				<zoo-link>
					<a slot="anchor" href="https://github.com/zooplus/zoo-web-components" target="about:blank">Github</a>
				</zoo-link>
				<zoo-link>
					<a slot="anchor" href="https://www.npmjs.com/package/@zooplus/zoo-web-components">NPM</a>
				</zoo-link>
			</zoo-footer> `;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-footer')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-footer a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});