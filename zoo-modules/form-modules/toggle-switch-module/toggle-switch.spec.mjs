describe('Zoo toggle switch', function() {
	it('should create checkbox', async () => {
		const inputLabelText = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-toggle-switch>
				<label for="input-toggle" slot="label">Toggle switch</label>
				<input id="input-toggle" slot="input" type="checkbox"/>
			</zoo-toggle-switch>
			`;
			let control = document.querySelector('zoo-toggle-switch');

			return control.shadowRoot.querySelector('slot[name="label"]').assignedElements()[0].innerHTML;
		});
		expect(inputLabelText).toEqual('Toggle switch');
	});

	it('should set and then remove invalid attribute from host', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-toggle-switch>
					<label for="input-toggle" slot="label">Toggle switch</label>
					<input id="input-toggle" slot="input" type="checkbox" required/>
				</zoo-toggle-switch>
				`;
			const result = [];
			let input = document.querySelector('zoo-toggle-switch');
			await new Promise(r => setTimeout(r, 10));
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			slottedInput.click();
			await new Promise(r => setTimeout(r, 10));
			result.push(input.hasAttribute('invalid'));

			slottedInput.click();
			await new Promise(r => setTimeout(r, 10));
			result.push(input.hasAttribute('invalid'));

			return result;
		});
		expect(result[0]).toBeFalse();
		expect(result[1]).toBeTrue();
	});
});