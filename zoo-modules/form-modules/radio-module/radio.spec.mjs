describe('Zoo radio', function () {
	it('should accept 1 slot', async () => {
		const ret = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-radio>
					<input type="radio" id="contactChoice1" name="contact" value="email">
					<label for="contactChoice1">Email</label>
					<input type="radio" id="contactChoice2" name="contact" value="phone">
					<label for="contactChoice2">Phone</label>
					<input type="radio" id="contactChoice3" name="contact" value="mail">
					<label for="contactChoice3">Mail</label>
				</zoo-radio>
				`;
			let radio = document.querySelector('zoo-radio');

			const slottedRadio = radio.shadowRoot.querySelector('.radio-group slot').assignedNodes()[1];
			return {
				tagName: slottedRadio.tagName,
				type: slottedRadio.type
			};
		});
		expect(ret.tagName).toEqual('INPUT');
		expect(ret.type).toEqual('radio');
	});
});