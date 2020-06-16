export default [
	{
		input: 'src/components.js',
		output: {
			sourcemap: false,
			format: 'esm',
			file: 'test/bundle.js',
			name: 'bundle'
		}
	}
];
