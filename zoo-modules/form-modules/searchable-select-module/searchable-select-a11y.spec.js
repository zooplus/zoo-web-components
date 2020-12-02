describe('Zoo searchable select', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-searchable-select labeltext="Searchable multiple select" placeholder="Placeholder" infotext="Additional helpful information for our users which is a long text.">
				<select multiple slot="selectelement">
					<option value="text">text</option>
					<option value="raNdOm">raNdOm</option>
					<option value="random1">random1</option>
					<option value="random2">random2</option>
				</select>
			</zoo-searchable-select>`;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-searchable-select')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-searchable-select a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});