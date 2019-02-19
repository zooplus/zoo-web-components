const chai = require('chai')
const expect = chai.expect;

describe('Zoo log feedback', function() {
	this.timeout('5s');

	describe('Feedback', () => {
		it('should create default feedback', done => {
			global.nightmare
				.evaluate(() => {
					let feedback = document.createElement('zoo-log-feedback');
					document.body.appendChild(feedback);
					const infoIcon = feedback.shadowRoot.querySelector('.info-rounded-circle-o');
					const text = feedback.shadowRoot.querySelector('.text').innerHTML;
					const feedbackAttrs = {
						infoIcon: infoIcon,
						text: text
					};
					return feedbackAttrs;
				})
				.then(feedbackAttrs => {
					expect(feedbackAttrs.infoIcon).to.be.not.undefined;
					expect(feedbackAttrs.text).equal('');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create feedback info with text', done => {
			global.nightmare
				.evaluate(() => {
					let feedback = document.createElement('zoo-log-feedback');
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
				})
				.then(feedbackAttrs => {
					expect(feedbackAttrs.infoIcon).to.be.not.undefined;
					expect(feedbackAttrs.text).equal('test-text');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create feedback success with text', done => {
			global.nightmare
				.evaluate(() => {
					let feedback = document.createElement('zoo-log-feedback');
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
				})
				.then(feedbackAttrs => {
					expect(feedbackAttrs.infoIcon).to.be.not.undefined;
					expect(feedbackAttrs.text).equal('test-text');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should create feedback error with text', done => {
			global.nightmare
				.evaluate(() => {
					let feedback = document.createElement('zoo-log-feedback');
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
				})
				.then(feedbackAttrs => {
					expect(feedbackAttrs.infoIcon).to.be.not.undefined;
					expect(feedbackAttrs.text).equal('test-text');
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});