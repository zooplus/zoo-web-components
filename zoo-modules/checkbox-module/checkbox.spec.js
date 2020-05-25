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
					inputLabelText: inputBox.querySelector('label').innerHTML,
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

		it('should create highlighted checkbox', async() => {
			const elementAttrs = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				let input = document.createElement('input');
				checkbox.highlighted = true;
				input.type = 'checkbox';
				input.slot = 'checkboxelement';
				checkbox.appendChild(input);
				document.body.appendChild(checkbox);
				const elementBox = checkbox.shadowRoot.querySelector('.checkbox');

				return {
					containsHighlightedClass: elementBox.classList.contains('highlighted')
				};
			});
			expect(elementAttrs.containsHighlightedClass).to.be.true;
		});

		it('should create disabled checkbox', async() => {
			const elementAttrs = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				let input = document.createElement('input');
				input.disabled = true;
				input.type = 'checkbox';
				input.slot = 'checkboxelement';
				checkbox.appendChild(input);
				document.body.appendChild(checkbox);
				const elementBox = checkbox.shadowRoot.querySelector('.box');

				return new Promise((fulfil, reject) => {
					setTimeout(() => {
						return fulfil({
							containsDisabledClass: elementBox.classList.contains('disabled')
						});
					}, 100);
				});
			});
			expect(elementAttrs.containsDisabledClass).to.be.true;
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
			expect(label).equal('labeltext');
		});

		it('should pass input info attributes to zoo-input-info when supplied', async() => {
			const valid = true;
			const inputerrormsg = 'error message';
			const infotext = 'info text';
			const ret = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				let input = document.createElement('input');
				checkbox.valid = true;
				checkbox.inputerrormsg = 'error message';
				checkbox.infotext = 'info text';
				input.type = 'checkbox';
				input.slot = 'checkboxelement';
				checkbox.appendChild(input);
				document.body.appendChild(checkbox);
				const zooInputInfoEl = checkbox.shadowRoot.querySelector('zoo-input-info');

				return {
					valid: zooInputInfoEl.valid,
					inputerrormsg: zooInputInfoEl.inputerrormsg,
					infotext: zooInputInfoEl.infotext
				};
			});
			expect(ret.valid).equal(valid);
			expect(ret.inputerrormsg).equal(inputerrormsg);
			expect(ret.infotext).equal(infotext);
		});

		it('should not add error class based on valid attribute', async() => {
			let errorClassPresent = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				let input = document.createElement('input');
				checkbox.valid = true;
				input.type = 'checkbox';
				input.slot = 'checkboxelement';
				checkbox.appendChild(input);
				document.body.appendChild(checkbox);
				const checkboxEl = checkbox.shadowRoot.querySelector('.checkbox');

				return checkboxEl.classList.contains('error');
			});
			
			expect(errorClassPresent).to.be.false;
		});

		it('should add error class based on valid attribute', async() => {
			let errorClassPresent = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				let input = document.createElement('input');
				checkbox.valid = false;
				input.type = 'checkbox';
				input.slot = 'checkboxelement';
				checkbox.appendChild(input);
				document.body.appendChild(checkbox);
				const checkboxEl = checkbox.shadowRoot.querySelector('.checkbox');

				return checkboxEl.classList.contains('error');
			});
			
			expect(errorClassPresent).to.be.true;
		});

		it('should add and then remove error class based on valid attribute', async() => {
			let ret = await page.evaluate(() => {
				let checkbox = document.createElement('zoo-checkbox');
				let input = document.createElement('input');
				checkbox.valid = false;
				input.type = 'checkbox';
				input.slot = 'checkboxelement';
				checkbox.appendChild(input);
				document.body.appendChild(checkbox);
				const checkboxEl = checkbox.shadowRoot.querySelector('.checkbox');
				const firstValue = checkboxEl.classList.contains('error');

				checkbox.valid = true;
				const secondValue = checkboxEl.classList.contains('error');
				return {
					firstValue: firstValue,
					secondValue: secondValue
				};
			});
			
			expect(ret.firstValue).to.be.true;
			expect(ret.secondValue).to.be.false;
		});
	});
});