describe('Zoo toggle switch', function() {
	it('should create checkbox', async () => {
		const inputLabelText = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-quantity-control infotext="Additional helpful information for our users" >
				<input id="number-input" slot="input" readonly placeholder="0" type="number" step="50"/>
				<label for="number-input" slot="label">Label</label>
			</zoo-quantity-control>
			`;
			let control = document.querySelector('zoo-quantity-control');

			return control.shadowRoot.querySelector('slot[name="label"]').assignedElements()[0].innerHTML;
		});
		expect(inputLabelText).toEqual('Label');
	});
});