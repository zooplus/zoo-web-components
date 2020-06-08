describe('Zoo button', function() {
	describe('Button', () => {
		it('should create disabled button', async() => {
			const disabledAttr = await page.evaluate(() => {
				let button = document.createElement('zoo-button');
				button.disabled = true;
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.getAttribute('disabled');
			});
			expect(disabledAttr).equal('');
		});
	});
});