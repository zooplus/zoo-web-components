describe('Zoo collapsable list', function () {
	it('should create default collapsable list', async () => {
		const ret = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-collapsable-list>
				<zoo-collapsable-list-item>
					<span slot="header">header1</span>
					<div slot="content">content</div>
				</zoo-collapsable-list-item>
				<zoo-collapsable-list-item>
					<span slot="header">Header2</span>
					<div slot="content">content</div>
				</zoo-collapsable-list-item>
			</zoo-collapsable-list>
			`;
			const listItem = document.querySelector('zoo-collapsable-list-item');
			const header = listItem.shadowRoot.querySelector('slot[name="header"]').assignedElements()[0].innerHTML;
			const content = listItem.shadowRoot.querySelector('slot[name="content"]').assignedElements()[0].innerHTML;
			return {
				header: header,
				content: content
			};
		});
		expect(ret.header).toEqual('header1');
		expect(ret.content).toEqual('content');
	});

	it('should close other items on toggle', async () => {
		const result = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-collapsable-list>
				<zoo-collapsable-list-item>
					<span slot="header">header1</span>
					<div slot="content">content</div>
				</zoo-collapsable-list-item>
				<zoo-collapsable-list-item>
					<span slot="header">header2</span>
					<div slot="content">content</div>
				</zoo-collapsable-list-item>
			</zoo-collapsable-list>
			`;
			const result = [];
			const listItems = [...document.querySelectorAll('zoo-collapsable-list-item')];
			await new Promise(r => setTimeout(r, 10));
			const details = listItems.map(item => item.shadowRoot.querySelector('details'));
			
			result.push(details.map(d => d.open));
			details[0].open = true;
			result.push(details.map(d => d.open));
			await new Promise(r => setTimeout(r, 10));
			details[1].open = true;
			await new Promise(r => setTimeout(r, 10));
			result.push(details.map(d => d.open));
			return result;
		});
		expect(result[0]).toEqual([false, false]);
		expect(result[1]).toEqual([true, false]);
		expect(result[2]).toEqual([false, true]);
	});
});