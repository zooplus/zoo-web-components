describe('Zoo segmented buttons', function() {
	it('should accept slot', async() => {
		const ret = await page.evaluate(() => {
			let cmp = document.createElement('zoo-segmented-buttons');
			let element = document.createElement('zoo-button');
			cmp.appendChild(element);
			document.body.appendChild(cmp);

			const slottedBtn = cmp.shadowRoot.querySelector('slot').assignedNodes()[0];

			return slottedBtn.tagName;
		});
		expect(ret).equal('ZOO-BUTTON');
	});

	it('should set empty attribute when no attribute is present', async() => {
		const ret = await page.evaluate(async () => {
			let cmp = document.createElement('zoo-segmented-buttons');
			let element = document.createElement('zoo-button');
			cmp.appendChild(element);
			document.body.appendChild(cmp);

			await new Promise(r => setTimeout(r, 10));

			const slottedBtn = cmp.shadowRoot.querySelector('slot').assignedNodes()[0];
			return slottedBtn.getAttribute('type');
		});
		expect(ret).equal('empty');
	});

	it('should change type when button is clicked', async() => {
		const ret = await page.evaluate(async () => {
			let cmp = document.createElement('zoo-segmented-buttons');
			let element = document.createElement('zoo-button');
			cmp.appendChild(element);
			document.body.appendChild(cmp);

			await new Promise(r => setTimeout(r, 10));
			const slottedBtn = cmp.shadowRoot.querySelector('slot').assignedNodes()[0];
			slottedBtn.click();

			return slottedBtn.getAttribute('type');
		});
		expect(ret).equal('primary');
	});

	it('should change types when button is clicked', async() => {
		const ret = await page.evaluate(async () => {
			let cmp = document.createElement('zoo-segmented-buttons');
			let element = document.createElement('zoo-button');
			let element2 = document.createElement('zoo-button');
			element2.type = 'primary';
			cmp.appendChild(element);
			cmp.appendChild(element2);
			document.body.appendChild(cmp);
			await new Promise(r => setTimeout(r, 10));

			const slottedBtn = cmp.shadowRoot.querySelector('slot').assignedNodes()[0];
			slottedBtn.click();

			const allBtns = cmp.shadowRoot.querySelector('slot').assignedNodes();
			return [allBtns[0].getAttribute('type'), allBtns[1].getAttribute('type')];
		});
		expect(ret[0]).equal('primary');
		expect(ret[1]).equal('empty');
	});
});