describe('Zoo input', function () {
	it('should be a11y', async () => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-input linktext="Forgotten your password?" linkhref="https://google.com" linktarget="about:blank"
					infotext="Additional helpful information for our users">
				<input id="input-type-text" slot="inputelement" type="text" placeholder="input"/>
				<label for="input-type-text" slot="inputlabel">Input type text</label>
			</zoo-input>`;
		});

		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-input')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-input a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});