describe('Zoo modal', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async() => {
			document.body.innerHTML = `
			<zoo-modal id="modal" headertext="Your basket contains licensed items" closelabel="close modal">
				<div>some content</div>
			</zoo-modal>`;

			document.querySelector('#modal').openModal();
			// wait for animation to finish
			await new Promise(res => {
				setTimeout(() => res(), 300);
			});
			return await axe.run('zoo-modal');
		});
		if (results.violations.length) {
			console.log('zoo-modal a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});