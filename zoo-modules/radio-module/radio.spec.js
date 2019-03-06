describe('Zoo log radio', function() {
	describe('Radio', () => {
		it('should accept 1 slot', async() => {
			const ret = await page.evaluate(() => {
				let radio = document.createElement('zoo-radio');
				let element = document.createElement('input');
				element.type = 'radio';
				radio.appendChild(element);
				document.body.appendChild(radio);

				const slottedRadio = radio.shadowRoot.querySelector('slot').assignedNodes()[0];

				return {
					tagName: slottedRadio.tagName,
					type: slottedRadio.type
				};
			});
			expect(ret.tagName).equal('INPUT');
			expect(ret.type).equal('radio')
		});
	});
});