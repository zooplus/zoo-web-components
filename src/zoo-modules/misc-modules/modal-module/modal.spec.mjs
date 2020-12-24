describe('Zoo modal', function () {
	it('should create opened modal', async () => {
		const modalHeadingText = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-modal closelabel="close modal">
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
				<zoo-modal closelabel="close modal">
					<span slot="header">header-text</span>
					<div>content</div>
				</zoo-modal>
				`;
			let modal = document.querySelector('zoo-modal');
			modal.style.display = 'block';

			const closeButton = modal.shadowRoot.querySelector('.close');
			closeButton.click();
			await new Promise(r => setTimeout(r, 400)); // waiting for animation to finish
			return modal.style.display;
		});
		expect(modalDisplay).toEqual('none');
	});

	it('should close opened modal when outer box is clicked', async () => {
		const modalDisplay = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-modal closelabel="close modal">
					<span slot="header">header-text</span>
					<div>content</div>
				</zoo-modal>
				`;
			let modal = document.querySelector('zoo-modal');
			modal.style.display = 'block';

			const box = modal.shadowRoot.querySelector('.box');
			box.dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 400)); // waiting for animation to finish
			return modal.style.display;
		});
		expect(modalDisplay).toEqual('none');
	});

	it('should close opened modal when escape is clicked', async () => {
		const modalDisplay = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-modal closelabel="close modal">
					<span slot="header">header-text</span>
					<div>content</div>
				</zoo-modal>
				`;
			let modal = document.querySelector('zoo-modal');
			modal.openModal();
			await new Promise(r => setTimeout(r, 10));

			const event = new KeyboardEvent('keyup', { key: 'Escape' });
			document.dispatchEvent(event);
			await new Promise(r => setTimeout(r, 400)); // waiting for animation to finish
			return modal.style.display;
		});
		expect(modalDisplay).toEqual('none');
	});

	it('should dispatch only one modalClosed event despite multiple calls to closeModal', async () => {
		const calledTimes = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-modal closelabel="close modal">
					<span slot="header">header-text</span>
					<div>content</div>
				</zoo-modal>
				`;
			let modal = document.querySelector('zoo-modal');
			modal.openModal();
			await new Promise(r => setTimeout(r, 310));

			let called = 0;
			modal.addEventListener('modalClosed', () => called += 1);

			modal.closeModal();
			await new Promise(r => setTimeout(r, 10));
			modal.closeModal();
			await new Promise(r => setTimeout(r, 620));
			return called;
		});
		expect(calledTimes).toEqual(1);
	});
});