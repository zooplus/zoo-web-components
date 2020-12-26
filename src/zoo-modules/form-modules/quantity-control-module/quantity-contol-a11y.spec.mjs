describe('Zoo quantity control', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-quantity-control>
				<button type="button" slot="decrease" title="decrease">
					<svg height="18" width="18"><line y1="9" x1="0" x2="18" y2="9"></line></svg>
				</button>
				<input id="number-input" slot="input" readonly placeholder="0" type="number" step="50"/>
				<label for="number-input" slot="label">Label</label>
				<button type="button" slot="increase" title="increase">
					<svg height="18" width="18">
						<line y1="0" x1="9" x2="9" y2="18"></line>
						<line y1="9" x1="0" x2="18" y2="9"></line>
					</svg>
				</button>
			</zoo-quantity-control>`;
			return await axe.run('zoo-quantity-control');
		});
		if (results.violations.length) {
			console.log('zoo-quantity-control a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});