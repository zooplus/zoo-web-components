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

	/* src\App.svelte generated by Svelte v3.0.0-beta.20 */

	const file = "src\\App.svelte";

	function add_css() {
		var style = element("style");
		style.id = 'svelte-1uvrh83-style';
		style.textContent = ".app.svelte-1uvrh83{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:15px 0px 40px 0px rgba(85, 85, 85, 0.3), -15px 0px 40px 0px rgba(85, 85, 85, 0.3)}.page-content.svelte-1uvrh83{position:relative;display:grid;grid-template-columns:320px 1fr;grid-gap:30px;grid-template-areas:\"overview overview\"\r \"caniuse caniuse\"\r \"spec-docs content\"}@media only screen and (max-width: 850px){.page-content.svelte-1uvrh83{grid-template-areas:\"overview\"\r \"caniuse\"\r \"spec-docs\" \r \"content\";grid-template-columns:minmax(320px, 90%);justify-content:center}}.what-list.svelte-1uvrh83{color:var(--main-color, #3C9700);font-size:20px}@media only screen and (max-width: 850px){#when.svelte-1uvrh83 .desktop.svelte-1uvrh83{display:none}}#when.svelte-1uvrh83 .mobile.svelte-1uvrh83{display:none}@media only screen and (max-width: 850px){#when.svelte-1uvrh83 .mobile.svelte-1uvrh83{display:block}}#when.svelte-1uvrh83 .back-btn.svelte-1uvrh83{width:280px;margin:10px auto}#when.svelte-1uvrh83 .back-btn a.svelte-1uvrh83{text-decoration:none;color:white}.link-wrapper.svelte-1uvrh83{height:auto;transition:color 0.3s, background-color 0.3s}.link-wrapper.svelte-1uvrh83:hover{background-color:rgba(0, 0, 0, 0.1);color:white}.link-wrapper.svelte-1uvrh83 a.svelte-1uvrh83{color:var(--main-color, #3C9700);padding:12px;display:block;text-decoration:none}.left-menu.svelte-1uvrh83 .left-menu-separator.svelte-1uvrh83{margin:0}@media only screen and (max-width: 850px){.left-menu.svelte-1uvrh83{display:none}}.overview.svelte-1uvrh83{grid-area:overview;max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}.caniuse.svelte-1uvrh83{grid-area:caniuse;width:100%;flex:1 0 auto}.caniuse.svelte-1uvrh83 p.svelte-1uvrh83{max-width:1280px;margin:0 auto}.spec-docs.svelte-1uvrh83{grid-area:spec-docs;position:sticky;top:0;height:200px}.content.svelte-1uvrh83{grid-area:content}hr.svelte-1uvrh83{border-color:var(--main-color, #3C9700);margin:45px 0;opacity:0.3}.footer.svelte-1uvrh83{flex-shrink:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwiYXBwXCI+XHJcblx0PGFwcC1oZWFkZXI+PC9hcHAtaGVhZGVyPlxyXG5cdDxhcHAtY29udGV4dCBpZD1cIndoYXRcIiB0ZXh0PVwiV2hhdCBpcyB0aGlzIHByb2plY3Q/XCI+PC9hcHAtY29udGV4dD5cclxuXHQ8dWwgY2xhc3M9XCJ3aGF0LWxpc3RcIj5cclxuXHRcdDxsaT5cclxuXHRcdFx0U2V0IG9mIHdlYi1jb21wb25lbnRzIHdoaWNoIGNhbiBiZSB1c2VkIGluIGFueSBtb2Rlcm4gVUkgZnJhbWV3b3JrIChvciB3aXRob3V0IGFueSkuXHJcblx0XHQ8L2xpPlxyXG5cdFx0PGxpPlxyXG5cdFx0XHRUaGUgd2ViLWNvbXBvbmVudCBzZXQgaW1wbGVtZW50cyBaKyBzaG9wIHN0eWxlIGd1aWRlLlxyXG5cdFx0PC9saT5cclxuXHRcdDxsaT5cclxuXHRcdFx0RnV0dXJlIHJlbGVhc2VzIHdpbGwgaW5jbHVkZSBtb3JlIGNvbXBvbmVudHMsIEVTTSBzdXBwb3J0IGV0Yy5cclxuXHRcdDwvbGk+XHJcblx0PC91bD5cclxuXHQ8ZGl2IGNsYXNzPVwicGFnZS1jb250ZW50XCI+XHJcblx0XHQ8ZGl2IGNsYXNzPVwib3ZlcnZpZXdcIj5cclxuXHRcdFx0PGFwcC1mb3JtIGlkPVwiYXBwLWZvcm1cIj48L2FwcC1mb3JtPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxhcHAtYnV0dG9ucyBpZD1cImFwcC1idXR0b25zXCI+PC9hcHAtYnV0dG9ucz5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8YXBwLXRvb2x0aXAtYW5kLWZlZWRiYWNrIGlkPVwiYXBwLXRvb2x0aXAtYW5kLWZlZWRiYWNrXCI+PC9hcHAtdG9vbHRpcC1hbmQtZmVlZGJhY2s+XHJcblx0XHRcdDxocj5cclxuXHRcdDwvZGl2PlxyXG5cdFx0PGRpdiBpZD1cIndoZW5cIiBjbGFzcz1cImNhbml1c2VcIj5cclxuXHRcdFx0PGFwcC1jb250ZXh0IHRleHQ9XCJXaGVuIGNhbiBJIHVzZSBpdD9cIiBiYWNrYnRuPVwie3RydWV9XCI+PC9hcHAtY29udGV4dD5cclxuXHRcdFx0PGRpdiBjbGFzcz1cImRlc2t0b3BcIj5cclxuXHRcdFx0XHQ8cCBjbGFzcz1cImNpdV9lbWJlZFwiIGRhdGEtZmVhdHVyZT1cInNoYWRvd2RvbXYxXCIgZGF0YS1wZXJpb2RzPVwiZnV0dXJlXzEsY3VycmVudCxwYXN0XzEscGFzdF8yXCIgZGF0YS1hY2Nlc3NpYmxlLWNvbG91cnM9XCJmYWxzZVwiPlxyXG5cdFx0XHRcdFx0PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1zaGFkb3dkb212MVwiPkNhbiBJIFVzZSBzaGFkb3dkb212MT88L2E+IERhdGEgb24gc3VwcG9ydCBmb3IgdGhlIHNoYWRvd2RvbXYxIGZlYXR1cmUgYWNyb3NzIHRoZSBtYWpvciBicm93c2VycyBmcm9tIGNhbml1c2UuY29tLlxyXG5cdFx0XHRcdDwvcD5cclxuXHRcdFx0XHQ8cCBjbGFzcz1cImNpdV9lbWJlZFwiIGRhdGEtZmVhdHVyZT1cImN1c3RvbS1lbGVtZW50c3YxXCIgZGF0YS1wZXJpb2RzPVwiZnV0dXJlXzEsY3VycmVudCxwYXN0XzEscGFzdF8yXCIgZGF0YS1hY2Nlc3NpYmxlLWNvbG91cnM9XCJmYWxzZVwiPlxyXG5cdFx0XHRcdFx0PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1jdXN0b20tZWxlbWVudHN2MVwiPkNhbiBJIFVzZSBjdXN0b20tZWxlbWVudHN2MT88L2E+IERhdGEgb24gc3VwcG9ydCBmb3IgdGhlIGN1c3RvbS1lbGVtZW50c3YxIGZlYXR1cmUgYWNyb3NzIHRoZSBtYWpvciBicm93c2VycyBmcm9tIGNhbml1c2UuY29tLlxyXG5cdFx0XHRcdDwvcD5cclxuXHRcdFx0XHQ8cCBjbGFzcz1cImNpdV9lbWJlZFwiIGRhdGEtZmVhdHVyZT1cInRlbXBsYXRlXCIgZGF0YS1wZXJpb2RzPVwiZnV0dXJlXzEsY3VycmVudCxwYXN0XzEscGFzdF8yXCIgZGF0YS1hY2Nlc3NpYmxlLWNvbG91cnM9XCJmYWxzZVwiPlxyXG5cdFx0XHRcdFx0PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD10ZW1wbGF0ZVwiPkNhbiBJIFVzZSB0ZW1wbGF0ZT88L2E+IERhdGEgb24gc3VwcG9ydCBmb3IgdGhlIHRlbXBsYXRlIGZlYXR1cmUgYWNyb3NzIHRoZSBtYWpvciBicm93c2VycyBmcm9tIGNhbml1c2UuY29tLlxyXG5cdFx0XHRcdDwvcD5cclxuXHRcdFx0PC9kaXY+XHJcblx0XHRcdDxkaXYgY2xhc3M9XCJtb2JpbGVcIj5cclxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYmFjay1idG5cIj5cclxuXHRcdFx0XHRcdDx6b28tYnV0dG9uPlxyXG5cdFx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPjxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9c2hhZG93ZG9tdjFcIiB0YXJnZXQ9XCJhYm91dDpibGFua1wiPkNhbiBJIFVzZSBzaGFkb3dkb212MT88L2E+PC9zcGFuPlxyXG5cdFx0XHRcdFx0PC96b28tYnV0dG9uPlxyXG5cdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJiYWNrLWJ0blwiPlxyXG5cdFx0XHRcdFx0PHpvby1idXR0b24+XHJcblx0XHRcdFx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1jdXN0b20tZWxlbWVudHN2MVwiIHRhcmdldD1cImFib3V0OmJsYW5rXCI+Q2FuIEkgVXNlIGN1c3RvbS1lbGVtZW50c3YxPzwvYT48L3NwYW4+XHJcblx0XHRcdFx0XHQ8L3pvby1idXR0b24+XHJcblx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0PGRpdiBjbGFzcz1cImJhY2stYnRuXCI+XHJcblx0XHRcdFx0XHQ8em9vLWJ1dHRvbj5cclxuXHRcdFx0XHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj48YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PXRlbXBsYXRlXCIgdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIj5DYW4gSSBVc2UgdGVtcGxhdGU/PC9hPiA8L3NwYW4+XHJcblx0XHRcdFx0XHQ8L3pvby1idXR0b24+XHJcblx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdDwvZGl2PlxyXG5cdFx0PC9kaXY+XHJcblx0XHQ8ZGl2IGlkPVwiaG93XCIgY2xhc3M9XCJzcGVjLWRvY3NcIj5cclxuXHRcdFx0PGFwcC1jb250ZXh0IHRleHQ9XCJIb3cgY2FuIEkgdXNlIGl0P1wiIGJhY2tidG49XCJ7dHJ1ZX1cIj48L2FwcC1jb250ZXh0PlxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwibGVmdC1tZW51XCI+XHJcblx0XHRcdFx0eyNlYWNoIGRvY2xpbmtzIGFzIGxpbmt9XHJcblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwibGluay13cmFwcGVyXCI+XHJcblx0XHRcdFx0XHRcdDxhIGhyZWY9XCJ7bGluay5ocmVmfVwiIHRhcmdldD1cIntsaW5rLnRhcmdldH1cIj57bGluay50ZXh0fTwvYT5cclxuXHRcdFx0XHRcdDwvZGl2PlxyXG5cdFx0XHRcdFx0PGhyIGNsYXNzPVwibGVmdC1tZW51LXNlcGFyYXRvclwiPlxyXG5cdFx0XHRcdHsvZWFjaH1cclxuXHRcdFx0PC9kaXY+XHJcblx0XHQ8L2Rpdj5cclxuXHRcdDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XHJcblx0XHRcdDxkb2NzLWJ1dHRvbiAgaWQ9XCJidXR0b24tZG9jXCI+PC9kb2NzLWJ1dHRvbj5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1jaGVja2JveCBpZD1cImNoZWNrYm94LWRvY1wiPjwvZG9jcy1jaGVja2JveD5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1jb2xsYXBzYWJsZS1saXN0IGlkPVwiY29sbGFwc2FibGUtbGlzdC1kb2NcIj48L2RvY3MtY29sbGFwc2FibGUtbGlzdD5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1mZWVkYmFjayBpZD1cImZlZWRiYWNrLWRvY1wiPjwvZG9jcy1mZWVkYmFjaz5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1mb290ZXIgaWQ9XCJmb290ZXItZG9jXCI+PC9kb2NzLWZvb3Rlcj5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1oZWFkZXIgaWQ9XCJoZWFkZXItZG9jXCI+PC9kb2NzLWhlYWRlcj5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1pbnB1dCBpZD1cImlucHV0LWRvY1wiPjwvZG9jcy1pbnB1dD5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1saW5rIGlkPVwibGluay1kb2NcIj48L2RvY3MtbGluaz5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1tb2RhbCBpZD1cIm1vZGFsLWRvY1wiPjwvZG9jcy1tb2RhbD5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1uYXZpZ2F0aW9uIGlkPVwibmF2aWdhdGlvbi1kb2NcIj48L2RvY3MtbmF2aWdhdGlvbj5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1yYWRpbyBpZD1cInJhZGlvLWRvY1wiPjwvZG9jcy1yYWRpbz5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1zZWFyY2hhYmxlLXNlbGVjdCBpZD1cInNlYXJjaGFibGUtc2VsZWN0LWRvY1wiPjwvZG9jcy1zZWFyY2hhYmxlLXNlbGVjdD5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy1zZWxlY3QgaWQ9XCJzZWxlY3QtZG9jXCI+PC9kb2NzLXNlbGVjdD5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy10b2FzdCBpZD1cInRvYXN0LWRvY1wiPjwvZG9jcy10b2FzdD5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy10b29sdGlwIGlkPVwidG9vbHRpcC1kb2NcIj48L2RvY3MtdG9vbHRpcD5cclxuXHRcdFx0PGhyPlxyXG5cdFx0XHQ8ZG9jcy10aGVtaW5nIGlkPVwidGhlbWluZy1kb2NcIj48L2RvY3MtdGhlbWluZz5cclxuXHRcdFx0PGhyPlxyXG5cdFx0PC9kaXY+XHJcblx0PC9kaXY+XHJcblx0PHpvby1mb290ZXIgY2xhc3M9XCJmb290ZXJcIiBiaW5kOnRoaXM9e2Zvb3Rlcn0gY29weXJpZ2h0PVwiem9vcGx1cyBBR1wiPjwvem9vLWZvb3Rlcj4gXHJcbjwvZGl2PlxyXG5cclxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uYXBwIHtcbiAgbWFyZ2luOiAwIGF1dG87XG4gIGhlaWdodDogMTAwJTtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgYm94LXNoYWRvdzogMTVweCAwcHggNDBweCAwcHggcmdiYSg4NSwgODUsIDg1LCAwLjMpLCAtMTVweCAwcHggNDBweCAwcHggcmdiYSg4NSwgODUsIDg1LCAwLjMpOyB9XG5cbi5wYWdlLWNvbnRlbnQge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdyaWQtdGVtcGxhdGUtY29sdW1uczogMzIwcHggMWZyO1xuICBncmlkLWdhcDogMzBweDtcbiAgZ3JpZC10ZW1wbGF0ZS1hcmVhczogXCJvdmVydmlldyBvdmVydmlld1wiXHIgXCJjYW5pdXNlIGNhbml1c2VcIlxyIFwic3BlYy1kb2NzIGNvbnRlbnRcIjsgfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gICAgLnBhZ2UtY29udGVudCB7XG4gICAgICBncmlkLXRlbXBsYXRlLWFyZWFzOiBcIm92ZXJ2aWV3XCJcciBcImNhbml1c2VcIlxyIFwic3BlYy1kb2NzXCIgXHIgXCJjb250ZW50XCI7XG4gICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IG1pbm1heCgzMjBweCwgOTAlKTtcbiAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyOyB9IH1cblxuLndoYXQtbGlzdCB7XG4gIGNvbG9yOiB2YXIoLS1tYWluLWNvbG9yLCAjM0M5NzAwKTtcbiAgZm9udC1zaXplOiAyMHB4OyB9XG5cbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogODUwcHgpIHtcbiAgI3doZW4gLmRlc2t0b3Age1xuICAgIGRpc3BsYXk6IG5vbmU7IH0gfVxuXG4jd2hlbiAubW9iaWxlIHtcbiAgZGlzcGxheTogbm9uZTsgfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gICAgI3doZW4gLm1vYmlsZSB7XG4gICAgICBkaXNwbGF5OiBibG9jazsgfSB9XG5cbiN3aGVuIC5iYWNrLWJ0biB7XG4gIHdpZHRoOiAyODBweDtcbiAgbWFyZ2luOiAxMHB4IGF1dG87IH1cbiAgI3doZW4gLmJhY2stYnRuIGEge1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICBjb2xvcjogd2hpdGU7IH1cblxuLmxpbmstd3JhcHBlciB7XG4gIGhlaWdodDogYXV0bztcbiAgdHJhbnNpdGlvbjogY29sb3IgMC4zcywgYmFja2dyb3VuZC1jb2xvciAwLjNzOyB9XG4gIC5saW5rLXdyYXBwZXI6aG92ZXIge1xuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC4xKTtcbiAgICBjb2xvcjogd2hpdGU7IH1cbiAgLmxpbmstd3JhcHBlciBhIHtcbiAgICBjb2xvcjogdmFyKC0tbWFpbi1jb2xvciwgIzNDOTcwMCk7XG4gICAgcGFkZGluZzogMTJweDtcbiAgICBkaXNwbGF5OiBibG9jaztcbiAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7IH1cblxuLmxlZnQtbWVudSAubGVmdC1tZW51LXNlcGFyYXRvciB7XG4gIG1hcmdpbjogMDsgfVxuXG5AbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gIC5sZWZ0LW1lbnUge1xuICAgIGRpc3BsYXk6IG5vbmU7IH0gfVxuXG4ub3ZlcnZpZXcge1xuICBncmlkLWFyZWE6IG92ZXJ2aWV3O1xuICBtYXgtd2lkdGg6IDEyODBweDtcbiAgd2lkdGg6IDEwMCU7XG4gIGZsZXg6IDEgMCBhdXRvO1xuICBtYXJnaW46IDAgYXV0bzsgfVxuXG4uY2FuaXVzZSB7XG4gIGdyaWQtYXJlYTogY2FuaXVzZTtcbiAgd2lkdGg6IDEwMCU7XG4gIGZsZXg6IDEgMCBhdXRvOyB9XG5cbi5jYW5pdXNlIHAge1xuICBtYXgtd2lkdGg6IDEyODBweDtcbiAgbWFyZ2luOiAwIGF1dG87IH1cblxuLnNwZWMtZG9jcyB7XG4gIGdyaWQtYXJlYTogc3BlYy1kb2NzO1xuICBwb3NpdGlvbjogc3RpY2t5O1xuICB0b3A6IDA7XG4gIGhlaWdodDogMjAwcHg7IH1cblxuLmNvbnRlbnQge1xuICBncmlkLWFyZWE6IGNvbnRlbnQ7IH1cblxuaHIge1xuICBib3JkZXItY29sb3I6IHZhcigtLW1haW4tY29sb3IsICMzQzk3MDApO1xuICBtYXJnaW46IDQ1cHggMDtcbiAgb3BhY2l0eTogMC4zOyB9XG5cbi5mb290ZXIge1xuICBmbGV4LXNocmluazogMDsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XHJcblxyXG48c2NyaXB0PlxyXG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xyXG5cdGxldCBmb290ZXI7XHJcblx0bGV0IGRvY2xpbmtzID0gW1xyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI2J1dHRvbi1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnQnV0dG9uJ1xyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aHJlZjogJyNjaGVja2JveC1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnQ2hlY2tib3gnXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI2NvbGxhcHNhYmxlLWxpc3QtZG9jJyxcclxuXHRcdFx0dGFyZ2V0OiAnJyxcclxuXHRcdFx0dGV4dDogJ0NvbGxhcHNhYmxlIExpc3QnXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI2ZlZWRiYWNrLWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdGZWVkYmFjaydcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjZm9vdGVyLWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdGb290ZXInXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI2hlYWRlci1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnSGVhZGVyJ1xyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aHJlZjogJyNpbnB1dC1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnSW5wdXQnXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI2xpbmstZG9jJyxcclxuXHRcdFx0dGFyZ2V0OiAnJyxcclxuXHRcdFx0dGV4dDogJ0xpbmsnXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI21vZGFsLWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdNb2RhbCdcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjbmF2aWdhdGlvbi1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnTmF2aWdhdGlvbidcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjcmFkaW8tZG9jJyxcclxuXHRcdFx0dGFyZ2V0OiAnJyxcclxuXHRcdFx0dGV4dDogJ1JhZGlvJ1xyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aHJlZjogJyNzZWFyY2hhYmxlLXNlbGVjdC1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnU2VhcmNoYWJsZSBzZWxlY3QnXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI3NlbGVjdC1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnU2VsZWN0J1xyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aHJlZjogJyN0b2FzdC1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnVG9hc3QnXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI3Rvb2x0aXAtZG9jJyxcclxuXHRcdFx0dGFyZ2V0OiAnJyxcclxuXHRcdFx0dGV4dDogJ1Rvb2x0aXAnXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI3RoZW1pbmctZG9jJyxcclxuXHRcdFx0dGFyZ2V0OiAnJyxcclxuXHRcdFx0dGV4dDogJ1RoZW1pbmcnXHJcblx0XHR9XHJcblx0XTtcclxuXHRvbk1vdW50KCgpID0+IHtcclxuXHRcdGZvb3Rlci5mb290ZXJsaW5rcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxyXG5cdFx0XHRcdHRleHQ6ICdHaXRodWInLFxyXG5cdFx0XHRcdHR5cGU6ICdzdGFuZGFyZCdcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhyZWY6ICdodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9Aem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxyXG5cdFx0XHRcdHRleHQ6ICdOUE0nLFxyXG5cdFx0XHRcdHR5cGU6ICdzdGFuZGFyZCdcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9KTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXVHd0IsSUFBSSxlQUFDLENBQUMsQUFDNUIsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLENBQ2QsTUFBTSxDQUFFLElBQUksQ0FDWixPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxNQUFNLENBQ3RCLFVBQVUsQ0FBRSxJQUFJLENBQUMsR0FBRyxD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 */";
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
				a.className = "svelte-1uvrh83";
				add_location(a, file, 59, 6, 2677);
				div.className = "link-wrapper svelte-1uvrh83";
				add_location(div, file, 58, 5, 2643);
				hr.className = "left-menu-separator svelte-1uvrh83";
				add_location(hr, file, 61, 5, 2757);
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
				add_location(app_header, file, 1, 1, 20);
				app_context0.id = "what";
				set_custom_element_data(app_context0, "text", "What is this project?");
				add_location(app_context0, file, 2, 1, 48);
				add_location(li0, file, 4, 2, 143);
				add_location(li1, file, 7, 2, 249);
				add_location(li2, file, 10, 2, 324);
				ul.className = "what-list svelte-1uvrh83";
				add_location(ul, file, 3, 1, 117);
				app_form.id = "app-form";
				add_location(app_form, file, 16, 3, 472);
				hr0.className = "svelte-1uvrh83";
				add_location(hr0, file, 17, 3, 512);
				app_buttons.id = "app-buttons";
				add_location(app_buttons, file, 18, 3, 521);
				hr1.className = "svelte-1uvrh83";
				add_location(hr1, file, 19, 3, 570);
				app_tooltip_and_feedback.id = "app-tooltip-and-feedback";
				add_location(app_tooltip_and_feedback, file, 20, 3, 579);
				hr2.className = "svelte-1uvrh83";
				add_location(hr2, file, 21, 3, 667);
				div0.className = "overview svelte-1uvrh83";
				add_location(div0, file, 15, 2, 445);
				set_custom_element_data(app_context1, "text", "When can I use it?");
				set_custom_element_data(app_context1, "backbtn", true);
				add_location(app_context1, file, 24, 3, 721);
				a0.href = "http://caniuse.com/#feat=shadowdomv1";
				add_location(a0, file, 27, 5, 956);
				p0.className = "ciu_embed svelte-1uvrh83";
				p0.dataset.feature = "shadowdomv1";
				p0.dataset.periods = "future_1,current,past_1,past_2";
				p0.dataset.accessibleColours = "false";
				add_location(p0, file, 26, 4, 823);
				a1.href = "http://caniuse.com/#feat=custom-elementsv1";
				add_location(a1, file, 30, 5, 1272);
				p1.className = "ciu_embed svelte-1uvrh83";
				p1.dataset.feature = "custom-elementsv1";
				p1.dataset.periods = "future_1,current,past_1,past_2";
				p1.dataset.accessibleColours = "false";
				add_location(p1, file, 29, 4, 1133);
				a2.href = "http://caniuse.com/#feat=template";
				add_location(a2, file, 33, 5, 1597);
				p2.className = "ciu_embed svelte-1uvrh83";
				p2.dataset.feature = "template";
				p2.dataset.periods = "future_1,current,past_1,past_2";
				p2.dataset.accessibleColours = "false";
				add_location(p2, file, 32, 4, 1467);
				div1.className = "desktop svelte-1uvrh83";
				add_location(div1, file, 25, 3, 796);
				a3.href = "http://caniuse.com/#feat=shadowdomv1";
				a3.target = "about:blank";
				a3.className = "svelte-1uvrh83";
				add_location(a3, file, 39, 33, 1877);
				attr(span0, "slot", "buttoncontent");
				add_location(span0, file, 39, 6, 1850);
				add_location(zoo_button0, file, 38, 5, 1830);
				div2.className = "back-btn svelte-1uvrh83";
				add_location(div2, file, 37, 4, 1801);
				a4.href = "http://caniuse.com/#feat=custom-elementsv1";
				a4.target = "about:blank";
				a4.className = "svelte-1uvrh83";
				add_location(a4, file, 44, 33, 2092);
				attr(span1, "slot", "buttoncontent");
				add_location(span1, file, 44, 6, 2065);
				add_location(zoo_button1, file, 43, 5, 2045);
				div3.className = "back-btn svelte-1uvrh83";
				add_location(div3, file, 42, 4, 2016);
				a5.href = "http://caniuse.com/#feat=template";
				a5.target = "about:blank";
				a5.className = "svelte-1uvrh83";
				add_location(a5, file, 49, 33, 2319);
				attr(span2, "slot", "buttoncontent");
				add_location(span2, file, 49, 6, 2292);
				add_location(zoo_button2, file, 48, 5, 2272);
				div4.className = "back-btn svelte-1uvrh83";
				add_location(div4, file, 47, 4, 2243);
				div5.className = "mobile svelte-1uvrh83";
				add_location(div5, file, 36, 3, 1775);
				div6.id = "when";
				div6.className = "caniuse svelte-1uvrh83";
				add_location(div6, file, 23, 2, 685);
				set_custom_element_data(app_context2, "text", "How can I use it?");
				set_custom_element_data(app_context2, "backbtn", true);
				add_location(app_context2, file, 55, 3, 2509);
				div7.className = "left-menu svelte-1uvrh83";
				add_location(div7, file, 56, 3, 2583);
				div8.id = "how";
				div8.className = "spec-docs svelte-1uvrh83";
				add_location(div8, file, 54, 2, 2472);
				docs_button.id = "button-doc";
				add_location(docs_button, file, 66, 3, 2853);
				hr3.className = "svelte-1uvrh83";
				add_location(hr3, file, 67, 3, 2902);
				docs_checkbox.id = "checkbox-doc";
				add_location(docs_checkbox, file, 68, 3, 2911);
				hr4.className = "svelte-1uvrh83";
				add_location(hr4, file, 69, 3, 2965);
				docs_collapsable_list.id = "collapsable-list-doc";
				add_location(docs_collapsable_list, file, 70, 3, 2974);
				hr5.className = "svelte-1uvrh83";
				add_location(hr5, file, 71, 3, 3052);
				docs_feedback.id = "feedback-doc";
				add_location(docs_feedback, file, 72, 3, 3061);
				hr6.className = "svelte-1uvrh83";
				add_location(hr6, file, 73, 3, 3115);
				docs_footer.id = "footer-doc";
				add_location(docs_footer, file, 74, 3, 3124);
				hr7.className = "svelte-1uvrh83";
				add_location(hr7, file, 75, 3, 3172);
				docs_header.id = "header-doc";
				add_location(docs_header, file, 76, 3, 3181);
				hr8.className = "svelte-1uvrh83";
				add_location(hr8, file, 77, 3, 3229);
				docs_input.id = "input-doc";
				add_location(docs_input, file, 78, 3, 3238);
				hr9.className = "svelte-1uvrh83";
				add_location(hr9, file, 79, 3, 3283);
				docs_link.id = "link-doc";
				add_location(docs_link, file, 80, 3, 3292);
				hr10.className = "svelte-1uvrh83";
				add_location(hr10, file, 81, 3, 3334);
				docs_modal.id = "modal-doc";
				add_location(docs_modal, file, 82, 3, 3343);
				hr11.className = "svelte-1uvrh83";
				add_location(hr11, file, 83, 3, 3388);
				docs_navigation.id = "navigation-doc";
				add_location(docs_navigation, file, 84, 3, 3397);
				hr12.className = "svelte-1uvrh83";
				add_location(hr12, file, 85, 3, 3457);
				docs_radio.id = "radio-doc";
				add_location(docs_radio, file, 86, 3, 3466);
				hr13.className = "svelte-1uvrh83";
				add_location(hr13, file, 87, 3, 3511);
				docs_searchable_select.id = "searchable-select-doc";
				add_location(docs_searchable_select, file, 88, 3, 3520);
				hr14.className = "svelte-1uvrh83";
				add_location(hr14, file, 89, 3, 3601);
				docs_select.id = "select-doc";
				add_location(docs_select, file, 90, 3, 3610);
				hr15.className = "svelte-1uvrh83";
				add_location(hr15, file, 91, 3, 3658);
				docs_toast.id = "toast-doc";
				add_location(docs_toast, file, 92, 3, 3667);
				hr16.className = "svelte-1uvrh83";
				add_location(hr16, file, 93, 3, 3712);
				docs_tooltip.id = "tooltip-doc";
				add_location(docs_tooltip, file, 94, 3, 3721);
				hr17.className = "svelte-1uvrh83";
				add_location(hr17, file, 95, 3, 3772);
				docs_theming.id = "theming-doc";
				add_location(docs_theming, file, 96, 3, 3781);
				hr18.className = "svelte-1uvrh83";
				add_location(hr18, file, 97, 3, 3832);
				div9.className = "content svelte-1uvrh83";
				add_location(div9, file, 65, 2, 2827);
				div10.className = "page-content svelte-1uvrh83";
				add_location(div10, file, 14, 1, 415);
				zoo_footer.className = "footer svelte-1uvrh83";
				set_custom_element_data(zoo_footer, "copyright", "zooplus AG");
				add_location(zoo_footer, file, 100, 1, 3858);
				div11.className = "app svelte-1uvrh83";
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
			if (!document.getElementById("svelte-1uvrh83-style")) add_css();
			init(this, options, instance, create_fragment, safe_not_equal, []);
		}
	}

	const app = new App({
		target: document.body
	});

	return app;

}());
