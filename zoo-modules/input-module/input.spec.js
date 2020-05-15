describe('Zoo input', function() {
	describe('Input', () => {
		it('should create input', async() => {
			const inputAttrs = await page.evaluate(() => {
				let input = document.createElement('zoo-input');
				document.body.appendChild(input);
				const inputBox = input.shadowRoot.querySelector('.box');
				return {
					inputLabelPresent: inputBox.querySelector('.input-label') !== undefined,
					inputLinkPresent: inputBox.querySelector('.input-link') !== undefined,
					inputInfoPresent: inputBox.querySelector('.input-info') !== undefined
				};
			});
			expect(inputAttrs.inputLabelPresent).to.be.true;
			expect(inputAttrs.inputLinkPresent).to.be.true;
			expect(inputAttrs.inputInfoPresent).to.be.true;
		});

		it('should pass attributes to input label component', async() => {
			const labelAttrs = await page.evaluate(() => {
				let input = document.createElement('zoo-input');
				input.labeltext = 'label';
				input.valid = false;
				document.body.appendChild(input);
				const inputBox = input.shadowRoot.querySelector('.box');
				const label = inputBox.querySelector('.input-label').shadowRoot;
				return {
					labelText: label.querySelector('div').innerHTML
				};
			});
			expect(labelAttrs.labelText).equal('label');
		});

		it('should pass attributes to input link component', async() => {
			const linkAttrs = await page.evaluate(() => {
				let input = document.createElement('zoo-input');
				input.linkhref = 'https://google.com';
				input.linktarget = '#';
				input.linktext = 'link-text';
				document.body.appendChild(input);
				const inputBox = input.shadowRoot.querySelector('.box');
				const link = inputBox.querySelector('.input-link').shadowRoot;
				const linkAnchor = link.querySelector('a');
				return {
					linkText: linkAnchor.querySelector('span').innerHTML,
					linkTarget: linkAnchor.getAttribute('target'),
					linkHref: linkAnchor.getAttribute('href')
				};
			});
			expect(linkAttrs.linkText).equal('link-text');
			expect(linkAttrs.linkHref).equal('https://google.com');
			expect(linkAttrs.linkTarget).equal('#');
		});

		it('should pass attributes to input info component', async() => {
			const infoAttrs = await page.evaluate(() => {
				let input = document.createElement('zoo-input');
				input.infotext = 'info-text';
				input.inputerrormsg = 'errormsg';
				input.valid = false;
				document.body.appendChild(input);
				const inputBox = input.shadowRoot.querySelector('.box');
				const info = inputBox.querySelector('.input-info').shadowRoot;
				return {
					infoText: info.querySelector('.info').innerHTML,
					errorMsg: info.querySelector('.error').innerHTML
				};
			});
			expect(infoAttrs.infoText.indexOf('info-text')).not.equal(-1);
			expect(infoAttrs.errorMsg.indexOf('errormsg')).not.equal(-1);
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
			expect(ret.tagName).equal('INPUT');
		});
	});
});