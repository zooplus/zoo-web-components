const chai = require('chai')
const expect = chai.expect;

describe('Zoo log input label', function() {
	this.timeout('5s');

	describe('InputLabel', () => {
		it('should create label text', done => {
			global.nightmare
				.evaluate(() => {
					let inputInfo = document.createElement('zoo-log-input-label');
					inputInfo.labeltext = 'label-text';
					document.body.appendChild(inputInfo);
					const text = inputInfo.shadowRoot.querySelector('.label');
					return text.innerHTML;
				})
				.then(infoText => {
					expect(infoText).to.have.string('label-text');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should apply error class', done => {
			global.nightmare
				.evaluate(() => {
					let inputInfo = document.createElement('zoo-log-input-label');
					inputInfo.labeltext = 'text';
					inputInfo.valid = false;
					document.body.appendChild(inputInfo);
					const labelEl = inputInfo.shadowRoot.querySelector('.label');
					return {
						containsErrorClass: labelEl.classList.contains('error')
					};
				})
				.then(inputLabelErrorAttrs => {
					expect(inputLabelErrorAttrs.containsErrorClass).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});