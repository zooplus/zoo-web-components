const chai = require('chai')
const expect = chai.expect;

describe('Zoo log header', function() {
	this.timeout('5s');

	describe('Header', () => {
		it('should create header text', done => {
			global.nightmare
				.evaluate(() => {
					let header = document.createElement('zoo-log-header');
					header.headertext = 'header-text';
					document.body.appendChild(header);
					const text = header.shadowRoot.querySelector('.app-name');
					return text.innerHTML;
				})
				.then(headerText => {
					expect(headerText).equal('header-text');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create image', done => {
			global.nightmare
				.evaluate(() => {
					let header = document.createElement('zoo-log-header');
					header.imgsrc = 'logo.png';
					document.body.appendChild(header);
					const image = header.shadowRoot.querySelector('img');
					return image.getAttribute('src');
				})
				.then(imageSrc => {
					expect(imageSrc).equal('logo.png');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
		it('should accept 1 slot', done => {
			global.nightmare
				.evaluate(() => {
					let header = document.createElement('zoo-log-header');
					let element = document.createElement('span');
					element.innerHTML = 'slotted';
					header.appendChild(element);
					document.body.appendChild(header);
					const slot = header.shadowRoot.querySelector('slot');
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