const Nightmare = require('nightmare');
const chai = require('chai')
const expect = chai.expect;
const assert = require('assert');

describe('Load a Page', function() {
	// Recommended: 5s locally, 10s to remote server, 30s from airplane ¯\_(ツ)_/¯
	this.timeout('30s');
  
	let nightmare = null;
	beforeEach(() => {
	  nightmare = new Nightmare({show: true});
	});
  
	describe('/ (Home Page)', () => {
	  it('should load without error', done => {
		nightmare.goto('http://localhost:5000')
		  .end()
		  .then(function (result) { done() })
		  .catch(done)
	  });
	});

	describe('Header', () => {
		it('should create', done => {
			nightmare
				.goto('http://localhost:5000')
				.evaluate(() => {
					let header = document.createElement('zoo-log-header');
					header.imgsrc = 'logo.png';
					header.headertext = 'header-text';
					document.body.appendChild(header);

					const image = header.shadowRoot.querySelector('img');
					console.log(image.src);

					return image;
				})
				.then(image => {
					console.log(image);
					expect(image.src).equal('logo.png');
					done();
				})
				.catch(error => {
					console.log(error);
					done(new Error("Header should create failed"));
				})
		});
	});
});