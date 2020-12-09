describe('Zoo input', function () {
	it('should be a11y', async () => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-input>
				<input id="input-type-text" slot="input" type="text" placeholder="input"/>
				<label for="input-type-text" slot="label">Input type text</label>
			</zoo-input>`;
			return await axe.run('zoo-input');
		});

		if (results.violations.length) {
			console.log('zoo-input a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});