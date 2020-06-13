describe('Zoo toggle switch', function() {
	it('should accept 1 slot', async() => {
		const ret = await page.evaluate(() => {
			let input = document.createElement('zoo-toggle-switch');
			let element = document.createElement('input');
			element.type = 'checkbox';
			element.slot = 'input';
			input.appendChild(element);
			document.body.appendChild(input);

			const slottedInput = input.shadowRoot.querySelector('.box slot[name="input"]').assignedNodes()[0];

			return slottedInput.tagName;
		});
		expect(ret).equal('INPUT');
	});

	it('should pass attributes to input info component', async() => {
		const infoAttrs = await page.evaluate(() => {
			let input = document.createElement('zoo-toggle-switch');
			input.infotext = 'info-text';
			document.body.appendChild(input);
			const info = input.shadowRoot.querySelector('zoo-input-info').shadowRoot;
			return {
				infoText: info.querySelector('.info').innerHTML
			};
		});
		expect(infoAttrs.infoText.indexOf('info-text')).not.equal(-1);
	});

	it('should pass attributes to input label component', async() => {
		const labelAttrs = await page.evaluate(() => {
			let input = document.createElement('zoo-toggle-switch');
			input.labeltext = 'label';
			document.body.appendChild(input);
			const label = input.shadowRoot.querySelector('zoo-input-label').shadowRoot;
			return {
				labelText: label.querySelector('label').innerHTML
			};
		});
		expect(labelAttrs.labelText).equal('label');
	});
});