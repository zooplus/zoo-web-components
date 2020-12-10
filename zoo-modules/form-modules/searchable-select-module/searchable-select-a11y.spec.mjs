describe('Zoo searchable select', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-searchable-select>
				<span slot="label">Searchable multiple select legend</span>
				<select id="searchable-select" multiple slot="select">
					<option value="text">text</option>
				</select>
				<label for="searchable-select" slot="selectlabel">Searchable multiple select</label>
				<input id="searchable-input" slot="input"/>
				<label for="searchable-input" slot="inputlabel">Searchable multiple input</label>
			</zoo-searchable-select>`;
			return await axe.run('zoo-searchable-select');
		});
		
		if (results.violations.length) {
			console.log('zoo-searchable-select a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});