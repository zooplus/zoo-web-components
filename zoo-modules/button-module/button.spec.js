describe('Zoo button', function() {
	describe('Button', () => {
		it('should create primary button', async () => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-button');
				button.type = 'primary';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('primary');
			});
			expect(result).to.be.true;
		});
		it('should create secondary button', async() => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-button');
				button.type = 'secondary';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('secondary');
			});
			expect(result).to.be.true;
		});
		it('should create small button', async() => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-button');
				button.size = 'small';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('small');
			});
			expect(result).to.be.true;
		});
		it('should create medium button', async() => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-button');
				button.size = 'medium';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('medium');
			});
			expect(result).to.be.true;
		});

		it('should create disabled button', async() => {
			const disabledAttr = await page.evaluate(() => {
				let button = document.createElement('zoo-button');
				button.disabled = true;
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.getAttribute('disabled');
			});
			expect(disabledAttr).equal('');
		});

		it('should create button with default attributes', async() => {
			const defaultAttrs = await page.evaluate(() => {
				let button = document.createElement('zoo-button');
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				const defaultAttrs = {};
				defaultAttrs.disabled = nestedButton.getAttribute('disabled');
				defaultAttrs.smallSize = nestedButton.classList.contains('small');
				defaultAttrs.primaryType = nestedButton.classList.contains('primary');
				return defaultAttrs;
			});
			expect(defaultAttrs.disabled).to.be.null;
			expect(defaultAttrs.smallSize).to.be.true;
			expect(defaultAttrs.primaryType).to.be.true;
		});

		it('should fall back to primary type when deprecated cold is passed', async() => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-button');
				button.type = 'cold';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('primary');
			});
			expect(result).to.be.true;
		});

		it('should fall back to secondary when deprecated hot is passed', async() => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-button');
				button.type = 'hot';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('secondary');
			});
			expect(result).to.be.true;
		});

		it('should create hollow button', async () => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-button');
				button.type = 'hollow';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('hollow');
			});
			expect(result).to.be.true;
		});
	});
});