describe('Zoo searchable select', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-searchable-select labeltext="Searchable multiple select" placeholder="Placeholder" infotext="Additional helpful information for our users which is a long text.">
				<select multiple slot="selectelement">
					<option value="text">text</option>
					<option value="raNdOm">raNdOm</option>
					<option value="random1">random1</option>
					<option value="random2">random2</option>
				</select>
			</zoo-searchable-select>`;
			return await axe.run('zoo-searchable-select');
		});
		
		if (results.violations.length) {
			console.log('zoo-searchable-select a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});