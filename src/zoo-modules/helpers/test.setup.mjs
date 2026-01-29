/* eslint-disable no-undef */
import puppeteer from 'puppeteer';
import jasmine from 'jasmine';
import axe from 'axe-core';
import pti from 'puppeteer-to-istanbul';

beforeAll(async () => {
	jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
	global.browser = await puppeteer.launch({
		headless: "new",
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});
	global.page = await browser.newPage();
	global.colors = {
		primaryMid: '#286400',
		primaryLight: '#66B100',
		primaryDark: '#286400',
		primaryUltralight: '#EBF4E5',
		secondaryMid: '#FF6200',
		secondaryLight: '#F80',
		secondaryDark: '#CC4E00',
		infoUltralight: '#ECF5FA',
		infoMid: '#459FD0',
		warningUltralight: '#FDE8E9',
		warningMid: '#ED1C24'
	};
	page.on('console', msg => console.log('PAGE LOG:', msg.text()));
	await Promise.all([page.coverage.startJSCoverage(), page.coverage.startCSSCoverage()]);
	
	await page.goto('http://localhost:5050');
	await page.addScriptTag( {'url' : 'https://cdn.jsdelivr.net/npm/jasmine-core@3.6.0/lib/jasmine-core/jasmine.js'});
	await page.addScriptTag( {'url' : 'https://cdn.jsdelivr.net/npm/jasmine-core@3.6.0/lib/jasmine-core/jasmine-html.js'});
	await page.addScriptTag( {'url' : 'https://cdn.jsdelivr.net/npm/jasmine-core@3.6.0/lib/jasmine-core/boot.js'});
	global.axeHandle = await page.evaluateHandle(`${axe.source}`);
});

afterAll(async () => {
	const [jsCoverage, cssCoverage] = await Promise.all([
		page.coverage.stopJSCoverage(),
		page.coverage.stopCSSCoverage(),
	]);
	pti.write([...jsCoverage, ...cssCoverage], { storagePath: './.nyc_output' });
	await global.axeHandle ? global.axeHandle.dispose() : new Promise(res => res());
	await browser.close();
});