describe('Zoo checkbox', function() {
	describe('Chechbox', () => {
		it('should create checkbox', async() => {
			const inputAttrs = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				checkbox.labeltext = 'label-text';
				checkbox.valid = false;
				checkbox.highlighted = true;
				document.body.appendChild(checkbox);
				const inputBox = checkbox.shadowRoot.querySelector('.box');
				const checkboxInner = checkbox.shadowRoot.querySelector('.checkbox');

				return {
					inputLabelText: inputBox.querySelector('span').innerHTML,
					errorClassPresent: checkboxInner.classList.contains('error'),
					highlightedClassPresent: checkboxInner.classList.contains('highlighted')
				};
			});
			expect(inputAttrs.inputLabelText).equal('label-text');
			expect(inputAttrs.errorClassPresent).to.be.true;
			expect(inputAttrs.highlightedClassPresent).to.be.true;
		});

		it('should handle checkbox label click', async() => {
			const checked = await page.evaluate(async() => {
				let checkbox = document.createElement('zoo-checkbox');
				let element = document.createElement('input');
				element.slot = 'checkboxelement';
				element.type = 'checkbox';
				checkbox.appendChild(element);
				document.body.appendChild(checkbox);

				await new Promise(r => setTimeout(r, 10));
				const inputSlot = checkbox.shadowRoot.querySelector('.checkbox');
				const slottedCheckbox = checkbox.shadowRoot.querySelector('slot[name="checkboxelement"]').assignedNodes()[0];
				inputSlot.click();
				return slottedCheckbox.checked;
			});
			expect(checked).to.be.true;
		});

		it('should accept 1 slot', async() => {
			const ret = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				let element = document.createElement('input');
				element.slot = 'checkboxelement';
				element.type = 'checkbox';
				checkbox.appendChild(element);
				document.body.appendChild(checkbox);

				const slottedCheckbox = checkbox.shadowRoot.querySelector('slot[name="checkboxelement"]').assignedNodes()[0];

				return {
					tagName: slottedCheckbox.tagName,
					type: slottedCheckbox.type
				};
			});
			expect(ret.tagName).equal('INPUT');
			expect(ret.type).equal('checkbox')
		});
	});
});