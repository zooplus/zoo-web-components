describe('Zoo modal', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(async() => {
			document.body.innerHTML = `
			<zoo-modal id="modal" headertext="Your basket contains licensed items" closelabel="close modal">
				<div>some content</div>
			</zoo-modal>`;

			document.querySelector('#modal').openModal();
			// wait for animation to finish
			await new Promise(res => {
				setTimeout(() => res(), 300);
			});
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-modal')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-modal a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});