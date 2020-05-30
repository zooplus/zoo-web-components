describe('Zoo footer', function() {
	describe('Footer', () => {
		it('should create two links given array of two', async() => {
			const linksLength = await page.evaluate(() => {
				let footer = document.createElement('zoo-footer');
				const link1 = document.createElement('zoo-link');
				link1.href = 'https://google.com';
				link1.text = 'About us';
				footer.appendChild(link1);
				const link2 = document.createElement('zoo-link');
				link2.href = 'https://google.com';
				link2.text = 'About us';
				footer.appendChild(link2);
				document.body.appendChild(footer);
				const linkSlot = footer.shadowRoot.querySelector('slot');
				return linkSlot.assignedNodes().length;
			});
			expect(linksLength).equal(2);
		});
	});
});