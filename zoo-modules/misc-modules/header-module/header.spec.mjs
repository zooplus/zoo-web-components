describe('Zoo header', function () {
	it('should create header text', async () => {
		const headerText = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-header>
					<img slot="img" alt="Zooplus logo" src="logo.png"/>
					<h2 slot="headertext">header-text</h2>
				</zoo-header>
				`;
			let header = document.querySelector('zoo-header');

			const text = header.shadowRoot.querySelector('slot[name="headertext"]').assignedNodes()[0];
			return text.innerHTML;
		});
		expect(headerText).toEqual('header-text');
	});

	it('should create image', async () => {
		const imageSrc = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-header>
					<img slot="img" alt="Zooplus logo" src="logo.png"/>
					<h2 slot="headertext">header-text</h2>
				</zoo-header>
				`;
			let header = document.querySelector('zoo-header');

			const imageSlot = header.shadowRoot.querySelector('slot[name="img"]');
			return imageSlot.assignedNodes()[0].getAttribute('src');
		});
		expect(imageSrc).toEqual('logo.png');
	});
});