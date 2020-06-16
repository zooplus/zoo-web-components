describe('Zoo tooltip', function() {
	describe('Tooltip', () => {
		it('should create default tooltip', async() => {
			const tooltipAttrs = await page.evaluate(() => {
				let tooltip = document.createElement('zoo-tooltip');
				tooltip.text = 'some-text';
				document.body.appendChild(tooltip);
				const tooltiptext = tooltip.shadowRoot.querySelector('span');
				const tooltipAttrs = {
					tooltipText: tooltiptext.innerHTML
				};
				return tooltipAttrs;
			});
			expect(tooltipAttrs.tooltipText).equal('some-text');
		});

		it('should create tooltip with slot', async() => {
			const slottedElement = await page.evaluate(() => {
				let tooltip = document.createElement('zoo-tooltip');
				let element = document.createElement('span');
				element.innerHTML = 'slotted';
				tooltip.appendChild(element);
				document.body.appendChild(tooltip);
				const slot = tooltip.shadowRoot.querySelector('slot');
				return slot.assignedNodes()[0].innerHTML;
			});
			expect(slottedElement).equal('slotted');
		});
	});
});