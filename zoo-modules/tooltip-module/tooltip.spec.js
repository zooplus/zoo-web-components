describe('Zoo log tooltip', function() {
	describe('Tooltip', () => {
		it('should create default tooltip', async() => {
			const tooltipAttrs = await page.evaluate(() => {
				let tooltip = document.createElement('zoo-tooltip');
				tooltip.text = 'some-text';
				document.body.appendChild(tooltip);
				const tooltipBox = tooltip.shadowRoot.querySelector('.box');
				const tooltipTip = tooltip.shadowRoot.querySelector('.tip');
				const tooltiptext = tooltip.shadowRoot.querySelector('.text');
				const tooltipAttrs = {
					tooltipBoxPositionTopClass: tooltipBox.classList.contains('top'),
					tooltipTipPositionTopClass: tooltipTip.classList.contains('top'),
					tooltipText: tooltiptext.innerHTML
				};
				return tooltipAttrs;
			});
			expect(tooltipAttrs.tooltipBoxPositionTopClass).to.be.true;
			expect(tooltipAttrs.tooltipTipPositionTopClass).to.be.true;
			expect(tooltipAttrs.tooltipText).equal('some-text');
		});

		it('should create left tooltip', async() => {
			const tooltipAttrs = await page.evaluate(() => {
				let tooltip = document.createElement('zoo-tooltip');
				tooltip.position = 'left';
				document.body.appendChild(tooltip);
				const tooltipBox = tooltip.shadowRoot.querySelector('.box');
				const tooltipTip = tooltip.shadowRoot.querySelector('.tip');
				const tooltipAttrs = {
					tooltipBoxPositionLeftClass: tooltipBox.classList.contains('left'),
					tooltipTipPositionLeftClass: tooltipTip.classList.contains('left')
				};
				return tooltipAttrs;
			});
			expect(tooltipAttrs.tooltipBoxPositionLeftClass).to.be.true;
			expect(tooltipAttrs.tooltipTipPositionLeftClass).to.be.true;
		});

		it('should create right tooltip', async() => {
			const tooltipAttrs = await page.evaluate(() => {
				let tooltip = document.createElement('zoo-tooltip');
				tooltip.position = 'right';
				document.body.appendChild(tooltip);
				const tooltipBox = tooltip.shadowRoot.querySelector('.box');
				const tooltipTip = tooltip.shadowRoot.querySelector('.tip');
				const tooltipAttrs = {
					tooltipBoxPositionRightClass: tooltipBox.classList.contains('right'),
					tooltipTipPositionRightClass: tooltipTip.classList.contains('right')
				};
				return tooltipAttrs;
			});
			expect(tooltipAttrs.tooltipBoxPositionRightClass).to.be.true;
			expect(tooltipAttrs.tooltipTipPositionRightClass).to.be.true;
		});

		it('should create bottom tooltip', async() => {
			const tooltipAttrs = await page.evaluate(() => {
				let tooltip = document.createElement('zoo-tooltip');
				tooltip.position = 'bottom';
				document.body.appendChild(tooltip);
				const tooltipBox = tooltip.shadowRoot.querySelector('.box');
				const tooltipTip = tooltip.shadowRoot.querySelector('.tip');
				const tooltipAttrs = {
					tooltipBoxPositionBottomClass: tooltipBox.classList.contains('bottom'),
					tooltipTipPositionBottomClass: tooltipTip.classList.contains('bottom')
				};
				return tooltipAttrs;
			});
			expect(tooltipAttrs.tooltipBoxPositionBottomClass).to.be.true;
			expect(tooltipAttrs.tooltipTipPositionBottomClass).to.be.true;
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