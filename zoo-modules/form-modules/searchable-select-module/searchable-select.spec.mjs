describe('Zoo searchable select', function () {
	it('should create searchable select', async () => {
		const label = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-searchable-select placeholder="Placeholder">
				<select id="searchable-select" multiple slot="select">
					<option value="text">text</option>
					<option value="raNdOm">raNdOm</option>
					<option value="random1">random1</option>
					<option value="random2">random2</option>
				</select>
				<label for="searchable-select" slot="label">Searchable multiple select</label>
			</zoo-searchable-select>
			`;
			let select = document.querySelector('zoo-searchable-select');

			const nestedInput = select.shadowRoot.querySelector('zoo-input');

			const label = nestedInput.shadowRoot.querySelector('slot[name="inputlabel"]').assignedNodes()[0].assignedNodes()[0];
			return label.innerHTML;
		});

		expect(label).toEqual('Searchable multiple select');
	});

	it('should handle input typing', async () => {
		const optionDisplayProp = await page.evaluate(async () => {
			let select = document.createElement('zoo-searchable-select');
			let element = document.createElement('select');
			element.multiple = true;

			let option = document.createElement('option');
			option.value = 1;
			option.text = 'first';
			element.appendChild(option);
			element.slot = 'select';

			select.appendChild(element);
			document.body.appendChild(select);

			// so... here we let browser to do its work related to init of slots, custom element and so on.
			// while browser is at it we schedule a micro-task with setTimeout to check what we need to check
			// after all main tasks have finished.
			await new Promise(r => setTimeout(r, 10));
			const slottedInput = select.shadowRoot.querySelector('input');
			slottedInput.focus();
			slottedInput.value = 'sec';
			slottedInput.dispatchEvent(new Event('input', { bubbles: true }));
			return option.style.display;
		});
		expect(optionDisplayProp).toEqual('none');
	});
});