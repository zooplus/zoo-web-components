const chai = require('chai')
const expect = chai.expect;

describe('Zoo log input', function() {
	this.timeout('5s');

	describe('Input', () => {
		it('should create input', done => {
			global.nightmare
				.evaluate(() => {
					let input = document.createElement('zoo-log-input');
					document.body.appendChild(input);
					const inputBox = input.shadowRoot.querySelector('.box');
					return {
						inputLabelPresent: inputBox.querySelector('.input-label') !== undefined,
						inputLinkPresent: inputBox.querySelector('.input-link') !== undefined,
						inputInfoPresent: inputBox.querySelector('.input-info') !== undefined
					};
				})
				.then(inputAttrs => {
					expect(inputAttrs.inputLabelPresent).to.be.true;
					expect(inputAttrs.inputLinkPresent).to.be.true;
					expect(inputAttrs.inputInfoPresent).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should pass attributes to input label component', done => {
			global.nightmare
				.evaluate(() => {
					let input = document.createElement('zoo-log-input');
					input.labeltext = 'label';
					input.valid = false;
					document.body.appendChild(input);
					const inputBox = input.shadowRoot.querySelector('.box');
					const label = inputBox.querySelector('.input-label').shadowRoot;
					return {
						labelText: label.querySelector('span').innerHTML,
						errorClassPresent: label.querySelector('.label').classList.contains('error')
					};
				})
				.then(labelAttrs => {
					expect(labelAttrs.labelText).equal('label');
					expect(labelAttrs.errorClassPresent).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should pass attributes to input link component', done => {
			global.nightmare
				.evaluate(() => {
					let input = document.createElement('zoo-log-input');
					input.linkhref = 'https://google.com';
					input.linktarget = '#';
					input.linktext = 'link-text';
					document.body.appendChild(input);
					const inputBox = input.shadowRoot.querySelector('.box');
					const link = inputBox.querySelector('.input-link').shadowRoot;
					const linkAnchor = link.querySelector('a');
					return {
						linkText: linkAnchor.innerHTML,
						linkTarget: linkAnchor.getAttribute('target'),
						linkHref: linkAnchor.getAttribute('href')
					};
				})
				.then(linkAttrs => {
					expect(linkAttrs.linkText).equal('link-text');
					expect(linkAttrs.linkHref).equal('https://google.com');
					expect(linkAttrs.linkTarget).equal('#');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should pass attributes to input info component', done => {
			global.nightmare
				.evaluate(() => {
					let input = document.createElement('zoo-log-input');
					input.infotext = 'info-text';
					input.inputerrormsg = 'errormsg';
					input.valid = false;
					document.body.appendChild(input);
					const inputBox = input.shadowRoot.querySelector('.box');
					const info = inputBox.querySelector('.input-info').shadowRoot;
					return {
						infoText: info.querySelector('.info-text').innerHTML,
						errorMsg: info.querySelector('.error-label').innerHTML
					};
				})
				.then(infoAttrs => {
					expect(infoAttrs.infoText).equal('info-text');
					expect(infoAttrs.errorMsg).equal('errormsg');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should accept 1 slot', done => {
			global.nightmare
				.evaluate(() => {
					let input = document.createElement('zoo-log-input');
					let element = document.createElement('input');
					element.slot = 'inputelement';
					input.appendChild(element);
					document.body.appendChild(input);

					const slottedInput = input.shadowRoot.querySelector('slot[name="inputelement"]').assignedNodes()[0];

					return {
						tagName: slottedInput.tagName 
					};
				})
				.then(ret => {
					expect(ret.tagName).equal('INPUT');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});