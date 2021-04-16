describe('Zoo tooltip', function () {
	it('should create default tooltip', async () => {
		const tooltipText = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-button>
					<button type="button">
						Button
						<zoo-tooltip position="bottom"><span>some-text</span></zoo-tooltip>
					</button>
				</zoo-button>
				`;
			let tooltip = document.querySelector('zoo-tooltip');
			const tooltiptext = tooltip.shadowRoot.querySelector('slot').assignedNodes()[0];
			return tooltiptext.innerHTML;
		});
		expect(tooltipText).toEqual('some-text');
	});
});