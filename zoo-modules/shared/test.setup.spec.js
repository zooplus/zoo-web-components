const puppeteer = require('puppeteer');

beforeAll(async () => {
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

afterAll(async () => {
	await global.browser.close();
});