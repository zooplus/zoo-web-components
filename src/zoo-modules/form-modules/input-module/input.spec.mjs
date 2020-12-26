describe('Zoo input', function () {
	it('should pass attributes to input label component', async () => {
		const labelText = await page.evaluate(() => {
			document.body.innerHTML = `
					<zoo-input>
						<input id="input-type-text" slot="input" type="text" placeholder="input"/>
						<label for="input-type-text" slot="label">label</label>
					</zoo-input>
				`;
			let input = document.querySelector('zoo-input');
			const label = input.shadowRoot.querySelector('slot[name="label"]').assignedElements()[0];
			return label.innerHTML;
		});
		expect(labelText).toEqual('label');
	});

	it('should render input link', async () => {
		const linkAttrs = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-input>
					<input id="input-type-number" slot="input" placeholder="input" list="animals"/>
					<label for="input-type-number" slot="label">Autocomplete</label>
					<span slot="info">Possible values: Dog, Cat, Small Pet, Bird, Aquatic</span>
					<a slot="link" href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist" target="about:blank">Learn your HTML and don't overcomplicate</a>
				</zoo-input>
				`;
			let input = document.querySelector('zoo-input');
			const linkAnchor = input.shadowRoot.querySelector('slot[name="link"]').assignedElements()[0];
			return {
				linkText: linkAnchor.innerHTML,
				linkTarget: linkAnchor.getAttribute('target'),
				linkHref: linkAnchor.getAttribute('href')
			};
		});
		expect(linkAttrs.linkText).toEqual('Learn your HTML and don\'t overcomplicate');
		expect(linkAttrs.linkHref).toEqual('https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist');
		expect(linkAttrs.linkTarget).toEqual('about:blank');
	});

	it('should render input error', async () => {
		const errorDisplay = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input invalid>
					<input id="input-type-number" slot="input" placeholder="input"/>
					<label for="input-type-number" slot="label">Autocomplete</label>
					<span slot="error">error</span>
				</zoo-input>
				`;
			let input = document.querySelector('zoo-input');
			await new Promise(r => setTimeout(r, 10));
			const error = input.shadowRoot.querySelector('.error');
			return window.getComputedStyle(error).display;
		});
		expect(errorDisplay).toEqual('flex');
	});

	it('should not render input error', async () => {
		const errorDisplay = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input>
					<input id="input-type-number" slot="input" placeholder="input"/>
					<label for="input-type-number" slot="label">Autocomplete</label>
					<span slot="error">error</span>
				</zoo-input>
				`;
			let input = document.querySelector('zoo-input');
			await new Promise(r => setTimeout(r, 10));
			const error = input.shadowRoot.querySelector('.error');
			return window.getComputedStyle(error).display;
		});
		expect(errorDisplay).toEqual('none');
	});

	it('should set and then remove invalid attribute from host', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input>
					<input id="input" slot="input" pattern="[A-Za-z ]+"/>
					<label for="input" slot="label">Input</label>
					<span slot="error">error</span>
				</zoo-input>
				`;
			const result = [];
			let input = document.querySelector('zoo-input');
			await new Promise(r => setTimeout(r, 10));
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			slottedInput.value = 123;
			slottedInput.dispatchEvent(new Event('change'));
			await new Promise(r => setTimeout(r, 10));
			result.push(input.hasAttribute('invalid'));

			slottedInput.value = 'asd';
			slottedInput.dispatchEvent(new Event('change'));
			await new Promise(r => setTimeout(r, 10));
			result.push(input.hasAttribute('invalid'));

			return result;
		});
		expect(result[0]).toBeTrue();
		expect(result[1]).toBeFalse();
	});
});