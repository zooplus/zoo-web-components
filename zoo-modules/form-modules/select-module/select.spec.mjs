describe('Zoo select', function() {
	describe('Select', () => {
		it('should create select', async() => {
			const selectAttrs = await page.evaluate(() => {
				let select = document.createElement('zoo-select');
				document.body.appendChild(select);
				return {
					inputLabelPresent: select.shadowRoot.querySelector('zoo-input-label') !== undefined,
					inputLinkPresent: select.shadowRoot.querySelector('a') !== undefined,
					inputInfoPresent: select.shadowRoot.querySelector('zoo-input-info') !== undefined
				};
			});
			expect(selectAttrs.inputLabelPresent).toBeTrue();
			expect(selectAttrs.inputLinkPresent).toBeTrue();
			expect(selectAttrs.inputInfoPresent).toBeTrue();
		});

		it('should pass attributes to input label component', async() => {
			const labelAttrs = await page.evaluate(() => {
				let select = document.createElement('zoo-select');
				select.labeltext = 'label';
				select.valid = false;
				document.body.appendChild(select);
				const label = select.shadowRoot.querySelector('zoo-input-label').shadowRoot;
				return {
					labelText: label.querySelector('label').innerHTML
				};
			});
			expect(labelAttrs.labelText).toEqual('label');
		});

		it('should render input link', async() => {
			const linkAttrs = await page.evaluate(() => {
				let select = document.createElement('zoo-select');
				select.linkhref = 'https://google.com';
				select.linktarget = '#';
				select.linktext = 'link-text';
				document.body.appendChild(select);
				const linkAnchor = select.shadowRoot.querySelector('a');
				return {
					linkText: linkAnchor.innerHTML,
					linkTarget: linkAnchor.getAttribute('target'),
					linkHref: linkAnchor.getAttribute('href')
				};
			});
			expect(linkAttrs.linkText).toEqual('link-text');
			expect(linkAttrs.linkHref).toEqual('https://google.com');
			expect(linkAttrs.linkTarget).toEqual('#');
		});

		it('should pass attributes to input info component', async() => {
			const infoAttrs = await page.evaluate(() => {
				let select = document.createElement('zoo-select');
				select.infotext = 'info-text';
				select.inputerrormsg = 'errormsg';
				select.valid = false;
				document.body.appendChild(select);
				const info = select.shadowRoot.querySelector('zoo-input-info').shadowRoot;
				return {
					infoText: info.querySelector('.info').innerHTML,
					errorMsg: info.querySelector('.error').innerHTML
				};
			});
			expect(infoAttrs.infoText.indexOf('info-text')).not.toEqual(-1);
			expect(infoAttrs.errorMsg.indexOf('errormsg')).not.toEqual(-1);
		});

		it('should accept 1 slot', async() => {
			const slottedElement = await page.evaluate(() => {
				let select = document.createElement('zoo-select');
				let element = document.createElement('select');

				let option = document.createElement('option');
				option.value = 1;
				option.innerHTML = 'first';
				element.appendChild(option);
				element.slot = 'selectelement';

				select.appendChild(element);
				document.body.appendChild(select);
				const slot = select.shadowRoot.querySelector('slot[name="selectelement"]');
				return {
					optVal: slot.assignedNodes()[0].options[0].value,
					optText: slot.assignedNodes()[0].options[0].innerHTML
				};
			});
			expect(slottedElement.optVal).toEqual('1');
			expect(slottedElement.optText).toEqual('first');
		});
	});
});