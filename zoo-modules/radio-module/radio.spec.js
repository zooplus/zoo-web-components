const chai = require('chai')
const expect = chai.expect;

describe('Zoo log radio', function() {
	this.timeout('5s');

	describe('Radio', () => {
		it('should accept 1 slot', done => {
			global.nightmare
				.evaluate(() => {
					let radio = document.createElement('zoo-log-radio');
					let element = document.createElement('input');
					element.type = 'radio';
					radio.appendChild(element);
					document.body.appendChild(radio);

					const slottedRadio = radio.shadowRoot.querySelector('slot').assignedNodes()[0];

					return {
						tagName: slottedRadio.tagName,
						type: slottedRadio.type
					};
				})
				.then(ret => {
					expect(ret.tagName).equal('INPUT');
					expect(ret.type).equal('radio')
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});