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
			expect(headerText).toEqual('header-text');
		});

		it('should create image', async() => {
			const imageSrc = await page.evaluate(() => {
				let header = document.createElement('zoo-header');
				let img = document.createElement('img');
				img.src = 'logo.png';
				img.slot = 'img';
				header.appendChild(img);
				document.body.appendChild(header);
				const imageSlot = header.shadowRoot.querySelector('slot[name="img"]');
				return imageSlot.assignedNodes()[0].getAttribute('src');
			});
			expect(imageSrc).toEqual('logo.png');
		});
		it('should accept 1 slot', async() => {
			const slottedElement = await page.evaluate(() => {
				let header = document.createElement('zoo-header');
				let element = document.createElement('span');
				element.innerHTML = 'slotted';
				header.appendChild(element);
				document.body.appendChild(header);
				const slot = header.shadowRoot.querySelectorAll('slot')[2];
				return slot.assignedNodes()[0].innerHTML;
			});
			expect(slottedElement).toEqual('slotted');
		});
		
	});
});