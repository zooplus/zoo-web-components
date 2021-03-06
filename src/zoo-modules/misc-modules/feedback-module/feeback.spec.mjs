describe('Zoo feedback', function () {
	it('should create default feedback', async () => {
		const retText = await page.evaluate(() => {
			let feedback = document.createElement('zoo-feedback');
			const span = document.createElement('span');
			span.innerHTML = 'example';
			feedback.appendChild(span);
			document.body.appendChild(feedback);
			const text = feedback.shadowRoot.querySelector('slot').assignedElements()[0].innerHTML;
			return text;
		});
		expect(retText).toEqual('example');
	});
});