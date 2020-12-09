describe('Zoo modal', function () {
	it('should create opened modal', async () => {
		const modalHeadingText = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-modal id="modal" closelabel="close modal">
					<span slot="header">header-text</span>
					<div>content</div>
				</zoo-modal>
				`;
			let modal = document.querySelector('zoo-modal');
			modal.style.display = 'block';

			return modal.shadowRoot.querySelector('slot[name="header"]').assignedNodes()[0].innerHTML;
		});
		expect(modalHeadingText).toEqual('header-text');
	});

	it('should create opened modal and close it', async () => {
		const modalDisplay = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-modal id="modal" closelabel="close modal">
					<span slot="header">header-text</span>
					<div>content</div>
				</zoo-modal>
				`;
			let modal = document.querySelector('zoo-modal');
			modal.style.display = 'block';

			const closeButton = modal.shadowRoot.querySelector('.close');
			closeButton.click();
			await new Promise(r => setTimeout(r, 400)); // waiting for animation to finish
			return modal.shadowRoot.host.style.display;
		});
		expect(modalDisplay).toEqual('none');
	});
});