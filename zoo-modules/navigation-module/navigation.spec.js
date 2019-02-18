const chai = require('chai')
const expect = chai.expect;

describe('Zoo log navigation', function() {
	this.timeout('5s');

	describe('Navigation', () => {
		it('should create nav element with slotted element', done => {
			global.nightmare
				.evaluate(() => {
					let nav = document.createElement('zoo-log-navigation');
					let element = document.createElement('span');
					element.innerHTML = 'slotted';
					nav.appendChild(element);
					document.body.appendChild(nav);
					const slot = nav.shadowRoot.querySelector('slot');
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