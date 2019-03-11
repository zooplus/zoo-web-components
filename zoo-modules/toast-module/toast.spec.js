describe('Zoo toast', function() {
	describe('Toast', () => {
		it('should create default toast', async() => {
			const toastAttrs = await page.evaluate(() => {
				let toast = document.createElement('zoo-toast');
				toast.text = 'some-text';
				document.body.appendChild(toast);
				const toastBox = toast.shadowRoot.querySelector('.toast');
				const toasttext = toastBox.querySelector('span');
				const toastAttrs = {
					toastBoxHasInfoClass: toastBox.classList.contains('info'),
					toasttext: toasttext.innerHTML
				};
				return toastAttrs;
			});
			expect(toastAttrs.toastBoxHasInfoClass).to.be.true;
			expect(toastAttrs.toasttext).equal('some-text');
		});
		it('should create default toast', async() => {
			const toastAttrs = await page.evaluate(() => {
				let toast = document.createElement('zoo-toast');
				toast.text = 'some-text';
				toast.type = 'error';
				document.body.appendChild(toast);
				const toastBox = toast.shadowRoot.querySelector('.toast');
				const toasttext = toastBox.querySelector('span');
				const toastAttrs = {
					toastBoxHasErrorClass: toastBox.classList.contains('error'),
					toasttext: toasttext.innerHTML
				};
				return toastAttrs;
			});
			expect(toastAttrs.toastBoxHasErrorClass).to.be.true;
			expect(toastAttrs.toasttext).equal('some-text');
		});
		it('should create default toast', async() => {
			const toastAttrs = await page.evaluate(() => {
				let toast = document.createElement('zoo-toast');
				toast.text = 'some-text';
				toast.type = 'success';
				document.body.appendChild(toast);
				const toastBox = toast.shadowRoot.querySelector('.toast');
				const toasttext = toastBox.querySelector('span');
				const toastAttrs = {
					toastBoxHasSuccessClass: toastBox.classList.contains('success'),
					toasttext: toasttext.innerHTML
				};
				return toastAttrs;
			});
			expect(toastAttrs.toastBoxHasSuccessClass).to.be.true;
			expect(toastAttrs.toasttext).equal('some-text');
		});
	});
});