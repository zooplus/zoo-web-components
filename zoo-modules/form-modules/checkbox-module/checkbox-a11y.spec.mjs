describe('Zoo checkbox', () => {
	it('should be a11y', async () => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-checkbox>
				<input id="checkbox" checked slot="checkboxelement" type="checkbox"/>
				<label for="checkbox" slot="checkboxlabel">Valid</label>
			</zoo-checkbox>`;
			return await axe.run('zoo-checkbox');
		});

		if (results.violations.length) {
			console.log('zoo-checkbox a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});