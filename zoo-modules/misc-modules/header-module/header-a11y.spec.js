describe('Zoo header', function() {
	it('should pass accessibility tests', async() => {
		await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-header headertext="Zooplus web components">
				<img slot="img" alt="Zooplus logo" src="logo.png"/>
				<div class="buttons-holder">
					<zoo-button id="zoo-theme" type="secondary">
						<button type="button">Zoo+ theme</button>
					</zoo-button>
					<zoo-button id="grey-theme">
						<button type="button">Grey theme</button>
					</zoo-button>
					<zoo-button id="random-theme">
						<button type="button">Random theme</button>
					</zoo-button>
				</div>
			</zoo-header>`;
		});
		// Inject and run axe-core
		const handle = await page.evaluateHandle(`
			${axe.source}
			axe.run('zoo-header')
		`);

		// Get the results from `axe.run()`.
		results = await handle.jsonValue();
		if (results.violations.length) {
			console.log('zoo-header a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
		// Destroy the handle & return axe results.
		await handle.dispose();
	});
});