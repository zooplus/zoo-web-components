describe('Zoo toast', function() {
	describe('Toast', () => {
		it('should create default toast', async() => {
			const toastAttrs = await page.evaluate(() => {
				let toast = document.createElement('zoo-toast');
				toast.text = 'some-text';
				document.body.appendChild(toast);
				const toastBox = toast.shadowRoot.querySelector('div');
				const toasttext = toastBox.querySelector('span');
				const toastAttrs = {
					toasttext: toasttext.innerHTML
				};
				return toastAttrs;
			});
			expect(toastAttrs.toasttext).equal('some-text');
		});
	});
});