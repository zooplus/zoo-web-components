describe('Zoo input tag', function () {
	it('should render input error', async () => {
		const errorDisplay = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input-tag invalid>
					<label for="input-tag" slot="label">Tag input</label>
					<input id="input-tag" slot="input" placeholder="Type a tag name"/>
					<span slot="error">At least one tag should be selected!</span>
					<select slot="select" multiple required>
						<option value="Dog"></option>
					</select>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Dog" tabindex="0">
							<span slot="content">Dog</span>
						</zoo-tag>
						<span slot="description">The domestic dog (Canis familiaris or Canis lupus familiaris)[4] is a domesticated descendant of the wolf.</span>
					</zoo-input-tag-option>
				</zoo-input-tag>
				`;
			let input = document.querySelector('zoo-input-tag');
			await new Promise(r => setTimeout(r, 10));
			const error = input.shadowRoot.querySelector('zoo-info[role="alert"]');
			return window.getComputedStyle(error).display;
		});
		expect(errorDisplay).toEqual('flex');
	});

	it('should not render input error', async () => {
		const errorDisplay = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input-tag>
					<label for="input-tag" slot="label">Tag input</label>
					<input id="input-tag" slot="input" placeholder="Type a tag name"/>
					<span slot="error">At least one tag should be selected!</span>
					<select slot="select" multiple required>
						<option value="Dog"></option>
					</select>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Dog" tabindex="0">
							<span slot="content">Dog</span>
						</zoo-tag>
						<span slot="description">The domestic dog (Canis familiaris or Canis lupus familiaris)[4] is a domesticated descendant of the wolf.</span>
					</zoo-input-tag-option>
				</zoo-input-tag>
				`;
			let input = document.querySelector('zoo-input-tag');
			await new Promise(r => setTimeout(r, 10));
			const error = input.shadowRoot.querySelector('zoo-info[role="alert"]');
			return window.getComputedStyle(error).display;
		});
		expect(errorDisplay).toEqual('none');
	});

	it('should show and then hide tags on input', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input-tag>
					<label for="input-tag" slot="label">Tag input</label>
					<input id="input-tag" slot="input" placeholder="Type a tag name"/>
					<span slot="error">At least one tag should be selected!</span>
					<select slot="select" multiple required>
						<option value="Dog"></option>
					</select>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Dog" tabindex="0">
							<span slot="content">Dog</span>
						</zoo-tag>
						<span slot="description">The domestic dog (Canis familiaris or Canis lupus familiaris)[4] is a domesticated descendant of the wolf.</span>
					</zoo-input-tag-option>
				</zoo-input-tag>
				`;
			await new Promise(r => setTimeout(r, 10));
			let input = document.querySelector('zoo-input-tag');
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			slottedInput.value = 123;
			slottedInput.dispatchEvent(new Event('input'));
			await new Promise(r => setTimeout(r, 10));
			const tagOptions = input.shadowRoot.getElementById('tag-options');
			const tagOptionsDisplayWithInputValue = window.getComputedStyle(tagOptions).display;
			const showTagsAttrPresentWithInputValue = input.hasAttribute('show-tags');

			slottedInput.value = '';
			slottedInput.dispatchEvent(new Event('input'));
			await new Promise(r => setTimeout(r, 10));
			const tagOptionsDisplayWithoutInputValue = window.getComputedStyle(tagOptions).display;
			const showTagsAttrPresentWithoutInputValue = input.hasAttribute('show-tags');

			return {
				showTagsAttrPresentWithInputValue,
				tagOptionsDisplayWithInputValue,
				showTagsAttrPresentWithoutInputValue,
				tagOptionsDisplayWithoutInputValue
			};
		});
		expect(ret.showTagsAttrPresentWithInputValue).toBeTrue();
		expect(ret.tagOptionsDisplayWithInputValue).toEqual('flex');
		expect(ret.showTagsAttrPresentWithoutInputValue).toBeFalse();
		expect(ret.tagOptionsDisplayWithoutInputValue).toEqual('none');
	});

	it('should set and then remove invalid attribute from host while setting the value in the slotted select', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input-tag>
					<label for="input-tag" slot="label">Tag input</label>
					<input id="input-tag" slot="input" placeholder="Type a tag name"/>
					<span slot="error">At least one tag should be selected!</span>
					<select slot="select" multiple required>
						<option value="Dog"></option>
					</select>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Dog" tabindex="0">
							<span slot="content">Dog</span>
						</zoo-tag>
						<span slot="description">The domestic dog (Canis familiaris or Canis lupus familiaris)[4] is a domesticated descendant of the wolf.</span>
					</zoo-input-tag-option>
				</zoo-input-tag>
				`;
			const result = {};
			let input = document.querySelector('zoo-input-tag');
			await new Promise(r => setTimeout(r, 10));
			result.initialInvalid = input.hasAttribute('invalid');
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			slottedInput.value = 123;
			slottedInput.dispatchEvent(new Event('input'));
			await new Promise(r => setTimeout(r, 10));
			const zooInputTagOption = document.querySelector('zoo-input-tag-option');
			zooInputTagOption.click();
			await new Promise(r => setTimeout(r, 10));
			result.selectValueAfterClick = document.querySelector('select').value;
			result.inputValueAfterClick = slottedInput.value;

			input.shadowRoot.querySelector('zoo-cross-icon').click();
			await new Promise(r => setTimeout(r, 10));
			result.invalidAfterCrossClick = input.hasAttribute('invalid');
			result.selectValueAfterCrossClick = document.querySelector('select').value;

			return result;
		});
		expect(result.initialInvalid).toBeFalse();
		expect(result.selectValueAfterClick).toEqual('Dog');
		expect(result.inputValueAfterClick).toEqual('');
		expect(result.invalidAfterCrossClick).toBeTrue();
		expect(result.selectValueAfterCrossClick).toEqual('');
	});
});