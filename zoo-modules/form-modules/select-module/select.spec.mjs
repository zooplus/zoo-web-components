describe('Zoo select', function () {
	it('should create select', async () => {
		const label = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-select>
				<select id="multiselect" slot="select" multiple>
					<option class="placeholder" value="" disabled selected>Placeholder</option>
					<option>1</option>
					<option>2</option>
					<option>3</option>
				</select>
				<label for="multiselect" slot="label">Multiselect</label>
			</zoo-select>
			`;
			let select = document.querySelector('zoo-select');
			return select.shadowRoot.querySelector('slot[name="label"').assignedNodes()[0].innerHTML;
		});
		expect(label).toEqual('Multiselect');
	});
});