describe('Zoo toggle switch', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-toggle-switch infotext="Additional helpful information for our users">
				<label for="input-toggle" slot="label">Toggle switch</label>
				<input id="input-toggle" slot="input" type="checkbox"/>
			</zoo-toggle-switch>`;
			return await axe.run('zoo-toggle-switch');
		});
		if (results.violations.length) {
			console.log('zoo-toggle-switch a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});