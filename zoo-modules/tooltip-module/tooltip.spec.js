const chai = require('chai')
const expect = chai.expect;

describe('Zoo log tooltip', function() {
	this.timeout('5s');

	describe('Tooltip', () => {
		it('should create default tooltip', done => {
			global.nightmare
				.evaluate(() => {
					let tooltip = document.createElement('zoo-log-tooltip');
					tooltip.text = 'some-text';
					document.body.appendChild(tooltip);
					const tooltipBox = tooltip.shadowRoot.querySelector('.tooltip-box');
					const tooltipTip = tooltip.shadowRoot.querySelector('.tip');
					const tooltiptext = tooltip.shadowRoot.querySelector('.text');
					const tooltipContent = tooltip.shadowRoot.querySelector('.tooltip-content');
					const tooltipAttrs = {
						tooltipBoxPositionTopClass: tooltipBox.classList.contains('top'),
						tooltipTipPositionTopClass: tooltipTip.classList.contains('top'),
						foldingClassPresent: tooltipContent.classList.contains('folding'),
						tooltipText: tooltiptext.innerHTML
					};
					return tooltipAttrs;
				})
				.then(tooltipAttrs => {
					expect(tooltipAttrs.tooltipBoxPositionTopClass).to.be.true;
					expect(tooltipAttrs.tooltipTipPositionTopClass).to.be.true;
					expect(tooltipAttrs.tooltipText).equal('some-text');
					expect(tooltipAttrs.foldingClassPresent).to.be.false;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create left tooltip', done => {
			global.nightmare
				.evaluate(() => {
					let tooltip = document.createElement('zoo-log-tooltip');
					tooltip.position = 'left';
					tooltip.folding = true;
					document.body.appendChild(tooltip);
					const tooltipBox = tooltip.shadowRoot.querySelector('.tooltip-box');
					const tooltipTip = tooltip.shadowRoot.querySelector('.tip');
					const tooltipContent = tooltip.shadowRoot.querySelector('.tooltip-content');
					const tooltipAttrs = {
						tooltipBoxPositionLeftClass: tooltipBox.classList.contains('left'),
						foldingClassPresent: tooltipContent.classList.contains('folding'),
						tooltipTipPositionLeftClass: tooltipTip.classList.contains('left')
					};
					return tooltipAttrs;
				})
				.then(tooltipAttrs => {
					expect(tooltipAttrs.tooltipBoxPositionLeftClass).to.be.true;
					expect(tooltipAttrs.tooltipTipPositionLeftClass).to.be.true;
					expect(tooltipAttrs.foldingClassPresent).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create right tooltip', done => {
			global.nightmare
				.evaluate(() => {
					let tooltip = document.createElement('zoo-log-tooltip');
					tooltip.position = 'right';
					document.body.appendChild(tooltip);
					const tooltipBox = tooltip.shadowRoot.querySelector('.tooltip-box');
					const tooltipTip = tooltip.shadowRoot.querySelector('.tip');
					const tooltipAttrs = {
						tooltipBoxPositionRightClass: tooltipBox.classList.contains('right'),
						tooltipTipPositionRightClass: tooltipTip.classList.contains('right')
					};
					return tooltipAttrs;
				})
				.then(tooltipAttrs => {
					expect(tooltipAttrs.tooltipBoxPositionRightClass).to.be.true;
					expect(tooltipAttrs.tooltipTipPositionRightClass).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create bottom tooltip', done => {
			global.nightmare
				.evaluate(() => {
					let tooltip = document.createElement('zoo-log-tooltip');
					tooltip.position = 'bottom';
					document.body.appendChild(tooltip);
					const tooltipBox = tooltip.shadowRoot.querySelector('.tooltip-box');
					const tooltipTip = tooltip.shadowRoot.querySelector('.tip');
					const tooltipAttrs = {
						tooltipBoxPositionBottomClass: tooltipBox.classList.contains('bottom'),
						tooltipTipPositionBottomClass: tooltipTip.classList.contains('bottom')
					};
					return tooltipAttrs;
				})
				.then(tooltipAttrs => {
					expect(tooltipAttrs.tooltipBoxPositionBottomClass).to.be.true;
					expect(tooltipAttrs.tooltipTipPositionBottomClass).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create tooltip with slot', done => {
			global.nightmare
				.evaluate(() => {
					let tooltip = document.createElement('zoo-log-tooltip');
					let element = document.createElement('span');
					element.innerHTML = 'slotted';
					tooltip.appendChild(element);
					document.body.appendChild(tooltip);
					const slot = tooltip.shadowRoot.querySelector('slot');
					return slot.assignedNodes()[0].innerHTML;
				})
				.then(slottedElement => {
					expect(slottedElement).equal('slotted');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});