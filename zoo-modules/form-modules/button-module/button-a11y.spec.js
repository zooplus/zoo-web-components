const axe = require('axe-core');

describe('Zoo button', function () {
	describe('Button', () => {
		it('should create disabled button', async () => {
			await page.evaluate(() => {
				let zoobutton = document.createElement('zoo-button');
				zoobutton.id = 'button-id'
				let button = document.createElement('button');
				button.innerHTML = 'button-text';
				button.disabled = true;

				zoobutton.appendChild(button);
				document.body.appendChild(zoobutton);
			});
			// Inject and run axe-core
			const handle = await page.evaluateHandle(`
				${axe.source}
				axe.run('#button-id')
			`);

			// Get the results from `axe.run()`.
			results = await handle.jsonValue();
			if (results.violations.length) {
				console.log(results.violations);
				throw new Error('Accessibility issues found');
			}
			// Destroy the handle & return axe results.
			await handle.dispose();
		});
	});
});