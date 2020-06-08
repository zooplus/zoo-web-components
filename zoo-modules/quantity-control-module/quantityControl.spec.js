describe('Zoo quantity control', function() {
	it('should accept 1 slot', async() => {
		const ret = await page.evaluate(() => {
			let input = document.createElement('zoo-quantity-control');
			let element = document.createElement('input');
			element.type = 'number';
			input.appendChild(element);
			document.body.appendChild(input);

			const slottedInput = input.shadowRoot.querySelector('.control slot').assignedNodes()[0];

			return slottedInput.tagName;
		});
		expect(ret).equal('INPUT');
	});

	it('should pass attributes to input info component', async() => {
		const infoAttrs = await page.evaluate(() => {
			let input = document.createElement('zoo-quantity-control');
			input.infotext = 'info-text';
			input.inputerrormsg = 'errormsg';
			input.valid = false;
			document.body.appendChild(input);
			const info = input.shadowRoot.querySelector('zoo-input-info').shadowRoot;
			return {
				infoText: info.querySelector('.info').innerHTML,
				errorMsg: info.querySelector('.error').innerHTML
			};
		});
		expect(infoAttrs.infoText.indexOf('info-text')).not.equal(-1);
		expect(infoAttrs.errorMsg.indexOf('errormsg')).not.equal(-1);
	});

	it('should pass attributes to input label component', async() => {
		const labelAttrs = await page.evaluate(() => {
			let input = document.createElement('zoo-quantity-control');
			input.labeltext = 'label';
			input.valid = false;
			document.body.appendChild(input);
			const label = input.shadowRoot.querySelector('zoo-input-label').shadowRoot;
			return {
				labelText: label.querySelector('label').innerHTML
			};
		});
		expect(labelAttrs.labelText).equal('label');
	});

	it('should increase input value when plus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			let input = document.createElement('zoo-quantity-control');
			let element = document.createElement('input');
			element.type = 'number';
			element.step = 50;
			input.appendChild(element);
			document.body.appendChild(input);

			await new Promise(r => setTimeout(r, 10));

			const increaseBtn = input.shadowRoot.querySelectorAll('button')[1];
			const slottedInput = input.shadowRoot.querySelector('.control slot').assignedNodes()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).equal('50');
	});

	it('should not increase input value when plus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			let input = document.createElement('zoo-quantity-control');
			input.increasedisabled = "true";
			let element = document.createElement('input');
			element.type = 'number';
			element.step = 50;
			input.appendChild(element);
			document.body.appendChild(input);

			await new Promise(r => setTimeout(r, 10));

			const increaseBtn = input.shadowRoot.querySelectorAll('button')[1];
			const slottedInput = input.shadowRoot.querySelector('.control slot').assignedNodes()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).equal('');
	});

	it('should decrease input value when minus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			let input = document.createElement('zoo-quantity-control');
			let element = document.createElement('input');
			element.type = 'number';
			element.step = 50;
			input.appendChild(element);
			document.body.appendChild(input);

			await new Promise(r => setTimeout(r, 10));

			const increaseBtn = input.shadowRoot.querySelectorAll('button')[0];
			const slottedInput = input.shadowRoot.querySelector('.control slot').assignedNodes()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).equal('-50');
	});

	it('should not decrease input value when minus is clicked', async() => {
		const ret = await page.evaluate(async () => {
			let input = document.createElement('zoo-quantity-control');
			input.decreasedisabled = "true";
			let element = document.createElement('input');
			element.type = 'number';
			element.step = 50;
			input.appendChild(element);
			document.body.appendChild(input);

			await new Promise(r => setTimeout(r, 10));

			const increaseBtn = input.shadowRoot.querySelectorAll('button')[0];
			const slottedInput = input.shadowRoot.querySelector('.control slot').assignedNodes()[0];
			increaseBtn.click();
			
			return slottedInput.value;
		});
		expect(ret).equal('');
	});
});