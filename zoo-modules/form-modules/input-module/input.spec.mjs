describe('Zoo input', function () {
	it('should create input', async () => {
		const inputAttrs = await page.evaluate(() => {
			let input = document.createElement('zoo-input');
			document.body.appendChild(input);
			return {
				inputLabelPresent: input.shadowRoot.querySelector('zoo-label') !== undefined,
				inputLinkPresent: input.shadowRoot.querySelector('a') !== undefined,
				inputInfoPresent: input.shadowRoot.querySelector('zoo-info') !== undefined
			};
		});
		expect(inputAttrs.inputLabelPresent).toBeTrue();
		expect(inputAttrs.inputLinkPresent).toBeTrue();
		expect(inputAttrs.inputInfoPresent).toBeTrue();
	});

	it('should pass attributes to input label component', async () => {
		const labelText = await page.evaluate(() => {
			document.body.innerHTML = `
					<zoo-input>
						<input id="input-type-text" slot="input" type="text" placeholder="input"/>
						<label for="input-type-text" slot="label">label</label>
					</zoo-input>
				`;
			let input = document.querySelector('zoo-input');
			const label = input.shadowRoot.querySelector('slot[name="label"]').assignedNodes()[0];
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
					<zoo-info slot="info">
						Possible values: Dog, Cat, Small Pet, Bird, Aquatic
					</zoo-info>
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

	it('should accept 1 slot', async () => {
		const ret = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-input>
					<input id="input-type-number" slot="input" placeholder="input" list="animals"/>
					<label for="input-type-number" slot="label">Autocomplete</label>
					<zoo-info slot="info">
						Possible values: Dog, Cat, Small Pet, Bird, Aquatic
					</zoo-info>
					<zoo-link slot="link">
						<a slot="anchor" href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist" target="about:blank">Learn your HTML and don't overcomplicate</a>
					</zoo-link>
				</zoo-input>
				`;
			let input = document.querySelector('zoo-input');

			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedNodes()[0];

			return {
				tagName: slottedInput.tagName
			};
		});
		expect(ret.tagName).toEqual('INPUT');
	});
});