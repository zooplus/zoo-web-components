describe('Zoo checkbox', function() {
	describe('Checkbox', () => {
		it('should create checkbox', async() => {
			const inputAttrs = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				checkbox.labeltext = 'label-text';
				checkbox.highlighted = true;
				document.body.appendChild(checkbox);

				return {
					inputLabelText: checkbox.shadowRoot.querySelector('label').innerHTML
				};
			});
			expect(inputAttrs.inputLabelText).toEqual('label-text');
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
			expect(checked).toBeTrue();
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
			expect(ret.tagName).toEqual('INPUT');
			expect(ret.type).toEqual('checkbox');
		});

		it('should render labeltext when such attribute is passed', async() => {
			const label = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				let input = document.createElement('input');
				checkbox.labeltext = 'labeltext';
				input.type = 'checkbox';
				input.slot = 'checkboxelement';
				checkbox.appendChild(input);
				document.body.appendChild(checkbox);
				const labelText = checkbox.shadowRoot.querySelector('label');

				return labelText.innerHTML;
			});
			expect(label).toEqual('labeltext');
		});

		it('should pass input info attributes to zoo-input-info when supplied', async() => {
			const inputerrormsg = 'error message';
			const infotext = 'info text';
			const ret = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				let input = document.createElement('input');
				checkbox.inputerrormsg = 'error message';
				checkbox.infotext = 'info text';
				input.type = 'checkbox';
				input.slot = 'checkboxelement';
				checkbox.appendChild(input);
				document.body.appendChild(checkbox);
				const zooInputInfoEl = checkbox.shadowRoot.querySelector('zoo-input-info');

				return {
					inputerrormsg: zooInputInfoEl.inputerrormsg,
					infotext: zooInputInfoEl.infotext
				};
			});
			expect(ret.inputerrormsg).toEqual(inputerrormsg);
			expect(ret.infotext).toEqual(infotext);
		});
	});
});