const Nightmare = require('nightmare');

before(() => {
	global.nightmare = new Nightmare();
	global.nightmare.goto('http://localhost:5000');
});

after(() => {
	global.nightmare.halt();
});

beforeEach(() => {
	// global.nightmare
	// .evaluate(() => {
	// 	document.body.innerHTML = "";
	// });
});