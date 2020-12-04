describe('Zoo toast', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async() => {
			document.body.innerHTML = `<zoo-toast id="toast" text="Search for more than 8.000 products." closelabel="close popup"></zoo-toast>`;
			document.querySelector('#toast').show();
			// wait for animation to finish
			await new Promise(res => {
				setTimeout(() => res(), 300);
			});
			return await axe.run('zoo-toast');
		});
		if (results.violations.length) {
			console.log('zoo-toast a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});