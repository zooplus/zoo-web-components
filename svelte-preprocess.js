import sass from 'node-sass';

export default {
	style: ({ content, attributes }) => {
		if (attributes.type !== 'text/scss') return;

		return new Promise((fulfil, reject) => {
			sass.render({
				data: content,
				includePaths: ['zoo-modules/theming-module'],
				sourceMap: true,
				outFile: 'x' // this is necessary, but is ignored
			}, (err, result) => {
				if (err) return reject(err);

				fulfil({
					code: result.css.toString(),
					map: result.map.toString()
				});
			});
		});
	}
};