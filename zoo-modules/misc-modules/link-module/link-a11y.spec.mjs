describe('Zoo link', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-link>
				<a slot="anchor" href="https://github.com/zooplus/zoo-web-components" target="about:blank">Github</a>
			</zoo-link>`;
			// disable color-contrast check until design team changes it.
			return await axe.run('zoo-link', {rules: { 'color-contrast': { enabled: false } }});
		});
		if (results.violations.length) {
			console.log('zoo-link a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});