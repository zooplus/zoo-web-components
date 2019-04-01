var app = (function () {
	'use strict';

	function noop() {}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function destroy_each(iterations, detaching) {
		for (var i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function set_custom_element_data(node, prop, value) {
		if (prop in node) {
			node[prop] = value;
		} else {
			attr(node, prop, value);
		}
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error(`Function called outside component initialization`);
		return current_component;
	}

	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	let dirty_components = [];

	let update_promise;
	const binding_callbacks = [];
	const render_callbacks = [];

	function schedule_update() {
		if (!update_promise) {
			update_promise = Promise.resolve();
			update_promise.then(flush);
		}
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function add_binding_callback(fn) {
		binding_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		update_promise = null;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case — component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = {};
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.bound[key]) $$.bound[key](value);

				if ($$.ctx) {
					const changed = not_equal$$1(value, $$.ctx[key]);
					if (ready && changed) {
						make_dirty(component, key);
					}

					$$.ctx[key] = value;
					return changed;
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}

			super();
		}

		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`);
			};
		}
	}

	/* src/App.svelte generated by Svelte v3.0.0-beta.20 */

	const file = "src/App.svelte";

	function add_css() {
		var style = element("style");
		style.id = 'svelte-1fn2qzx-style';
		style.textContent = ".app.svelte-1fn2qzx{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:15px 0px 40px 0px rgba(85, 85, 85, 0.3), -15px 0px 40px 0px rgba(85, 85, 85, 0.3)}.page-content.svelte-1fn2qzx{position:relative;display:grid;grid-template-columns:320px 1fr;grid-gap:30px;grid-template-areas:\"overview overview\" \"caniuse caniuse\" \"spec-docs content\"}@media only screen and (max-width: 850px){.page-content.svelte-1fn2qzx{grid-template-areas:\"overview\" \"caniuse\" \"spec-docs\"  \"content\";grid-template-columns:320px;justify-content:center}}.what-list.svelte-1fn2qzx{color:var(--main-color, #3C9700);font-size:20px}@media only screen and (max-width: 850px){#when.svelte-1fn2qzx .desktop.svelte-1fn2qzx{display:none}}#when.svelte-1fn2qzx .mobile.svelte-1fn2qzx{display:none}@media only screen and (max-width: 850px){#when.svelte-1fn2qzx .mobile.svelte-1fn2qzx{display:block}}#when.svelte-1fn2qzx .back-btn.svelte-1fn2qzx{width:280px;margin:10px auto}#when.svelte-1fn2qzx .back-btn a.svelte-1fn2qzx{text-decoration:none;color:white}.link-wrapper.svelte-1fn2qzx{height:auto;transition:color 0.3s, background-color 0.3s}.link-wrapper.svelte-1fn2qzx:hover{background-color:rgba(0, 0, 0, 0.1);color:white}.link-wrapper.svelte-1fn2qzx a.svelte-1fn2qzx{color:var(--main-color, #3C9700);padding:12px;display:block;text-decoration:none}.left-menu-separator.svelte-1fn2qzx{margin:0}.overview.svelte-1fn2qzx{grid-area:overview;max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}.caniuse.svelte-1fn2qzx{grid-area:caniuse;width:100%;flex:1 0 auto}.caniuse.svelte-1fn2qzx p.svelte-1fn2qzx{max-width:1280px;margin:0 auto}.spec-docs.svelte-1fn2qzx{grid-area:spec-docs;position:sticky;top:0;height:500px}.content.svelte-1fn2qzx{grid-area:content}hr.svelte-1fn2qzx{border-color:var(--main-color, #3C9700);margin:45px 0;opacity:0.3}.footer.svelte-1fn2qzx{flex-shrink:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwiYXBwXCI+XG5cdDxhcHAtaGVhZGVyPjwvYXBwLWhlYWRlcj5cblx0PGFwcC1jb250ZXh0IGlkPVwid2hhdFwiIHRleHQ9XCJXaGF0IGlzIHRoaXMgcHJvamVjdD9cIj48L2FwcC1jb250ZXh0PlxuXHQ8dWwgY2xhc3M9XCJ3aGF0LWxpc3RcIj5cblx0XHQ8bGk+XG5cdFx0XHRTZXQgb2Ygd2ViLWNvbXBvbmVudHMgd2hpY2ggY2FuIGJlIHVzZWQgaW4gYW55IG1vZGVybiBVSSBmcmFtZXdvcmsgKG9yIHdpdGhvdXQgYW55KS5cblx0XHQ8L2xpPlxuXHRcdDxsaT5cblx0XHRcdFRoZSB3ZWItY29tcG9uZW50IHNldCBpbXBsZW1lbnRzIForIHNob3Agc3R5bGUgZ3VpZGUuXG5cdFx0PC9saT5cblx0XHQ8bGk+XG5cdFx0XHRGdXR1cmUgcmVsZWFzZXMgd2lsbCBpbmNsdWRlIG1vcmUgY29tcG9uZW50cywgRVNNIHN1cHBvcnQgZXRjLlxuXHRcdDwvbGk+XG5cdDwvdWw+XG5cdDxkaXYgY2xhc3M9XCJwYWdlLWNvbnRlbnRcIj5cblx0XHQ8ZGl2IGNsYXNzPVwib3ZlcnZpZXdcIj5cblx0XHRcdDxhcHAtZm9ybSBpZD1cImFwcC1mb3JtXCI+PC9hcHAtZm9ybT5cblx0XHRcdDxocj5cblx0XHRcdDxhcHAtYnV0dG9ucyBpZD1cImFwcC1idXR0b25zXCI+PC9hcHAtYnV0dG9ucz5cblx0XHRcdDxocj5cblx0XHRcdDxhcHAtdG9vbHRpcC1hbmQtZmVlZGJhY2sgaWQ9XCJhcHAtdG9vbHRpcC1hbmQtZmVlZGJhY2tcIj48L2FwcC10b29sdGlwLWFuZC1mZWVkYmFjaz5cblx0XHRcdDxocj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGlkPVwid2hlblwiIGNsYXNzPVwiY2FuaXVzZVwiPlxuXHRcdFx0PGFwcC1jb250ZXh0IHRleHQ9XCJXaGVuIGNhbiBJIHVzZSBpdD9cIiBiYWNrYnRuPVwie3RydWV9XCI+PC9hcHAtY29udGV4dD5cblx0XHRcdDxkaXYgY2xhc3M9XCJkZXNrdG9wXCI+XG5cdFx0XHRcdDxwIGNsYXNzPVwiY2l1X2VtYmVkXCIgZGF0YS1mZWF0dXJlPVwic2hhZG93ZG9tdjFcIiBkYXRhLXBlcmlvZHM9XCJmdXR1cmVfMSxjdXJyZW50LHBhc3RfMSxwYXN0XzJcIiBkYXRhLWFjY2Vzc2libGUtY29sb3Vycz1cImZhbHNlXCI+XG5cdFx0XHRcdFx0PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1zaGFkb3dkb212MVwiPkNhbiBJIFVzZSBzaGFkb3dkb212MT88L2E+IERhdGEgb24gc3VwcG9ydCBmb3IgdGhlIHNoYWRvd2RvbXYxIGZlYXR1cmUgYWNyb3NzIHRoZSBtYWpvciBicm93c2VycyBmcm9tIGNhbml1c2UuY29tLlxuXHRcdFx0XHQ8L3A+XG5cdFx0XHRcdDxwIGNsYXNzPVwiY2l1X2VtYmVkXCIgZGF0YS1mZWF0dXJlPVwiY3VzdG9tLWVsZW1lbnRzdjFcIiBkYXRhLXBlcmlvZHM9XCJmdXR1cmVfMSxjdXJyZW50LHBhc3RfMSxwYXN0XzJcIiBkYXRhLWFjY2Vzc2libGUtY29sb3Vycz1cImZhbHNlXCI+XG5cdFx0XHRcdFx0PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1jdXN0b20tZWxlbWVudHN2MVwiPkNhbiBJIFVzZSBjdXN0b20tZWxlbWVudHN2MT88L2E+IERhdGEgb24gc3VwcG9ydCBmb3IgdGhlIGN1c3RvbS1lbGVtZW50c3YxIGZlYXR1cmUgYWNyb3NzIHRoZSBtYWpvciBicm93c2VycyBmcm9tIGNhbml1c2UuY29tLlxuXHRcdFx0XHQ8L3A+XG5cdFx0XHRcdDxwIGNsYXNzPVwiY2l1X2VtYmVkXCIgZGF0YS1mZWF0dXJlPVwidGVtcGxhdGVcIiBkYXRhLXBlcmlvZHM9XCJmdXR1cmVfMSxjdXJyZW50LHBhc3RfMSxwYXN0XzJcIiBkYXRhLWFjY2Vzc2libGUtY29sb3Vycz1cImZhbHNlXCI+XG5cdFx0XHRcdFx0PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD10ZW1wbGF0ZVwiPkNhbiBJIFVzZSB0ZW1wbGF0ZT88L2E+IERhdGEgb24gc3VwcG9ydCBmb3IgdGhlIHRlbXBsYXRlIGZlYXR1cmUgYWNyb3NzIHRoZSBtYWpvciBicm93c2VycyBmcm9tIGNhbml1c2UuY29tLlxuXHRcdFx0XHQ8L3A+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJtb2JpbGVcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImJhY2stYnRuXCI+XG5cdFx0XHRcdFx0PHpvby1idXR0b24+XG5cdFx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPjxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9c2hhZG93ZG9tdjFcIiB0YXJnZXQ9XCJhYm91dDpibGFua1wiPkNhbiBJIFVzZSBzaGFkb3dkb212MT88L2E+PC9zcGFuPlxuXHRcdFx0XHRcdDwvem9vLWJ1dHRvbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJiYWNrLWJ0blwiPlxuXHRcdFx0XHRcdDx6b28tYnV0dG9uPlxuXHRcdFx0XHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj48YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PWN1c3RvbS1lbGVtZW50c3YxXCIgdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIj5DYW4gSSBVc2UgY3VzdG9tLWVsZW1lbnRzdjE/PC9hPjwvc3Bhbj5cblx0XHRcdFx0XHQ8L3pvby1idXR0b24+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYmFjay1idG5cIj5cblx0XHRcdFx0XHQ8em9vLWJ1dHRvbj5cblx0XHRcdFx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD10ZW1wbGF0ZVwiIHRhcmdldD1cImFib3V0OmJsYW5rXCI+Q2FuIEkgVXNlIHRlbXBsYXRlPzwvYT4gPC9zcGFuPlxuXHRcdFx0XHRcdDwvem9vLWJ1dHRvbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGlkPVwiaG93XCIgY2xhc3M9XCJzcGVjLWRvY3NcIj5cblx0XHRcdDxhcHAtY29udGV4dCB0ZXh0PVwiSG93IGNhbiBJIHVzZSBpdD9cIiBiYWNrYnRuPVwie3RydWV9XCI+PC9hcHAtY29udGV4dD5cblx0XHRcdDxkaXYgY2xhc3M9XCJsZWZ0LW1lbnVcIj5cblx0XHRcdFx0eyNlYWNoIGRvY2xpbmtzIGFzIGxpbmt9XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImxpbmstd3JhcHBlclwiPlxuXHRcdFx0XHRcdFx0PGEgaHJlZj1cIntsaW5rLmhyZWZ9XCIgdGFyZ2V0PVwie2xpbmsudGFyZ2V0fVwiPntsaW5rLnRleHR9PC9hPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxociBjbGFzcz1cImxlZnQtbWVudS1zZXBhcmF0b3JcIj5cblx0XHRcdFx0ey9lYWNofVxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cblx0XHRcdDxkb2NzLWJ1dHRvbiAgaWQ9XCJidXR0b24tZG9jXCI+PC9kb2NzLWJ1dHRvbj5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWNoZWNrYm94IGlkPVwiY2hlY2tib3gtZG9jXCI+PC9kb2NzLWNoZWNrYm94PlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtY29sbGFwc2FibGUtbGlzdCBpZD1cImNvbGxhcHNhYmxlLWxpc3QtZG9jXCI+PC9kb2NzLWNvbGxhcHNhYmxlLWxpc3Q+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1mZWVkYmFjayBpZD1cImZlZWRiYWNrLWRvY1wiPjwvZG9jcy1mZWVkYmFjaz5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWZvb3RlciBpZD1cImZvb3Rlci1kb2NcIj48L2RvY3MtZm9vdGVyPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtaGVhZGVyIGlkPVwiaGVhZGVyLWRvY1wiPjwvZG9jcy1oZWFkZXI+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1pbnB1dCBpZD1cImlucHV0LWRvY1wiPjwvZG9jcy1pbnB1dD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWxpbmsgaWQ9XCJsaW5rLWRvY1wiPjwvZG9jcy1saW5rPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtbW9kYWwgaWQ9XCJtb2RhbC1kb2NcIj48L2RvY3MtbW9kYWw+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1uYXZpZ2F0aW9uIGlkPVwibmF2aWdhdGlvbi1kb2NcIj48L2RvY3MtbmF2aWdhdGlvbj5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLXJhZGlvIGlkPVwicmFkaW8tZG9jXCI+PC9kb2NzLXJhZGlvPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3Mtc2VhcmNoYWJsZS1zZWxlY3QgaWQ9XCJzZWFyY2hhYmxlLXNlbGVjdC1kb2NcIj48L2RvY3Mtc2VhcmNoYWJsZS1zZWxlY3Q+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1zZWxlY3QgaWQ9XCJzZWxlY3QtZG9jXCI+PC9kb2NzLXNlbGVjdD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLXRvYXN0IGlkPVwidG9hc3QtZG9jXCI+PC9kb2NzLXRvYXN0PlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtdG9vbHRpcCBpZD1cInRvb2x0aXAtZG9jXCI+PC9kb2NzLXRvb2x0aXA+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy10aGVtaW5nIGlkPVwidGhlbWluZy1kb2NcIj48L2RvY3MtdGhlbWluZz5cblx0XHRcdDxocj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+XG5cdDx6b28tZm9vdGVyIGNsYXNzPVwiZm9vdGVyXCIgYmluZDp0aGlzPXtmb290ZXJ9IGNvcHlyaWdodD1cInpvb3BsdXMgQUdcIj48L3pvby1mb290ZXI+IFxuPC9kaXY+XG5cbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmFwcCB7XG4gIG1hcmdpbjogMCBhdXRvO1xuICBoZWlnaHQ6IDEwMCU7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIGJveC1zaGFkb3c6IDE1cHggMHB4IDQwcHggMHB4IHJnYmEoODUsIDg1LCA4NSwgMC4zKSwgLTE1cHggMHB4IDQwcHggMHB4IHJnYmEoODUsIDg1LCA4NSwgMC4zKTsgfVxuXG4ucGFnZS1jb250ZW50IHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBkaXNwbGF5OiBncmlkO1xuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDMyMHB4IDFmcjtcbiAgZ3JpZC1nYXA6IDMwcHg7XG4gIGdyaWQtdGVtcGxhdGUtYXJlYXM6IFwib3ZlcnZpZXcgb3ZlcnZpZXdcIiBcImNhbml1c2UgY2FuaXVzZVwiIFwic3BlYy1kb2NzIGNvbnRlbnRcIjsgfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gICAgLnBhZ2UtY29udGVudCB7XG4gICAgICBncmlkLXRlbXBsYXRlLWFyZWFzOiBcIm92ZXJ2aWV3XCIgXCJjYW5pdXNlXCIgXCJzcGVjLWRvY3NcIiAgXCJjb250ZW50XCI7XG4gICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDMyMHB4O1xuICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IH0gfVxuXG4ud2hhdC1saXN0IHtcbiAgY29sb3I6IHZhcigtLW1haW4tY29sb3IsICMzQzk3MDApO1xuICBmb250LXNpemU6IDIwcHg7IH1cblxuQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA4NTBweCkge1xuICAjd2hlbiAuZGVza3RvcCB7XG4gICAgZGlzcGxheTogbm9uZTsgfSB9XG5cbiN3aGVuIC5tb2JpbGUge1xuICBkaXNwbGF5OiBub25lOyB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogODUwcHgpIHtcbiAgICAjd2hlbiAubW9iaWxlIHtcbiAgICAgIGRpc3BsYXk6IGJsb2NrOyB9IH1cblxuI3doZW4gLmJhY2stYnRuIHtcbiAgd2lkdGg6IDI4MHB4O1xuICBtYXJnaW46IDEwcHggYXV0bzsgfVxuICAjd2hlbiAuYmFjay1idG4gYSB7XG4gICAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xuICAgIGNvbG9yOiB3aGl0ZTsgfVxuXG4ubGluay13cmFwcGVyIHtcbiAgaGVpZ2h0OiBhdXRvO1xuICB0cmFuc2l0aW9uOiBjb2xvciAwLjNzLCBiYWNrZ3JvdW5kLWNvbG9yIDAuM3M7IH1cbiAgLmxpbmstd3JhcHBlcjpob3ZlciB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjEpO1xuICAgIGNvbG9yOiB3aGl0ZTsgfVxuICAubGluay13cmFwcGVyIGEge1xuICAgIGNvbG9yOiB2YXIoLS1tYWluLWNvbG9yLCAjM0M5NzAwKTtcbiAgICBwYWRkaW5nOiAxMnB4O1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTsgfVxuXG4ubGVmdC1tZW51LXNlcGFyYXRvciB7XG4gIG1hcmdpbjogMDsgfVxuXG4ub3ZlcnZpZXcge1xuICBncmlkLWFyZWE6IG92ZXJ2aWV3O1xuICBtYXgtd2lkdGg6IDEyODBweDtcbiAgd2lkdGg6IDEwMCU7XG4gIGZsZXg6IDEgMCBhdXRvO1xuICBtYXJnaW46IDAgYXV0bzsgfVxuXG4uY2FuaXVzZSB7XG4gIGdyaWQtYXJlYTogY2FuaXVzZTtcbiAgd2lkdGg6IDEwMCU7XG4gIGZsZXg6IDEgMCBhdXRvOyB9XG5cbi5jYW5pdXNlIHAge1xuICBtYXgtd2lkdGg6IDEyODBweDtcbiAgbWFyZ2luOiAwIGF1dG87IH1cblxuLnNwZWMtZG9jcyB7XG4gIGdyaWQtYXJlYTogc3BlYy1kb2NzO1xuICBwb3NpdGlvbjogc3RpY2t5O1xuICB0b3A6IDA7XG4gIGhlaWdodDogNTAwcHg7IH1cblxuLmNvbnRlbnQge1xuICBncmlkLWFyZWE6IGNvbnRlbnQ7IH1cblxuaHIge1xuICBib3JkZXItY29sb3I6IHZhcigtLW1haW4tY29sb3IsICMzQzk3MDApO1xuICBtYXJnaW46IDQ1cHggMDtcbiAgb3BhY2l0eTogMC4zOyB9XG5cbi5mb290ZXIge1xuICBmbGV4LXNocmluazogMDsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xuXHRsZXQgZm9vdGVyO1xuXHRsZXQgZG9jbGlua3MgPSBbXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNidXR0b24tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnQnV0dG9uJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNjaGVja2JveC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdDaGVja2JveCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjY29sbGFwc2FibGUtbGlzdC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdDb2xsYXBzYWJsZSBMaXN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNmZWVkYmFjay1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdGZWVkYmFjaydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjZm9vdGVyLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ0Zvb3Rlcidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjaGVhZGVyLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ0hlYWRlcidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjaW5wdXQtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnSW5wdXQnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI2xpbmstZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTGluaydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjbW9kYWwtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTW9kYWwnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI25hdmlnYXRpb24tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTmF2aWdhdGlvbidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjcmFkaW8tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnUmFkaW8nXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI3NlYXJjaGFibGUtc2VsZWN0LWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ1NlYXJjaGFibGUgc2VsZWN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNzZWxlY3QtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnU2VsZWN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyN0b2FzdC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdUb2FzdCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjdG9vbHRpcC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdUb29sdGlwJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyN0aGVtaW5nLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ1RoZW1pbmcnXG5cdFx0fVxuXHRdO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRmb290ZXIuZm9vdGVybGlua3MgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdGhyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxuXHRcdFx0XHR0ZXh0OiAnR2l0aHViJyxcblx0XHRcdFx0dHlwZTogJ3N0YW5kYXJkJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL0B6b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXG5cdFx0XHRcdHRleHQ6ICdOUE0nLFxuXHRcdFx0XHR0eXBlOiAnc3RhbmRhcmQnXG5cdFx0XHR9XG5cdFx0XTtcblx0fSk7XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBdUd3QixJQUFJLGVBQUMsQ0FBQyxBQUM1QixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FDZCxNQUFNLENBQUUsSUFBSSxDQUNaLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLE1BQU0sQ0FDdEIsVUFBVSxDQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUUsQ0FBQyxBQUVsRyxhQUFhLGVBQUMsQ0FBQyxBQUNiLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxJQUFJLENBQ2IscUJBQXFCLENBQUUsS0FBSyxDQUFDLEdBQUcsQ0FDaEMsUUFBUSxDQUFFLElBQUksQ0FDZCxtQkFBbUIsQ0FBRSxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQUFBRSxDQUFDLEFBQ2pGLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pDLGFBQWEsZUFBQyxDQUFDLEFBQ2IsbUJBQW1CLENBQUUsVUFBVSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUNoRSxxQkFBcUIs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 */";
		append(document.head, style);
	}

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.link = list[i];
		return child_ctx;
	}

	// (58:4) {#each doclinks as link}
	function create_each_block(ctx) {
		var div, a, t0_value = ctx.link.text, t0, a_href_value, a_target_value, t1, hr;

		return {
			c: function create() {
				div = element("div");
				a = element("a");
				t0 = text(t0_value);
				t1 = space();
				hr = element("hr");
				a.href = a_href_value = ctx.link.href;
				a.target = a_target_value = ctx.link.target;
				a.className = "svelte-1fn2qzx";
				add_location(a, file, 59, 6, 2618);
				div.className = "link-wrapper svelte-1fn2qzx";
				add_location(div, file, 58, 5, 2585);
				hr.className = "left-menu-separator svelte-1fn2qzx";
				add_location(hr, file, 61, 5, 2696);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, a);
				append(a, t0);
				insert(target, t1, anchor);
				insert(target, hr, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
					detach(t1);
					detach(hr);
				}
			}
		};
	}

	function create_fragment(ctx) {
		var div11, app_header, t0, app_context0, t1, ul, li0, t3, li1, t5, li2, t7, div10, div0, app_form, t8, hr0, t9, app_buttons, t10, hr1, t11, app_tooltip_and_feedback, t12, hr2, t13, div6, app_context1, t14, div1, p0, a0, t16, t17, p1, a1, t19, t20, p2, a2, t22, t23, div5, div2, zoo_button0, span0, a3, t25, div3, zoo_button1, span1, a4, t27, div4, zoo_button2, span2, a5, t29, div8, app_context2, t30, div7, t31, div9, docs_button, t32, hr3, t33, docs_checkbox, t34, hr4, t35, docs_collapsable_list, t36, hr5, t37, docs_feedback, t38, hr6, t39, docs_footer, t40, hr7, t41, docs_header, t42, hr8, t43, docs_input, t44, hr9, t45, docs_link, t46, hr10, t47, docs_modal, t48, hr11, t49, docs_navigation, t50, hr12, t51, docs_radio, t52, hr13, t53, docs_searchable_select, t54, hr14, t55, docs_select, t56, hr15, t57, docs_toast, t58, hr16, t59, docs_tooltip, t60, hr17, t61, docs_theming, t62, hr18, t63, zoo_footer;

		var each_value = ctx.doclinks;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		return {
			c: function create() {
				div11 = element("div");
				app_header = element("app-header");
				t0 = space();
				app_context0 = element("app-context");
				t1 = space();
				ul = element("ul");
				li0 = element("li");
				li0.textContent = "Set of web-components which can be used in any modern UI framework (or without any).";
				t3 = space();
				li1 = element("li");
				li1.textContent = "The web-component set implements Z+ shop style guide.";
				t5 = space();
				li2 = element("li");
				li2.textContent = "Future releases will include more components, ESM support etc.";
				t7 = space();
				div10 = element("div");
				div0 = element("div");
				app_form = element("app-form");
				t8 = space();
				hr0 = element("hr");
				t9 = space();
				app_buttons = element("app-buttons");
				t10 = space();
				hr1 = element("hr");
				t11 = space();
				app_tooltip_and_feedback = element("app-tooltip-and-feedback");
				t12 = space();
				hr2 = element("hr");
				t13 = space();
				div6 = element("div");
				app_context1 = element("app-context");
				t14 = space();
				div1 = element("div");
				p0 = element("p");
				a0 = element("a");
				a0.textContent = "Can I Use shadowdomv1?";
				t16 = text(" Data on support for the shadowdomv1 feature across the major browsers from caniuse.com.");
				t17 = space();
				p1 = element("p");
				a1 = element("a");
				a1.textContent = "Can I Use custom-elementsv1?";
				t19 = text(" Data on support for the custom-elementsv1 feature across the major browsers from caniuse.com.");
				t20 = space();
				p2 = element("p");
				a2 = element("a");
				a2.textContent = "Can I Use template?";
				t22 = text(" Data on support for the template feature across the major browsers from caniuse.com.");
				t23 = space();
				div5 = element("div");
				div2 = element("div");
				zoo_button0 = element("zoo-button");
				span0 = element("span");
				a3 = element("a");
				a3.textContent = "Can I Use shadowdomv1?";
				t25 = space();
				div3 = element("div");
				zoo_button1 = element("zoo-button");
				span1 = element("span");
				a4 = element("a");
				a4.textContent = "Can I Use custom-elementsv1?";
				t27 = space();
				div4 = element("div");
				zoo_button2 = element("zoo-button");
				span2 = element("span");
				a5 = element("a");
				a5.textContent = "Can I Use template?";
				t29 = space();
				div8 = element("div");
				app_context2 = element("app-context");
				t30 = space();
				div7 = element("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t31 = space();
				div9 = element("div");
				docs_button = element("docs-button");
				t32 = space();
				hr3 = element("hr");
				t33 = space();
				docs_checkbox = element("docs-checkbox");
				t34 = space();
				hr4 = element("hr");
				t35 = space();
				docs_collapsable_list = element("docs-collapsable-list");
				t36 = space();
				hr5 = element("hr");
				t37 = space();
				docs_feedback = element("docs-feedback");
				t38 = space();
				hr6 = element("hr");
				t39 = space();
				docs_footer = element("docs-footer");
				t40 = space();
				hr7 = element("hr");
				t41 = space();
				docs_header = element("docs-header");
				t42 = space();
				hr8 = element("hr");
				t43 = space();
				docs_input = element("docs-input");
				t44 = space();
				hr9 = element("hr");
				t45 = space();
				docs_link = element("docs-link");
				t46 = space();
				hr10 = element("hr");
				t47 = space();
				docs_modal = element("docs-modal");
				t48 = space();
				hr11 = element("hr");
				t49 = space();
				docs_navigation = element("docs-navigation");
				t50 = space();
				hr12 = element("hr");
				t51 = space();
				docs_radio = element("docs-radio");
				t52 = space();
				hr13 = element("hr");
				t53 = space();
				docs_searchable_select = element("docs-searchable-select");
				t54 = space();
				hr14 = element("hr");
				t55 = space();
				docs_select = element("docs-select");
				t56 = space();
				hr15 = element("hr");
				t57 = space();
				docs_toast = element("docs-toast");
				t58 = space();
				hr16 = element("hr");
				t59 = space();
				docs_tooltip = element("docs-tooltip");
				t60 = space();
				hr17 = element("hr");
				t61 = space();
				docs_theming = element("docs-theming");
				t62 = space();
				hr18 = element("hr");
				t63 = space();
				zoo_footer = element("zoo-footer");
				add_location(app_header, file, 1, 1, 19);
				app_context0.id = "what";
				set_custom_element_data(app_context0, "text", "What is this project?");
				add_location(app_context0, file, 2, 1, 46);
				add_location(li0, file, 4, 2, 139);
				add_location(li1, file, 7, 2, 242);
				add_location(li2, file, 10, 2, 314);
				ul.className = "what-list svelte-1fn2qzx";
				add_location(ul, file, 3, 1, 114);
				app_form.id = "app-form";
				add_location(app_form, file, 16, 3, 456);
				hr0.className = "svelte-1fn2qzx";
				add_location(hr0, file, 17, 3, 495);
				app_buttons.id = "app-buttons";
				add_location(app_buttons, file, 18, 3, 503);
				hr1.className = "svelte-1fn2qzx";
				add_location(hr1, file, 19, 3, 551);
				app_tooltip_and_feedback.id = "app-tooltip-and-feedback";
				add_location(app_tooltip_and_feedback, file, 20, 3, 559);
				hr2.className = "svelte-1fn2qzx";
				add_location(hr2, file, 21, 3, 646);
				div0.className = "overview svelte-1fn2qzx";
				add_location(div0, file, 15, 2, 430);
				set_custom_element_data(app_context1, "text", "When can I use it?");
				set_custom_element_data(app_context1, "backbtn", true);
				add_location(app_context1, file, 24, 3, 697);
				a0.href = "http://caniuse.com/#feat=shadowdomv1";
				add_location(a0, file, 27, 5, 929);
				p0.className = "ciu_embed svelte-1fn2qzx";
				p0.dataset.feature = "shadowdomv1";
				p0.dataset.periods = "future_1,current,past_1,past_2";
				p0.dataset.accessibleColours = "false";
				add_location(p0, file, 26, 4, 797);
				a1.href = "http://caniuse.com/#feat=custom-elementsv1";
				add_location(a1, file, 30, 5, 1242);
				p1.className = "ciu_embed svelte-1fn2qzx";
				p1.dataset.feature = "custom-elementsv1";
				p1.dataset.periods = "future_1,current,past_1,past_2";
				p1.dataset.accessibleColours = "false";
				add_location(p1, file, 29, 4, 1104);
				a2.href = "http://caniuse.com/#feat=template";
				add_location(a2, file, 33, 5, 1564);
				p2.className = "ciu_embed svelte-1fn2qzx";
				p2.dataset.feature = "template";
				p2.dataset.periods = "future_1,current,past_1,past_2";
				p2.dataset.accessibleColours = "false";
				add_location(p2, file, 32, 4, 1435);
				div1.className = "desktop svelte-1fn2qzx";
				add_location(div1, file, 25, 3, 771);
				a3.href = "http://caniuse.com/#feat=shadowdomv1";
				a3.target = "about:blank";
				a3.className = "svelte-1fn2qzx";
				add_location(a3, file, 39, 33, 1838);
				attr(span0, "slot", "buttoncontent");
				add_location(span0, file, 39, 6, 1811);
				add_location(zoo_button0, file, 38, 5, 1792);
				div2.className = "back-btn svelte-1fn2qzx";
				add_location(div2, file, 37, 4, 1764);
				a4.href = "http://caniuse.com/#feat=custom-elementsv1";
				a4.target = "about:blank";
				a4.className = "svelte-1fn2qzx";
				add_location(a4, file, 44, 33, 2048);
				attr(span1, "slot", "buttoncontent");
				add_location(span1, file, 44, 6, 2021);
				add_location(zoo_button1, file, 43, 5, 2002);
				div3.className = "back-btn svelte-1fn2qzx";
				add_location(div3, file, 42, 4, 1974);
				a5.href = "http://caniuse.com/#feat=template";
				a5.target = "about:blank";
				a5.className = "svelte-1fn2qzx";
				add_location(a5, file, 49, 33, 2270);
				attr(span2, "slot", "buttoncontent");
				add_location(span2, file, 49, 6, 2243);
				add_location(zoo_button2, file, 48, 5, 2224);
				div4.className = "back-btn svelte-1fn2qzx";
				add_location(div4, file, 47, 4, 2196);
				div5.className = "mobile svelte-1fn2qzx";
				add_location(div5, file, 36, 3, 1739);
				div6.id = "when";
				div6.className = "caniuse svelte-1fn2qzx";
				add_location(div6, file, 23, 2, 662);
				set_custom_element_data(app_context2, "text", "How can I use it?");
				set_custom_element_data(app_context2, "backbtn", true);
				add_location(app_context2, file, 55, 3, 2454);
				div7.className = "left-menu";
				add_location(div7, file, 56, 3, 2527);
				div8.id = "how";
				div8.className = "spec-docs svelte-1fn2qzx";
				add_location(div8, file, 54, 2, 2418);
				docs_button.id = "button-doc";
				add_location(docs_button, file, 66, 3, 2787);
				hr3.className = "svelte-1fn2qzx";
				add_location(hr3, file, 67, 3, 2835);
				docs_checkbox.id = "checkbox-doc";
				add_location(docs_checkbox, file, 68, 3, 2843);
				hr4.className = "svelte-1fn2qzx";
				add_location(hr4, file, 69, 3, 2896);
				docs_collapsable_list.id = "collapsable-list-doc";
				add_location(docs_collapsable_list, file, 70, 3, 2904);
				hr5.className = "svelte-1fn2qzx";
				add_location(hr5, file, 71, 3, 2981);
				docs_feedback.id = "feedback-doc";
				add_location(docs_feedback, file, 72, 3, 2989);
				hr6.className = "svelte-1fn2qzx";
				add_location(hr6, file, 73, 3, 3042);
				docs_footer.id = "footer-doc";
				add_location(docs_footer, file, 74, 3, 3050);
				hr7.className = "svelte-1fn2qzx";
				add_location(hr7, file, 75, 3, 3097);
				docs_header.id = "header-doc";
				add_location(docs_header, file, 76, 3, 3105);
				hr8.className = "svelte-1fn2qzx";
				add_location(hr8, file, 77, 3, 3152);
				docs_input.id = "input-doc";
				add_location(docs_input, file, 78, 3, 3160);
				hr9.className = "svelte-1fn2qzx";
				add_location(hr9, file, 79, 3, 3204);
				docs_link.id = "link-doc";
				add_location(docs_link, file, 80, 3, 3212);
				hr10.className = "svelte-1fn2qzx";
				add_location(hr10, file, 81, 3, 3253);
				docs_modal.id = "modal-doc";
				add_location(docs_modal, file, 82, 3, 3261);
				hr11.className = "svelte-1fn2qzx";
				add_location(hr11, file, 83, 3, 3305);
				docs_navigation.id = "navigation-doc";
				add_location(docs_navigation, file, 84, 3, 3313);
				hr12.className = "svelte-1fn2qzx";
				add_location(hr12, file, 85, 3, 3372);
				docs_radio.id = "radio-doc";
				add_location(docs_radio, file, 86, 3, 3380);
				hr13.className = "svelte-1fn2qzx";
				add_location(hr13, file, 87, 3, 3424);
				docs_searchable_select.id = "searchable-select-doc";
				add_location(docs_searchable_select, file, 88, 3, 3432);
				hr14.className = "svelte-1fn2qzx";
				add_location(hr14, file, 89, 3, 3512);
				docs_select.id = "select-doc";
				add_location(docs_select, file, 90, 3, 3520);
				hr15.className = "svelte-1fn2qzx";
				add_location(hr15, file, 91, 3, 3567);
				docs_toast.id = "toast-doc";
				add_location(docs_toast, file, 92, 3, 3575);
				hr16.className = "svelte-1fn2qzx";
				add_location(hr16, file, 93, 3, 3619);
				docs_tooltip.id = "tooltip-doc";
				add_location(docs_tooltip, file, 94, 3, 3627);
				hr17.className = "svelte-1fn2qzx";
				add_location(hr17, file, 95, 3, 3677);
				docs_theming.id = "theming-doc";
				add_location(docs_theming, file, 96, 3, 3685);
				hr18.className = "svelte-1fn2qzx";
				add_location(hr18, file, 97, 3, 3735);
				div9.className = "content svelte-1fn2qzx";
				add_location(div9, file, 65, 2, 2762);
				div10.className = "page-content svelte-1fn2qzx";
				add_location(div10, file, 14, 1, 401);
				zoo_footer.className = "footer svelte-1fn2qzx";
				set_custom_element_data(zoo_footer, "copyright", "zooplus AG");
				add_location(zoo_footer, file, 100, 1, 3758);
				div11.className = "app svelte-1fn2qzx";
				add_location(div11, file, 0, 0, 0);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div11, anchor);
				append(div11, app_header);
				append(div11, t0);
				append(div11, app_context0);
				append(div11, t1);
				append(div11, ul);
				append(ul, li0);
				append(ul, t3);
				append(ul, li1);
				append(ul, t5);
				append(ul, li2);
				append(div11, t7);
				append(div11, div10);
				append(div10, div0);
				append(div0, app_form);
				append(div0, t8);
				append(div0, hr0);
				append(div0, t9);
				append(div0, app_buttons);
				append(div0, t10);
				append(div0, hr1);
				append(div0, t11);
				append(div0, app_tooltip_and_feedback);
				append(div0, t12);
				append(div0, hr2);
				append(div10, t13);
				append(div10, div6);
				append(div6, app_context1);
				append(div6, t14);
				append(div6, div1);
				append(div1, p0);
				append(p0, a0);
				append(p0, t16);
				append(div1, t17);
				append(div1, p1);
				append(p1, a1);
				append(p1, t19);
				append(div1, t20);
				append(div1, p2);
				append(p2, a2);
				append(p2, t22);
				append(div6, t23);
				append(div6, div5);
				append(div5, div2);
				append(div2, zoo_button0);
				append(zoo_button0, span0);
				append(span0, a3);
				append(div5, t25);
				append(div5, div3);
				append(div3, zoo_button1);
				append(zoo_button1, span1);
				append(span1, a4);
				append(div5, t27);
				append(div5, div4);
				append(div4, zoo_button2);
				append(zoo_button2, span2);
				append(span2, a5);
				append(div10, t29);
				append(div10, div8);
				append(div8, app_context2);
				append(div8, t30);
				append(div8, div7);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div7, null);
				}

				append(div10, t31);
				append(div10, div9);
				append(div9, docs_button);
				append(div9, t32);
				append(div9, hr3);
				append(div9, t33);
				append(div9, docs_checkbox);
				append(div9, t34);
				append(div9, hr4);
				append(div9, t35);
				append(div9, docs_collapsable_list);
				append(div9, t36);
				append(div9, hr5);
				append(div9, t37);
				append(div9, docs_feedback);
				append(div9, t38);
				append(div9, hr6);
				append(div9, t39);
				append(div9, docs_footer);
				append(div9, t40);
				append(div9, hr7);
				append(div9, t41);
				append(div9, docs_header);
				append(div9, t42);
				append(div9, hr8);
				append(div9, t43);
				append(div9, docs_input);
				append(div9, t44);
				append(div9, hr9);
				append(div9, t45);
				append(div9, docs_link);
				append(div9, t46);
				append(div9, hr10);
				append(div9, t47);
				append(div9, docs_modal);
				append(div9, t48);
				append(div9, hr11);
				append(div9, t49);
				append(div9, docs_navigation);
				append(div9, t50);
				append(div9, hr12);
				append(div9, t51);
				append(div9, docs_radio);
				append(div9, t52);
				append(div9, hr13);
				append(div9, t53);
				append(div9, docs_searchable_select);
				append(div9, t54);
				append(div9, hr14);
				append(div9, t55);
				append(div9, docs_select);
				append(div9, t56);
				append(div9, hr15);
				append(div9, t57);
				append(div9, docs_toast);
				append(div9, t58);
				append(div9, hr16);
				append(div9, t59);
				append(div9, docs_tooltip);
				append(div9, t60);
				append(div9, hr17);
				append(div9, t61);
				append(div9, docs_theming);
				append(div9, t62);
				append(div9, hr18);
				append(div11, t63);
				append(div11, zoo_footer);
				add_binding_callback(() => ctx.zoo_footer_binding(zoo_footer, null));
			},

			p: function update(changed, ctx) {
				if (changed.doclinks) {
					each_value = ctx.doclinks;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div7, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}

				if (changed.items) {
					ctx.zoo_footer_binding(null, zoo_footer);
					ctx.zoo_footer_binding(zoo_footer, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div11);
				}

				destroy_each(each_blocks, detaching);

				ctx.zoo_footer_binding(null, zoo_footer);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let footer;
		let doclinks = [
			{
				href: '#button-doc',
				target: '',
				text: 'Button'
			},
			{
				href: '#checkbox-doc',
				target: '',
				text: 'Checkbox'
			},
			{
				href: '#collapsable-list-doc',
				target: '',
				text: 'Collapsable List'
			},
			{
				href: '#feedback-doc',
				target: '',
				text: 'Feedback'
			},
			{
				href: '#footer-doc',
				target: '',
				text: 'Footer'
			},
			{
				href: '#header-doc',
				target: '',
				text: 'Header'
			},
			{
				href: '#input-doc',
				target: '',
				text: 'Input'
			},
			{
				href: '#link-doc',
				target: '',
				text: 'Link'
			},
			{
				href: '#modal-doc',
				target: '',
				text: 'Modal'
			},
			{
				href: '#navigation-doc',
				target: '',
				text: 'Navigation'
			},
			{
				href: '#radio-doc',
				target: '',
				text: 'Radio'
			},
			{
				href: '#searchable-select-doc',
				target: '',
				text: 'Searchable select'
			},
			{
				href: '#select-doc',
				target: '',
				text: 'Select'
			},
			{
				href: '#toast-doc',
				target: '',
				text: 'Toast'
			},
			{
				href: '#tooltip-doc',
				target: '',
				text: 'Tooltip'
			},
			{
				href: '#theming-doc',
				target: '',
				text: 'Theming'
			}
		];
		onMount(() => {
			footer.footerlinks = [
				{
					href: 'https://github.com/zooplus/zoo-web-components',
					text: 'Github',
					type: 'standard'
				},
				{
					href: 'https://www.npmjs.com/package/@zooplus/zoo-web-components',
					text: 'NPM',
					type: 'standard'
				}
			]; $$invalidate('footer', footer);
		});

		function zoo_footer_binding($$node, check) {
			footer = $$node;
			$$invalidate('footer', footer);
		}

		return { footer, doclinks, zoo_footer_binding };
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			if (!document.getElementById("svelte-1fn2qzx-style")) add_css();
			init(this, options, instance, create_fragment, safe_not_equal, []);
		}
	}

	const app = new App({
		target: document.body
	});

	return app;

}());
