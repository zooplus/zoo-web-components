/* eslint-disable no-undef */
describe('Zoo modal', function () {
	beforeEach(async () => await page.evaluate(() => jasmine.clock().install()));
	afterEach(async () => await page.evaluate(() => jasmine.clock().uninstall()));
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
			jasmine.clock().tick(400);
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
			jasmine.clock().tick(400);
			return modal.style.display;
		});
		expect(modalDisplay).toEqual('none');
	});

	it('should not close opened modal when button-closeable attribute is set and outer box is clicked', async () => {
		const modalDisplay = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-modal closelabel="close modal" button-closeable>
					<span slot="header">header-text</span>
					<div>content</div>
				</zoo-modal>
				`;
			let modal = document.querySelector('zoo-modal');
			modal.style.display = 'block';

			const box = modal.shadowRoot.querySelector('.box');
			box.dispatchEvent(new Event('click'));
			jasmine.clock().tick(400);
			return modal.style.display;
		});
		expect(modalDisplay).toEqual('block');
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

			const event = new KeyboardEvent('keyup', { key: 'Escape' });
			document.dispatchEvent(event);
			jasmine.clock().tick(400);
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
			jasmine.clock().tick(310);

			let called = 0;
			modal.addEventListener('modalClosed', () => called += 1);

			modal.closeModal();
			modal.closeModal();
			jasmine.clock().tick(620);
			return called;
		});
		expect(calledTimes).toEqual(1);
	});
});