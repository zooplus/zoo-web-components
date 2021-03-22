describe('Zoo button', () => {
	it('should create disabled button', async () => {
		const style = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-button>
					<button disabled type="button">content</button>
				</zoo-button>
			`;
			const nestedButton = document.querySelector('zoo-button').shadowRoot.querySelector('slot').assignedElements()[0];
			const style = window.getComputedStyle(nestedButton);
			return {
				colorLight: style.getPropertyValue('--color-light').trim(),
				colorMid: style.getPropertyValue('--color-mid').trim(),
				colorDark: style.getPropertyValue('--color-dark').trim(),
				textNormal: style.getPropertyValue('--text-normal').trim(),
				textActive: style.getPropertyValue('--text-active').trim(),
				background: style.getPropertyValue('--background').trim(),
				border: style.getPropertyValue('--border').trim()
			};
		});
		expect(style.colorLight).toEqual(colors.primaryLight);
		expect(style.colorMid).toEqual('#F2F3F4');
		expect(style.colorDark).toEqual('#F2F3F4');
		expect(style.textNormal).toEqual('#767676');
		expect(style.textActive).toEqual('#767676');
		expect(style.background).toEqual('#F2F3F4');
		expect(style.border).toEqual('1px solid #E6E6E6');
	});

	it('should create normal button', async () => {
		const style = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-button>
					<button type="button">content</button>
				</zoo-button>
			`;
			const nestedButton = document.querySelector('zoo-button').shadowRoot.querySelector('slot').assignedElements()[0];
			const style = window.getComputedStyle(nestedButton);
			return {
				colorLight: style.getPropertyValue('--color-light').trim(),
				colorMid: style.getPropertyValue('--color-mid').trim(),
				colorDark: style.getPropertyValue('--color-dark').trim(),
				textNormal: style.getPropertyValue('--text-normal').trim(),
				textActive: style.getPropertyValue('--text-active').trim(),
				background: style.getPropertyValue('--background').trim(),
				border: style.getPropertyValue('--border').trim()
			};
		});
		expect(style.colorLight).toEqual(colors.primaryLight);
		expect(style.colorMid).toEqual(colors.primaryMid);
		expect(style.colorDark).toEqual(colors.primaryDark);
		expect(style.textNormal).toEqual('white');
		expect(style.textActive).toEqual('white');
		expect(style.background).toEqual(`linear-gradient(to right,  ${colors.primaryMid},  ${colors.primaryLight})`);
		expect(style.border).toEqual('0');
	});

	it('should create secondary button', async () => {
		const style = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-button type="secondary">
					<button type="button">content</button>
				</zoo-button>
			`;
			const nestedButton = document.body.querySelector('zoo-button').shadowRoot.querySelector('slot').assignedElements()[0];
			const style = window.getComputedStyle(nestedButton);
			return {
				colorLight: style.getPropertyValue('--color-light').trim(),
				colorMid: style.getPropertyValue('--color-mid').trim(),
				colorDark: style.getPropertyValue('--color-dark').trim(),
				textNormal: style.getPropertyValue('--text-normal').trim(),
				textActive: style.getPropertyValue('--text-active').trim(),
				background: style.getPropertyValue('--background').trim(),
				border: style.getPropertyValue('--border').trim()
			};
		});
		expect(style.colorLight).toEqual(colors.secondaryLight);
		expect(style.colorMid).toEqual(colors.secondaryMid);
		expect(style.colorDark).toEqual(colors.secondaryDark);
		expect(style.textNormal).toEqual('white');
		expect(style.textActive).toEqual('white');
		expect(style.background).toEqual(`linear-gradient(to right,  ${colors.secondaryMid},  ${colors.secondaryLight})`);
		expect(style.border).toEqual('0');
	});

	it('should create hollow button', async () => {
		const style = await page.evaluate(() => {
			document.body.innerHTML = `
				<zoo-button type="hollow">
					<button type="button">content</button>
				</zoo-button>
			`;
			const nestedButton = document.body.querySelector('zoo-button').shadowRoot.querySelector('slot').assignedElements()[0];
			const style = window.getComputedStyle(nestedButton);
			return {
				colorLight: style.getPropertyValue('--color-light').trim(),
				colorMid: style.getPropertyValue('--color-mid').trim(),
				colorDark: style.getPropertyValue('--color-dark').trim(),
				textNormal: style.getPropertyValue('--text-normal').trim(),
				textActive: style.getPropertyValue('--text-active').trim(),
				background: style.getPropertyValue('--background').trim(),
				border: style.getPropertyValue('--border').trim()
			};
		});
		expect(style.colorLight).toEqual(colors.primaryLight);
		expect(style.colorMid).toEqual(colors.primaryMid);
		expect(style.colorDark).toEqual(colors.primaryDark);
		expect(style.textNormal).toEqual(colors.primaryMid);
		expect(style.textActive).toEqual('white');
		expect(style.background).toEqual('transparent');
		expect(style.border).toEqual(`2px solid  ${colors.primaryMid}`);
	});
});