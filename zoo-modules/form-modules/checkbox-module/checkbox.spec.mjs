describe('Zoo checkbox', function () {
	it('should create highlighted checkbox', async () => {
		const inputLabelText = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-checkbox>
				<input id="modal-checkbox" slot="checkbox" type="checkbox"/>
				<label for="modal-checkbox" slot="label">label-text</label>
			</zoo-checkbox>
			`;
			let checkbox = document.querySelector('zoo-checkbox');

			return checkbox.shadowRoot.querySelector('slot[name="label"]').assignedElements()[0].innerHTML;
		});
		expect(inputLabelText).toEqual('label-text');
	});

	it('should create normal checkbox', async () => {
		const style = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-checkbox>
					<input id="modal-checkbox" slot="checkbox" type="checkbox"/>
					<label for="modal-checkbox" slot="label">label-text</label>
				</zoo-checkbox>
			`;
			const root = document.querySelector('zoo-checkbox');
			const style = window.getComputedStyle(root);
			return {
				checkColor: style.getPropertyValue('--check-color').trim(),
				border: style.getPropertyValue('--border').trim()
			};
		});
		expect(style.checkColor).toEqual(colors.primaryMid);
		expect(style.border).toEqual('0');
	});

	it('should create highlighted checkbox', async () => {
		const style = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-checkbox highlighted>
					<input id="modal-checkbox" slot="checkbox" type="checkbox"/>
					<label for="modal-checkbox" slot="label">label-text</label>
				</zoo-checkbox>
			`;
			const root = document.querySelector('zoo-checkbox');
			const style = window.getComputedStyle(root);
			return {
				checkColor: style.getPropertyValue('--check-color').trim(),
				border: style.getPropertyValue('--border').trim()
			};
		});
		expect(style.checkColor).toEqual(colors.primaryMid);
		expect(style.border).toEqual(`1px solid  ${colors.primaryMid}`);
	});

	it('should create disabled checkbox', async () => {
		const style = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-checkbox highlighted>
					<input id="modal-checkbox" slot="checkbox" type="checkbox" disabled/>
					<label for="modal-checkbox" slot="label">label-text</label>
				</zoo-checkbox>
			`;
			const root = document.querySelector('zoo-checkbox');
			const style = window.getComputedStyle(root);
			await new Promise(r => setTimeout(r, 50)); // wait for internal callbacks to kick in
			return {
				checkColor: style.getPropertyValue('--check-color').trim(),
				border: style.getPropertyValue('--border').trim()
			};
		});
		expect(style.checkColor).toEqual('#767676');
		expect(style.border).toEqual('1px solid #767676');
	});

	it('should create invalid checkbox', async () => {
		const style = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-checkbox highlighted invalid>
					<input id="modal-checkbox" slot="checkbox" type="checkbox"/>
					<label for="modal-checkbox" slot="label">label-text</label>
				</zoo-checkbox>
			`;
			const root = document.querySelector('zoo-checkbox');
			const style = window.getComputedStyle(root);
			return {
				checkColor: style.getPropertyValue('--check-color').trim(),
				border: style.getPropertyValue('--border').trim()
			};
		});
		expect(style.checkColor).toEqual(colors.warningMid);
		expect(style.border).toEqual(`1px solid  ${colors.warningMid}`);
	});

	it('should set checked attribute on host when checkbox is checked', async () => {
		const checked = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-checkbox>
					<input id="modal-checkbox" slot="checkbox" type="checkbox"/>
					<label for="modal-checkbox" slot="label">label-text</label>
				</zoo-checkbox>
			`;
			const root = document.querySelector('zoo-checkbox');
			root.shadowRoot.querySelector('slot[name="checkbox"]').assignedElements()[0].click();
			await new Promise(r => setTimeout(r, 10));
			return root.hasAttribute('checked');
		});
		expect(checked).toBeTrue();
	});

	it('should set disabled attribute on host when checkbox is disabled', async () => {
		const disabled = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-checkbox>
					<input id="modal-checkbox" slot="checkbox" type="checkbox"/>
					<label for="modal-checkbox" slot="label">label-text</label>
				</zoo-checkbox>
			`;
			const root = document.querySelector('zoo-checkbox');
			await new Promise(r => setTimeout(r, 10));
			root.shadowRoot.querySelector('slot[name="checkbox"]').assignedElements()[0].disabled = true;
			await new Promise(r => setTimeout(r, 10));

			return root.hasAttribute('disabled');
		});
		expect(disabled).toBeTrue();
	});

	it('should set checked attribute when change event is dispatched on slotted checkbox', async () => {
		const checked = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-checkbox>
					<input id="modal-checkbox" slot="checkbox" type="checkbox" checked/>
					<label for="modal-checkbox" slot="label">label-text</label>
				</zoo-checkbox>
			`;
			const root = document.querySelector('zoo-checkbox');
			await new Promise(r => setTimeout(r, 10));
			root.shadowRoot.querySelector('slot[name="checkbox"]').assignedElements()[0].dispatchEvent(new Event('change'));
			await new Promise(r => setTimeout(r, 10));
			return root.hasAttribute('checked');
		});
		expect(checked).toBeTrue();
	});
});