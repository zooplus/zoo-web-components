describe('Zoo log modal', function() {
	describe('Modal', () => {
		it('should create opened modal', async() => {
			const modalAttrs = await page.evaluate(() => {
				let modal = document.createElement('zoo-modal');
				modal.headertext = 'header-text';
				modal.style.display = 'block';
				document.body.appendChild(modal);
				const modalBox = modal.shadowRoot.querySelector('.box');

				return {
					modalHeadingText: modalBox.querySelector('h2').innerHTML
				};
			});
			expect(modalAttrs.modalHeadingText).equal('header-text');
		});

		it('should create opened modal and close it', async () => {
			const modalDisplay = await page.evaluate(async () => {
				let modal = document.createElement('zoo-modal');
				modal.headertext = 'header-text';
				modal.style.display = 'block';
				document.body.appendChild(modal);

				const closeButton = modal.shadowRoot.querySelector('.close');
				closeButton.click();
				await new Promise(r => setTimeout(r, 400)); // waiting for animation to finish
				return modal.shadowRoot.host.style.display;
			});
			expect(modalDisplay).equal('none');
		});

		it('should accept 1 slot', async() => {
			const ret = await page.evaluate(() => {
				let modal = document.createElement('zoo-modal');
				let element = document.createElement('span');
				element.innerHTML = 'some test text';
				modal.appendChild(element);
				document.body.appendChild(modal);

				const slottedContent = modal.shadowRoot.querySelector('slot').assignedNodes()[0];

				for (const element of document.getElementsByTagName('zoo-modal')) {
					element.remove();
				}

				return {
					slottedText: slottedContent.innerHTML
				};
			});
			expect(ret.slottedText).equal('some test text');
		});
	});
});