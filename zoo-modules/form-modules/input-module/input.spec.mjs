describe('Zoo input', function() {
	describe('Input', () => {
		it('should create input', async() => {
			const inputAttrs = await page.evaluate(() => {
				let input = document.createElement('zoo-input');
				document.body.appendChild(input);
				return {
					inputLabelPresent: input.shadowRoot.querySelector('zoo-input-label') !== undefined,
					inputLinkPresent: input.shadowRoot.querySelector('a') !== undefined,
					inputInfoPresent: input.shadowRoot.querySelector('zoo-input-info') !== undefined
				};
			});
			expect(inputAttrs.inputLabelPresent).toBeTrue();
			expect(inputAttrs.inputLinkPresent).toBeTrue();
			expect(inputAttrs.inputInfoPresent).toBeTrue();
		});

		it('should pass attributes to input label component', async() => {
			const labelAttrs = await page.evaluate(() => {
				let input = document.createElement('zoo-input');
				input.labeltext = 'label';
				document.body.appendChild(input);
				const label = input.shadowRoot.querySelector('zoo-input-label').shadowRoot;
				return {
					labelText: label.querySelector('label').innerHTML
				};
			});
			expect(labelAttrs.labelText).toEqual('label');
		});

		it('should render input link', async() => {
			const linkAttrs = await page.evaluate(() => {
				let input = document.createElement('zoo-input');
				input.linkhref = 'https://google.com';
				input.linktarget = '#';
				input.linktext = 'link-text';
				document.body.appendChild(input);
				const linkAnchor = input.shadowRoot.querySelector('a');
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
				let input = document.createElement('zoo-input');
				input.infotext = 'info-text';
				input.inputerrormsg = 'errormsg';
				input.invalid = true;
				document.body.appendChild(input);
				const info = input.shadowRoot.querySelector('zoo-input-info').shadowRoot;
				return {
					infoText: info.querySelector('.info').innerHTML,
					errorMsg: info.querySelector('.error').innerHTML
				};
			});
			expect(infoAttrs.infoText.indexOf('info-text')).not.toEqual(-1);
			expect(infoAttrs.errorMsg.indexOf('errormsg')).not.toEqual(-1);
		});

		it('should accept 1 slot', async() => {
			const ret = await page.evaluate(() => {
				let input = document.createElement('zoo-input');
				let element = document.createElement('input');
				element.slot = 'inputelement';
				input.appendChild(element);
				document.body.appendChild(input);

				const slottedInput = input.shadowRoot.querySelector('slot[name="inputelement"]').assignedNodes()[0];

				return {
					tagName: slottedInput.tagName 
				};
			});
			expect(ret.tagName).toEqual('INPUT');
		});
	});
});