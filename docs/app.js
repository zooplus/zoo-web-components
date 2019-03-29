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
		style.id = 'svelte-1eyx8ju-style';
		style.textContent = ":root{--main-color:#3C9700;--main-color-light:#66B100;--main-color-dark:#286400;--secondary-color:#FF6200;--secondary-color-light:#FF8800;--secondary-color-dark:#CC4E00}.app.svelte-1eyx8ju{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:15px 0px 40px 0px rgba(85, 85, 85, 0.3), -15px 0px 40px 0px rgba(85, 85, 85, 0.3)}.page-content.svelte-1eyx8ju{position:relative;display:grid;grid-template-columns:400px 1fr;grid-gap:30px;grid-template-areas:\"overview overview\" \"caniuse caniuse\" \"spec-docs content\"}.what-list.svelte-1eyx8ju{color:var(--main-color);font-size:20px}.link-wrapper.svelte-1eyx8ju{height:auto;padding:12px}.left-menu-separator.svelte-1eyx8ju{margin:0}.overview.svelte-1eyx8ju{grid-area:overview;max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}.caniuse.svelte-1eyx8ju{grid-area:caniuse;width:100%;flex:1 0 auto}.caniuse.svelte-1eyx8ju p.svelte-1eyx8ju{max-width:1280px;margin:0 auto}.spec-docs.svelte-1eyx8ju{grid-area:spec-docs;position:sticky;top:0;height:500px}.content.svelte-1eyx8ju{grid-area:content}hr.svelte-1eyx8ju{display:absolute;color:var(--main-color);margin:45px 0}.footer.svelte-1eyx8ju{flex-shrink:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwiYXBwXCI+XG5cdDxhcHAtaGVhZGVyPjwvYXBwLWhlYWRlcj5cblx0PGFwcC1jb250ZXh0IGlkPVwid2hhdFwiIHRleHQ9XCJXaGF0IGlzIHRoaXMgcHJvamVjdD9cIj48L2FwcC1jb250ZXh0PlxuXHQ8dWwgY2xhc3M9XCJ3aGF0LWxpc3RcIj5cblx0XHQ8bGk+XG5cdFx0XHRTZXQgb2Ygd2ViLWNvbXBvbmVudHMgd2hpY2ggY2FuIGJlIHVzZWQgaW4gYW55IG1vZGVybiBVSSBmcmFtZXdvcmsuXG5cdFx0PC9saT5cblx0XHQ8bGk+XG5cdFx0XHRUaGUgd2ViLWNvbXBvbmVudCBzZXQgaW1wbGVtZW50cyBaKyBzaG9wIHN0eWxlIGd1aWRlLCB3aGljaCBpcyBkZXNjcmliZWQgaGVyZTogaHR0cHM6Ly96b29wbHVzLmludmlzaW9uYXBwLmNvbS9zaGFyZS9YV05YTzA0OVpBRCMvc2NyZWVucy8zMjM4OTM5NjAuXG5cdFx0PC9saT5cblx0XHQ8bGk+XG5cdFx0XHRGdXR1cmUgcmVsZWFzZXMgd2lsbCBpbmNsdWRlIHRoZW1pbmcsIG1vcmUgY29tcG9uZW50cywgRVNNIHN1cHBvcnQuXG5cdFx0PC9saT5cblx0PC91bD5cblx0PGRpdiBjbGFzcz1cInBhZ2UtY29udGVudFwiPlxuXHRcdDxkaXYgY2xhc3M9XCJvdmVydmlld1wiPlxuXHRcdFx0PGFwcC1mb3JtIGlkPVwiYXBwLWZvcm1cIj48L2FwcC1mb3JtPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGFwcC1idXR0b25zIGlkPVwiYXBwLWJ1dHRvbnNcIj48L2FwcC1idXR0b25zPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGFwcC10b29sdGlwLWFuZC1mZWVkYmFjayBpZD1cImFwcC10b29sdGlwLWFuZC1mZWVkYmFja1wiPjwvYXBwLXRvb2x0aXAtYW5kLWZlZWRiYWNrPlxuXHRcdFx0PGhyPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgaWQ9XCJ3aGVuXCIgY2xhc3M9XCJjYW5pdXNlXCI+XG5cdFx0XHQ8YXBwLWNvbnRleHQgdGV4dD1cIldoZXJlIGNhbiBJIHVzZSBpdD9cIj48L2FwcC1jb250ZXh0PlxuXHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJzaGFkb3dkb212MVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1zaGFkb3dkb212MVwiPkNhbiBJIFVzZSBzaGFkb3dkb212MT88L2E+IERhdGEgb24gc3VwcG9ydCBmb3IgdGhlIHNoYWRvd2RvbXYxIGZlYXR1cmUgYWNyb3NzIHRoZSBtYWpvciBicm93c2VycyBmcm9tIGNhbml1c2UuY29tLlxuXHRcdFx0PC9wPlxuXHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJjdXN0b20tZWxlbWVudHN2MVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1jdXN0b20tZWxlbWVudHN2MVwiPkNhbiBJIFVzZSBjdXN0b20tZWxlbWVudHN2MT88L2E+IERhdGEgb24gc3VwcG9ydCBmb3IgdGhlIGN1c3RvbS1lbGVtZW50c3YxIGZlYXR1cmUgYWNyb3NzIHRoZSBtYWpvciBicm93c2VycyBmcm9tIGNhbml1c2UuY29tLlxuXHRcdFx0PC9wPlxuXHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJ0ZW1wbGF0ZVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD10ZW1wbGF0ZVwiPkNhbiBJIFVzZSB0ZW1wbGF0ZT88L2E+IERhdGEgb24gc3VwcG9ydCBmb3IgdGhlIHRlbXBsYXRlIGZlYXR1cmUgYWNyb3NzIHRoZSBtYWpvciBicm93c2VycyBmcm9tIGNhbml1c2UuY29tLlxuXHRcdFx0PC9wPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgaWQ9XCJob3dcIiBjbGFzcz1cInNwZWMtZG9jc1wiPlxuXHRcdFx0PGFwcC1jb250ZXh0IHRleHQ9XCJIb3cgY2FuIEkgdXNlIGl0P1wiPjwvYXBwLWNvbnRleHQ+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwibGVmdC1tZW51XCI+XG5cdFx0XHRcdHsjZWFjaCBkb2NsaW5rcyBhcyBsaW5rfVxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJsaW5rLXdyYXBwZXJcIj5cblx0XHRcdFx0XHRcdDx6b28tbGluayBocmVmPVwie2xpbmsuaHJlZn1cIiB0YXJnZXQ9XCJ7bGluay50YXJnZXR9XCIgdHlwZT1cIntsaW5rLnR5cGV9XCIgdGV4dD1cIntsaW5rLnRleHR9XCIgdGV4dGFsaWduPVwibGVmdFwiPjwvem9vLWxpbms+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGhyIGNsYXNzPVwibGVmdC1tZW51LXNlcGFyYXRvclwiPlxuXHRcdFx0XHR7L2VhY2h9XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuXHRcdFx0PGRvY3MtYnV0dG9uICBpZD1cImJ1dHRvbi1kb2NcIj48L2RvY3MtYnV0dG9uPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtY2hlY2tib3ggaWQ9XCJjaGVja2JveC1kb2NcIj48L2RvY3MtY2hlY2tib3g+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1jb2xsYXBzYWJsZS1saXN0IGlkPVwiY29sbGFwc2FibGUtbGlzdC1kb2NcIj48L2RvY3MtY29sbGFwc2FibGUtbGlzdD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWZlZWRiYWNrIGlkPVwiZmVlZGJhY2stZG9jXCI+PC9kb2NzLWZlZWRiYWNrPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtZm9vdGVyIGlkPVwiZm9vdGVyLWRvY1wiPjwvZG9jcy1mb290ZXI+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1oZWFkZXIgaWQ9XCJoZWFkZXItZG9jXCI+PC9kb2NzLWhlYWRlcj5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWlucHV0IGlkPVwiaW5wdXQtZG9jXCI+PC9kb2NzLWlucHV0PlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtbGluayBpZD1cImxpbmstZG9jXCI+PC9kb2NzLWxpbms+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1tb2RhbCBpZD1cIm1vZGFsLWRvY1wiPjwvZG9jcy1tb2RhbD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLW5hdmlnYXRpb24gaWQ9XCJuYXZpZ2F0aW9uLWRvY1wiPjwvZG9jcy1uYXZpZ2F0aW9uPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtcmFkaW8gaWQ9XCJyYWRpby1kb2NcIj48L2RvY3MtcmFkaW8+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1zZWFyY2hhYmxlLXNlbGVjdCBpZD1cInNlYXJjaGFibGUtc2VsZWN0LWRvY1wiPjwvZG9jcy1zZWFyY2hhYmxlLXNlbGVjdD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLXNlbGVjdCBpZD1cInNlbGVjdC1kb2NcIj48L2RvY3Mtc2VsZWN0PlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtdG9hc3QgaWQ9XCJ0b2FzdC1kb2NcIj48L2RvY3MtdG9hc3Q+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy10b29sdGlwIGlkPVwidG9vbHRpcC1kb2NcIj48L2RvY3MtdG9vbHRpcD5cblx0XHRcdDxocj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+XG5cdDx6b28tZm9vdGVyIGNsYXNzPVwiZm9vdGVyXCIgYmluZDp0aGlzPXtmb290ZXJ9Pjwvem9vLWZvb3Rlcj4gXG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj46cm9vdCB7XG4gIC0tbWFpbi1jb2xvcjogIzNDOTcwMDtcbiAgLS1tYWluLWNvbG9yLWxpZ2h0OiAjNjZCMTAwO1xuICAtLW1haW4tY29sb3ItZGFyazogIzI4NjQwMDtcbiAgLS1zZWNvbmRhcnktY29sb3I6ICNGRjYyMDA7XG4gIC0tc2Vjb25kYXJ5LWNvbG9yLWxpZ2h0OiAjRkY4ODAwO1xuICAtLXNlY29uZGFyeS1jb2xvci1kYXJrOiAjQ0M0RTAwOyB9XG5cbi5hcHAge1xuICBtYXJnaW46IDAgYXV0bztcbiAgaGVpZ2h0OiAxMDAlO1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBib3gtc2hhZG93OiAxNXB4IDBweCA0MHB4IDBweCByZ2JhKDg1LCA4NSwgODUsIDAuMyksIC0xNXB4IDBweCA0MHB4IDBweCByZ2JhKDg1LCA4NSwgODUsIDAuMyk7IH1cblxuLnBhZ2UtY29udGVudCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiA0MDBweCAxZnI7XG4gIGdyaWQtZ2FwOiAzMHB4O1xuICBncmlkLXRlbXBsYXRlLWFyZWFzOiBcIm92ZXJ2aWV3IG92ZXJ2aWV3XCIgXCJjYW5pdXNlIGNhbml1c2VcIiBcInNwZWMtZG9jcyBjb250ZW50XCI7IH1cblxuLndoYXQtbGlzdCB7XG4gIGNvbG9yOiB2YXIoLS1tYWluLWNvbG9yKTtcbiAgZm9udC1zaXplOiAyMHB4OyB9XG5cbi5saW5rLXdyYXBwZXIge1xuICBoZWlnaHQ6IGF1dG87XG4gIHBhZGRpbmc6IDEycHg7IH1cblxuLmxlZnQtbWVudS1zZXBhcmF0b3Ige1xuICBtYXJnaW46IDA7IH1cblxuLm92ZXJ2aWV3IHtcbiAgZ3JpZC1hcmVhOiBvdmVydmlldztcbiAgbWF4LXdpZHRoOiAxMjgwcHg7XG4gIHdpZHRoOiAxMDAlO1xuICBmbGV4OiAxIDAgYXV0bztcbiAgbWFyZ2luOiAwIGF1dG87IH1cblxuLmNhbml1c2Uge1xuICBncmlkLWFyZWE6IGNhbml1c2U7XG4gIHdpZHRoOiAxMDAlO1xuICBmbGV4OiAxIDAgYXV0bzsgfVxuXG4uY2FuaXVzZSBwIHtcbiAgbWF4LXdpZHRoOiAxMjgwcHg7XG4gIG1hcmdpbjogMCBhdXRvOyB9XG5cbi5zcGVjLWRvY3Mge1xuICBncmlkLWFyZWE6IHNwZWMtZG9jcztcbiAgcG9zaXRpb246IHN0aWNreTtcbiAgdG9wOiAwO1xuICBoZWlnaHQ6IDUwMHB4OyB9XG5cbi5jb250ZW50IHtcbiAgZ3JpZC1hcmVhOiBjb250ZW50OyB9XG5cbmhyIHtcbiAgZGlzcGxheTogYWJzb2x1dGU7XG4gIGNvbG9yOiB2YXIoLS1tYWluLWNvbG9yKTtcbiAgbWFyZ2luOiA0NXB4IDA7IH1cblxuLmZvb3RlciB7XG4gIGZsZXgtc2hyaW5rOiAwOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cblxuPHNjcmlwdD5cblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XG5cdGxldCBmb290ZXI7XG5cdGxldCBkb2NsaW5rcyA9IFtcblx0XHR7XG5cdFx0XHRocmVmOiAnI2J1dHRvbi1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHR5cGU6ICdncmVlbicsXG5cdFx0XHR0ZXh0OiAnQnV0dG9uIERvYydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjY2hlY2tib3gtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0eXBlOiAnZ3JlZW4nLFxuXHRcdFx0dGV4dDogJ0NoZWNrYm94IERvYydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjY29sbGFwc2FibGUtbGlzdC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHR5cGU6ICdncmVlbicsXG5cdFx0XHR0ZXh0OiAnQ29sbGFwc2FibGUgTGlzdCBEb2MnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI2ZlZWRiYWNrLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dHlwZTogJ2dyZWVuJyxcblx0XHRcdHRleHQ6ICdGZWVkYmFjayBEb2MnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI2Zvb3Rlci1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHR5cGU6ICdncmVlbicsXG5cdFx0XHR0ZXh0OiAnRm9vdGVyIERvYydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjaGVhZGVyLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dHlwZTogJ2dyZWVuJyxcblx0XHRcdHRleHQ6ICdIZWFkZXIgRG9jJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNpbnB1dC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHR5cGU6ICdncmVlbicsXG5cdFx0XHR0ZXh0OiAnSW5wdXQgRG9jJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNsaW5rLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dHlwZTogJ2dyZWVuJyxcblx0XHRcdHRleHQ6ICdMaW5rIERvYydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjbW9kYWwtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0eXBlOiAnZ3JlZW4nLFxuXHRcdFx0dGV4dDogJ01vZGFsIERvYydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjbmF2aWdhdGlvbi1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHR5cGU6ICdncmVlbicsXG5cdFx0XHR0ZXh0OiAnTmF2aWdhdGlvbiBEb2MnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI3JhZGlvLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dHlwZTogJ2dyZWVuJyxcblx0XHRcdHRleHQ6ICdSYWRpbyBEb2MnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI3NlYXJjaGFibGUtc2VsZWN0LWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dHlwZTogJ2dyZWVuJyxcblx0XHRcdHRleHQ6ICdTZWFyY2hhYmxlIHNlbGVjdCBEb2MnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI3NlbGVjdC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHR5cGU6ICdncmVlbicsXG5cdFx0XHR0ZXh0OiAnU2VsZWN0IERvYydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjdG9hc3QtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0eXBlOiAnZ3JlZW4nLFxuXHRcdFx0dGV4dDogJ1RvYXN0IERvYydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjdG9vbHRpcC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHR5cGU6ICdncmVlbicsXG5cdFx0XHR0ZXh0OiAnVG9vbHRpcCBEb2MnXG5cdFx0fVxuXHRdO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRmb290ZXIuZm9vdGVybGlua3MgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdGhyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxuXHRcdFx0XHR0ZXh0OiAnR2l0aHViJyxcblx0XHRcdFx0dHlwZTogJ3N0YW5kYXJkJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL0B6b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXG5cdFx0XHRcdHRleHQ6ICdOUE0nLFxuXHRcdFx0XHR0eXBlOiAnc3RhbmRhcmQnXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRocmVmOiAnaHR0cHM6Ly96b29wbHVzLmludmlzaW9uYXBwLmNvbS9zaGFyZS9YV05YTzA0OVpBRCMvc2NyZWVucycsXG5cdFx0XHRcdHRleHQ6ICdTdHlsZSBndWlkZScsXG5cdFx0XHRcdHR5cGU6ICdzdGFuZGFyZCdcblx0XHRcdH1cblx0XHRdO1xuXHR9KTtcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFrRndCLEtBQUssQUFBQyxDQUFDLEFBQzdCLFlBQVksQ0FBRSxPQUFPLENBQ3JCLGtCQUFrQixDQUFFLE9BQU8sQ0FDM0IsaUJBQWlCLENBQUUsT0FBTyxDQUMxQixpQkFBaUIsQ0FBRSxPQUFPLENBQzFCLHVCQUF1QixDQUFFLE9BQU8sQ0FDaEMsc0JBQXNCLENBQUUsT0FBTyxBQUFFLENBQUMsQUFFcEMsSUFBSSxlQUFDLENBQUMsQUFDSixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FDZCxNQUFNLENBQUUsSUFBSSxDQUNaLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLE1BQU0sQ0FDdEIsVUFBVSxDQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUUsQ0FBQyxBQUVsRyxhQUFhLGVBQUMsQ0FBQyxBQUNiLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxJQUFJLENBQ2IscUJBQXFCLENBQUUsS0FBSyxDQUFDLEdBQUcsQ0FDaEMsUUFBUSxDQUFFLElBQUksQ0FDZCxtQkFBbUIsQ0FBRSxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQUFBRSxDQUFDLEFBRW5GLFVBQVUsZUFBQyxDQUFDLEFBQ1YsS0FBSyxDQUFFLElBQUksWUFBWSxDQUFDLENBQ3hCLFNBQVMsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUVwQixhQUFhLGVBQUMsQ0FBQyxBQUNiLE1BQU0sQ0FBRSxJQUFJLENBQ1osT0FBTyxDQUFFLElBQUksQUFBRSxDQUFDLEFBRWxCLG9CQUFvQixlQUFDLENBQUMsQUFDcEIsTUFBTSxDQUFFLENBQUMsQUFBRSxDQUFDLEFBRWQsU0FBUyxlQUFDLENBQUMsQUFDVCxTQUFTLENBQUUsUUFBUSxDQUNuQixTQUFTLENBQUUsTUFBTSxDQUNqQixLQUFLLENBQUUsSUFBSSxDQUNYLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDZCxNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBRW5CLFFBQVEsZUFBQyxDQUFDLEFBQ1IsU0FBUyxDQUFFLE9BQU8sQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQix1QkFBUSxDQUFDLENBQUMsZUFBQyxDQUFDLEFBQ1YsU0FBUyxDQUFFLE1BQU0sQ0FDakIsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixVQUFVLGVBQUMsQ0FBQyxBQUNWLFNBQVMsQ0FBRSxTQUFTLENBQ3BCLFFBQVEsQ0FBRSxNQUFNLENBQ2hCLEdBQUcsQ0FBRSxDQUFDLENBQ04sTUFBTSxDQUFFLEtBQUssQUFBRSxDQUFDLEFBRWxCLFFBQVEsZUFBQyxDQUFDLEFBQ1IsU0FBUyxDQUFFLE9BQU8sQUFBRSxDQUFDLEFBRXZCLEVBQUUsZUFBQyxDQUFDLEFBQ0YsT0FBTyxDQUFFLFFBQVEsQ0FDakIsS0FBSyxDQUFFLElBQUksWUFBWSxDQUFDLENBQ3hCLE1BQU0sQ0FBRSxJQUFJLENBQUMsQ0FBQyxBQUFFLENBQUMsQUFFbkIsT0FBTyxlQUFDLENBQUMsQUFDUCxXQUFXLENBQUUsQ0FBQyxBQUFFLENBQUMifQ== */";
		append(document.head, style);
	}

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.link = list[i];
		return child_ctx;
	}

	// (39:4) {#each doclinks as link}
	function create_each_block(ctx) {
		var div, zoo_link, zoo_link_href_value, zoo_link_target_value, zoo_link_type_value, zoo_link_text_value, t, hr;

		return {
			c: function create() {
				div = element("div");
				zoo_link = element("zoo-link");
				t = space();
				hr = element("hr");
				set_custom_element_data(zoo_link, "href", zoo_link_href_value = ctx.link.href);
				set_custom_element_data(zoo_link, "target", zoo_link_target_value = ctx.link.target);
				set_custom_element_data(zoo_link, "type", zoo_link_type_value = ctx.link.type);
				set_custom_element_data(zoo_link, "text", zoo_link_text_value = ctx.link.text);
				set_custom_element_data(zoo_link, "textalign", "left");
				zoo_link.className = "svelte-1eyx8ju";
				add_location(zoo_link, file, 40, 6, 1953);
				div.className = "link-wrapper svelte-1eyx8ju";
				add_location(div, file, 39, 5, 1920);
				hr.className = "left-menu-separator svelte-1eyx8ju";
				add_location(hr, file, 42, 5, 2089);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, zoo_link);
				insert(target, t, anchor);
				insert(target, hr, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
					detach(t);
					detach(hr);
				}
			}
		};
	}

	function create_fragment(ctx) {
		var div6, app_header, t0, app_context0, t1, ul, li0, t3, li1, t5, li2, t7, div5, div0, app_form, t8, hr0, t9, app_buttons, t10, hr1, t11, app_tooltip_and_feedback, t12, hr2, t13, div1, app_context1, t14, p0, a0, t16, t17, p1, a1, t19, t20, p2, a2, t22, t23, div3, app_context2, t24, div2, t25, div4, docs_button, t26, hr3, t27, docs_checkbox, t28, hr4, t29, docs_collapsable_list, t30, hr5, t31, docs_feedback, t32, hr6, t33, docs_footer, t34, hr7, t35, docs_header, t36, hr8, t37, docs_input, t38, hr9, t39, docs_link, t40, hr10, t41, docs_modal, t42, hr11, t43, docs_navigation, t44, hr12, t45, docs_radio, t46, hr13, t47, docs_searchable_select, t48, hr14, t49, docs_select, t50, hr15, t51, docs_toast, t52, hr16, t53, docs_tooltip, t54, hr17, t55, zoo_footer;

		var each_value = ctx.doclinks;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		return {
			c: function create() {
				div6 = element("div");
				app_header = element("app-header");
				t0 = space();
				app_context0 = element("app-context");
				t1 = space();
				ul = element("ul");
				li0 = element("li");
				li0.textContent = "Set of web-components which can be used in any modern UI framework.";
				t3 = space();
				li1 = element("li");
				li1.textContent = "The web-component set implements Z+ shop style guide, which is described here: https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens/323893960.";
				t5 = space();
				li2 = element("li");
				li2.textContent = "Future releases will include theming, more components, ESM support.";
				t7 = space();
				div5 = element("div");
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
				div1 = element("div");
				app_context1 = element("app-context");
				t14 = space();
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
				div3 = element("div");
				app_context2 = element("app-context");
				t24 = space();
				div2 = element("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t25 = space();
				div4 = element("div");
				docs_button = element("docs-button");
				t26 = space();
				hr3 = element("hr");
				t27 = space();
				docs_checkbox = element("docs-checkbox");
				t28 = space();
				hr4 = element("hr");
				t29 = space();
				docs_collapsable_list = element("docs-collapsable-list");
				t30 = space();
				hr5 = element("hr");
				t31 = space();
				docs_feedback = element("docs-feedback");
				t32 = space();
				hr6 = element("hr");
				t33 = space();
				docs_footer = element("docs-footer");
				t34 = space();
				hr7 = element("hr");
				t35 = space();
				docs_header = element("docs-header");
				t36 = space();
				hr8 = element("hr");
				t37 = space();
				docs_input = element("docs-input");
				t38 = space();
				hr9 = element("hr");
				t39 = space();
				docs_link = element("docs-link");
				t40 = space();
				hr10 = element("hr");
				t41 = space();
				docs_modal = element("docs-modal");
				t42 = space();
				hr11 = element("hr");
				t43 = space();
				docs_navigation = element("docs-navigation");
				t44 = space();
				hr12 = element("hr");
				t45 = space();
				docs_radio = element("docs-radio");
				t46 = space();
				hr13 = element("hr");
				t47 = space();
				docs_searchable_select = element("docs-searchable-select");
				t48 = space();
				hr14 = element("hr");
				t49 = space();
				docs_select = element("docs-select");
				t50 = space();
				hr15 = element("hr");
				t51 = space();
				docs_toast = element("docs-toast");
				t52 = space();
				hr16 = element("hr");
				t53 = space();
				docs_tooltip = element("docs-tooltip");
				t54 = space();
				hr17 = element("hr");
				t55 = space();
				zoo_footer = element("zoo-footer");
				app_header.className = "svelte-1eyx8ju";
				add_location(app_header, file, 1, 1, 19);
				app_context0.id = "what";
				set_custom_element_data(app_context0, "text", "What is this project?");
				app_context0.className = "svelte-1eyx8ju";
				add_location(app_context0, file, 2, 1, 46);
				li0.className = "svelte-1eyx8ju";
				add_location(li0, file, 4, 2, 139);
				li1.className = "svelte-1eyx8ju";
				add_location(li1, file, 7, 2, 225);
				li2.className = "svelte-1eyx8ju";
				add_location(li2, file, 10, 2, 392);
				ul.className = "what-list svelte-1eyx8ju";
				add_location(ul, file, 3, 1, 114);
				app_form.id = "app-form";
				app_form.className = "svelte-1eyx8ju";
				add_location(app_form, file, 16, 3, 539);
				hr0.className = "svelte-1eyx8ju";
				add_location(hr0, file, 17, 3, 578);
				app_buttons.id = "app-buttons";
				app_buttons.className = "svelte-1eyx8ju";
				add_location(app_buttons, file, 18, 3, 586);
				hr1.className = "svelte-1eyx8ju";
				add_location(hr1, file, 19, 3, 634);
				app_tooltip_and_feedback.id = "app-tooltip-and-feedback";
				app_tooltip_and_feedback.className = "svelte-1eyx8ju";
				add_location(app_tooltip_and_feedback, file, 20, 3, 642);
				hr2.className = "svelte-1eyx8ju";
				add_location(hr2, file, 21, 3, 729);
				div0.className = "overview svelte-1eyx8ju";
				add_location(div0, file, 15, 2, 513);
				set_custom_element_data(app_context1, "text", "Where can I use it?");
				app_context1.className = "svelte-1eyx8ju";
				add_location(app_context1, file, 24, 3, 780);
				a0.href = "http://caniuse.com/#feat=shadowdomv1";
				a0.className = "svelte-1eyx8ju";
				add_location(a0, file, 26, 4, 969);
				p0.className = "ciu_embed svelte-1eyx8ju";
				p0.dataset.feature = "shadowdomv1";
				p0.dataset.periods = "future_1,current,past_1,past_2";
				p0.dataset.accessibleColours = "false";
				add_location(p0, file, 25, 3, 838);
				a1.href = "http://caniuse.com/#feat=custom-elementsv1";
				a1.className = "svelte-1eyx8ju";
				add_location(a1, file, 29, 4, 1279);
				p1.className = "ciu_embed svelte-1eyx8ju";
				p1.dataset.feature = "custom-elementsv1";
				p1.dataset.periods = "future_1,current,past_1,past_2";
				p1.dataset.accessibleColours = "false";
				add_location(p1, file, 28, 3, 1142);
				a2.href = "http://caniuse.com/#feat=template";
				a2.className = "svelte-1eyx8ju";
				add_location(a2, file, 32, 4, 1598);
				p2.className = "ciu_embed svelte-1eyx8ju";
				p2.dataset.feature = "template";
				p2.dataset.periods = "future_1,current,past_1,past_2";
				p2.dataset.accessibleColours = "false";
				add_location(p2, file, 31, 3, 1470);
				div1.id = "when";
				div1.className = "caniuse svelte-1eyx8ju";
				add_location(div1, file, 23, 2, 745);
				set_custom_element_data(app_context2, "text", "How can I use it?");
				app_context2.className = "svelte-1eyx8ju";
				add_location(app_context2, file, 36, 3, 1806);
				div2.className = "left-menu svelte-1eyx8ju";
				add_location(div2, file, 37, 3, 1862);
				div3.id = "how";
				div3.className = "spec-docs svelte-1eyx8ju";
				add_location(div3, file, 35, 2, 1770);
				docs_button.id = "button-doc";
				docs_button.className = "svelte-1eyx8ju";
				add_location(docs_button, file, 47, 3, 2180);
				hr3.className = "svelte-1eyx8ju";
				add_location(hr3, file, 48, 3, 2228);
				docs_checkbox.id = "checkbox-doc";
				docs_checkbox.className = "svelte-1eyx8ju";
				add_location(docs_checkbox, file, 49, 3, 2236);
				hr4.className = "svelte-1eyx8ju";
				add_location(hr4, file, 50, 3, 2289);
				docs_collapsable_list.id = "collapsable-list-doc";
				docs_collapsable_list.className = "svelte-1eyx8ju";
				add_location(docs_collapsable_list, file, 51, 3, 2297);
				hr5.className = "svelte-1eyx8ju";
				add_location(hr5, file, 52, 3, 2374);
				docs_feedback.id = "feedback-doc";
				docs_feedback.className = "svelte-1eyx8ju";
				add_location(docs_feedback, file, 53, 3, 2382);
				hr6.className = "svelte-1eyx8ju";
				add_location(hr6, file, 54, 3, 2435);
				docs_footer.id = "footer-doc";
				docs_footer.className = "svelte-1eyx8ju";
				add_location(docs_footer, file, 55, 3, 2443);
				hr7.className = "svelte-1eyx8ju";
				add_location(hr7, file, 56, 3, 2490);
				docs_header.id = "header-doc";
				docs_header.className = "svelte-1eyx8ju";
				add_location(docs_header, file, 57, 3, 2498);
				hr8.className = "svelte-1eyx8ju";
				add_location(hr8, file, 58, 3, 2545);
				docs_input.id = "input-doc";
				docs_input.className = "svelte-1eyx8ju";
				add_location(docs_input, file, 59, 3, 2553);
				hr9.className = "svelte-1eyx8ju";
				add_location(hr9, file, 60, 3, 2597);
				docs_link.id = "link-doc";
				docs_link.className = "svelte-1eyx8ju";
				add_location(docs_link, file, 61, 3, 2605);
				hr10.className = "svelte-1eyx8ju";
				add_location(hr10, file, 62, 3, 2646);
				docs_modal.id = "modal-doc";
				docs_modal.className = "svelte-1eyx8ju";
				add_location(docs_modal, file, 63, 3, 2654);
				hr11.className = "svelte-1eyx8ju";
				add_location(hr11, file, 64, 3, 2698);
				docs_navigation.id = "navigation-doc";
				docs_navigation.className = "svelte-1eyx8ju";
				add_location(docs_navigation, file, 65, 3, 2706);
				hr12.className = "svelte-1eyx8ju";
				add_location(hr12, file, 66, 3, 2765);
				docs_radio.id = "radio-doc";
				docs_radio.className = "svelte-1eyx8ju";
				add_location(docs_radio, file, 67, 3, 2773);
				hr13.className = "svelte-1eyx8ju";
				add_location(hr13, file, 68, 3, 2817);
				docs_searchable_select.id = "searchable-select-doc";
				docs_searchable_select.className = "svelte-1eyx8ju";
				add_location(docs_searchable_select, file, 69, 3, 2825);
				hr14.className = "svelte-1eyx8ju";
				add_location(hr14, file, 70, 3, 2905);
				docs_select.id = "select-doc";
				docs_select.className = "svelte-1eyx8ju";
				add_location(docs_select, file, 71, 3, 2913);
				hr15.className = "svelte-1eyx8ju";
				add_location(hr15, file, 72, 3, 2960);
				docs_toast.id = "toast-doc";
				docs_toast.className = "svelte-1eyx8ju";
				add_location(docs_toast, file, 73, 3, 2968);
				hr16.className = "svelte-1eyx8ju";
				add_location(hr16, file, 74, 3, 3012);
				docs_tooltip.id = "tooltip-doc";
				docs_tooltip.className = "svelte-1eyx8ju";
				add_location(docs_tooltip, file, 75, 3, 3020);
				hr17.className = "svelte-1eyx8ju";
				add_location(hr17, file, 76, 3, 3070);
				div4.className = "content svelte-1eyx8ju";
				add_location(div4, file, 46, 2, 2155);
				div5.className = "page-content svelte-1eyx8ju";
				add_location(div5, file, 14, 1, 484);
				zoo_footer.className = "footer svelte-1eyx8ju";
				add_location(zoo_footer, file, 79, 1, 3093);
				div6.className = "app svelte-1eyx8ju";
				add_location(div6, file, 0, 0, 0);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div6, anchor);
				append(div6, app_header);
				append(div6, t0);
				append(div6, app_context0);
				append(div6, t1);
				append(div6, ul);
				append(ul, li0);
				append(ul, t3);
				append(ul, li1);
				append(ul, t5);
				append(ul, li2);
				append(div6, t7);
				append(div6, div5);
				append(div5, div0);
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
				append(div5, t13);
				append(div5, div1);
				append(div1, app_context1);
				append(div1, t14);
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
				append(div5, t23);
				append(div5, div3);
				append(div3, app_context2);
				append(div3, t24);
				append(div3, div2);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div2, null);
				}

				append(div5, t25);
				append(div5, div4);
				append(div4, docs_button);
				append(div4, t26);
				append(div4, hr3);
				append(div4, t27);
				append(div4, docs_checkbox);
				append(div4, t28);
				append(div4, hr4);
				append(div4, t29);
				append(div4, docs_collapsable_list);
				append(div4, t30);
				append(div4, hr5);
				append(div4, t31);
				append(div4, docs_feedback);
				append(div4, t32);
				append(div4, hr6);
				append(div4, t33);
				append(div4, docs_footer);
				append(div4, t34);
				append(div4, hr7);
				append(div4, t35);
				append(div4, docs_header);
				append(div4, t36);
				append(div4, hr8);
				append(div4, t37);
				append(div4, docs_input);
				append(div4, t38);
				append(div4, hr9);
				append(div4, t39);
				append(div4, docs_link);
				append(div4, t40);
				append(div4, hr10);
				append(div4, t41);
				append(div4, docs_modal);
				append(div4, t42);
				append(div4, hr11);
				append(div4, t43);
				append(div4, docs_navigation);
				append(div4, t44);
				append(div4, hr12);
				append(div4, t45);
				append(div4, docs_radio);
				append(div4, t46);
				append(div4, hr13);
				append(div4, t47);
				append(div4, docs_searchable_select);
				append(div4, t48);
				append(div4, hr14);
				append(div4, t49);
				append(div4, docs_select);
				append(div4, t50);
				append(div4, hr15);
				append(div4, t51);
				append(div4, docs_toast);
				append(div4, t52);
				append(div4, hr16);
				append(div4, t53);
				append(div4, docs_tooltip);
				append(div4, t54);
				append(div4, hr17);
				append(div6, t55);
				append(div6, zoo_footer);
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
							each_blocks[i].m(div2, null);
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
					detach(div6);
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
				type: 'green',
				text: 'Button Doc'
			},
			{
				href: '#checkbox-doc',
				target: '',
				type: 'green',
				text: 'Checkbox Doc'
			},
			{
				href: '#collapsable-list-doc',
				target: '',
				type: 'green',
				text: 'Collapsable List Doc'
			},
			{
				href: '#feedback-doc',
				target: '',
				type: 'green',
				text: 'Feedback Doc'
			},
			{
				href: '#footer-doc',
				target: '',
				type: 'green',
				text: 'Footer Doc'
			},
			{
				href: '#header-doc',
				target: '',
				type: 'green',
				text: 'Header Doc'
			},
			{
				href: '#input-doc',
				target: '',
				type: 'green',
				text: 'Input Doc'
			},
			{
				href: '#link-doc',
				target: '',
				type: 'green',
				text: 'Link Doc'
			},
			{
				href: '#modal-doc',
				target: '',
				type: 'green',
				text: 'Modal Doc'
			},
			{
				href: '#navigation-doc',
				target: '',
				type: 'green',
				text: 'Navigation Doc'
			},
			{
				href: '#radio-doc',
				target: '',
				type: 'green',
				text: 'Radio Doc'
			},
			{
				href: '#searchable-select-doc',
				target: '',
				type: 'green',
				text: 'Searchable select Doc'
			},
			{
				href: '#select-doc',
				target: '',
				type: 'green',
				text: 'Select Doc'
			},
			{
				href: '#toast-doc',
				target: '',
				type: 'green',
				text: 'Toast Doc'
			},
			{
				href: '#tooltip-doc',
				target: '',
				type: 'green',
				text: 'Tooltip Doc'
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
				},
				{
					href: 'https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens',
					text: 'Style guide',
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
			if (!document.getElementById("svelte-1eyx8ju-style")) add_css();
			init(this, options, instance, create_fragment, safe_not_equal, []);
		}
	}

	const app = new App({
		target: document.body
	});

	return app;

}());
