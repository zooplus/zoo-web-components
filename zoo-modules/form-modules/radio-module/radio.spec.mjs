describe('Zoo radio', function () {
	it('should pass attributes to input label component', async () => {
		const labelText = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-radio>
					<input type="radio" id="contactChoice1" name="contact" value="email">
					<label for="contactChoice1">Email</label>
					<input type="radio" id="contactChoice2" name="contact" value="phone">
					<label for="contactChoice2">Phone</label>
					<label slot="label">label</label>
				</zoo-radio>
				`;
			let input = document.querySelector('zoo-radio');
			const label = input.shadowRoot.querySelector('slot[name="label"]').assignedElements()[0];
			return label.innerHTML;
		});
		expect(labelText).toEqual('label');
	});

	it('should render input error', async () => {
		const errorDisplay = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-radio invalid>
					<input type="radio" id="contactChoice1" name="contact" value="email">
					<label for="contactChoice1">Email</label>
					<input type="radio" id="contactChoice2" name="contact" value="phone">
					<label for="contactChoice2">Phone</label>
					<label slot="label">label</label>
					<span slot="error">error</span>
				</zoo-radio>
				`;
			let input = document.querySelector('zoo-radio');
			const error = input.shadowRoot.querySelector('.error');
			return window.getComputedStyle(error).display;
		});
		expect(errorDisplay).toEqual('flex');
	});

	it('should not render input error', async () => {
		const errorDisplay = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-radio>
					<input type="radio" id="contactChoice1" name="contact" value="email">
					<label for="contactChoice1">Email</label>
					<input type="radio" id="contactChoice2" name="contact" value="phone">
					<label for="contactChoice2">Phone</label>
					<label slot="label">label</label>
					<span slot="error">error</span>
				</zoo-radio>
				`;
			let input = document.querySelector('zoo-radio');
			const error = input.shadowRoot.querySelector('.error');
			return window.getComputedStyle(error).display;
		});
		expect(errorDisplay).toEqual('none');
	});

	it('should set and then remove invalid attribute from host', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-radio>
					<input type="radio" id="contactChoice1" name="contact" value="email" required>
					<label for="contactChoice1">Email</label>
					<input type="radio" id="contactChoice2" name="contact" value="phone">
					<label for="contactChoice2">Phone</label>
					<label slot="label">label</label>
					<span slot="error">error</span>
				</zoo-radio>
				`;
			const result = [];
			let input = document.querySelector('zoo-radio');
			await new Promise(r => setTimeout(r, 10));
			const slottedEls = input.shadowRoot.querySelector('.radio-group slot').assignedElements();
			const inputs = [];
			slottedEls.forEach(e => {
				if (e.tagName === 'INPUT') inputs.push(e);
			});
			inputs[0].checkValidity();
			await new Promise(r => setTimeout(r, 10));
			result.push(input.hasAttribute('invalid'));

			inputs[0].click();
			await new Promise(r => setTimeout(r, 10));
			result.push(input.hasAttribute('invalid'));

			return result;
		});
		expect(result[0]).toBeTrue();
		expect(result[1]).toBeFalse();
	});
});