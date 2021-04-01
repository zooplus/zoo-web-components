describe('Zoo button', function () {
	it('should pass accessibility tests', async () => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-button>
				<button type="button">Grey theme</button>
			</zoo-button>`;
			return await axe.run('zoo-button');
		});
		if (results.violations.length) {
			console.log('zoo-button a11y violations', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});