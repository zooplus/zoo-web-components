describe('Zoo link', function () {
	it('should create default empty link', async () => {
		const linkAttrs = await page.evaluate(() => {
			let link = document.createElement('zoo-link');
			document.body.appendChild(link);
			const linkBox = link.shadowRoot.querySelector('.link-box');
			const linkAttrs = {
				linkBox: linkBox
			};
			return linkAttrs;
		});
		expect(linkAttrs.linkBox).toBeNull();
	});
});