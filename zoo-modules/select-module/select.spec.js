describe('Zoo log select', function() {
	describe('Select', () => {
		it('should create select', async() => {
			const selectAttrs = await page.evaluate(() => {
				let select = document.createElement('zoo-log-select');
				document.body.appendChild(select);
				const selectBox = select.shadowRoot.querySelector('.box');
				return {
					inputLabelPresent: selectBox.querySelector('.input-label') !== undefined,
					inputLinkPresent: selectBox.querySelector('.input-link') !== undefined,
					inputInfoPresent: selectBox.querySelector('.input-info') !== undefined
				};
			});
			expect(selectAttrs.inputLabelPresent).to.be.true;
			expect(selectAttrs.inputLinkPresent).to.be.true;
			expect(selectAttrs.inputInfoPresent).to.be.true;
		});

		it('should pass attributes to input label component', async() => {
			const labelAttrs = await page.evaluate(() => {
				let select = document.createElement('zoo-log-select');
				select.labeltext = 'label';
				select.valid = false;
				document.body.appendChild(select);
				const selectBox = select.shadowRoot.querySelector('.box');
				const label = selectBox.querySelector('.input-label').shadowRoot;
				return {
					labelText: label.querySelector('span').innerHTML,
					errorClassPresent: label.querySelector('.label').classList.contains('error')
				};
			});
			expect(labelAttrs.labelText).equal('label');
			expect(labelAttrs.errorClassPresent).to.be.true;
		});

		it('should pass attributes to input link component', async() => {
			const linkAttrs = await page.evaluate(() => {
				let select = document.createElement('zoo-log-select');
				select.linkhref = 'https://google.com';
				select.linktarget = '#';
				select.linktext = 'link-text';
				document.body.appendChild(select);
				const selectBox = select.shadowRoot.querySelector('.box');
				const link = selectBox.querySelector('.input-link').shadowRoot;
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
				let select = document.createElement('zoo-log-select');
				select.infotext = 'info-text';
				select.inputerrormsg = 'errormsg';
				select.valid = false;
				document.body.appendChild(select);
				const selectBox = select.shadowRoot.querySelector('.box');
				const info = selectBox.querySelector('.input-info').shadowRoot;
				return {
					infoText: info.querySelector('.info-text').innerHTML,
					errorMsg: info.querySelector('.error-label').innerHTML
				};
			});
			expect(infoAttrs.infoText).equal('info-text');
			expect(infoAttrs.errorMsg).equal('errormsg');
		});

		it('should accept 1 slot', async() => {
			const slottedElement = await page.evaluate(() => {
				let select = document.createElement('zoo-log-select');
				let element = document.createElement('select');

				let option = document.createElement('option');
				option.value = 1;
				option.innerHTML = 'first';
				element.appendChild(option);
				element.slot = 'selectelement';

				select.appendChild(element);
				document.body.appendChild(select);
				const slot = select.shadowRoot.querySelector('slot');
				return {
					optVal: slot.assignedNodes()[0].options[0].value,
					optText: slot.assignedNodes()[0].options[0].innerHTML
				}
			});
			expect(slottedElement.optVal).equal('1');
			expect(slottedElement.optText).equal('first');
		});
	});
});