describe('Zoo checkbox', function () {
	it('should create checkbox', async () => {
		const inputLabelText = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-checkbox highlighted>
				<input id="modal-checkbox" slot="checkboxelement" type="checkbox"/>
				<label for="modal-checkbox" slot="checkboxlabel">label-text</label>
			</zoo-checkbox>
			`;
			let checkbox = document.querySelector('zoo-checkbox');

			return checkbox.shadowRoot.querySelector('slot[name="checkboxlabel"]').assignedNodes()[0].innerHTML;
		});
		expect(inputLabelText).toEqual('label-text');
	});
});