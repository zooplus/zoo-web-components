function debounce(func, wait) {
	let timeout;
	return function() {
		const later = () => {
			timeout = null;
			func.apply(this, arguments);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (!timeout) func.apply(this, arguments);
	};
}

export { debounce };
//# sourceMappingURL=debounce.js.map
