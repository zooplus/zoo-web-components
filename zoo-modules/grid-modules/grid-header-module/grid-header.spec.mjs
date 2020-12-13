describe('Zoo quantity control', function() {
	it('should show sort arrow when sortable attribute is present', async() => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = '<zoo-grid-header sortable>Valid</zoo-grid-header>';

			const header = document.querySelector('zoo-grid-header');
			const arrow = header.shadowRoot.querySelector('.arrow');
			
			const style = window.getComputedStyle(arrow);
			return style.display;
		});
		expect(ret).toEqual('flex');
	});

	it('should not show sort arrow when sortable attribute is absent', async() => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = '<zoo-grid-header>Valid</zoo-grid-header>';

			const header = document.querySelector('zoo-grid-header');
			const arrow = header.shadowRoot.querySelector('.arrow');
			
			const style = window.getComputedStyle(arrow);
			return style.display;
		});
		expect(ret).toEqual('none');
	});

	it('should show reorder arrows when reorderable attribute is present', async() => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = '<zoo-grid-header reorderable>Valid</zoo-grid-header>';

			const header = document.querySelector('zoo-grid-header');
			const swap = header.shadowRoot.querySelector('.swap');
			
			const style = window.getComputedStyle(swap);
			return style.display;
		});
		expect(ret).toEqual('flex');
	});

	it('should not show reorder arrows when reorderable attribute is absent', async() => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = '<zoo-grid-header>Valid</zoo-grid-header>';

			const header = document.querySelector('zoo-grid-header');
			const swap = header.shadowRoot.querySelector('.swap');
			
			const style = window.getComputedStyle(swap);
			return style.display;
		});
		expect(ret).toEqual('none');
	});

	it('should add and then remove draggable attribute when on mousedown and draend events', async() => {
		const ret = await page.evaluate(async () => {
			document.body.innerHTML = '<zoo-grid-header reorderable>Valid</zoo-grid-header>';

			const header = document.querySelector('zoo-grid-header');
			const swap = header.shadowRoot.querySelector('.swap');
			
			swap.dispatchEvent(new Event('mousedown'));
			await new Promise(r => setTimeout(r, 10));
			const draggableFirst = header.hasAttribute('draggable');

			header.dispatchEvent(new Event('dragend'));
			await new Promise(r => setTimeout(r, 10));
			const draggableSecond = header.hasAttribute('draggable');

			return [draggableFirst, draggableSecond];
		});
		expect(ret[0]).toBeTrue();
		expect(ret[1]).toBeFalse();
	});

	it('should set sortstate attribute on click on arrow', async() => {
		const sortState = await page.evaluate(async () => {
			document.body.innerHTML = '<zoo-grid-header sortable>Valid</zoo-grid-header>';

			const header = document.querySelector('zoo-grid-header');
			const arrow = header.shadowRoot.querySelector('.arrow');

			const states = [];

			arrow.dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 10));
			states.push(header.getAttribute('sortState'));

			arrow.dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 10));
			states.push(header.getAttribute('sortState'));

			arrow.dispatchEvent(new Event('click'));
			await new Promise(r => setTimeout(r, 10));
			states.push(header.getAttribute('sortState'));

			return states;
		});
		expect(sortState).toEqual(['desc', 'asc', null]);
	});
});