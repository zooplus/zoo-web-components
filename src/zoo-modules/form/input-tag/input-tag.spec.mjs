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

	it('should render component with initial values', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input-tag data-initial-value="Dog">
					<label for="input-tag" slot="label">Tag input</label>
					<input id="input-tag" slot="input" placeholder="Type a tag name"/>
					<span slot="error">At least one tag should be selected!</span>
					<select slot="select" multiple required>
						<option value="Dog"></option>
						<option value="Cat"></option>
					</select>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Dog" tabindex="0">
							<span slot="content">Dog</span>
						</zoo-tag>
						<span slot="description">The domestic dog (Canis familiaris or Canis lupus familiaris)[4] is a domesticated descendant of the wolf.</span>
					</zoo-input-tag-option>
					<zoo-input-tag-option slot="tag-option" id="cat-tag">
                        <zoo-tag slot="tag" type="cloud" data-value="Cat" tabindex="0">
                            <span slot="content">Cat</span>
                        </zoo-tag>
                        <span slot="description">The cat (Felis catus) is a domestic species of small carnivorous mammal.</span>
                    </zoo-input-tag-option>
				</zoo-input-tag>
				`;
			const options = [...document.querySelectorAll('option')];
			await new Promise(r => setTimeout(r, 10));

			const input = document.querySelector('zoo-input-tag');
			let selectedTags = []
			input.shadowRoot.querySelectorAll('#input-wrapper zoo-tag').forEach(el=> selectedTags.push(el.textContent.trim()));
			const optionsStatus = options.filter((option) => option.hasAttribute('selected')).map(option => option.value);
			return {
				optionsStatus,
				selectedTags
			}
		});
		expect(ret.optionsStatus).toEqual(['Dog']);
		expect(ret.optionsStatus).not.toContain('Cat');
		expect(ret.selectedTags).toContain('Dog');
		expect(ret.selectedTags).not.toContain('Cat');
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

	it('should remove selected tag after clicking cross icon', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input-tag data-initial-value="Dog">
					<label for="input-tag" slot="label">Tag input</label>
					<input id="input-tag" slot="input" placeholder="Type a tag name"/>
					<span slot="error">At least one tag should be selected!</span>
					<select slot="select" multiple required>
						<option value="Dog"></option>
						<option value="Cat"></option>
					</select>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Dog" tabindex="0">
							<span slot="content">Dog</span>
						</zoo-tag>
						<span slot="description">The domestic dog (Canis familiaris or Canis lupus familiaris)[4] is a domesticated descendant of the wolf.</span>
					</zoo-input-tag-option>
					<zoo-input-tag-option slot="tag-option" id="cat-tag">
                        <zoo-tag slot="tag" type="cloud" data-value="Cat" tabindex="0">
                            <span slot="content">Cat</span>
                        </zoo-tag>
                        <span slot="description">The cat (Felis catus) is a domestic species of small carnivorous mammal.</span>
                    </zoo-input-tag-option>
				</zoo-input-tag>
				`;
			const input = document.querySelector('zoo-input-tag');
			const options = [...document.querySelectorAll('option')];
			await new Promise(r => setTimeout(r, 10));

			input.shadowRoot.querySelector('#input-wrapper zoo-tag zoo-cross-icon').click()
			await new Promise(r => setTimeout(r, 10));

			let selectedTags = []
			input.shadowRoot.querySelectorAll('#input-wrapper zoo-tag').forEach(el=> selectedTags.push(el.textContent.trim()));
			const optionsStatus = options.filter((option) => option.hasAttribute('selected')).map(option => option.value);
			return {
				optionsStatus,
				selectedTags
			}
		});
		expect(ret.optionsStatus.length).toEqual(0);
		expect(ret.selectedTags.length).toEqual(0);
	});

	it('should toggle tag selection when clicking on option list', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input-tag show-tags-after-select>
					<label for="input-tag" slot="label">Tag input</label>
					<input id="input-tag" slot="input" placeholder="Type a tag name"/>
					<span slot="error">At least one tag should be selected!</span>
					<select slot="select" multiple required>
						<option value="Dog"></option>
						<option value="Bird"></option>
					</select>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Dog" tabindex="0">
							<span slot="content">Dog</span>
						</zoo-tag>
						<span slot="description">The domestic dog (Canis familiaris or Canis lupus familiaris)[4] is a domesticated descendant of the wolf.</span>
					</zoo-input-tag-option>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Bird" tabindex="0">
							<span slot="content">Bird</span>
						</zoo-tag>
						<span slot="description">Birds are a group of warm-blooded vertebrates constituting the class Aves /ˈeɪviːz/.</span>
					</zoo-input-tag-option>
				</zoo-input-tag>
				`;
			await new Promise(r => setTimeout(r, 10));
			let input = document.querySelector('zoo-input-tag');
			const slottedInput = input.shadowRoot.querySelector('slot[name="input"]').assignedElements()[0];
			slottedInput.value = 123;
			slottedInput.dispatchEvent(new Event('input'));
			await new Promise(r => setTimeout(r, 10));

			const tagOption1 = input.shadowRoot.querySelector('slot[name="tag-option"]').assignedElements()[0]
			tagOption1.click();
			await new Promise(r => setTimeout(r, 10));

			let selectedTags1stClick = [];
			input.shadowRoot.querySelectorAll('#input-wrapper zoo-tag').forEach(el=> selectedTags1stClick.push(el.textContent.trim()));
			let selectedOptions1stClick = [];
			input.shadowRoot.querySelector('slot[name="tag-option"]').assignedElements().forEach(el=> {
				if(el.hasAttribute('selected')) {
					selectedOptions1stClick.push(el.querySelector('span').textContent.trim())
				}
			});

			tagOption1.click();
			await new Promise(r => setTimeout(r, 10));

			let selectedTags2stClick = [];
			input.shadowRoot.querySelectorAll('#input-wrapper zoo-tag').forEach(el=> selectedTags2stClick.push(el.textContent.trim()));
			let selectedOptions2stClick = [];
			input.shadowRoot.querySelector('slot[name="tag-option"]').assignedElements().forEach(el=> {
				if(el.hasAttribute('selected')) {
					selectedOptions2stClick.push(el.querySelector('span').textContent.trim())
				}
			});
			return {
				selectedTags1stClick,
				selectedOptions1stClick,
				selectedTags2stClick,
				selectedOptions2stClick
			}
		});
		expect(ret.selectedOptions1stClick).toEqual(['Dog']);
		expect(ret.selectedTags1stClick).toEqual(['Dog']);
		expect(ret.selectedOptions2stClick.length).toEqual(0);
		expect(ret.selectedTags2stClick.length).toEqual(0);
	});

	it('should render clicked option as tag with tag content as text', async () => {
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
							<span slot="content">Dog content</span>
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

			input.shadowRoot.querySelector('slot[name="tag-option"]').assignedElements()[0].click();
			await new Promise(r => setTimeout(r, 10));

			const selectedTag = input.shadowRoot.querySelector('#input-wrapper zoo-tag');
			const selectedTagContent = selectedTag.textContent.trim()
			return {
				showTagsAttrPresentWithInputValue,
				tagOptionsDisplayWithInputValue,
				selectedTagContent
			};
		});
		expect(ret.showTagsAttrPresentWithInputValue).toBeTrue();
		expect(ret.tagOptionsDisplayWithInputValue).toEqual('flex');
		expect(ret.selectedTagContent).toEqual('Dog content');
	});

	it('should render clicked option as tag when using custom markup with data-option-content attribute', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input-tag>
					<label for="input-tag" slot="label">Tag input</label>
					<input id="input-tag" slot="input" placeholder="Type a tag name"/>
					<span slot="error">At least one tag should be selected!</span>
					<select slot="select" multiple required>
						<option value="Dog">Dog</option>
					</select>
					<zoo-input-tag-option slot="tag-option">
						<h5 slot="tag" data-value="Dog" data-option-content>Dog content</h5>
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

			input.shadowRoot.querySelector('slot[name="tag-option"]').assignedElements()[0].click();
			await new Promise(r => setTimeout(r, 10));

			const selectedTag = input.shadowRoot.querySelector('#input-wrapper zoo-tag');
			const selectedTagContent = selectedTag.textContent.trim()
			return {
				showTagsAttrPresentWithInputValue,
				tagOptionsDisplayWithInputValue,
				selectedTagContent
			};
		});
		expect(ret.showTagsAttrPresentWithInputValue).toBeTrue();
		expect(ret.tagOptionsDisplayWithInputValue).toEqual('flex');
		expect(ret.selectedTagContent).toEqual('Dog');
	});

	it('should show and not hide tags on input when attribute set', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input-tag show-tags-after-select>
					<label for="input-tag" slot="label">Tag input</label>
					<input id="input-tag" slot="input" placeholder="Type a tag name"/>
					<span slot="error">At least one tag should be selected!</span>
					<select slot="select" multiple required>
						<option value="Dog"></option>
						<option value="Bird"></option>
					</select>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Dog" tabindex="0">
							<span slot="content">Dog</span>
						</zoo-tag>
						<span slot="description">The domestic dog (Canis familiaris or Canis lupus familiaris)[4] is a domesticated descendant of the wolf.</span>
					</zoo-input-tag-option>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Bird" tabindex="0">
							<span slot="content">Bird</span>
						</zoo-tag>
						<span slot="description">Birds are a group of warm-blooded vertebrates constituting the class Aves /ˈeɪviːz/.</span>
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

			input.shadowRoot.querySelector('slot[name="tag-option"]').assignedElements()[0].click();

			await new Promise(r => setTimeout(r, 10));

			const showTagsAttrPresentWithoutInputValue = input.hasAttribute('show-tags');
			const tagOptionsDisplayWithoutInputValue = window.getComputedStyle(tagOptions).display;

			return {
				showTagsAttrPresentWithInputValue,
				tagOptionsDisplayWithInputValue,
				showTagsAttrPresentWithoutInputValue,
				tagOptionsDisplayWithoutInputValue
			};
		});
		expect(ret.showTagsAttrPresentWithInputValue).toBeTrue();
		expect(ret.tagOptionsDisplayWithInputValue).toEqual('flex');
		expect(ret.showTagsAttrPresentWithoutInputValue).toBeTrue();
		expect(ret.tagOptionsDisplayWithoutInputValue).toEqual('flex');
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

	it('should clear selection by invoking function', async () => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = `
				<zoo-input-tag data-initial-value="Dog">
					<label for="input-tag" slot="label">Tag input</label>
					<input id="input-tag" slot="input" placeholder="Type a tag name"/>
					<span slot="error">At least one tag should be selected!</span>
					<select slot="select" multiple required>
						<option value="Dog"></option>
						<option value="Cat"></option>
					</select>
					<zoo-input-tag-option slot="tag-option">
						<zoo-tag slot="tag" type="cloud" data-value="Dog" tabindex="0">
							<span slot="content">Dog</span>
						</zoo-tag>
						<span slot="description">The domestic dog (Canis familiaris or Canis lupus familiaris)[4] is a domesticated descendant of the wolf.</span>
					</zoo-input-tag-option>
					<zoo-input-tag-option slot="tag-option" id="cat-tag">
                        <zoo-tag slot="tag" type="cloud" data-value="Cat" tabindex="0">
                            <span slot="content">Cat</span>
                        </zoo-tag>
                        <span slot="description">The cat (Felis catus) is a domestic species of small carnivorous mammal.</span>
                    </zoo-input-tag-option>
				</zoo-input-tag>
				`;
			const input = document.querySelector('zoo-input-tag');
			input.shadowRoot.querySelector('slot[name="tag-option"]').assignedElements()[1].click();
			await new Promise(r => setTimeout(r, 10));

			input.clearSelection();

			const options = [...document.querySelectorAll('option')];
			await new Promise(r => setTimeout(r, 10));

			let selectedTags = []
			input.shadowRoot.querySelectorAll('#input-wrapper zoo-tag').forEach(el=> selectedTags.push(el.textContent.trim()));
			const optionsStatus = options.filter((option) => option.hasAttribute('selected')).map(option => option.value);
			return {
				optionsStatus,
				selectedTags
			}
		});
		expect(ret.optionsStatus.length).toEqual(0);
		expect(ret.selectedTags.length).toEqual(0);
	});
});