describe('Zoo paginator', function () {
	it('should create default paginator', async () => {
		const buttonsLength = await page.evaluate(() => {
			document.body.innerHTML = `<zoo-paginator currentpage="2" maxpages="3"></zoo-paginator>`;
			const paginator = document.querySelector('zoo-paginator');
			const buttons = paginator.shadowRoot.querySelectorAll('button');
			return buttons.length;
		});
		expect(buttonsLength).toEqual(5);
	});

	it('should go to previous page', async () => {
		const currentpage = await page.evaluate(async () => {
			document.body.innerHTML = `<zoo-paginator currentpage="2" maxpages="3"></zoo-paginator>`;
			const paginator = document.querySelector('zoo-paginator');
			const prev = paginator.shadowRoot.querySelector('.prev');
			prev.dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 10));

			return paginator.getAttribute('currentpage');
		});
		expect(currentpage).toEqual('1');
	});

	it('should go to next page', async () => {
		const currentpage = await page.evaluate(async () => {
			document.body.innerHTML = `<zoo-paginator currentpage="2" maxpages="3"></zoo-paginator>`;
			const paginator = document.querySelector('zoo-paginator');
			const next = paginator.shadowRoot.querySelector('.next');
			next.dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 10));

			return paginator.getAttribute('currentpage');
		});
		expect(currentpage).toEqual('3');
	});

	it('should go to first page', async () => {
		const currentpage = await page.evaluate(async () => {
			document.body.innerHTML = `<zoo-paginator currentpage="2" maxpages="3"></zoo-paginator>`;
			const paginator = document.querySelector('zoo-paginator');
			const button = paginator.shadowRoot.querySelector('button[page="1"]');
			button.click();
			await new Promise(r => setTimeout(r, 10));

			return paginator.getAttribute('currentpage');
		});
		expect(currentpage).toEqual('1');
	});
});