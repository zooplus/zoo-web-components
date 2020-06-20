const fs = require('fs');

export default function injectInnerHTML() {
	return {
		name: 'injectInnerHTML',

		transform(code, id) {
			if (code.indexOf('let replaceMe;') > -1) {
				const htmlFile = id.replace('.js', '.html');
				const cssFile = id.replace('.js', '.css');
				try {
					const html = fs.readFileSync(htmlFile, 'utf8');
					const css = fs.readFileSync(cssFile, 'utf8');
					code = code.replace('let replaceMe;', `shadowRoot.innerHTML = \`<style>${css.replace(/(\t|\n)/gm, '')}</style>${html.replace(/(\t|\n)/gm, '')}\`;`);
				} catch (e) {
					console.error(e);
				}
			}
			return {
				code: code,
				map: { mappings: ''}
			};
		}
	};
}