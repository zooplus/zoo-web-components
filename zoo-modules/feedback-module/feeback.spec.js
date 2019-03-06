describe('Zoo log feedback', function() {
	describe('Feedback', () => {
		it('should create default feedback', async() => {
			const feedbackAttrs = await page.evaluate(() => {
				let feedback = document.createElement('zoo-feedback');
				document.body.appendChild(feedback);
				const infoIcon = feedback.shadowRoot.querySelector('.info-rounded-circle-o');
				const text = feedback.shadowRoot.querySelector('.text').innerHTML;
				const feedbackAttrs = {
					infoIcon: infoIcon,
					text: text
				};
				return feedbackAttrs;
			});
			expect(feedbackAttrs.infoIcon).to.be.not.undefined;
			expect(feedbackAttrs.text).equal('');
		});

		it('should create feedback info with text', async() => {
			const feedbackAttrs = await page.evaluate(() => {
				let feedback = document.createElement('zoo-feedback');
				feedback.type = 'info';
				feedback.text = 'test-text';
				document.body.appendChild(feedback);
				const infoIcon = feedback.shadowRoot.querySelector('.info-rounded-circle-o');
				const text = feedback.shadowRoot.querySelector('.text').innerHTML;
				const feedbackAttrs = {
					infoIcon: infoIcon,
					text: text
				};
				return feedbackAttrs;
			});
			expect(feedbackAttrs.infoIcon).to.be.not.undefined;
			expect(feedbackAttrs.text).equal('test-text');
		});

		it('should create feedback success with text', async() => {
			const feedbackAttrs = await page.evaluate(() => {
				let feedback = document.createElement('zoo-feedback');
				feedback.type = 'success';
				feedback.text = 'test-text';
				document.body.appendChild(feedback);
				const infoIcon = feedback.shadowRoot.querySelector('.happiness');
				const text = feedback.shadowRoot.querySelector('.text').innerHTML;
				const feedbackAttrs = {
					infoIcon: infoIcon,
					text: text
				};
				return feedbackAttrs;
			});
			expect(feedbackAttrs.infoIcon).to.be.not.undefined;
			expect(feedbackAttrs.text).equal('test-text');
		});

		it('should create feedback error with text', async() => {
			const feedbackAttrs = await page.evaluate(() => {
				let feedback = document.createElement('zoo-feedback');
				feedback.type = 'error';
				feedback.text = 'test-text';
				document.body.appendChild(feedback);
				const infoIcon = feedback.shadowRoot.querySelector('.error');
				const text = feedback.shadowRoot.querySelector('.text').innerHTML;
				const feedbackAttrs = {
					infoIcon: infoIcon,
					text: text
				};
				return feedbackAttrs;
			});
			expect(feedbackAttrs.infoIcon).to.be.not.undefined;
			expect(feedbackAttrs.text).equal('test-text');
		});
	});
});