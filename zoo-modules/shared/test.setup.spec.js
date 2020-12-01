/* eslint-disable */

const puppeteer = require('puppeteer');
const chai = require('chai');
const expect = chai.expect;

before(async () => {
	global.expect = expect;
	global.browser = await puppeteer.launch({headless: true});
	global.page = await global.browser.newPage();
	await global.page.goto('http://localhost:5000');
});

afterEach(async () => {
	await global.page.evaluate(() => {
		document.body.innerHTML = '';
	});
});

after(async () => {
	await global.browser.close();
});