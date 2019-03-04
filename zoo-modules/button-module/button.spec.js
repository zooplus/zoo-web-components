describe('Zoo log button', function() {
	describe('Button', () => {
		it('should create cold button', async () => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-log-button');
				button.type = 'cold';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('cold');
			});
			expect(result).to.be.true;
		});
		it('should create hot button', async() => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-log-button');
				button.type = 'hot';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('hot');
			});
			expect(result).to.be.true;
		});
		it('should create small button', async() => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-log-button');
				button.size = 'small';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('small');
			});
			expect(result).to.be.true;
		});
		it('should create medium button', async() => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-log-button');
				button.size = 'medium';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('medium');
			});
			expect(result).to.be.true;
		});
		it('should create big button', async() => {
			const result = await page.evaluate(() => {
				let button = document.createElement('zoo-log-button');
				button.size = 'big';
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.classList.contains('big');
			});
			expect(result).to.be.true;
		});

		it('should create disabled button', async() => {
			const disabledAttr = await page.evaluate(() => {
				let button = document.createElement('zoo-log-button');
				button.disabled = true;
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				return nestedButton.getAttribute('disabled');
			});
			expect(disabledAttr).equal('');
		});

		it('should create button with default attributes', async() => {
			const defaultAttrs = await page.evaluate(() => {
				let button = document.createElement('zoo-log-button');
				document.body.appendChild(button);
				const nestedButton = button.shadowRoot.querySelector('button');
				const defaultAttrs = {};
				defaultAttrs.disabled = nestedButton.getAttribute('disabled');
				defaultAttrs.smallSize = nestedButton.classList.contains('small');
				defaultAttrs.coldType = nestedButton.classList.contains('cold');
				return defaultAttrs;
			});
			expect(defaultAttrs.disabled).to.be.null;
			expect(defaultAttrs.smallSize).to.be.true;
			expect(defaultAttrs.coldType).to.be.true;
		});
	});
});