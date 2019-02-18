const chai = require('chai')
const expect = chai.expect;

describe('Zoo log footer', function() {
	this.timeout('5s');

	describe('Footer', () => {
		it('should create two links given array of two', done => {
			global.nightmare
				.evaluate(() => {
					let footer = document.createElement('zoo-log-footer');
					footer.footerlinks = [{
						href: 'https://google.com',
						text: 'About us',
						type: 'standard'
					},{
						href: 'https://google.com',
						text: 'Careers',
						type: 'standard'
					}];
					document.body.appendChild(footer);
					const links = footer.shadowRoot.querySelectorAll('zoo-log-link');
					return links.length;
				})
				.then(linksLength => {
					expect(linksLength).equal(2);
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});