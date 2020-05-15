describe('Zoo input label', function() {
	describe('InputLabel', () => {
		it('should create label text', async() => {
			const infoText = await page.evaluate(() => {
				let inputInfo = document.createElement('zoo-input-label');
				inputInfo.labeltext = 'label-text';
				document.body.appendChild(inputInfo);
				const text = inputInfo.shadowRoot.querySelector('div');
				return text.innerHTML;
			});
			expect(infoText).to.have.string('label-text');
		});
	});
});