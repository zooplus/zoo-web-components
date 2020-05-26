describe('Zoo header', function() {
	describe('Header', () => {
		it('should create header text', async() => {
			const headerText = await page.evaluate(() => {
				let header = document.createElement('zoo-header');
				header.headertext = 'header-text';
				document.body.appendChild(header);
				const text = header.shadowRoot.querySelector('h2');
				return text.innerHTML;
			});
			expect(headerText).equal('header-text');
		});

		it('should create image', async() => {
			const imageSrc = await page.evaluate(() => {
				let header = document.createElement('zoo-header');
				header.imgsrc = 'logo.png';
				document.body.appendChild(header);
				const image = header.shadowRoot.querySelector('img');
				return image.getAttribute('src');
			});
			expect(imageSrc).equal('logo.png');
		});
		it('should accept 1 slot', async() => {
			const slottedElement = await page.evaluate(() => {
				let header = document.createElement('zoo-header');
				let element = document.createElement('span');
				element.innerHTML = 'slotted';
				header.appendChild(element);
				document.body.appendChild(header);
				const slot = header.shadowRoot.querySelector('slot');
				return slot.assignedNodes()[0].innerHTML;
			});
			expect(slottedElement).equal('slotted');
		});
		
	});
});