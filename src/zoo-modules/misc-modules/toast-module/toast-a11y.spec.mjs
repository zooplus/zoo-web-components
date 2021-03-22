describe('Zoo toast', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async() => {
			document.body.innerHTML = `<zoo-toast closelabel="close popup">
				<span slot="content">Search for more than 8.000 products.</span>
			</zoo-toast>`;
			document.querySelector('zoo-toast').show();
			// wait for animation to finish
			await new Promise(res => setTimeout(() => res(), 330));
			return await axe.run('zoo-toast');
		});
		if (results.violations.length) {
			console.log('zoo-toast a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});