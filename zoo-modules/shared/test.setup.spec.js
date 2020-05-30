const puppeteer = require('puppeteer');
const chai = require('chai')
const expect = chai.expect;

before(async () => {
	global.expect = expect;
	global.browser = await puppeteer.launch({headless: true});
	global.page = await global.browser.newPage();
	await global.page.goto('http://localhost:5000');
});

after(async () => {
	await global.browser.close();
});

beforeEach(() => {
});