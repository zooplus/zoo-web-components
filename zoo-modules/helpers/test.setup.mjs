/* eslint-disable */
import puppeteer from 'puppeteer';
import axe from 'axe-core';
import jasmine from 'jasmine';

beforeAll(async () => {
	jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
	global.browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});
	global.page = await global.browser.newPage();
	global.axe = axe;
	await global.page.goto('http://localhost:9000');
});

afterEach(async () => await global.page.evaluate(() => document.body.innerHTML = ''));

afterAll(async () => await global.browser.close());