const puppeteer = require('puppeteer');
const axe = require('axe-core');

beforeAll(async () => {
	global.browser = await puppeteer.launch({headless: true});
	global.page = await global.browser.newPage();
	global.axe = axe;
	await global.page.goto('http://localhost:5000');
});

afterEach(async () => await global.page.evaluate(() => document.body.innerHTML = ''));

afterAll(async () => await global.browser.close());