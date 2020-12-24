import glob from 'glob';
import path from 'path';

export function watcher() {
	return {
		buildStart() {
			let include = ['src/zoo-modules/**/*.html', 'src/zoo-modules/**/*.css'];
			for (const item of include) {
				glob.sync(path.resolve(item)).forEach(filename => this.addWatchFile(filename));
			}
		},
		options(options) {
			options.cache = {};
			return options;
		}
	};
}

export function noOpWatcher() {
	return {
		options(options) {
			return options;
		}
	};
}