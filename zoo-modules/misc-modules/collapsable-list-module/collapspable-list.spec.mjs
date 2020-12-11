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

	it('should set active attribute on click', async () => {
		const ret = await page.evaluate(async () => {
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
			const listItems = [...document.querySelectorAll('zoo-collapsable-list-item')];
			await new Promise(r => setTimeout(r, 10));
			const prevState = listItems.map(item => item.hasAttribute('active'));
			listItems[1].dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 10));
			const currentState = listItems.map(item => item.hasAttribute('active'));
			
			return {
				prevState: prevState,
				curreState: currentState
			};
		});
		expect(ret.prevState).toEqual([true, false]);
		expect(ret.curreState).toEqual([false, true]);
	});

	it('should not set active attribute on click when active element is clicked', async () => {
		const ret = await page.evaluate(async () => {
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
			const listItems = [...document.querySelectorAll('zoo-collapsable-list-item')];
			await new Promise(r => setTimeout(r, 10));
			const prevState = listItems.map(item => item.hasAttribute('active'));
			listItems[0].dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 10));
			const currentState = listItems.map(item => item.hasAttribute('active'));
			
			return {
				prevState: prevState,
				curreState: currentState
			};
		});
		expect(ret.prevState).toEqual([true, false]);
		expect(ret.curreState).toEqual([true, false]);
	});
});