const chai = require('chai')
const expect = chai.expect;

describe('Zoo log checkbox', function() {
	this.timeout('5s');

	describe('Chechbox', () => {
		it('should create checkbox', done => {
			global.nightmare
				.evaluate(() => {
					let checkbox = document.createElement('zoo-log-checkbox');
					checkbox.labeltext = 'label-text';
					checkbox.valid = false;
					checkbox.highlighted = true;
					document.body.appendChild(checkbox);
					const inputBox = checkbox.shadowRoot.querySelector('.box');

					return {
						inputLabelText: inputBox.querySelector('.input-label').innerHTML,
						errorClassPresent: inputBox.classList.contains('error'),
						highlightedClassPresent: inputBox.classList.contains('highlighted')
					};
				})
				.then(inputAttrs => {
					expect(inputAttrs.inputLabelText).equal('label-text');
					expect(inputAttrs.errorClassPresent).to.be.true;
					expect(inputAttrs.highlightedClassPresent).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should handle checkbox label click', done => {
			global.nightmare
				.evaluate(done => {
					let checkbox = document.createElement('zoo-log-checkbox');
					let element = document.createElement('input');
					element.slot = 'checkboxelement';
					element.type = 'checkbox';
					checkbox.appendChild(element);
					document.body.appendChild(checkbox);

					setTimeout(
						() => {
							const inputSlot = checkbox.shadowRoot.querySelector('.input-slot');
							const slottedCheckbox = checkbox.shadowRoot.querySelector('slot[name="checkboxelement"]').assignedNodes()[0];
							inputSlot.click();
							done(null, slottedCheckbox.checked);
						},
						10
					);
				})
				.then(checked => {
					expect(checked).to.be.true;
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});

		it('should accept 1 slot', done => {
			global.nightmare
				.evaluate(() => {
					let checkbox = document.createElement('zoo-log-checkbox');
					let element = document.createElement('input');
					element.slot = 'checkboxelement';
					element.type = 'checkbox';
					checkbox.appendChild(element);
					document.body.appendChild(checkbox);

					const slottedCheckbox = checkbox.shadowRoot.querySelector('slot[name="checkboxelement"]').assignedNodes()[0];

					return {
						tagName: slottedCheckbox.tagName,
						type: slottedCheckbox.type
					};
				})
				.then(ret => {
					expect(ret.tagName).equal('INPUT');
					expect(ret.type).equal('checkbox')
					done();
				})
				.catch(error => {
					done(new Error(error));
				});
		});
	});
});