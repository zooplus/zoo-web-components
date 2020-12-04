describe('Zoo radio', function() {
	it('should pass accessibility tests', async() => {
		const results = await page.evaluate(async () => {
			document.body.innerHTML = `
			<zoo-radio infotext="infotext" labeltext="Label text">
				<input type="radio" id="contactChoice1" name="contact" value="email" disabled>
				<label for="contactChoice1">Email</label>
				<input type="radio" id="contactChoice2" name="contact" value="phone">
				<label for="contactChoice2">Phone</label>
				<input type="radio" id="contactChoice3" name="contact" value="mail">
				<label for="contactChoice3">Mail</label>
			</zoo-radio>`;
			return await axe.run('zoo-radio');
		});
		if (results.violations.length) {
			console.log('zoo-radio a11y violations ', results.violations);
			throw new Error('Accessibility issues found');
		}
	});
});