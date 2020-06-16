export default function removeLinebreaks() {
	return {
		name: 'removeLinebreaks',

		transform(code, id) {
			// match styles
			const stringToReplace = code.match(/<style>[^]+<\/style>/g);
			if (stringToReplace) {
				// remove tabs and newlines
				stringToReplace[0] = stringToReplace[0].replace(/(\t|\n)/gm, '');
				// remove spaces
				stringToReplace[0] = stringToReplace[0].replace(' ', '');
				// inject replaced string into code
				code = code.replace(/<style>[^]+<\/style>/g, stringToReplace[0]);
			}
			return {
				code: code,
				map: { mappings: ''}
			};
		}
	};
}