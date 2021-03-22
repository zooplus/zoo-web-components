describe('Zoo select', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-select>
				<select id="multiselect" slot="select" multiple>
					<option class="placeholder" value="" disabled selected>Placeholder</option>
					<option>1</option>
					<option>2</option>
					<option>3</option>
				</select>
				<label for="multiselect" slot="label">Multiselect</label>
			</zoo-select>`;
			return await axe.run('zoo-select');
		});
		if (results.violations.length) {
			console.log('zoo-select a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});