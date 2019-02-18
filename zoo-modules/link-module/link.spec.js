const chai = require('chai')
const expect = chai.expect;

describe('Zoo log link', function() {
	this.timeout('5s');

	describe('Link', () => {
		it('should create default empty link', done => {
			global.nightmare
				.evaluate(() => {
					let link = document.createElement('zoo-log-link');
					document.body.appendChild(link);
					const linkBox = link.shadowRoot.querySelector('.link-box');
					const linkAttrs = {
						linkBox: linkBox
					};
					return linkAttrs;
				})
				.then(linkAttrs => {
					expect(linkAttrs.linkBox).to.be.null;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create default link', done => {
			global.nightmare
				.evaluate(() => {
					let link = document.createElement('zoo-log-link');
					link.text = 'test-text';
					link.href = 'https://google.com';
					document.body.appendChild(link);
					const anchor = link.shadowRoot.querySelector('a');
					const linkAttrs = {
						anchorTarget: anchor.target,
						anchorHref: anchor.href,
						anchorTypeStandard: anchor.classList.contains('standard'),
						anchorDisabledClass: anchor.classList.contains('disabled'),
						anchorStyles: anchor.style
					};
					return linkAttrs;
				})
				.then(linkAttrs => {
					expect(linkAttrs.anchorTarget).equal('about:blank');
					expect(linkAttrs.anchorHref).equal('https://google.com/');
					expect(linkAttrs.anchorTypeStandard).to.be.true;
					expect(linkAttrs.anchorDisabledClass).to.be.false;
					expect(linkAttrs.anchorStyles.textAlign).equal('center');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});