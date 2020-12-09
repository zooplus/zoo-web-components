describe('Zoo button', function () {
	it('should create disabled button', async () => {
		const disabledAttr = await page.evaluate(() => {
			let zoobutton = document.createElement('zoo-button');
			let button = document.createElement('button');
			button.disabled = true;

			zoobutton.appendChild(button);
			document.body.appendChild(zoobutton);
			const nestedButton = zoobutton.shadowRoot.querySelector('slot').assignedNodes()[0];
			return nestedButton.getAttribute('disabled');
		});
		expect(disabledAttr).toEqual('');
	});
});