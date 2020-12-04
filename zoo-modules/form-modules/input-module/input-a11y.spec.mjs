describe('Zoo input', function () {
	it('should be a11y', async () => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-input linktext="Forgotten your password?" linkhref="https://google.com" linktarget="about:blank"
					infotext="Additional helpful information for our users">
				<input id="input-type-text" slot="inputelement" type="text" placeholder="input"/>
				<label for="input-type-text" slot="inputlabel">Input type text</label>
			</zoo-input>`;
			return await axe.run('zoo-input');
		});

		if (results.violations.length) {
			console.log('zoo-input a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});