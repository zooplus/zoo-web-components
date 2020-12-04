describe('Zoo footer', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-footer id="how" copyright="zooplus AG">
				<zoo-link>
					<a slot="anchor" href="https://github.com/zooplus/zoo-web-components" target="about:blank">Github</a>
				</zoo-link>
				<zoo-link>
					<a slot="anchor" href="https://www.npmjs.com/package/@zooplus/zoo-web-components">NPM</a>
				</zoo-link>
			</zoo-footer>`;
			return await axe.run('zoo-footer');
		});
		if (results.violations.length) {
			console.log('zoo-footer a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});