describe('Zoo log footer', function() {
	describe('Footer', () => {
		it('should create two links given array of two', async() => {
			const linksLength = await page.evaluate(() => {
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
			});
			expect(linksLength).equal(2);
		});
	});
});