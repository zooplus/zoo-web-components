describe('Zoo searchable select', function () {
	it('should create searchable select', async () => {
		const label = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-searchable-select>
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
			<zoo-searchable-select>
				<span slot="label">Searchable multiple select legend</span>
				<select id="searchable-select" multiple slot="select">
					<option value="text">text</option>
					<option value="text">sec</option>
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
			slottedInput.dispatchEvent(new Event('input'));
			const options = document.querySelectorAll('option');
			return {
				first: options[0].style.display,
				second: options[1].style.display
			};
		});
		expect(optionDisplayProp.first).toEqual('none');
		expect(optionDisplayProp.second).toEqual('block');
	});

	it('should set disabled attribute on input when slotted select is disabled', async () => {
		const disabled = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-searchable-select>
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

	it('should pass and then remove invalid attribute to zoo-input', async () => {
		const invalid = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-searchable-select>
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
			await new Promise(r => setTimeout(r, 10));
			const zooInput = select.shadowRoot.querySelector('zoo-input');
			select.setAttribute('invalid', '');
			await new Promise(r => setTimeout(r, 10));

			const firstInvalid = zooInput.hasAttribute('invalid');

			select.removeAttribute('invalid', '');
			await new Promise(r => setTimeout(r, 10));

			const secondInvalid = zooInput.hasAttribute('invalid');

			return [firstInvalid, secondInvalid];
		});
		expect(invalid[0]).toBeTrue();
		expect(invalid[1]).toBeFalse();
	});

	it('should handle cross click', async () => {
		const value = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-searchable-select>
				<span slot="label">Searchable multiple select legend</span>
				<select id="searchable-select" multiple slot="select">
					<option value="1">1</option>
					<option value="2">2</option>
				</select>
				<label for="searchable-select" slot="selectlabel">Searchable multiple select</label>
				<input id="searchable-input" slot="input"/>
				<label for="searchable-input" slot="inputlabel">Searchable multiple input</label>
			</zoo-searchable-select>
			`;
			let select = document.querySelector('zoo-searchable-select');
			await new Promise(r => setTimeout(r, 10));

			const slottedSelect = select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0];
			slottedSelect.value = 1;
			slottedSelect.dispatchEvent(new Event('change'));

			await new Promise(r => setTimeout(r, 10));

			select.shadowRoot.querySelector('zoo-cross-icon').dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 10));

			return slottedSelect.value;
		});
		expect(value).toEqual('');
	});

	it('should handle tooltip when option is selected', async () => {
		const tooltipText = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-searchable-select>
				<span slot="label">Searchable multiple select legend</span>
				<select id="searchable-select" multiple slot="select">
					<option value="firstOption">first option</option>
					<option value="secondOption">second option</option>
				</select>
				<label for="searchable-select" slot="selectlabel">Searchable multiple select</label>
				<input id="searchable-input" slot="input"/>
				<label for="searchable-input" slot="inputlabel">Searchable multiple input</label>
			</zoo-searchable-select>
			`;
			let select = document.querySelector('zoo-searchable-select');
			await new Promise(r => setTimeout(r, 10));

			const slottedSelect = select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0];
			slottedSelect.value = 'firstOption';
			slottedSelect.dispatchEvent(new Event('change'));

			await new Promise(r => setTimeout(r, 10));

			const tooltip = select.shadowRoot.querySelector('zoo-tooltip');
			return tooltip.getAttribute('text');
		});
		expect(tooltipText).toEqual('first option');
	});

	it('should set and then remove invalid attribute from host', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-searchable-select>
					<span slot="label">Searchable multiple select legend</span>
					<select id="searchable-select" slot="select" required>
						<option value="firstOption">first option</option>
						<option value="secondOption">second option</option>
					</select>
					<label for="searchable-select" slot="selectlabel">Searchable multiple select</label>
					<input id="searchable-input" slot="input"/>
					<label for="searchable-input" slot="inputlabel">Searchable multiple input</label>
				</zoo-searchable-select>
				`;
			const result = [];
			let select = document.querySelector('zoo-searchable-select');
			await new Promise(r => setTimeout(r, 10));
			const slottedSelect = select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0];
			slottedSelect.value = '';
			slottedSelect.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
			await new Promise(r => setTimeout(r, 10));
			result.push(select.hasAttribute('invalid'));

			slottedSelect.value = 'secondOption';
			slottedSelect.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
			await new Promise(r => setTimeout(r, 10));
			result.push(select.hasAttribute('invalid'));

			return result;
		});
		expect(result[0]).toBeTrue();
		expect(result[1]).toBeFalse();
	});

	it('should show cross icon when an option is already selected', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-searchable-select>
					<span slot="label">Searchable multiple select legend</span>
					<select id="searchable-select" slot="select" required>
						<option value="firstOption">first option</option>
						<option value="secondOption" selected>second option</option>
					</select>
					<input id="searchable-input" slot="input"/>
				</zoo-searchable-select>
				`;
			let select = document.querySelector('zoo-searchable-select');
			await new Promise(r => setTimeout(r, 30));
			const slottedInput = select.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			const closeIcon = select.shadowRoot.querySelector('zoo-cross-icon');
			const style = window.getComputedStyle(closeIcon);

			return {
				placeholder: slottedInput.placeholder,
				valueselected: select.hasAttribute('valueselected'),
				closeIconDisplay: style.display
			};
		});
		expect(result.placeholder).toEqual('second option');
		expect(result.valueselected).toBeTrue();
		expect(result.closeIconDisplay).toEqual('flex');
	});
});