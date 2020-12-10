describe('Zoo searchable select', function () {
	it('should create searchable select', async () => {
		const label = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-searchable-select placeholder="Placeholder">
				<span slot="label">Searchable multiple select legend</span>
				<select id="searchable-select" multiple slot="select">
					<option value="text">text</option>
				</select>
				<label for="searchable-select" slot="selectlabel">Searchable multiple select</label>
				<input id="searchable-input" slot="input"/>
				<label for="searchable-input" slot="inputlabel">Searchable multiple input</label>
			</zoo-searchable-select>
			`;
			let select = document.querySelector('zoo-searchable-select');
			const label = select.shadowRoot.querySelector('slot[name="label"]').assignedElements()[0];
			return label.innerHTML;
		});

		expect(label).toEqual('Searchable multiple select legend');
	});

	it('should handle input typing', async () => {
		const optionDisplayProp = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-searchable-select placeholder="Placeholder">
				<span slot="label">Searchable multiple select legend</span>
				<select id="searchable-select" multiple slot="select">
					<option value="text">text</option>
				</select>
				<label for="searchable-select" slot="selectlabel">Searchable multiple select</label>
				<input id="searchable-input" slot="input"/>
				<label for="searchable-input" slot="inputlabel">Searchable multiple input</label>
			</zoo-searchable-select>
			`;
			let select = document.querySelector('zoo-searchable-select');

			// so... here we let browser to do its work related to init of slots, custom element and so on.
			// while browser is at it we schedule a micro-task with setTimeout to check what we need to check
			// after all main tasks have finished.
			await new Promise(r => setTimeout(r, 10));
			const slottedInput = select.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			slottedInput.focus();
			slottedInput.value = 'sec';
			slottedInput.dispatchEvent(new Event('input', { bubbles: true }));
			return document.querySelector('option').style.display;
		});
		expect(optionDisplayProp).toEqual('none');
	});

	it('should set disabled attribute on input when slotted select is disabled', async () => {
		const disabled = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-searchable-select placeholder="Placeholder">
				<span slot="label">Searchable multiple select legend</span>
				<select id="searchable-select" multiple slot="select">
					<option value="text">text</option>
				</select>
				<label for="searchable-select" slot="selectlabel">Searchable multiple select</label>
				<input id="searchable-input" slot="input"/>
				<label for="searchable-input" slot="inputlabel">Searchable multiple input</label>
			</zoo-searchable-select>
			`;
			let select = document.querySelector('zoo-searchable-select');
			select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0].disabled = true;

			await new Promise(r => setTimeout(r, 10));

			return select.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0].hasAttribute('disabled');
		});
		expect(disabled).toBeTrue();
	});
});