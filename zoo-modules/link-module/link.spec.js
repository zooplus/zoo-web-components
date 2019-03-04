describe('Zoo log link', function() {
	describe('Link', () => {
		it('should create default empty link', async() => {
			const linkAttrs = await page.evaluate(() => {
				let link = document.createElement('zoo-log-link');
				document.body.appendChild(link);
				const linkBox = link.shadowRoot.querySelector('.link-box');
				const linkAttrs = {
					linkBox: linkBox
				};
				return linkAttrs;
			});
			expect(linkAttrs.linkBox).to.be.null;
		});

		it('should create default link', async() => {
			const linkAttrs = await page.evaluate(() => {
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
					anchorTextAlign: anchor.style.textAlign
				};
				return linkAttrs;
			});
			expect(linkAttrs.anchorTarget).equal('about:blank');
			expect(linkAttrs.anchorHref).equal('https://google.com/');
			expect(linkAttrs.anchorTypeStandard).to.be.true;
			expect(linkAttrs.anchorDisabledClass).to.be.false;
			expect(linkAttrs.anchorTextAlign).equal('center');
		});
	});
});