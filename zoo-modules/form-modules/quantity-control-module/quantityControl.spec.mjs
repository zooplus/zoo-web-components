describe('Zoo quantity control', function() {
	it('should accept 1 slot', async() => {
		const ret = await page.evaluate(() => {
			let input = document.createElement('zoo-quantity-control');
			let element = document.createElement('input');
			element.type = 'number';
			element.slot = 'input';
			input.appendChild(element);
			document.body.appendChild(input);

			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedNodes()[0];

			return slottedInput.tagName;
		});
		expect(ret).toEqual('INPUT');
	});

	it('should increase input value when plus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			let input = document.createElement('zoo-quantity-control');
			let element = document.createElement('input');
			element.type = 'number';
			element.step = 50;
			element.slot = 'input';
			input.appendChild(element);
			document.body.appendChild(input);

			await new Promise(r => setTimeout(r, 10));

			const increaseBtn = input.shadowRoot.querySelectorAll('button')[1];
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedNodes()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).toEqual('50');
	});

	it('should not increase input value when plus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			let input = document.createElement('zoo-quantity-control');
			input.increasedisabled = 'true';
			let element = document.createElement('input');
			element.type = 'number';
			element.step = 50;
			element.slot = 'input';
			input.appendChild(element);
			document.body.appendChild(input);

			await new Promise(r => setTimeout(r, 10));

			const increaseBtn = input.shadowRoot.querySelectorAll('button')[1];
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedNodes()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).toEqual('');
	});

	it('should decrease input value when minus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			let input = document.createElement('zoo-quantity-control');
			let element = document.createElement('input');
			element.type = 'number';
			element.step = 50;
			element.slot = 'input';
			input.appendChild(element);
			document.body.appendChild(input);

			await new Promise(r => setTimeout(r, 10));

			const increaseBtn = input.shadowRoot.querySelectorAll('button')[0];
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedNodes()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).toEqual('-50');
	});

	it('should not decrease input value when minus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			let input = document.createElement('zoo-quantity-control');
			input.decreasedisabled = 'true';
			let element = document.createElement('input');
			element.type = 'number';
			element.step = 50;
			element.slot = 'input';
			input.appendChild(element);
			document.body.appendChild(input);

			await new Promise(r => setTimeout(r, 10));

			const increaseBtn = input.shadowRoot.querySelectorAll('button')[0];
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedNodes()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).toEqual('');
	});
});