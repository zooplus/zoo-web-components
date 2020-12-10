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
});