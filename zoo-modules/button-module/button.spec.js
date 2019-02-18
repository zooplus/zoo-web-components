const chai = require('chai')
const expect = chai.expect;

describe('Zoo log button', function() {
	this.timeout('5s');

	describe('Button', () => {
		it('should create cold button', done => {
			global.nightmare
				.evaluate(() => {
					let button = document.createElement('zoo-log-button');
					button.type = 'cold';
					document.body.appendChild(button);
					const nestedButton = button.shadowRoot.querySelector('button');
					return nestedButton.classList.contains('cold');
				})
				.then(containsColdClass => {
					expect(containsColdClass).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
		it('should create hot button', done => {
			global.nightmare
				.evaluate(() => {
					let button = document.createElement('zoo-log-button');
					button.type = 'hot';
					document.body.appendChild(button);
					const nestedButton = button.shadowRoot.querySelector('button');
					return nestedButton.classList.contains('hot');
				})
				.then(containsHotClass => {
					expect(containsHotClass).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
		it('should create small button', done => {
			global.nightmare
				.evaluate(() => {
					let button = document.createElement('zoo-log-button');
					button.size = 'small';
					document.body.appendChild(button);
					const nestedButton = button.shadowRoot.querySelector('button');
					return nestedButton.classList.contains('small');
				})
				.then(containsSmallClass => {
					expect(containsSmallClass).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
		it('should create medium button', done => {
			global.nightmare
				.evaluate(() => {
					let button = document.createElement('zoo-log-button');
					button.size = 'medium';
					document.body.appendChild(button);
					const nestedButton = button.shadowRoot.querySelector('button');
					return nestedButton.classList.contains('medium');
				})
				.then(containsMediumClass => {
					expect(containsMediumClass).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
		it('should create big button', done => {
			global.nightmare
				.evaluate(() => {
					let button = document.createElement('zoo-log-button');
					button.size = 'big';
					document.body.appendChild(button);
					const nestedButton = button.shadowRoot.querySelector('button');
					return nestedButton.classList.contains('big');
				})
				.then(containsBigClass => {
					expect(containsBigClass).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create disabled button', done => {
			global.nightmare
				.evaluate(() => {
					let button = document.createElement('zoo-log-button');
					button.disabled = true;
					document.body.appendChild(button);
					const nestedButton = button.shadowRoot.querySelector('button');
					return nestedButton.getAttribute('disabled');
				})
				.then(disabledAttr => {
					expect(disabledAttr).equal('');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create button with default attributes', done => {
			global.nightmare
				.evaluate(() => {
					let button = document.createElement('zoo-log-button');
					document.body.appendChild(button);
					const nestedButton = button.shadowRoot.querySelector('button');
					const defaultAttrs = {};
					defaultAttrs.disabled = nestedButton.getAttribute('disabled');
					defaultAttrs.smallSize = nestedButton.classList.contains('small');
					defaultAttrs.coldType = nestedButton.classList.contains('cold');
					return defaultAttrs;
				})
				.then(defaultAttrs => {
					expect(defaultAttrs.disabled).to.be.null;
					expect(defaultAttrs.smallSize).to.be.true;
					expect(defaultAttrs.coldType).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});