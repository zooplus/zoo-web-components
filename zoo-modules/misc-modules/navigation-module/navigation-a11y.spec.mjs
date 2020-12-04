describe('Zoo navigation', function () {
	it('should pass accessibility tests', async () => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-navigation>
				<a href="http://caniuse.com/#feat=shadowdomv1" target="about:blank">Can I use shadowdomv1?</a>
				<a href="http://caniuse.com/#feat=custom-elementsv1" target="about:blank">Can I use custom-elementsv1?</a>
				<a href="https://zooplus.github.io/zoo-web-components-docs/index.html" target="about:blank">Documentation</a>
			</zoo-navigation>`;
			return await axe.run('zoo-navigation');
		});

		if (results.violations.length) {
			console.log('zoo-navigation a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});