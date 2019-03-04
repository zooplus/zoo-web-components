describe('Zoo log navigation', function() {
	describe('Navigation', () => {
		it('should create nav element with slotted element', async() => {
			const slottedElement = await page.evaluate(() => {
				let nav = document.createElement('zoo-log-navigation');
				let element = document.createElement('span');
				element.innerHTML = 'slotted';
				nav.appendChild(element);
				document.body.appendChild(nav);
				const slot = nav.shadowRoot.querySelector('slot');
				return slot.assignedNodes()[0].innerHTML;
			});
			expect(slottedElement).equal('slotted');
		});
	});
});