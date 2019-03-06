describe('Zoo log input info', function() {
	describe('InputInfo', () => {
		it('should create info text', async() => {
			const infoText = await page.evaluate(() => {
				let inputInfo = document.createElement('zoo-input-info');
				inputInfo.infotext = 'input-text';
				document.body.appendChild(inputInfo);
				const text = inputInfo.shadowRoot.querySelector('.info');
				return text.innerHTML;
			});
			expect(infoText).to.have.string('input-text');
		});

		it('should render error text', async() => {
			const inputInfoErrorAttrs = await page.evaluate(() => {
				let inputInfo = document.createElement('zoo-input-info');
				inputInfo.valid = false;
				inputInfo.inputerrormsg = 'error';
				document.body.appendChild(inputInfo);
				const errorIcon = inputInfo.shadowRoot.querySelector('.exclamation-circle');
				const errorMsg = inputInfo.shadowRoot.querySelector('.error-label');
				return {
					errorIconPresent: errorIcon !== undefined,
					errorMsg: errorMsg.innerHTML
				};
			});
			expect(inputInfoErrorAttrs.errorIconPresent).to.be.true;
			expect(inputInfoErrorAttrs.errorMsg).equal('error');
		});
	});
});