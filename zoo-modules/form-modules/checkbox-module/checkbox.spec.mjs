describe('Zoo checkbox', function () {
	it('should create checkbox', async () => {
		const inputLabelText = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-checkbox highlighted>
				<input id="modal-checkbox" slot="checkbox" type="checkbox"/>
				<label for="modal-checkbox" slot="label">label-text</label>
			</zoo-checkbox>
			`;
			let checkbox = document.querySelector('zoo-checkbox');

			return checkbox.shadowRoot.querySelector('slot[name="label"]').assignedNodes()[0].innerHTML;
		});
		expect(inputLabelText).toEqual('label-text');
	});
});