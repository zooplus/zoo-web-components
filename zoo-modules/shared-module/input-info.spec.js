const chai = require('chai')
const expect = chai.expect;

describe('Zoo log input info', function() {
	this.timeout('5s');

	describe('InputInfo', () => {
		it('should create info text', done => {
			global.nightmare
				.evaluate(() => {
					let inputInfo = document.createElement('zoo-log-input-info');
					inputInfo.infotext = 'input-text';
					document.body.appendChild(inputInfo);
					const text = inputInfo.shadowRoot.querySelector('.info');
					return text.innerHTML;
				})
				.then(infoText => {
					expect(infoText).to.have.string('input-text');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should render error text', done => {
			global.nightmare
				.evaluate(() => {
					let inputInfo = document.createElement('zoo-log-input-info');
					inputInfo.valid = false;
					inputInfo.inputerrormsg = 'error';
					document.body.appendChild(inputInfo);
					const errorIcon = inputInfo.shadowRoot.querySelector('.exclamation-circle');
					const errorMsg = inputInfo.shadowRoot.querySelector('.error-label');
					return {
						errorIconPresent: errorIcon !== undefined,
						errorMsg: errorMsg.innerHTML
					};
				})
				.then(inputInfoErrorAttrs => {
					expect(inputInfoErrorAttrs.errorIconPresent).to.be.true;
					expect(inputInfoErrorAttrs.errorMsg).equal('error');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});