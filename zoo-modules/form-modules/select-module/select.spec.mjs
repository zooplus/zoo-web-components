describe('Zoo select', function () {
	it('should create select', async () => {
		const label = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-select>
				<select id="multiselect" slot="select">
					<option>1</option>
				</select>
				<label for="multiselect" slot="label">Multiselect</label>
			</zoo-select>
			`;
			let select = document.querySelector('zoo-select');
			return select.shadowRoot.querySelector('slot[name="label"]').assignedElements()[0].innerHTML;
		});
		expect(label).toEqual('Multiselect');
	});

	it('should set disabled attribute on host when select is disabled', async () => {
		const disabled = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-select>
				<select id="multiselect" slot="select">
					<option>1</option>
				</select>
				<label for="multiselect" slot="label">Multiselect</label>
			</zoo-select>
			`;
			let select = document.querySelector('zoo-select');
			await new Promise(r => setTimeout(r(), 10));
			select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0].disabled = true;
			await new Promise(r => setTimeout(r(), 10));

			return select.hasAttribute('disabled');
		});
		expect(disabled).toBeTrue();
	});

	it('should remove disabled attribute on host when select is not disabled', async () => {
		const disabled = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-select>
				<select id="multiselect" slot="select" disabled>
					<option>1</option>
				</select>
				<label for="multiselect" slot="label">Multiselect</label>
			</zoo-select>
			`;
			let select = document.querySelector('zoo-select');
			await new Promise(r => setTimeout(r(), 10));
			select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0].disabled = false;
			await new Promise(r => setTimeout(r(), 10));

			return select.hasAttribute('disabled');
		});
		expect(disabled).toBeFalse();
	});

	it('should set multiple attribute on host when select is multiple', async () => {
		const multiple = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-select>
				<select id="multiselect" slot="select">
					<option>1</option>
				</select>
				<label for="multiselect" slot="label">Multiselect</label>
			</zoo-select>
			`;
			let select = document.querySelector('zoo-select');
			await new Promise(r => setTimeout(r(), 10));
			select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0].multiple = true;
			await new Promise(r => setTimeout(r(), 10));

			return select.hasAttribute('multiple');
		});
		expect(multiple).toBeTrue();
	});

	it('should remove multiple attribute on host when select is not multiple', async () => {
		const multiple = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-select>
				<select id="multiselect" slot="select" multiple>
					<option>1</option>
				</select>
				<label for="multiselect" slot="label">Multiselect</label>
			</zoo-select>
			`;
			let select = document.querySelector('zoo-select');
			await new Promise(r => setTimeout(r(), 10));
			select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0].multiple = false;
			await new Promise(r => setTimeout(r(), 10));

			return select.hasAttribute('multiple');
		});
		expect(multiple).toBeFalse();
	});

	it('should set and then remove valueselected attribute on host when select option is selected/deselected', async () => {
		let valueselected = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-select>
				<select id="select" slot="select">
					<option>1</option>
				</select>
				<label for="select" slot="label">some label</label>
			</zoo-select>
			`;
			let select = document.querySelector('zoo-select');
			await new Promise(r => setTimeout(r(), 10));
			const slottedSelect = select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0];
			slottedSelect.value = 1;
			slottedSelect.dispatchEvent(new Event('change'));

			return select.hasAttribute('valueselected');
		});
		expect(valueselected).toBeTrue();

		valueselected = await page.evaluate(async () => {
			let select = document.querySelector('zoo-select');
			await new Promise(r => setTimeout(r(), 10));
			const slottedSelect = select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0];
			slottedSelect.value = null;
			slottedSelect.dispatchEvent(new Event('change'));

			return select.hasAttribute('valueselected');
		});
		expect(valueselected).toBeFalse();
	});

	it('should remove valueselected attribute on host when cross is clicked', async () => {
		let ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-select>
				<select id="select" slot="select">
					<option>1</option>
				</select>
				<label for="select" slot="label">some label</label>
			</zoo-select>
			`;
			let select = document.querySelector('zoo-select');
			await new Promise(r => setTimeout(r(), 10));
			const slottedSelect = select.shadowRoot.querySelector('slot[name="select"]').assignedElements()[0];
			slottedSelect.value = 1;
			slottedSelect.dispatchEvent(new Event('change'));

			await new Promise(r => setTimeout(r(), 10));
			select.shadowRoot.querySelector('.close').dispatchEvent(new Event('click'));

			return {
				value: slottedSelect.value,
				valueselectedAttr: select.hasAttribute('valueselected')
			};
		});
		expect(ret.value).toEqual('');
		expect(ret.valueselectedAttr).toBeFalse();
	});
});