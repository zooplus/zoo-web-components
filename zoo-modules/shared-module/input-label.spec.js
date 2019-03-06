describe('Zoo log input label', function() {
	describe('InputLabel', () => {
		it('should create label text', async() => {
			const infoText = await page.evaluate(() => {
				let inputInfo = document.createElement('zoo-input-label');
				inputInfo.labeltext = 'label-text';
				document.body.appendChild(inputInfo);
				const text = inputInfo.shadowRoot.querySelector('.label');
				return text.innerHTML;
			});
			expect(infoText).to.have.string('label-text');
		});

		it('should apply error class', async() => {
			const inputLabelErrorAttrs = await page.evaluate(() => {
				let inputInfo = document.createElement('zoo-input-label');
				inputInfo.labeltext = 'text';
				inputInfo.valid = false;
				document.body.appendChild(inputInfo);
				const labelEl = inputInfo.shadowRoot.querySelector('.label');
				return {
					containsErrorClass: labelEl.classList.contains('error')
				};
			});
			expect(inputLabelErrorAttrs.containsErrorClass).to.be.true;
		});
	});
});