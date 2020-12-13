describe('Zoo toast', function () {
	it('should create default toast', async () => {
		const toasttext = await page.evaluate(() => {
			document.body.innerHTML = `
			<zoo-toast>
				<span slot="content">some-text</span>
			</zoo-toast>
			`;
			const toast = document.querySelector('zoo-toast');
			const toastBox = toast.shadowRoot.querySelector('slot[name="content"]').assignedElements()[0];
			return toastBox.innerHTML;
		});
		expect(toasttext).toEqual('some-text');
	});

	it('should show and then close toast after 330ms even when timeout is 5000ms', async () => {
		const styles = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-toast timeout="5">
				<span slot="content">some-text</span>
			</zoo-toast>
			`;
			const styles = [];
			const toast = document.querySelector('zoo-toast');
			toast.show();
			await new Promise(r => setTimeout(r, 35));
			styles.push(window.getComputedStyle(toast).display);

			toast.close();
			await new Promise(r => setTimeout(r, 335));
			styles.push(window.getComputedStyle(toast).display);
			return styles;
		});
		expect(styles[0]).toEqual('block');
		expect(styles[1]).toEqual('none');
	});

	it('should show and then close toast after 330ms even when timeout is 5000ms and a button is clicked', async () => {
		const styles = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-toast timeout="5">
				<span slot="content">some-text</span>
			</zoo-toast>
			`;
			const styles = [];
			const toast = document.querySelector('zoo-toast');
			toast.show();
			await new Promise(r => setTimeout(r, 35));
			styles.push(window.getComputedStyle(toast).display);

			toast.close();
			await new Promise(r => setTimeout(r, 350));
			styles.push(window.getComputedStyle(toast).display);
			return styles;
		});
		expect(styles[0]).toEqual('block');
		expect(styles[1]).toEqual('none');
	});

	it('should show and then close toast after 330ms automatically', async () => {
		const styles = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-toast timeout="1">
				<span slot="content">some-text</span>
			</zoo-toast>
			`;
			const styles = [];
			const toast = document.querySelector('zoo-toast');
			toast.show();
			await new Promise(r => setTimeout(r, 35));
			styles.push(window.getComputedStyle(toast).display);

			await new Promise(r => setTimeout(r, 1350));
			styles.push(window.getComputedStyle(toast).display);
			return styles;
		});
		expect(styles[0]).toEqual('block');
		expect(styles[1]).toEqual('none');
	});

	it('should ignore multiple calls to show', async () => {
		const calledTimes = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-toast timeout="1">
				<span slot="content">some-text</span>
			</zoo-toast>
			`;
			const toast = document.querySelector('zoo-toast');
			let calledTimes = 0;
			toast.toggleToastClass = () => calledTimes += 1;
			toast.show();
			await new Promise(r => setTimeout(r, 35));
			toast.show();
			await new Promise(r => setTimeout(r, 35));

			return calledTimes;
		});
		expect(calledTimes).toEqual(1);
	});

	it('should ignore multiple calls to close', async () => {
		const calledTimes = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-toast timeout="1">
				<span slot="content">some-text</span>
			</zoo-toast>
			`;
			const toast = document.querySelector('zoo-toast');
			let calledTimes = 0;
			toast.toggleToastClass = () => calledTimes += 1;
			toast.show();
			await new Promise(r => setTimeout(r, 35));
			toast.close();
			await new Promise(r => setTimeout(r, 35));
			toast.close();
			await new Promise(r => setTimeout(r, 35));

			return calledTimes;
		});
		expect(calledTimes).toEqual(2);
	});
});