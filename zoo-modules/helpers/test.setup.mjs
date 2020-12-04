import puppeteer from 'puppeteer';
import jasmine from 'jasmine';
import axe from 'axe-core';

beforeAll(async () => {
	jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
	global.browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});
	global.page = await global.browser.newPage();
	global.axeHandle = '';
	await global.page.goto('http://localhost:9000');
});

beforeEach(async () => {
	global.axeHandle = await page.evaluateHandle(`${axe.source}`);
});

afterEach(async () => {
	await global.axeHandle.dispose();
	await global.page.evaluate(() => document.body.innerHTML = '');
});

afterAll(async () => await global.browser.close());