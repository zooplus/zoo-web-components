describe('Zoo toast', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async() => {
			const style = document.createElement('style');
			style.textContent = `
				:root {
					--primary-mid: #3C9700;
					--primary-light: #66B100;
					--primary-dark: #286400;
					--primary-ultralight: #EBF4E5;
					--secondary-mid: #FF6200;
					--secondary-light: #F80;
					--secondary-dark: #CC4E00;
					--info-ultralight: #ECF5FA;
					--info-mid: #459FD0;
					--warning-ultralight: #FDE8E9;
					--warning-mid: #ED1C24;
				}
			`;
			document.head.appendChild(style);
			
			document.body.innerHTML = `<zoo-toast closelabel="close popup">
				<span slot="content">Search for more than 8.000 products.</span>
			</zoo-toast>`;
			document.querySelector('zoo-toast').show();
			// wait for animation and styles to finish
			await new Promise(res => setTimeout(() => res(), 330));
			return await axe.run('zoo-toast');
		});
		if (results.violations.length) {
			console.log('zoo-toast a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});