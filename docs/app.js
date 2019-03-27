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

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
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
		style.id = 'svelte-1xpybgn-style';
		style.textContent = ".app.svelte-1xpybgn{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:15px 0px 40px 0px rgba(85,85,85, 0.3), -15px 0px 40px 0px rgba(85,85,85, 0.3)}.content.svelte-1xpybgn{max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}hr.svelte-1xpybgn{display:absolute;color:#3C9700;margin:45px 0}.footer.svelte-1xpybgn{flex-shrink:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwiYXBwXCI+XG5cdDxhcHAtaGVhZGVyPjwvYXBwLWhlYWRlcj5cblx0PGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cblx0XHQ8YXBwLWZvcm0gaWQ9XCJhcHAtZm9ybVwiPjwvYXBwLWZvcm0+XG5cdFx0PGhyPlxuXHRcdDxhcHAtYnV0dG9ucyBpZD1cImFwcC1idXR0b25zXCI+PC9hcHAtYnV0dG9ucz5cblx0XHQ8aHI+XG5cdFx0PGFwcC10b29sdGlwLWFuZC1mZWVkYmFjayBpZD1cImFwcC10b29sdGlwLWFuZC1mZWVkYmFja1wiPjwvYXBwLXRvb2x0aXAtYW5kLWZlZWRiYWNrPlxuXHRcdDxocj5cblx0XHQ8IS0tIDxkb2NzLWJ1dHRvbj48L2RvY3MtYnV0dG9uPiAtLT5cblx0PC9kaXY+XG5cdDx6b28tZm9vdGVyIGNsYXNzPVwiZm9vdGVyXCIgYmluZDp0aGlzPXtmb290ZXJ9Pjwvem9vLWZvb3Rlcj4gXG48L2Rpdj5cblxuPHN0eWxlPlxuXHQuYXBwIHtcblx0XHRtYXJnaW46IDAgYXV0bztcblx0XHRoZWlnaHQ6IDEwMCU7XG5cdFx0ZGlzcGxheTogZmxleDtcblx0XHRmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuXHRcdGJveC1zaGFkb3c6IDE1cHggMHB4IDQwcHggMHB4IHJnYmEoODUsODUsODUsIDAuMyksIC0xNXB4IDBweCA0MHB4IDBweCByZ2JhKDg1LDg1LDg1LCAwLjMpO1xuXHR9XG5cdC5jb250ZW50IHtcblx0XHRtYXgtd2lkdGg6IDEyODBweDtcblx0XHR3aWR0aDogMTAwJTtcblx0XHRmbGV4OiAxIDAgYXV0bztcblx0XHRtYXJnaW46IDAgYXV0bztcblx0fVxuXHRociB7XG5cdFx0ZGlzcGxheTogYWJzb2x1dGU7XG5cdFx0Y29sb3I6ICMzQzk3MDA7XG5cdFx0bWFyZ2luOiA0NXB4IDA7XG5cdH1cblx0LmZvb3RlciB7XG5cdFx0ZmxleC1zaHJpbms6IDA7XG5cdH1cbjwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xuXHRsZXQgZm9vdGVyO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdGZvb3Rlci5mb290ZXJsaW5rcyA9IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGhyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxuXHRcdFx0XHRcdHRleHQ6ICdHaXRodWInLFxuXHRcdFx0XHRcdHR5cGU6ICdzdGFuZGFyZCdcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGhyZWY6ICdodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9Aem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxuXHRcdFx0XHRcdHRleHQ6ICdOUE0nLFxuXHRcdFx0XHRcdHR5cGU6ICdzdGFuZGFyZCdcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGhyZWY6ICdodHRwczovL3pvb3BsdXMuaW52aXNpb25hcHAuY29tL3NoYXJlL1hXTlhPMDQ5WkFEIy9zY3JlZW5zJyxcblx0XHRcdFx0XHR0ZXh0OiAnU3R5bGUgZ3VpZGUnLFxuXHRcdFx0XHRcdHR5cGU6ICdzdGFuZGFyZCdcblx0XHRcdFx0fVxuXHRcdFx0XTtcblx0XHR9LCAyMDApO1xuXHR9KTtcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFlQyxJQUFJLGVBQUMsQ0FBQyxBQUNMLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxDQUNkLE1BQU0sQ0FBRSxJQUFJLENBQ1osT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsTUFBTSxDQUN0QixVQUFVLENBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQzFGLENBQUMsQUFDRCxRQUFRLGVBQUMsQ0FBQyxBQUNULFNBQVMsQ0FBRSxNQUFNLENBQ2pCLEtBQUssQ0FBRSxJQUFJLENBQ1gsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNkLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUNmLENBQUMsQUFDRCxFQUFFLGVBQUMsQ0FBQyxBQUNILE9BQU8sQ0FBRSxRQUFRLENBQ2pCLEtBQUssQ0FBRSxPQUFPLENBQ2QsTUFBTSxDQUFFLElBQUksQ0FBQyxDQUFDLEFBQ2YsQ0FBQyxBQUNELE9BQU8sZUFBQyxDQUFDLEFBQ1IsV0FBVyxDQUFFLENBQUMsQUFDZixDQUFDIn0= */";
		append(document.head, style);
	}

	function create_fragment(ctx) {
		var div1, app_header, t0, div0, app_form, t1, hr0, t2, app_buttons, t3, hr1, t4, app_tooltip_and_feedback, t5, hr2, t6, zoo_footer;

		return {
			c: function create() {
				div1 = element("div");
				app_header = element("app-header");
				t0 = space();
				div0 = element("div");
				app_form = element("app-form");
				t1 = space();
				hr0 = element("hr");
				t2 = space();
				app_buttons = element("app-buttons");
				t3 = space();
				hr1 = element("hr");
				t4 = space();
				app_tooltip_and_feedback = element("app-tooltip-and-feedback");
				t5 = space();
				hr2 = element("hr");
				t6 = space();
				zoo_footer = element("zoo-footer");
				add_location(app_header, file, 1, 1, 19);
				app_form.id = "app-form";
				add_location(app_form, file, 3, 2, 70);
				hr0.className = "svelte-1xpybgn";
				add_location(hr0, file, 4, 2, 108);
				app_buttons.id = "app-buttons";
				add_location(app_buttons, file, 5, 2, 115);
				hr1.className = "svelte-1xpybgn";
				add_location(hr1, file, 6, 2, 162);
				app_tooltip_and_feedback.id = "app-tooltip-and-feedback";
				add_location(app_tooltip_and_feedback, file, 7, 2, 169);
				hr2.className = "svelte-1xpybgn";
				add_location(hr2, file, 8, 2, 255);
				div0.className = "content svelte-1xpybgn";
				add_location(div0, file, 2, 1, 46);
				zoo_footer.className = "footer svelte-1xpybgn";
				add_location(zoo_footer, file, 11, 1, 308);
				div1.className = "app svelte-1xpybgn";
				add_location(div1, file, 0, 0, 0);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, app_header);
				append(div1, t0);
				append(div1, div0);
				append(div0, app_form);
				append(div0, t1);
				append(div0, hr0);
				append(div0, t2);
				append(div0, app_buttons);
				append(div0, t3);
				append(div0, hr1);
				append(div0, t4);
				append(div0, app_tooltip_and_feedback);
				append(div0, t5);
				append(div0, hr2);
				append(div1, t6);
				append(div1, zoo_footer);
				add_binding_callback(() => ctx.zoo_footer_binding(zoo_footer, null));
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_footer_binding(null, zoo_footer);
					ctx.zoo_footer_binding(zoo_footer, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div1);
				}

				ctx.zoo_footer_binding(null, zoo_footer);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let footer;
		onMount(() => {
			setTimeout(() => {
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
			}, 200);
		});

		function zoo_footer_binding($$node, check) {
			footer = $$node;
			$$invalidate('footer', footer);
		}

		return { footer, zoo_footer_binding };
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			if (!document.getElementById("svelte-1xpybgn-style")) add_css();
			init(this, options, instance, create_fragment, safe_not_equal, []);
		}
	}

	const app = new App({
		target: document.body
	});

	return app;

}());
//# sourceMappingURL=app.js.map
