const chai = require('chai')
const expect = chai.expect;

describe('Zoo log modal', function() {
	this.timeout('5s');

	describe('Modal', () => {
		it('should create opened modal', done => {
			global.nightmare
				.evaluate(() => {
					let modal = document.createElement('zoo-log-modal');
					modal.headertext = 'header-text';
					modal.style.display = 'block';
					document.body.appendChild(modal);
					const modalBox = modal.shadowRoot.querySelector('.box');

					return {
						modalHeadingText: modalBox.querySelector('h2').innerHTML
					};
				})
				.then(modalAttrs => {
					expect(modalAttrs.modalHeadingText).equal('header-text');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create opened modal and close it', done => {
			global.nightmare
				.evaluate(done => {
					let modal = document.createElement('zoo-log-modal');
					modal.headertext = 'header-text';
					modal.style.display = 'block';
					document.body.appendChild(modal);

					setTimeout(
						() => {
							const closeButton = modal.shadowRoot.querySelector('.close');
							closeButton.click();
							done(null, modal.shadowRoot.host.style.display);
						},
						10
					);
				})
				.then(modalDisplay => {
					expect(modalDisplay).equal('none');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should accept 1 slot', done => {
			global.nightmare
				.evaluate(() => {
					let modal = document.createElement('zoo-log-modal');
					let element = document.createElement('span');
					element.innerHTML = 'some test text';
					modal.appendChild(element);
					document.body.appendChild(modal);

					const slottedContent = modal.shadowRoot.querySelector('slot').assignedNodes()[0];

					for (const element of document.getElementsByTagName('zoo-log-modal')) {
						element.remove();
					}

					return {
						slottedText: slottedContent.innerHTML
					};
				})
				.then(ret => {
					expect(ret.slottedText).equal('some test text');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});