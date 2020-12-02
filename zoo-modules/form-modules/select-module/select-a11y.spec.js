describe('Zoo select', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-select linktext="Documentation link" linkhref="https://google.com" linktarget="about:blank" infotext="Additional helpful information for our users">
				<select id="multiselect" slot="selectelement" multiple>
					<option class="placeholder" value="" disabled selected>Placeholder</option>
					<option>1</option>
					<option>2</option>
					<option>3</option>
				</select>
				<label for="multiselect" slot="selectlabel">Multiselect</label>
			</zoo-select>`;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-select')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-select a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});