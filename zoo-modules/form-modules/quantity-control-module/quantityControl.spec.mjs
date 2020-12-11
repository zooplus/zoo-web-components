describe('Zoo quantity control', function() {
	it('should increase input value when plus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-quantity-control>
				<button type="button" slot="decrease">
					<svg height="18" width="18"><line y1="9" x1="0" x2="18" y2="9"></line></svg>
				</button>
				<input id="number-input" slot="input" readonly placeholder="0" type="number" step="50"/>
				<label for="number-input" slot="label">Label</label>
				<button type="button" slot="increase">
					<svg height="18" width="18">
						<line y1="0" x1="9" x2="9" y2="18"></line>
						<line y1="9" x1="0" x2="18" y2="9"></line>
					</svg>
				</button>
			</zoo-quantity-control>`;

			await new Promise(r => setTimeout(r, 10));

			const input = document.querySelector('zoo-quantity-control');
			const increaseBtn = input.shadowRoot.querySelector('slot[name="increase"]').assignedElements()[0];
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).toEqual('50');
	});

	it('should not increase input value when plus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-quantity-control>
				<button type="button" slot="decrease">
					<svg height="18" width="18"><line y1="9" x1="0" x2="18" y2="9"></line></svg>
				</button>
				<input id="number-input" slot="input" readonly placeholder="0" type="number" step="50"/>
				<label for="number-input" slot="label">Label</label>
				<button type="button" slot="increase" disabled>
					<svg height="18" width="18">
						<line y1="0" x1="9" x2="9" y2="18"></line>
						<line y1="9" x1="0" x2="18" y2="9"></line>
					</svg>
				</button>
			</zoo-quantity-control>`;

			await new Promise(r => setTimeout(r, 10));

			const input = document.querySelector('zoo-quantity-control');
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			slottedInput.value = 50;
			const increaseBtn = input.shadowRoot.querySelector('slot[name="increase"]').assignedElements()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).toEqual('50');
	});

	it('should decrease input value when minus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-quantity-control>
				<button type="button" slot="decrease">
					<svg height="18" width="18"><line y1="9" x1="0" x2="18" y2="9"></line></svg>
				</button>
				<input id="number-input" slot="input" readonly placeholder="0" type="number" step="50"/>
				<label for="number-input" slot="label">Label</label>
				<button type="button" slot="increase">
					<svg height="18" width="18">
						<line y1="0" x1="9" x2="9" y2="18"></line>
						<line y1="9" x1="0" x2="18" y2="9"></line>
					</svg>
				</button>
			</zoo-quantity-control>`;

			await new Promise(r => setTimeout(r, 10));

			const input = document.querySelector('zoo-quantity-control');
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			const decreaseBtn = input.shadowRoot.querySelector('slot[name="decrease"]').assignedElements()[0];
			decreaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).toEqual('-50');
	});

	it('should not decrease input value when minus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-quantity-control>
				<button type="button" slot="decrease" disabled>
					<svg height="18" width="18"><line y1="9" x1="0" x2="18" y2="9"></line></svg>
				</button>
				<input id="number-input" slot="input" readonly placeholder="0" type="number" step="50"/>
				<label for="number-input" slot="label">Label</label>
				<button type="button" slot="increase">
					<svg height="18" width="18">
						<line y1="0" x1="9" x2="9" y2="18"></line>
						<line y1="9" x1="0" x2="18" y2="9"></line>
					</svg>
				</button>
			</zoo-quantity-control>`;

			await new Promise(r => setTimeout(r, 10));

			const input = document.querySelector('zoo-quantity-control');
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			slottedInput.value = 50;
			const decreaseBtn = input.shadowRoot.querySelector('slot[name="decrease"]').assignedElements()[0];
			decreaseBtn.click();
			await new Promise(r => setTimeout(r, 10));
			
			return slottedInput.value;
		});
		expect(ret).toEqual('50');
	});

	it('should use default step of 1 when step is not defined', async() => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-quantity-control>
				<button type="button" slot="decrease">
					<svg height="18" width="18"><line y1="9" x1="0" x2="18" y2="9"></line></svg>
				</button>
				<input id="number-input" slot="input" readonly placeholder="0" type="number"/>
				<label for="number-input" slot="label">Label</label>
				<button type="button" slot="increase">
					<svg height="18" width="18">
						<line y1="0" x1="9" x2="9" y2="18"></line>
						<line y1="9" x1="0" x2="18" y2="9"></line>
					</svg>
				</button>
			</zoo-quantity-control>`;

			await new Promise(r => setTimeout(r, 10));

			const input = document.querySelector('zoo-quantity-control');
			const increaseBtn = input.shadowRoot.querySelector('slot[name="increase"]').assignedElements()[0];
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).toEqual('1');
	});
});