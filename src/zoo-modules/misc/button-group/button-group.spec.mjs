describe('Zoo button group', () => {
	it('should properly set initially active button', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-button-group active-type="primary" inactive-type="transparent">
					<zoo-button>
						<button type="button">First</button>
					</zoo-button>
					
					<zoo-button data-active>
						<button type="button">Second</button>
					</zoo-button>
				</zoo-button-group>
			`;
			const firstBtn = document.querySelector('zoo-button-group').shadowRoot.querySelector('slot').assignedElements()[0];
			const secondBtn = document.querySelector('zoo-button-group').shadowRoot.querySelector('slot').assignedElements()[1];
			await new Promise(r => setTimeout(r, 10));

			return {
				firstButtonType: firstBtn.getAttribute('type'),
				secondButtonType: secondBtn.getAttribute('type')
			};
		});
		expect(result.firstButtonType).toEqual('transparent');
		expect(result.secondButtonType).toEqual('primary');
	});

	it('should properly change active button', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-button-group active-type="primary" inactive-type="transparent">
					<zoo-button>
						<button type="button">First</button>
					</zoo-button>
					
					<zoo-button data-active>
						<button type="button">Second</button>
					</zoo-button>
				</zoo-button-group>
			`;
			await new Promise(r => setTimeout(r));
			const firstBtn = document.querySelector('zoo-button-group');
			const secondBtn = document.querySelector('zoo-button-group');
			await new Promise(r => setTimeout(r));

			firstBtn.shadowRoot.querySelector('slot').assignedElements()[0].shadowRoot.querySelector('slot').assignedElements()[0].click();

			return {
				firstButtonType: firstBtn.shadowRoot.querySelector('slot').assignedElements()[0].getAttribute('type'),
				secondButtonType: secondBtn.shadowRoot.querySelector('slot').assignedElements()[1].getAttribute('type')
			};
		});
		expect(result.firstButtonType).toEqual('primary');
		expect(result.secondButtonType).toEqual('transparent');
	});
});
