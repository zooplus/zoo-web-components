const fs = require('fs');
var CleanCSS = require('clean-css');
var minifyHTML = require('html-minifier').minify;

export default function injectInnerHTML() {
	return {
		name: 'injectInnerHTML',

		transform(code, id) {
			if (code.indexOf('let replaceMe;') > -1) {
				const htmlFile = id.replace('.js', '.html');
				const cssFile = id.replace('.js', '.css');
				const html = fs.readFileSync(htmlFile, 'utf8');
				const minifiedHTML = minifyHTML(html, {collapseWhitespace: true, collapseBooleanAttributes: true});
				const css = fs.readFileSync(cssFile, 'utf8');
				const minifiedCss = new CleanCSS({ level: { 2: { all: true } } }).minify(css);
				code = code.replace('let replaceMe;', `shadowRoot.innerHTML = \`<style>${minifiedCss.styles}</style>${minifiedHTML}\`;`);
			}
			return {
				code: code,
				map: { mappings: ''}
			};
		}
	};
}