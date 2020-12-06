import fs from 'fs';
import CleanCSS from 'clean-css';
import minifyHTML from 'html-minifier';

export default function injectInnerHTML() {
	return {
		name: 'injectInnerHTML',

		transform(code, id) {
			if (code.indexOf('@injectHTML') > -1) {
				const htmlFile = id.replace('.js', '.html');
				const cssFile = id.replace('.js', '.css');
				const html = fs.readFileSync(htmlFile, 'utf8');
				const minifiedHTML = minifyHTML.minify(html, {collapseWhitespace: true, collapseBooleanAttributes: true});
				const css = fs.readFileSync(cssFile, 'utf8');
				const minifiedCss = new CleanCSS({ level: { 2: { all: true } } }).minify(css);
				code = code.replace('super();', `super();this.attachShadow({mode:'open'}).innerHTML=\`<style>${minifiedCss.styles}</style>${minifiedHTML}\`;`);
				
				// fs.appendFile('./docs/all.css', minifiedCss.styles, function (err) {
				// 	if (err) throw err;
				// 	console.log('Saved!');
				// });
			}
			return {
				code: code,
				map: null
			};
		}
	};
}