(function () {
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

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
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

	function set_style(node, key, value) {
		node.style.setProperty(key, value);
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

	let SvelteElement;
	if (typeof HTMLElement !== 'undefined') {
		SvelteElement = class extends HTMLElement {
			constructor() {
				super();
				this.attachShadow({ mode: 'open' });
			}

			connectedCallback() {
				for (let key in this.$$.slotted) {
					this.appendChild(this.$$.slotted[key]);
				}
			}

			attributeChangedCallback(attr$$1, oldValue, newValue) {
				this[attr$$1] = newValue;
			}

			$destroy() {
				destroy(this, true);
				this.$destroy = noop;
			}

			$on(type, callback) {
				// TODO should this delegate to addEventListener?
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
		};
	}

	/* src/App.svelte generated by Svelte v3.0.0-beta.20 */

	const file = "src/App.svelte";

	function create_fragment(ctx) {
		var div1, app_header, t0, div0, app_form, t1, hr0, t2, app_buttons, t3, hr1, t4, app_tooltip_and_feedback, t5, zoo_footer;

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
				zoo_footer = element("zoo-footer");
				this.c = noop;
				add_location(app_header, file, 2, 1, 66);
				add_location(app_form, file, 4, 2, 117);
				add_location(hr0, file, 5, 2, 141);
				add_location(app_buttons, file, 6, 2, 148);
				add_location(hr1, file, 7, 2, 178);
				add_location(app_tooltip_and_feedback, file, 8, 2, 185);
				div0.className = "content";
				add_location(div0, file, 3, 1, 93);
				add_location(zoo_footer, file, 10, 1, 248);
				div1.className = "app";
				add_location(div1, file, 1, 0, 47);
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
				append(div1, t5);
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

	class App extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.app{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:15px 0px 40px 0px rgba(85, 85, 85, 0.3), -15px 0px 40px 0px rgba(85, 85, 85, 0.3)}.content{max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}.content hr{display:absolute;color:#3C9700;margin:45px 0}zoo-footer{flex-shrink:0}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwibXktYXBwXCI+PC9zdmVsdGU6b3B0aW9ucz5cbjxkaXYgY2xhc3M9XCJhcHBcIj5cblx0PGFwcC1oZWFkZXI+PC9hcHAtaGVhZGVyPlxuXHQ8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuXHRcdDxhcHAtZm9ybT48L2FwcC1mb3JtPlxuXHRcdDxocj5cblx0XHQ8YXBwLWJ1dHRvbnM+PC9hcHAtYnV0dG9ucz5cblx0XHQ8aHI+XG5cdFx0PGFwcC10b29sdGlwLWFuZC1mZWVkYmFjaz48L2FwcC10b29sdGlwLWFuZC1mZWVkYmFjaz5cblx0PC9kaXY+XG5cdDx6b28tZm9vdGVyIGJpbmQ6dGhpcz17Zm9vdGVyfT48L3pvby1mb290ZXI+IFxuPC9kaXY+XG5cbjxzdHlsZSB0eXBlPSd0ZXh0L3Njc3MnPi5hcHAge1xuICBtYXJnaW46IDAgYXV0bztcbiAgaGVpZ2h0OiAxMDAlO1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBib3gtc2hhZG93OiAxNXB4IDBweCA0MHB4IDBweCByZ2JhKDg1LCA4NSwgODUsIDAuMyksIC0xNXB4IDBweCA0MHB4IDBweCByZ2JhKDg1LCA4NSwgODUsIDAuMyk7IH1cblxuLmNvbnRlbnQge1xuICBtYXgtd2lkdGg6IDEyODBweDtcbiAgd2lkdGg6IDEwMCU7XG4gIGZsZXg6IDEgMCBhdXRvO1xuICBtYXJnaW46IDAgYXV0bzsgfVxuICAuY29udGVudCBociB7XG4gICAgZGlzcGxheTogYWJzb2x1dGU7XG4gICAgY29sb3I6ICMzQzk3MDA7XG4gICAgbWFyZ2luOiA0NXB4IDA7IH1cblxuem9vLWZvb3RlciB7XG4gIGZsZXgtc2hyaW5rOiAwOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cblxuPHNjcmlwdD5cblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XG5cdGxldCBmb290ZXI7XG5cdG9uTW91bnQoKCkgPT4ge1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0Zm9vdGVyLmZvb3RlcmxpbmtzID0gW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS96b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXG5cdFx0XHRcdFx0dGV4dDogJ0dpdGh1YicsXG5cdFx0XHRcdFx0dHlwZTogJ3N0YW5kYXJkJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL0B6b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXG5cdFx0XHRcdFx0dGV4dDogJ05QTScsXG5cdFx0XHRcdFx0dHlwZTogJ3N0YW5kYXJkJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vem9vcGx1cy5pbnZpc2lvbmFwcC5jb20vc2hhcmUvWFdOWE8wNDlaQUQjL3NjcmVlbnMnLFxuXHRcdFx0XHRcdHRleHQ6ICdTdHlsZSBndWlkZScsXG5cdFx0XHRcdFx0dHlwZTogJ3N0YW5kYXJkJ1xuXHRcdFx0XHR9XG5cdFx0XHRdO1xuXHRcdH0sIDIwMCk7XG5cdH0pO1xuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWF3QixJQUFJLEFBQUMsQ0FBQyxBQUM1QixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FDZCxNQUFNLENBQUUsSUFBSSxDQUNaLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLE1BQU0sQ0FDdEIsVUFBVSxDQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUUsQ0FBQyxBQUVsRyxRQUFRLEFBQUMsQ0FBQyxBQUNSLFNBQVMsQ0FBRSxNQUFNLENBQ2pCLEtBQUssQ0FBRSxJQUFJLENBQ1gsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNkLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFDakIsUUFBUSxDQUFDLEVBQUUsQUFBQyxDQUFDLEFBQ1gsT0FBTyxDQUFFLFFBQVEsQ0FDakIsS0FBSyxDQUFFLE9BQU8sQ0FDZCxNQUFNLENBQUUsSUFBSSxDQUFDLENBQUMsQUFBRSxDQUFDLEFBRXJCLFVBQVUsQUFBQyxDQUFDLEFBQ1YsV0FBVyxDQUFFLENBQUMsQUFBRSxDQUFDIn0= */</style>`;

			init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, []);

			if (options) {
				if (options.target) {
					insert(options.target, this, options.anchor);
				}
			}
		}

		static get observedAttributes() {
			return [];
		}
	}

	customElements.define("my-app", App);

	/* src/Header.svelte generated by Svelte v3.0.0-beta.20 */

	const file$1 = "src/Header.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.link = list[i];
		return child_ctx;
	}

	// (19:3) {#each navlinks as link}
	function create_each_block(ctx) {
		var zoo_link, zoo_link_href_value, zoo_link_target_value, zoo_link_type_value, zoo_link_text_value;

		return {
			c: function create() {
				zoo_link = element("zoo-link");
				set_custom_element_data(zoo_link, "href", zoo_link_href_value = ctx.link.href);
				set_custom_element_data(zoo_link, "target", zoo_link_target_value = ctx.link.target);
				set_custom_element_data(zoo_link, "type", zoo_link_type_value = ctx.link.type);
				set_custom_element_data(zoo_link, "text", zoo_link_text_value = ctx.link.text);
				add_location(zoo_link, file$1, 19, 4, 575);
			},

			m: function mount(target, anchor) {
				insert(target, zoo_link, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(zoo_link);
				}
			}
		};
	}

	function create_fragment$1(ctx) {
		var header, zoo_header, div2, div0, zoo_input, input, t0, div1, zoo_button, span, t2, zoo_navigation, div3;

		var each_value = ctx.navlinks;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		return {
			c: function create() {
				header = element("header");
				zoo_header = element("zoo-header");
				div2 = element("div");
				div0 = element("div");
				zoo_input = element("zoo-input");
				input = element("input");
				t0 = space();
				div1 = element("div");
				zoo_button = element("zoo-button");
				span = element("span");
				span.textContent = "Just a button";
				t2 = space();
				zoo_navigation = element("zoo-navigation");
				div3 = element("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				this.c = noop;
				attr(input, "slot", "inputelement");
				input.placeholder = "Example placeholder";
				add_location(input, file$1, 6, 5, 216);
				add_location(zoo_input, file$1, 5, 4, 199);
				div0.className = "header-search";
				add_location(div0, file$1, 4, 3, 167);
				attr(span, "slot", "buttoncontent");
				span.className = "slotted-span";
				add_location(span, file$1, 11, 5, 384);
				set_custom_element_data(zoo_button, "type", "hot");
				set_custom_element_data(zoo_button, "size", "medium");
				add_location(zoo_button, file$1, 10, 4, 341);
				div1.className = "header-button";
				add_location(div1, file$1, 9, 3, 309);
				div2.className = "search-field-holder";
				add_location(div2, file$1, 3, 2, 130);
				set_custom_element_data(zoo_header, "imgsrc", "logo.png");
				set_custom_element_data(zoo_header, "headertext", "Zooplus web components");
				add_location(zoo_header, file$1, 2, 1, 61);
				add_location(div3, file$1, 17, 2, 537);
				zoo_navigation.className = "nav";
				add_location(zoo_navigation, file$1, 16, 1, 506);
				add_location(header, file$1, 1, 0, 51);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, header, anchor);
				append(header, zoo_header);
				append(zoo_header, div2);
				append(div2, div0);
				append(div0, zoo_input);
				append(zoo_input, input);
				append(div2, t0);
				append(div2, div1);
				append(div1, zoo_button);
				append(zoo_button, span);
				append(header, t2);
				append(header, zoo_navigation);
				append(zoo_navigation, div3);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div3, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.navlinks) {
					each_value = ctx.navlinks;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div3, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(header);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	function instance$1($$self) {
		let navlinks = [
			{
				href: 'https://google.com',
				text: 'Example navigation 1',
				type: 'standard',
				active: false
			},
			{
				href: 'https://google.com',
				text: 'Example navigation 2',
				type: 'standard',
				active: false
			},
			{
				href: 'https://google.com',
				text: 'Example navigation 3',
				type: 'standard',
				active: false
			},
			{
				href: 'https://google.com',
				text: 'Example navigation 4',
				type: 'standard',
				active: false
			},
			{
				href: 'https://google.com',
				text: 'Example navigation 5',
				type: 'standard',
				active: false
			}
		];

		return { navlinks };
	}

	class Header extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>header{position:relative}.search-field-holder{display:flex;flex-direction:row;flex-grow:1;padding:0 25px 0 0}.header-search,.header-button{margin-left:auto}.header-search{flex-grow:0.5}.header-button{display:flex}.header-button zoo-button{align-self:center}@media only screen and (max-width: 544px){.header-button .slotted-span{display:none}}.nav{position:sticky;top:0;color:white;font-size:14px;font-weight:bold;line-height:16px;cursor:pointer}.nav zoo-link{padding:0 15px;cursor:pointer}.nav zoo-link:hover,.nav zoo-link:active{background:rgba(255, 255, 255, 0.3)}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGVhZGVyLnN2ZWx0ZSIsInNvdXJjZXMiOlsiSGVhZGVyLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiYXBwLWhlYWRlclwiPjwvc3ZlbHRlOm9wdGlvbnM+XG48aGVhZGVyPlxuXHQ8em9vLWhlYWRlciBpbWdzcmM9XCJsb2dvLnBuZ1wiIGhlYWRlcnRleHQ9XCJab29wbHVzIHdlYiBjb21wb25lbnRzXCI+XG5cdFx0PGRpdiBjbGFzcz1cInNlYXJjaC1maWVsZC1ob2xkZXJcIj5cblx0XHRcdDxkaXYgY2xhc3M9XCJoZWFkZXItc2VhcmNoXCI+XG5cdFx0XHRcdDx6b28taW5wdXQ+XG5cdFx0XHRcdFx0PGlucHV0IHNsb3Q9XCJpbnB1dGVsZW1lbnRcIiBwbGFjZWhvbGRlcj1cIkV4YW1wbGUgcGxhY2Vob2xkZXJcIi8+XG5cdFx0XHRcdDwvem9vLWlucHV0PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiaGVhZGVyLWJ1dHRvblwiPlxuXHRcdFx0XHQ8em9vLWJ1dHRvbiB0eXBlPVwiaG90XCIgc2l6ZT1cIm1lZGl1bVwiPlxuXHRcdFx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCIgY2xhc3M9XCJzbG90dGVkLXNwYW5cIj5KdXN0IGEgYnV0dG9uPC9zcGFuPlxuXHRcdFx0XHQ8L3pvby1idXR0b24+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC96b28taGVhZGVyPlxuXHQ8em9vLW5hdmlnYXRpb24gY2xhc3M9XCJuYXZcIj5cblx0XHQ8ZGl2PlxuXHRcdFx0eyNlYWNoIG5hdmxpbmtzIGFzIGxpbmt9XG5cdFx0XHRcdDx6b28tbGluayBocmVmPVwie2xpbmsuaHJlZn1cIiB0YXJnZXQ9XCJ7bGluay50YXJnZXR9XCIgdHlwZT1cIntsaW5rLnR5cGV9XCJcblx0XHRcdFx0XHR0ZXh0PVwie2xpbmsudGV4dH1cIj5cblx0XHRcdFx0PC96b28tbGluaz5cblx0XHRcdHsvZWFjaH1cblx0XHQ8L2Rpdj5cblx0PC96b28tbmF2aWdhdGlvbj5cbjwvaGVhZGVyPlxuXG48c3R5bGUgdHlwZT0ndGV4dC9zY3NzJz5oZWFkZXIge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7IH1cblxuLnNlYXJjaC1maWVsZC1ob2xkZXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93O1xuICBmbGV4LWdyb3c6IDE7XG4gIHBhZGRpbmc6IDAgMjVweCAwIDA7IH1cblxuLmhlYWRlci1zZWFyY2gsIC5oZWFkZXItYnV0dG9uIHtcbiAgbWFyZ2luLWxlZnQ6IGF1dG87IH1cblxuLmhlYWRlci1zZWFyY2gge1xuICBmbGV4LWdyb3c6IDAuNTsgfVxuXG4uaGVhZGVyLWJ1dHRvbiB7XG4gIGRpc3BsYXk6IGZsZXg7IH1cbiAgLmhlYWRlci1idXR0b24gem9vLWJ1dHRvbiB7XG4gICAgYWxpZ24tc2VsZjogY2VudGVyOyB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogNTQ0cHgpIHtcbiAgICAuaGVhZGVyLWJ1dHRvbiAuc2xvdHRlZC1zcGFuIHtcbiAgICAgIGRpc3BsYXk6IG5vbmU7IH0gfVxuXG4ubmF2IHtcbiAgcG9zaXRpb246IHN0aWNreTtcbiAgdG9wOiAwO1xuICBjb2xvcjogd2hpdGU7XG4gIGZvbnQtc2l6ZTogMTRweDtcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XG4gIGxpbmUtaGVpZ2h0OiAxNnB4O1xuICBjdXJzb3I6IHBvaW50ZXI7IH1cbiAgLm5hdiB6b28tbGluayB7XG4gICAgcGFkZGluZzogMCAxNXB4O1xuICAgIGN1cnNvcjogcG9pbnRlcjsgfVxuICAgIC5uYXYgem9vLWxpbms6aG92ZXIsIC5uYXYgem9vLWxpbms6YWN0aXZlIHtcbiAgICAgIGJhY2tncm91bmQ6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4zKTsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGxldCBuYXZsaW5rcyA9IFtcblx0XHR7XG5cdFx0XHRocmVmOiAnaHR0cHM6Ly9nb29nbGUuY29tJyxcblx0XHRcdHRleHQ6ICdFeGFtcGxlIG5hdmlnYXRpb24gMScsXG5cdFx0XHR0eXBlOiAnc3RhbmRhcmQnLFxuXHRcdFx0YWN0aXZlOiBmYWxzZVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJ2h0dHBzOi8vZ29vZ2xlLmNvbScsXG5cdFx0XHR0ZXh0OiAnRXhhbXBsZSBuYXZpZ2F0aW9uIDInLFxuXHRcdFx0dHlwZTogJ3N0YW5kYXJkJyxcblx0XHRcdGFjdGl2ZTogZmFsc2Vcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICdodHRwczovL2dvb2dsZS5jb20nLFxuXHRcdFx0dGV4dDogJ0V4YW1wbGUgbmF2aWdhdGlvbiAzJyxcblx0XHRcdHR5cGU6ICdzdGFuZGFyZCcsXG5cdFx0XHRhY3RpdmU6IGZhbHNlXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnaHR0cHM6Ly9nb29nbGUuY29tJyxcblx0XHRcdHRleHQ6ICdFeGFtcGxlIG5hdmlnYXRpb24gNCcsXG5cdFx0XHR0eXBlOiAnc3RhbmRhcmQnLFxuXHRcdFx0YWN0aXZlOiBmYWxzZVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJ2h0dHBzOi8vZ29vZ2xlLmNvbScsXG5cdFx0XHR0ZXh0OiAnRXhhbXBsZSBuYXZpZ2F0aW9uIDUnLFxuXHRcdFx0dHlwZTogJ3N0YW5kYXJkJyxcblx0XHRcdGFjdGl2ZTogZmFsc2Vcblx0XHR9XG5cdF07XG48L3NjcmlwdD5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUEyQndCLE1BQU0sQUFBQyxDQUFDLEFBQzlCLFFBQVEsQ0FBRSxRQUFRLEFBQUUsQ0FBQyxBQUV2QixvQkFBb0IsQUFBQyxDQUFDLEFBQ3BCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLEdBQUcsQ0FDbkIsU0FBUyxDQUFFLENBQUMsQ0FDWixPQUFPLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFFLENBQUMsQUFFeEIsY0FBYyxDQUFFLGNBQWMsQUFBQyxDQUFDLEFBQzlCLFdBQVcsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUV0QixjQUFjLEFBQUMsQ0FBQyxBQUNkLFNBQVMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUVuQixjQUFjLEFBQUMsQ0FBQyxBQUNkLE9BQU8sQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUNoQixjQUFjLENBQUMsVUFBVSxBQUFDLENBQUMsQUFDekIsVUFBVSxDQUFFLE1BQU0sQUFBRSxDQUFDLEFBQ3ZCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pDLGNBQWMsQ0FBQyxhQUFhLEFBQUMsQ0FBQyxBQUM1QixPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMsQUFBQyxDQUFDLEFBRXhCLElBQUksQUFBQyxDQUFDLEFBQ0osUUFBUSxDQUFFLE1BQU0sQ0FDaEIsR0FBRyxDQUFFLENBQUMsQ0FDTixLQUFLLENBQUUsS0FBSyxDQUNaLFNBQVMsQ0FBRSxJQUFJLENBQ2YsV0FBVyxDQUFFLElBQUksQ0FDakIsV0FBVyxDQUFFLElBQUksQ0FDakIsTUFBTSxDQUFFLE9BQU8sQUFBRSxDQUFDLEFBQ2xCLElBQUksQ0FBQyxRQUFRLEFBQUMsQ0FBQyxBQUNiLE9BQU8sQ0FBRSxDQUFDLENBQUMsSUFBSSxDQUNmLE1BQU0sQ0FBRSxPQUFPLEFBQUUsQ0FBQyxBQUNsQixJQUFJLENBQUMsUUFBUSxNQUFNLENBQUUsSUFBSSxDQUFDLFFBQVEsT0FBTyxBQUFDLENBQUMsQUFDekMsVUFBVSxDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUUsQ0FBQyJ9 */</style>`;

			init(this, { target: this.shadowRoot }, instance$1, create_fragment$1, safe_not_equal, []);

			if (options) {
				if (options.target) {
					insert(options.target, this, options.anchor);
				}
			}
		}

		static get observedAttributes() {
			return [];
		}
	}

	customElements.define("app-header", Header);

	/* src/Form.svelte generated by Svelte v3.0.0-beta.20 */

	const file$2 = "src/Form.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.option = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.option = list[i];
		return child_ctx;
	}

	// (42:3) {#each options as option}
	function create_each_block_1(ctx) {
		var option, t_value = ctx.option.text, t, option_value_value;

		return {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = ctx.option.value;
				option.value = option.__value;
				add_location(option, file$2, 42, 3, 2372);
			},

			m: function mount(target, anchor) {
				insert(target, option, anchor);
				append(option, t);
			},

			p: function update(changed, ctx) {
				option.value = option.__value;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(option);
				}
			}
		};
	}

	// (51:3) {#each options as option}
	function create_each_block$1(ctx) {
		var option, t_value = ctx.option.text, t, option_value_value;

		return {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = ctx.option.value;
				option.value = option.__value;
				add_location(option, file$2, 51, 3, 2686);
			},

			m: function mount(target, anchor) {
				insert(target, option, anchor);
				append(option, t);
			},

			p: function update(changed, ctx) {
				option.value = option.__value;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(option);
				}
			}
		};
	}

	function create_fragment$2(ctx) {
		var div0, h2, t1, form, zoo_input0, input0, t2, zoo_input1, input1, t3, zoo_input2, input2, t4, zoo_input3, input3, t5, zoo_input4, textarea, t6, zoo_select0, select0, option0, option1, option2, option3, t11, zoo_select1, select1, option4, option5, option6, option7, t16, zoo_searchable_select0, select2, t17, zoo_searchable_select1, select3, t18, zoo_checkbox, input4, t19, zoo_radio0, template, input5, t20, label0, t22, input6, t23, label1, t25, input7, t26, label2, t28, zoo_radio1, input8, t29, label3, t31, input9, t32, label4, t34, div1, zoo_button, span, dispose;

		var each_value_1 = ctx.options;

		var each_blocks_1 = [];

		for (var i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		var each_value = ctx.options;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		return {
			c: function create() {
				div0 = element("div");
				h2 = element("h2");
				h2.textContent = "First section is a showcase of different form elements like `input`, `textarea`, `select`.";
				t1 = space();
				form = element("form");
				zoo_input0 = element("zoo-input");
				input0 = element("input");
				t2 = space();
				zoo_input1 = element("zoo-input");
				input1 = element("input");
				t3 = space();
				zoo_input2 = element("zoo-input");
				input2 = element("input");
				t4 = space();
				zoo_input3 = element("zoo-input");
				input3 = element("input");
				t5 = space();
				zoo_input4 = element("zoo-input");
				textarea = element("textarea");
				t6 = space();
				zoo_select0 = element("zoo-select");
				select0 = element("select");
				option0 = element("option");
				option0.textContent = "Placeholder";
				option1 = element("option");
				option1.textContent = "1";
				option2 = element("option");
				option2.textContent = "2";
				option3 = element("option");
				option3.textContent = "3";
				t11 = space();
				zoo_select1 = element("zoo-select");
				select1 = element("select");
				option4 = element("option");
				option4.textContent = "Placeholder";
				option5 = element("option");
				option5.textContent = "1";
				option6 = element("option");
				option6.textContent = "2";
				option7 = element("option");
				option7.textContent = "3";
				t16 = space();
				zoo_searchable_select0 = element("zoo-searchable-select");
				select2 = element("select");

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t17 = space();
				zoo_searchable_select1 = element("zoo-searchable-select");
				select3 = element("select");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t18 = space();
				zoo_checkbox = element("zoo-checkbox");
				input4 = element("input");
				t19 = space();
				zoo_radio0 = element("zoo-radio");
				template = element("template");
				input5 = element("input");
				t20 = space();
				label0 = element("label");
				label0.textContent = "Email";
				t22 = space();
				input6 = element("input");
				t23 = space();
				label1 = element("label");
				label1.textContent = "Phone";
				t25 = space();
				input7 = element("input");
				t26 = space();
				label2 = element("label");
				label2.textContent = "Mail";
				t28 = space();
				zoo_radio1 = element("zoo-radio");
				input8 = element("input");
				t29 = space();
				label3 = element("label");
				label3.textContent = "Email";
				t31 = space();
				input9 = element("input");
				t32 = space();
				label4 = element("label");
				label4.textContent = "Phone";
				t34 = space();
				div1 = element("div");
				zoo_button = element("zoo-button");
				span = element("span");
				span.textContent = "Trigger invalid state!";
				this.c = noop;
				add_location(h2, file$2, 2, 1, 72);
				div0.className = "context";
				add_location(div0, file$2, 1, 0, 49);
				attr(input0, "slot", "inputelement");
				attr(input0, "type", "text");
				input0.placeholder = "input";
				add_location(input0, file$2, 7, 2, 436);
				set_custom_element_data(zoo_input0, "labeltext", "Input type text");
				set_custom_element_data(zoo_input0, "linktext", "Forgotten your password?");
				set_custom_element_data(zoo_input0, "linkhref", "https://google.com");
				set_custom_element_data(zoo_input0, "linktarget", "about:blank");
				set_custom_element_data(zoo_input0, "valid", ctx.inputState);
				set_custom_element_data(zoo_input0, "inputerrormsg", "invalid");
				set_custom_element_data(zoo_input0, "infotext", "Additional helpful information for our users");
				add_location(zoo_input0, file$2, 5, 1, 200);
				attr(input1, "slot", "inputelement");
				attr(input1, "type", "number");
				input1.placeholder = "input";
				add_location(input1, file$2, 11, 2, 706);
				set_custom_element_data(zoo_input1, "labeltext", "Input type number");
				set_custom_element_data(zoo_input1, "linktext", "Forgotten your password?");
				set_custom_element_data(zoo_input1, "linkhref", "https://google.com");
				set_custom_element_data(zoo_input1, "linktarget", "about:blank");
				set_custom_element_data(zoo_input1, "infotext", "Additional helpful information for our users");
				add_location(zoo_input1, file$2, 9, 1, 513);
				attr(input2, "slot", "inputelement");
				attr(input2, "type", "date");
				input2.placeholder = "Enter date";
				add_location(input2, file$2, 15, 2, 1031);
				set_custom_element_data(zoo_input2, "labeltext", "This input has type date");
				set_custom_element_data(zoo_input2, "linktext", "Native date picker -> click me");
				set_custom_element_data(zoo_input2, "linkhref", "https://github.com/jcgertig/date-input-polyfill");
				set_custom_element_data(zoo_input2, "linktarget", "about:blank");
				set_custom_element_data(zoo_input2, "infotext", "Click on input to show context menu with date selection");
				add_location(zoo_input2, file$2, 13, 1, 785);
				attr(input3, "slot", "inputelement");
				attr(input3, "type", "time");
				input3.placeholder = "Enter time";
				add_location(input3, file$2, 18, 2, 1187);
				set_custom_element_data(zoo_input3, "labeltext", "This input has type time");
				set_custom_element_data(zoo_input3, "infotext", "Select time");
				add_location(zoo_input3, file$2, 17, 1, 1113);
				attr(textarea, "slot", "inputelement");
				textarea.placeholder = "Textarea";
				add_location(textarea, file$2, 21, 2, 1333);
				set_custom_element_data(zoo_input4, "labeltext", "Textarea example");
				set_custom_element_data(zoo_input4, "valid", ctx.inputState);
				add_location(zoo_input4, file$2, 20, 1, 1269);
				option0.className = "placeholder";
				option0.__value = "";
				option0.value = option0.__value;
				option0.disabled = true;
				option0.selected = true;
				add_location(option0, file$2, 25, 3, 1605);
				option1.__value = "1";
				option1.value = option1.__value;
				add_location(option1, file$2, 26, 3, 1684);
				option2.__value = "2";
				option2.value = option2.__value;
				add_location(option2, file$2, 27, 3, 1706);
				option3.__value = "3";
				option3.value = option3.__value;
				add_location(option3, file$2, 28, 3, 1728);
				attr(select0, "slot", "selectelement");
				select0.multiple = true;
				add_location(select0, file$2, 24, 2, 1563);
				set_custom_element_data(zoo_select0, "labeltext", "Multiselect");
				set_custom_element_data(zoo_select0, "valid", ctx.inputState);
				set_custom_element_data(zoo_select0, "inputerrormsg", "Value is required");
				set_custom_element_data(zoo_select0, "infotext", "Additional helpful information for our users");
				add_location(zoo_select0, file$2, 23, 1, 1413);
				option4.className = "placeholder";
				option4.__value = "";
				option4.value = option4.__value;
				option4.disabled = true;
				option4.selected = true;
				add_location(option4, file$2, 33, 3, 1962);
				option5.__value = "1";
				option5.value = option5.__value;
				add_location(option5, file$2, 34, 3, 2041);
				option6.__value = "2";
				option6.value = option6.__value;
				add_location(option6, file$2, 35, 3, 2063);
				option7.__value = "3";
				option7.value = option7.__value;
				add_location(option7, file$2, 36, 3, 2085);
				attr(select1, "slot", "selectelement");
				add_location(select1, file$2, 32, 2, 1929);
				set_custom_element_data(zoo_select1, "labeltext", "Standard select");
				set_custom_element_data(zoo_select1, "valid", ctx.inputState);
				set_custom_element_data(zoo_select1, "inputerrormsg", "Value is required");
				set_custom_element_data(zoo_select1, "infotext", "Additional helpful information for our users");
				add_location(zoo_select1, file$2, 31, 1, 1775);
				select2.multiple = true;
				attr(select2, "slot", "selectelement");
				add_location(select2, file$2, 40, 2, 2301);
				set_custom_element_data(zoo_searchable_select0, "labeltext", "Searchable multiple select");
				set_custom_element_data(zoo_searchable_select0, "placeholder", "Placeholder");
				set_custom_element_data(zoo_searchable_select0, "infotext", "Additional helpful information for our users which is a long text.");
				add_location(zoo_searchable_select0, file$2, 39, 1, 2132);
				attr(select3, "slot", "selectelement");
				add_location(select3, file$2, 49, 2, 2624);
				set_custom_element_data(zoo_searchable_select1, "labeltext", "Searchable select");
				set_custom_element_data(zoo_searchable_select1, "placeholder", "Placeholder");
				set_custom_element_data(zoo_searchable_select1, "infotext", "Additional helpful information for our users.");
				add_location(zoo_searchable_select1, file$2, 48, 1, 2485);
				attr(input4, "slot", "checkboxelement");
				attr(input4, "type", "checkbox");
				add_location(input4, file$2, 58, 2, 2943);
				set_custom_element_data(zoo_checkbox, "highlighted", true);
				set_custom_element_data(zoo_checkbox, "valid", ctx.inputState);
				set_custom_element_data(zoo_checkbox, "labeltext", "An example checkbox with some additional event handling of clicks inside");
				add_location(zoo_checkbox, file$2, 57, 1, 2799);
				attr(input5, "type", "radio");
				input5.id = "contactChoice1";
				input5.name = "contact";
				input5.value = "email";
				input5.disabled = true;
				add_location(input5, file$2, 62, 3, 3099);
				label0.htmlFor = "contactChoice1";
				add_location(label0, file$2, 63, 3, 3181);
				attr(input6, "type", "radio");
				input6.id = "contactChoice2";
				input6.name = "contact";
				input6.value = "phone";
				add_location(input6, file$2, 64, 3, 3226);
				label1.htmlFor = "contactChoice2";
				add_location(label1, file$2, 65, 3, 3299);
				attr(input7, "type", "radio");
				input7.id = "contactChoice3";
				input7.name = "contact";
				input7.value = "mail";
				add_location(input7, file$2, 66, 3, 3344);
				label2.htmlFor = "contactChoice3";
				add_location(label2, file$2, 67, 3, 3416);
				add_location(template, file$2, 61, 2, 3085);
				set_custom_element_data(zoo_radio0, "valid", ctx.inputState);
				set_custom_element_data(zoo_radio0, "errormsg", "errormsg");
				set_custom_element_data(zoo_radio0, "infotext", "infotext");
				add_location(zoo_radio0, file$2, 60, 1, 3010);
				attr(input8, "type", "radio");
				input8.id = "contactChoice4";
				input8.name = "contact";
				input8.value = "email";
				input8.disabled = true;
				add_location(input8, file$2, 72, 2, 3562);
				label3.htmlFor = "contactChoice4";
				add_location(label3, file$2, 73, 2, 3643);
				attr(input9, "type", "radio");
				input9.id = "contactChoice5";
				input9.name = "contact";
				input9.value = "phone";
				add_location(input9, file$2, 74, 2, 3687);
				label4.htmlFor = "contactChoice5";
				add_location(label4, file$2, 75, 2, 3759);
				set_custom_element_data(zoo_radio1, "valid", ctx.inputState);
				set_custom_element_data(zoo_radio1, "errormsg", "errormsg");
				set_custom_element_data(zoo_radio1, "infotext", "infotext");
				add_location(zoo_radio1, file$2, 71, 1, 3487);
				form.className = "form";
				add_location(form, file$2, 4, 0, 179);
				attr(span, "slot", "buttoncontent");
				span.className = "slotted-span";
				add_location(span, file$2, 80, 2, 3910);
				set_custom_element_data(zoo_button, "type", "hot");
				set_custom_element_data(zoo_button, "size", "medium");
				add_location(zoo_button, file$2, 79, 1, 3845);
				div1.className = "submit";
				add_location(div1, file$2, 78, 0, 3823);
				dispose = listen(zoo_button, "click", ctx.changeState);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div0, anchor);
				append(div0, h2);
				insert(target, t1, anchor);
				insert(target, form, anchor);
				append(form, zoo_input0);
				append(zoo_input0, input0);
				append(form, t2);
				append(form, zoo_input1);
				append(zoo_input1, input1);
				append(form, t3);
				append(form, zoo_input2);
				append(zoo_input2, input2);
				append(form, t4);
				append(form, zoo_input3);
				append(zoo_input3, input3);
				append(form, t5);
				append(form, zoo_input4);
				append(zoo_input4, textarea);
				append(form, t6);
				append(form, zoo_select0);
				append(zoo_select0, select0);
				append(select0, option0);
				append(select0, option1);
				append(select0, option2);
				append(select0, option3);
				append(form, t11);
				append(form, zoo_select1);
				append(zoo_select1, select1);
				append(select1, option4);
				append(select1, option5);
				append(select1, option6);
				append(select1, option7);
				append(form, t16);
				append(form, zoo_searchable_select0);
				append(zoo_searchable_select0, select2);

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].m(select2, null);
				}

				append(form, t17);
				append(form, zoo_searchable_select1);
				append(zoo_searchable_select1, select3);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(select3, null);
				}

				append(form, t18);
				append(form, zoo_checkbox);
				append(zoo_checkbox, input4);
				append(form, t19);
				append(form, zoo_radio0);
				append(zoo_radio0, template);
				append(template.content, input5);
				append(template.content, t20);
				append(template.content, label0);
				append(template.content, t22);
				append(template.content, input6);
				append(template.content, t23);
				append(template.content, label1);
				append(template.content, t25);
				append(template.content, input7);
				append(template.content, t26);
				append(template.content, label2);
				append(form, t28);
				append(form, zoo_radio1);
				append(zoo_radio1, input8);
				append(zoo_radio1, t29);
				append(zoo_radio1, label3);
				append(zoo_radio1, t31);
				append(zoo_radio1, input9);
				append(zoo_radio1, t32);
				append(zoo_radio1, label4);
				insert(target, t34, anchor);
				insert(target, div1, anchor);
				append(div1, zoo_button);
				append(zoo_button, span);
			},

			p: function update(changed, ctx) {
				if (changed.inputState) {
					set_custom_element_data(zoo_input0, "valid", ctx.inputState);
					set_custom_element_data(zoo_input4, "valid", ctx.inputState);
					set_custom_element_data(zoo_select0, "valid", ctx.inputState);
					set_custom_element_data(zoo_select1, "valid", ctx.inputState);
				}

				if (changed.options) {
					each_value_1 = ctx.options;

					for (var i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(changed, child_ctx);
						} else {
							each_blocks_1[i] = create_each_block_1(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(select2, null);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}
					each_blocks_1.length = each_value_1.length;
				}

				if (changed.options) {
					each_value = ctx.options;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select3, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}

				if (changed.inputState) {
					set_custom_element_data(zoo_checkbox, "valid", ctx.inputState);
					set_custom_element_data(zoo_radio0, "valid", ctx.inputState);
					set_custom_element_data(zoo_radio1, "valid", ctx.inputState);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div0);
					detach(t1);
					detach(form);
				}

				destroy_each(each_blocks_1, detaching);

				destroy_each(each_blocks, detaching);

				if (detaching) {
					detach(t34);
					detach(div1);
				}

				dispose();
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		let options = [
			{
				text: 'text',
				value: 'value'
			},
			{
				text: 'raNdOm',
				value: 'random'
			},
			{
				text: 'random1',
				value: 'random1'
			},
			{
				text: 'random2',
				value: 'random2'
			}
		];
		let inputState = true;
		const changeState = () => {
			inputState = !inputState; $$invalidate('inputState', inputState);
		};

		return { options, inputState, changeState };
	}

	class Form extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.context{height:80px}.context h2{color:#3C9700;text-align:center}.form{flex:1 0 auto;margin:20px auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));grid-template-rows:120px 150px 120px 70px;grid-gap:20px}@media only screen and (max-width: 544px){.form{grid-template-rows:auto}}.submit{width:250px;height:50px;margin:0 auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9ybS5zdmVsdGUiLCJzb3VyY2VzIjpbIkZvcm0uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJhcHAtZm9ybVwiPjwvc3ZlbHRlOm9wdGlvbnM+XG48ZGl2IGNsYXNzPVwiY29udGV4dFwiPlxuXHQ8aDI+Rmlyc3Qgc2VjdGlvbiBpcyBhIHNob3djYXNlIG9mIGRpZmZlcmVudCBmb3JtIGVsZW1lbnRzIGxpa2UgYGlucHV0YCwgYHRleHRhcmVhYCwgYHNlbGVjdGAuPC9oMj5cbjwvZGl2PlxuPGZvcm0gY2xhc3M9XCJmb3JtXCI+XG5cdDx6b28taW5wdXQgbGFiZWx0ZXh0PVwiSW5wdXQgdHlwZSB0ZXh0XCIgbGlua3RleHQ9XCJGb3Jnb3R0ZW4geW91ciBwYXNzd29yZD9cIiBsaW5raHJlZj1cImh0dHBzOi8vZ29vZ2xlLmNvbVwiIGxpbmt0YXJnZXQ9XCJhYm91dDpibGFua1wiXG5cdCB2YWxpZD1cIntpbnB1dFN0YXRlfVwiIGlucHV0ZXJyb3Jtc2c9XCJpbnZhbGlkXCIgaW5mb3RleHQ9XCJBZGRpdGlvbmFsIGhlbHBmdWwgaW5mb3JtYXRpb24gZm9yIG91ciB1c2Vyc1wiPlxuXHRcdDxpbnB1dCBzbG90PVwiaW5wdXRlbGVtZW50XCIgdHlwZT1cInRleHRcIiBwbGFjZWhvbGRlcj1cImlucHV0XCIgLz5cblx0PC96b28taW5wdXQ+XG5cdDx6b28taW5wdXQgbGFiZWx0ZXh0PVwiSW5wdXQgdHlwZSBudW1iZXJcIiBsaW5rdGV4dD1cIkZvcmdvdHRlbiB5b3VyIHBhc3N3b3JkP1wiIGxpbmtocmVmPVwiaHR0cHM6Ly9nb29nbGUuY29tXCIgbGlua3RhcmdldD1cImFib3V0OmJsYW5rXCJcblx0IGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnNcIj5cblx0XHQ8aW5wdXQgc2xvdD1cImlucHV0ZWxlbWVudFwiIHR5cGU9XCJudW1iZXJcIiBwbGFjZWhvbGRlcj1cImlucHV0XCIgLz5cblx0PC96b28taW5wdXQ+XG5cdDx6b28taW5wdXQgbGFiZWx0ZXh0PVwiVGhpcyBpbnB1dCBoYXMgdHlwZSBkYXRlXCIgbGlua3RleHQ9XCJOYXRpdmUgZGF0ZSBwaWNrZXIgLT4gY2xpY2sgbWVcIiBsaW5raHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9qY2dlcnRpZy9kYXRlLWlucHV0LXBvbHlmaWxsXCJcblx0IGxpbmt0YXJnZXQ9XCJhYm91dDpibGFua1wiIGluZm90ZXh0PVwiQ2xpY2sgb24gaW5wdXQgdG8gc2hvdyBjb250ZXh0IG1lbnUgd2l0aCBkYXRlIHNlbGVjdGlvblwiPlxuXHRcdDxpbnB1dCBzbG90PVwiaW5wdXRlbGVtZW50XCIgdHlwZT1cImRhdGVcIiBwbGFjZWhvbGRlcj1cIkVudGVyIGRhdGVcIiAvPlxuXHQ8L3pvby1pbnB1dD5cblx0PHpvby1pbnB1dCBsYWJlbHRleHQ9XCJUaGlzIGlucHV0IGhhcyB0eXBlIHRpbWVcIiBpbmZvdGV4dD1cIlNlbGVjdCB0aW1lXCI+XG5cdFx0PGlucHV0IHNsb3Q9XCJpbnB1dGVsZW1lbnRcIiB0eXBlPVwidGltZVwiIHBsYWNlaG9sZGVyPVwiRW50ZXIgdGltZVwiIC8+XG5cdDwvem9vLWlucHV0PlxuXHQ8em9vLWlucHV0IGxhYmVsdGV4dD1cIlRleHRhcmVhIGV4YW1wbGVcIiB2YWxpZD1cIntpbnB1dFN0YXRlfVwiPlxuXHRcdDx0ZXh0YXJlYSBzbG90PVwiaW5wdXRlbGVtZW50XCIgcGxhY2Vob2xkZXI9XCJUZXh0YXJlYVwiPjwvdGV4dGFyZWE+XG5cdDwvem9vLWlucHV0PlxuXHQ8em9vLXNlbGVjdCBsYWJlbHRleHQ9XCJNdWx0aXNlbGVjdFwiIHZhbGlkPVwie2lucHV0U3RhdGV9XCIgaW5wdXRlcnJvcm1zZz1cIlZhbHVlIGlzIHJlcXVpcmVkXCIgaW5mb3RleHQ9XCJBZGRpdGlvbmFsIGhlbHBmdWwgaW5mb3JtYXRpb24gZm9yIG91ciB1c2Vyc1wiPlxuXHRcdDxzZWxlY3Qgc2xvdD1cInNlbGVjdGVsZW1lbnRcIiBtdWx0aXBsZT5cblx0XHRcdDxvcHRpb24gY2xhc3M9XCJwbGFjZWhvbGRlclwiIHZhbHVlPVwiXCIgZGlzYWJsZWQgc2VsZWN0ZWQ+UGxhY2Vob2xkZXI8L29wdGlvbj5cblx0XHRcdDxvcHRpb24+MTwvb3B0aW9uPlxuXHRcdFx0PG9wdGlvbj4yPC9vcHRpb24+XG5cdFx0XHQ8b3B0aW9uPjM8L29wdGlvbj5cblx0XHQ8L3NlbGVjdD5cblx0PC96b28tc2VsZWN0PlxuXHQ8em9vLXNlbGVjdCBsYWJlbHRleHQ9XCJTdGFuZGFyZCBzZWxlY3RcIiB2YWxpZD1cIntpbnB1dFN0YXRlfVwiIGlucHV0ZXJyb3Jtc2c9XCJWYWx1ZSBpcyByZXF1aXJlZFwiIGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnNcIj5cblx0XHQ8c2VsZWN0IHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XG5cdFx0XHQ8b3B0aW9uIGNsYXNzPVwicGxhY2Vob2xkZXJcIiB2YWx1ZT1cIlwiIGRpc2FibGVkIHNlbGVjdGVkPlBsYWNlaG9sZGVyPC9vcHRpb24+XG5cdFx0XHQ8b3B0aW9uPjE8L29wdGlvbj5cblx0XHRcdDxvcHRpb24+Mjwvb3B0aW9uPlxuXHRcdFx0PG9wdGlvbj4zPC9vcHRpb24+XG5cdFx0PC9zZWxlY3Q+XG5cdDwvem9vLXNlbGVjdD5cblx0PHpvby1zZWFyY2hhYmxlLXNlbGVjdCBsYWJlbHRleHQ9XCJTZWFyY2hhYmxlIG11bHRpcGxlIHNlbGVjdFwiIHBsYWNlaG9sZGVyPVwiUGxhY2Vob2xkZXJcIiBpbmZvdGV4dD1cIkFkZGl0aW9uYWwgaGVscGZ1bCBpbmZvcm1hdGlvbiBmb3Igb3VyIHVzZXJzIHdoaWNoIGlzIGEgbG9uZyB0ZXh0LlwiPlxuXHRcdDxzZWxlY3QgbXVsdGlwbGUgc2xvdD1cInNlbGVjdGVsZW1lbnRcIj5cblx0XHRcdHsjZWFjaCBvcHRpb25zIGFzIG9wdGlvbn1cblx0XHRcdDxvcHRpb24gdmFsdWU9XCJ7b3B0aW9uLnZhbHVlfVwiPlxuXHRcdFx0XHR7b3B0aW9uLnRleHR9XG5cdFx0XHQ8L29wdGlvbj5cblx0XHRcdHsvZWFjaH1cblx0XHQ8L3NlbGVjdD5cblx0PC96b28tc2VhcmNoYWJsZS1zZWxlY3Q+XG5cdDx6b28tc2VhcmNoYWJsZS1zZWxlY3QgbGFiZWx0ZXh0PVwiU2VhcmNoYWJsZSBzZWxlY3RcIiBwbGFjZWhvbGRlcj1cIlBsYWNlaG9sZGVyXCIgaW5mb3RleHQ9XCJBZGRpdGlvbmFsIGhlbHBmdWwgaW5mb3JtYXRpb24gZm9yIG91ciB1c2Vycy5cIj5cblx0XHQ8c2VsZWN0IHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XG5cdFx0XHR7I2VhY2ggb3B0aW9ucyBhcyBvcHRpb259XG5cdFx0XHQ8b3B0aW9uIHZhbHVlPVwie29wdGlvbi52YWx1ZX1cIj5cblx0XHRcdFx0e29wdGlvbi50ZXh0fVxuXHRcdFx0PC9vcHRpb24+XG5cdFx0XHR7L2VhY2h9XG5cdFx0PC9zZWxlY3Q+XG5cdDwvem9vLXNlYXJjaGFibGUtc2VsZWN0PlxuXHQ8em9vLWNoZWNrYm94IGhpZ2hsaWdodGVkPVwie3RydWV9XCIgdmFsaWQ9XCJ7aW5wdXRTdGF0ZX1cIiBsYWJlbHRleHQ9XCJBbiBleGFtcGxlIGNoZWNrYm94IHdpdGggc29tZSBhZGRpdGlvbmFsIGV2ZW50IGhhbmRsaW5nIG9mIGNsaWNrcyBpbnNpZGVcIj5cblx0XHQ8aW5wdXQgc2xvdD1cImNoZWNrYm94ZWxlbWVudFwiIHR5cGU9XCJjaGVja2JveFwiIC8+XG5cdDwvem9vLWNoZWNrYm94PlxuXHQ8em9vLXJhZGlvIHZhbGlkPVwie2lucHV0U3RhdGV9XCIgZXJyb3Jtc2c9XCJlcnJvcm1zZ1wiIGluZm90ZXh0PVwiaW5mb3RleHRcIj5cblx0XHQ8dGVtcGxhdGU+XG5cdFx0XHQ8aW5wdXQgdHlwZT1cInJhZGlvXCIgaWQ9XCJjb250YWN0Q2hvaWNlMVwiIG5hbWU9XCJjb250YWN0XCIgdmFsdWU9XCJlbWFpbFwiIGRpc2FibGVkPlxuXHRcdFx0PGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2UxXCI+RW1haWw8L2xhYmVsPlxuXHRcdFx0PGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwiY29udGFjdENob2ljZTJcIiBuYW1lPVwiY29udGFjdFwiIHZhbHVlPVwicGhvbmVcIj5cblx0XHRcdDxsYWJlbCBmb3I9XCJjb250YWN0Q2hvaWNlMlwiPlBob25lPC9sYWJlbD5cblx0XHRcdDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2UzXCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cIm1haWxcIj5cblx0XHRcdDxsYWJlbCBmb3I9XCJjb250YWN0Q2hvaWNlM1wiPk1haWw8L2xhYmVsPlxuXHRcdDwvdGVtcGxhdGU+XG5cdDwvem9vLXJhZGlvPlxuXG5cdDx6b28tcmFkaW8gdmFsaWQ9XCJ7aW5wdXRTdGF0ZX1cIiBlcnJvcm1zZz1cImVycm9ybXNnXCIgaW5mb3RleHQ9XCJpbmZvdGV4dFwiPlxuXHRcdDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2U0XCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cImVtYWlsXCIgZGlzYWJsZWQ+XG5cdFx0PGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2U0XCI+RW1haWw8L2xhYmVsPlxuXHRcdDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2U1XCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cInBob25lXCI+XG5cdFx0PGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2U1XCI+UGhvbmU8L2xhYmVsPlxuXHQ8L3pvby1yYWRpbz5cbjwvZm9ybT5cbjxkaXYgY2xhc3M9XCJzdWJtaXRcIj5cblx0PHpvby1idXR0b24gdHlwZT1cImhvdFwiIHNpemU9XCJtZWRpdW1cIiBvbjpjbGljaz1cIntjaGFuZ2VTdGF0ZX1cIj5cblx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiIGNsYXNzPVwic2xvdHRlZC1zcGFuXCI+VHJpZ2dlciBpbnZhbGlkIHN0YXRlITwvc3Bhbj5cblx0PC96b28tYnV0dG9uPlxuPC9kaXY+XG5cbjxzdHlsZSB0eXBlPSd0ZXh0L3Njc3MnPi5jb250ZXh0IHtcbiAgaGVpZ2h0OiA4MHB4OyB9XG4gIC5jb250ZXh0IGgyIHtcbiAgICBjb2xvcjogIzNDOTcwMDtcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7IH1cblxuLmZvcm0ge1xuICBmbGV4OiAxIDAgYXV0bztcbiAgbWFyZ2luOiAyMHB4IGF1dG87XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KGF1dG8tZmlsbCwgbWlubWF4KDMyMHB4LCAxZnIpKTtcbiAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiAxMjBweCAxNTBweCAxMjBweCA3MHB4O1xuICBncmlkLWdhcDogMjBweDsgfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDU0NHB4KSB7XG4gICAgLmZvcm0ge1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiBhdXRvOyB9IH1cblxuLnN1Ym1pdCB7XG4gIHdpZHRoOiAyNTBweDtcbiAgaGVpZ2h0OiA1MHB4O1xuICBtYXJnaW46IDAgYXV0bzsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGxldCBvcHRpb25zID0gW1xuXHRcdHtcblx0XHRcdHRleHQ6ICd0ZXh0Jyxcblx0XHRcdHZhbHVlOiAndmFsdWUnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHR0ZXh0OiAncmFOZE9tJyxcblx0XHRcdHZhbHVlOiAncmFuZG9tJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0dGV4dDogJ3JhbmRvbTEnLFxuXHRcdFx0dmFsdWU6ICdyYW5kb20xJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0dGV4dDogJ3JhbmRvbTInLFxuXHRcdFx0dmFsdWU6ICdyYW5kb20yJ1xuXHRcdH1cblx0XTtcblx0bGV0IGlucHV0U3RhdGUgPSB0cnVlO1xuXHRjb25zdCBjaGFuZ2VTdGF0ZSA9ICgpID0+IHtcblx0XHRpbnB1dFN0YXRlID0gIWlucHV0U3RhdGU7XG5cdH1cbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFvRndCLFFBQVEsQUFBQyxDQUFDLEFBQ2hDLE1BQU0sQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUNmLFFBQVEsQ0FBQyxFQUFFLEFBQUMsQ0FBQyxBQUNYLEtBQUssQ0FBRSxPQUFPLENBQ2QsVUFBVSxDQUFFLE1BQU0sQUFBRSxDQUFDLEFBRXpCLEtBQUssQUFBQyxDQUFDLEFBQ0wsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNkLE1BQU0sQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUNqQixPQUFPLENBQUUsSUFBSSxDQUNiLHFCQUFxQixDQUFFLE9BQU8sU0FBUyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUM1RCxrQkFBa0IsQ0FBRSxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQzFDLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUNqQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxDQUFDLEFBQUMsQ0FBQyxBQUN6QyxLQUFLLEFBQUMsQ0FBQyxBQUNMLGtCQUFrQixDQUFFLElBQUksQUFBRSxDQUFDLEFBQUMsQ0FBQyxBQUVuQyxPQUFPLEFBQUMsQ0FBQyxBQUNQLEtBQUssQ0FBRSxLQUFLLENBQ1osTUFBTSxDQUFFLElBQUksQ0FDWixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDIn0= */</style>`;

			init(this, { target: this.shadowRoot }, instance$2, create_fragment$2, safe_not_equal, []);

			if (options) {
				if (options.target) {
					insert(options.target, this, options.anchor);
				}
			}
		}

		static get observedAttributes() {
			return [];
		}
	}

	customElements.define("app-form", Form);

	/* src/Buttons.svelte generated by Svelte v3.0.0-beta.20 */

	const file$3 = "src/Buttons.svelte";

	function create_fragment$3(ctx) {
		var zoo_toast, t0, div0, h2, t2, div2, zoo_button0, span0, t4, zoo_button1, div1, t5, zoo_tooltip, t6, zoo_button2, span1, t8, zoo_modal, div3, zoo_feedback, t9, br0, t10, zoo_select, select, option0, option1, option2, option3, t15, br1, t16, zoo_checkbox, input, t17, br2, t18, zoo_button3, span2, dispose;

		return {
			c: function create() {
				zoo_toast = element("zoo-toast");
				t0 = space();
				div0 = element("div");
				h2 = element("h2");
				h2.textContent = "Second section is a showcase of buttons and modals.";
				t2 = space();
				div2 = element("div");
				zoo_button0 = element("zoo-button");
				span0 = element("span");
				span0.textContent = "Here we have a very long text indeed!";
				t4 = space();
				zoo_button1 = element("zoo-button");
				div1 = element("div");
				t5 = text("Disabled :(\n\t\t\t");
				zoo_tooltip = element("zoo-tooltip");
				t6 = space();
				zoo_button2 = element("zoo-button");
				span1 = element("span");
				span1.textContent = "Show modal";
				t8 = space();
				zoo_modal = element("zoo-modal");
				div3 = element("div");
				zoo_feedback = element("zoo-feedback");
				t9 = space();
				br0 = element("br");
				t10 = space();
				zoo_select = element("zoo-select");
				select = element("select");
				option0 = element("option");
				option0.textContent = "Doge";
				option1 = element("option");
				option1.textContent = "Doge";
				option2 = element("option");
				option2.textContent = "Catz";
				option3 = element("option");
				option3.textContent = "Snek";
				t15 = space();
				br1 = element("br");
				t16 = space();
				zoo_checkbox = element("zoo-checkbox");
				input = element("input");
				t17 = space();
				br2 = element("br");
				t18 = space();
				zoo_button3 = element("zoo-button");
				span2 = element("span");
				span2.textContent = "Add to cart";
				this.c = noop;
				set_custom_element_data(zoo_toast, "text", "Search for more than 8.000 products.");
				add_location(zoo_toast, file$3, 1, 0, 52);
				add_location(h2, file$3, 4, 1, 162);
				div0.className = "context";
				add_location(div0, file$3, 3, 0, 139);
				attr(span0, "slot", "buttoncontent");
				span0.className = "slotted-span";
				add_location(span0, file$3, 8, 2, 314);
				set_custom_element_data(zoo_button0, "size", "medium");
				add_location(zoo_button0, file$3, 7, 1, 253);
				set_custom_element_data(zoo_tooltip, "position", "bottom");
				set_custom_element_data(zoo_tooltip, "text", "Just set disabled attribute on `zoo-button`");
				add_location(zoo_tooltip, file$3, 13, 3, 535);
				attr(div1, "slot", "buttoncontent");
				add_location(div1, file$3, 11, 2, 490);
				set_custom_element_data(zoo_button1, "size", "medium");
				set_custom_element_data(zoo_button1, "disabled", true);
				zoo_button1.className = "top-tooltip";
				add_location(zoo_button1, file$3, 10, 1, 423);
				attr(span1, "slot", "buttoncontent");
				span1.className = "slotted-span";
				add_location(span1, file$3, 19, 2, 742);
				set_custom_element_data(zoo_button2, "type", "hot");
				set_custom_element_data(zoo_button2, "size", "medium");
				add_location(zoo_button2, file$3, 18, 1, 665);
				div2.className = "buttons";
				add_location(div2, file$3, 6, 0, 230);
				set_custom_element_data(zoo_feedback, "type", "info");
				set_custom_element_data(zoo_feedback, "text", "This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered.");
				add_location(zoo_feedback, file$3, 24, 2, 941);
				add_location(br0, file$3, 28, 2, 1123);
				option0.className = "placeholder";
				option0.__value = "";
				option0.value = option0.__value;
				option0.disabled = true;
				option0.selected = true;
				add_location(option0, file$3, 32, 4, 1231);
				option1.__value = "Doge";
				option1.value = option1.__value;
				add_location(option1, file$3, 33, 4, 1304);
				option2.__value = "Catz";
				option2.value = option2.__value;
				add_location(option2, file$3, 34, 4, 1330);
				option3.__value = "Snek";
				option3.value = option3.__value;
				add_location(option3, file$3, 35, 4, 1356);
				attr(select, "slot", "selectelement");
				add_location(select, file$3, 31, 3, 1197);
				set_custom_element_data(zoo_select, "labeltext", "This product is for");
				set_custom_element_data(zoo_select, "valid", true);
				add_location(zoo_select, file$3, 29, 2, 1130);
				add_location(br1, file$3, 38, 2, 1409);
				attr(input, "slot", "checkboxelement");
				attr(input, "type", "checkbox");
				add_location(input, file$3, 41, 3, 1528);
				set_custom_element_data(zoo_checkbox, "highlighted", "");
				set_custom_element_data(zoo_checkbox, "labeltext", "I understand and confirm that ALL of the above statements are true");
				add_location(zoo_checkbox, file$3, 39, 2, 1416);
				add_location(br2, file$3, 43, 2, 1596);
				attr(span2, "slot", "buttoncontent");
				add_location(span2, file$3, 45, 3, 1682);
				set_custom_element_data(zoo_button3, "type", "hot");
				set_custom_element_data(zoo_button3, "size", "medium");
				add_location(zoo_button3, file$3, 44, 2, 1603);
				add_location(div3, file$3, 23, 1, 933);
				set_style(zoo_modal, "display", "none");
				set_custom_element_data(zoo_modal, "headertext", "Your basket contains licensed items");
				add_location(zoo_modal, file$3, 22, 0, 831);

				dispose = [
					listen(zoo_button0, "click", ctx.click_handler),
					listen(zoo_button2, "click", ctx.click_handler_1),
					listen(zoo_button3, "click", ctx.click_handler_2)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, zoo_toast, anchor);
				add_binding_callback(() => ctx.zoo_toast_binding(zoo_toast, null));
				insert(target, t0, anchor);
				insert(target, div0, anchor);
				append(div0, h2);
				insert(target, t2, anchor);
				insert(target, div2, anchor);
				append(div2, zoo_button0);
				append(zoo_button0, span0);
				append(div2, t4);
				append(div2, zoo_button1);
				append(zoo_button1, div1);
				append(div1, t5);
				append(div1, zoo_tooltip);
				append(div2, t6);
				append(div2, zoo_button2);
				append(zoo_button2, span1);
				insert(target, t8, anchor);
				insert(target, zoo_modal, anchor);
				append(zoo_modal, div3);
				append(div3, zoo_feedback);
				append(div3, t9);
				append(div3, br0);
				append(div3, t10);
				append(div3, zoo_select);
				append(zoo_select, select);
				append(select, option0);
				append(select, option1);
				append(select, option2);
				append(select, option3);
				append(div3, t15);
				append(div3, br1);
				append(div3, t16);
				append(div3, zoo_checkbox);
				append(zoo_checkbox, input);
				append(div3, t17);
				append(div3, br2);
				append(div3, t18);
				append(div3, zoo_button3);
				append(zoo_button3, span2);
				add_binding_callback(() => ctx.zoo_modal_binding(zoo_modal, null));
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_toast_binding(null, zoo_toast);
					ctx.zoo_toast_binding(zoo_toast, null);
				}
				if (changed.items) {
					ctx.zoo_modal_binding(null, zoo_modal);
					ctx.zoo_modal_binding(zoo_modal, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(zoo_toast);
				}

				ctx.zoo_toast_binding(null, zoo_toast);

				if (detaching) {
					detach(t0);
					detach(div0);
					detach(t2);
					detach(div2);
					detach(t8);
					detach(zoo_modal);
				}

				ctx.zoo_modal_binding(null, zoo_modal);
				run_all(dispose);
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let toast;
		let modal;

		function zoo_toast_binding($$node, check) {
			toast = $$node;
			$$invalidate('toast', toast);
		}

		function click_handler() {
			return toast.show();
		}

		function click_handler_1() {
			return modal.openModal();
		}

		function click_handler_2() {
			return modal.closeModal();
		}

		function zoo_modal_binding($$node, check) {
			modal = $$node;
			$$invalidate('modal', modal);
		}

		return {
			toast,
			modal,
			zoo_toast_binding,
			click_handler,
			click_handler_1,
			click_handler_2,
			zoo_modal_binding
		};
	}

	class Buttons extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.context{height:80px}.context h2{color:#3C9700;text-align:center}.buttons{max-width:1280px;margin:20px auto;display:flex;width:90%}.buttons zoo-button{margin-left:15px}.buttons zoo-button:first-of-type{margin-left:0}.slotted-span{display:block;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}zoo-tooltip{display:none}.top-tooltip{position:relative;display:inline-block}.top-tooltip:hover zoo-tooltip{display:block}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQnV0dG9ucy5zdmVsdGUiLCJzb3VyY2VzIjpbIkJ1dHRvbnMuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJhcHAtYnV0dG9uc1wiPjwvc3ZlbHRlOm9wdGlvbnM+XG48em9vLXRvYXN0IHRleHQ9XCJTZWFyY2ggZm9yIG1vcmUgdGhhbiA4LjAwMCBwcm9kdWN0cy5cIiBiaW5kOnRoaXM9e3RvYXN0fT5cbjwvem9vLXRvYXN0PlxuPGRpdiBjbGFzcz1cImNvbnRleHRcIj5cblx0PGgyPlNlY29uZCBzZWN0aW9uIGlzIGEgc2hvd2Nhc2Ugb2YgYnV0dG9ucyBhbmQgbW9kYWxzLjwvaDI+XG48L2Rpdj5cbjxkaXYgY2xhc3M9XCJidXR0b25zXCI+XG5cdDx6b28tYnV0dG9uIHNpemU9XCJtZWRpdW1cIiBvbjpjbGljaz1cInsoKSA9PiB0b2FzdC5zaG93KCl9XCI+XG5cdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIiBjbGFzcz1cInNsb3R0ZWQtc3BhblwiPkhlcmUgd2UgaGF2ZSBhIHZlcnkgbG9uZyB0ZXh0IGluZGVlZCE8L3NwYW4+XG5cdDwvem9vLWJ1dHRvbj5cblx0PHpvby1idXR0b24gc2l6ZT1cIm1lZGl1bVwiIGRpc2FibGVkPVwie3RydWV9XCIgY2xhc3M9XCJ0b3AtdG9vbHRpcFwiPlxuXHRcdDxkaXYgc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj5cblx0XHRcdERpc2FibGVkIDooXG5cdFx0XHQ8em9vLXRvb2x0aXAgcG9zaXRpb249XCJib3R0b21cIlxuXHRcdFx0XHR0ZXh0PVwiSnVzdCBzZXQgZGlzYWJsZWQgYXR0cmlidXRlIG9uIGB6b28tYnV0dG9uYFwiPlxuXHRcdFx0PC96b28tdG9vbHRpcD5cblx0XHQ8L2Rpdj5cblx0PC96b28tYnV0dG9uPlxuXHQ8em9vLWJ1dHRvbiB0eXBlPVwiaG90XCIgc2l6ZT1cIm1lZGl1bVwiIG9uOmNsaWNrPVwieygpID0+IG1vZGFsLm9wZW5Nb2RhbCgpfVwiPlxuXHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCIgY2xhc3M9XCJzbG90dGVkLXNwYW5cIj5TaG93IG1vZGFsPC9zcGFuPlxuXHQ8L3pvby1idXR0b24+XG48L2Rpdj4gXG48em9vLW1vZGFsIHN0eWxlPVwiZGlzcGxheTogbm9uZVwiIGhlYWRlcnRleHQ9XCJZb3VyIGJhc2tldCBjb250YWlucyBsaWNlbnNlZCBpdGVtc1wiIGJpbmQ6dGhpcz17bW9kYWx9PlxuXHQ8ZGl2PlxuXHRcdDx6b28tZmVlZGJhY2sgXG5cdFx0dHlwZT1cImluZm9cIiBcblx0XHR0ZXh0PVwiVGhpcyBpcyBhbiBpbmZvIG1lc3NhZ2UuIE9ubHkgb25lIGNvdXBvbiBjYW4gYmUgYWNjZXB0ZWQgd2l0aCBlYWNoIG9yZGVyLiBQbGVhc2UgY2hvb3NlIG9uZSBjb3Vwb24gdGhhdCB5b3UganVzdCBlbnRlcmVkLlwiPlxuXHRcdDwvem9vLWZlZWRiYWNrPlxuXHRcdDxicj5cblx0XHQ8em9vLXNlbGVjdCBsYWJlbHRleHQ9XCJUaGlzIHByb2R1Y3QgaXMgZm9yXCIgXG5cdFx0XHR2YWxpZD1cInt0cnVlfVwiPlxuXHRcdFx0PHNlbGVjdCBzbG90PVwic2VsZWN0ZWxlbWVudFwiPlxuXHRcdFx0XHQ8b3B0aW9uIGNsYXNzPVwicGxhY2Vob2xkZXJcIiB2YWx1ZT1cIlwiIGRpc2FibGVkIHNlbGVjdGVkPkRvZ2U8L29wdGlvbj5cblx0XHRcdFx0PG9wdGlvbj5Eb2dlPC9vcHRpb24+XG5cdFx0XHRcdDxvcHRpb24+Q2F0ejwvb3B0aW9uPlxuXHRcdFx0XHQ8b3B0aW9uPlNuZWs8L29wdGlvbj5cblx0XHRcdDwvc2VsZWN0PlxuXHRcdDwvem9vLXNlbGVjdD5cblx0XHQ8YnI+XG5cdFx0PHpvby1jaGVja2JveCBoaWdobGlnaHRlZFxuXHRcdFx0bGFiZWx0ZXh0PVwiSSB1bmRlcnN0YW5kIGFuZCBjb25maXJtIHRoYXQgQUxMIG9mIHRoZSBhYm92ZSBzdGF0ZW1lbnRzIGFyZSB0cnVlXCI+XG5cdFx0XHQ8aW5wdXQgc2xvdD1cImNoZWNrYm94ZWxlbWVudFwiIHR5cGU9XCJjaGVja2JveFwiLz5cblx0XHQ8L3pvby1jaGVja2JveD5cblx0XHQ8YnI+XG5cdFx0PHpvby1idXR0b24gdHlwZT1cImhvdFwiIHNpemU9XCJtZWRpdW1cIiBvbjpjbGljaz1cInsoKSA9PiBtb2RhbC5jbG9zZU1vZGFsKCl9XCI+XG5cdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPkFkZCB0byBjYXJ0PC9zcGFuPlxuXHRcdDwvem9vLWJ1dHRvbj5cblx0PC9kaXY+XG48L3pvby1tb2RhbD5cbjxzdHlsZSB0eXBlPSd0ZXh0L3Njc3MnPi5jb250ZXh0IHtcbiAgaGVpZ2h0OiA4MHB4OyB9XG4gIC5jb250ZXh0IGgyIHtcbiAgICBjb2xvcjogIzNDOTcwMDtcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7IH1cblxuLmJ1dHRvbnMge1xuICBtYXgtd2lkdGg6IDEyODBweDtcbiAgbWFyZ2luOiAyMHB4IGF1dG87XG4gIGRpc3BsYXk6IGZsZXg7XG4gIHdpZHRoOiA5MCU7IH1cbiAgLmJ1dHRvbnMgem9vLWJ1dHRvbiB7XG4gICAgbWFyZ2luLWxlZnQ6IDE1cHg7IH1cbiAgICAuYnV0dG9ucyB6b28tYnV0dG9uOmZpcnN0LW9mLXR5cGUge1xuICAgICAgbWFyZ2luLWxlZnQ6IDA7IH1cblxuLnNsb3R0ZWQtc3BhbiB7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpcztcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfVxuXG56b28tdG9vbHRpcCB7XG4gIGRpc3BsYXk6IG5vbmU7IH1cblxuLnRvcC10b29sdGlwIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IH1cbiAgLnRvcC10b29sdGlwOmhvdmVyIHpvby10b29sdGlwIHtcbiAgICBkaXNwbGF5OiBibG9jazsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG48c2NyaXB0PlxuXHRsZXQgdG9hc3Q7XG5cdGxldCBtb2RhbDtcblxuXHRjb25zdCBzaG93TW9kYWwgPSAoKSA9PiB7XG5cdFx0bW9kYWwuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cdH07XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBaUR3QixRQUFRLEFBQUMsQ0FBQyxBQUNoQyxNQUFNLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDZixRQUFRLENBQUMsRUFBRSxBQUFDLENBQUMsQUFDWCxLQUFLLENBQUUsT0FBTyxDQUNkLFVBQVUsQ0FBRSxNQUFNLEFBQUUsQ0FBQyxBQUV6QixRQUFRLEFBQUMsQ0FBQyxBQUNSLFNBQVMsQ0FBRSxNQUFNLENBQ2pCLE1BQU0sQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUNqQixPQUFPLENBQUUsSUFBSSxDQUNiLEtBQUssQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUNiLFFBQVEsQ0FBQyxVQUFVLEFBQUMsQ0FBQyxBQUNuQixXQUFXLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDcEIsUUFBUSxDQUFDLFVBQVUsY0FBYyxBQUFDLENBQUMsQUFDakMsV0FBVyxDQUFFLENBQUMsQUFBRSxDQUFDLEFBRXZCLGFBQWEsQUFBQyxDQUFDLEFBQ2IsT0FBTyxDQUFFLEtBQUssQ0FDZCxhQUFhLENBQUUsUUFBUSxDQUN2QixRQUFRLENBQUUsTUFBTSxDQUNoQixXQUFXLENBQUUsTUFBTSxBQUFFLENBQUMsQUFFeEIsV0FBVyxBQUFDLENBQUMsQUFDWCxPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFbEIsWUFBWSxBQUFDLENBQUMsQUFDWixRQUFRLENBQUUsUUFBUSxDQUNsQixPQUFPLENBQUUsWUFBWSxBQUFFLENBQUMsQUFDeEIsWUFBWSxNQUFNLENBQUMsV0FBVyxBQUFDLENBQUMsQUFDOUIsT0FBTyxDQUFFLEtBQUssQUFBRSxDQUFDIn0= */</style>`;

			init(this, { target: this.shadowRoot }, instance$3, create_fragment$3, safe_not_equal, []);

			if (options) {
				if (options.target) {
					insert(options.target, this, options.anchor);
				}
			}
		}

		static get observedAttributes() {
			return [];
		}
	}

	customElements.define("app-buttons", Buttons);

	/* src/TooltipAndFeedback.svelte generated by Svelte v3.0.0-beta.20 */

	const file$4 = "src/TooltipAndFeedback.svelte";

	function create_fragment$4(ctx) {
		var div0, h2, t1, div5, div1, zoo_feedback0, t2, zoo_tooltip0, t3, div2, zoo_feedback1, t4, zoo_tooltip1, t5, div3, zoo_feedback2, t6, zoo_tooltip2, t7, div4, zoo_button, span, t9, zoo_tooltip4, zoo_input, input, t10, zoo_tooltip3, dispose;

		return {
			c: function create() {
				div0 = element("div");
				h2 = element("h2");
				h2.textContent = "Third section is a showcase of tooltips and feedback boxes.";
				t1 = space();
				div5 = element("div");
				div1 = element("div");
				zoo_feedback0 = element("zoo-feedback");
				t2 = space();
				zoo_tooltip0 = element("zoo-tooltip");
				t3 = space();
				div2 = element("div");
				zoo_feedback1 = element("zoo-feedback");
				t4 = space();
				zoo_tooltip1 = element("zoo-tooltip");
				t5 = space();
				div3 = element("div");
				zoo_feedback2 = element("zoo-feedback");
				t6 = space();
				zoo_tooltip2 = element("zoo-tooltip");
				t7 = space();
				div4 = element("div");
				zoo_button = element("zoo-button");
				span = element("span");
				span.textContent = "This element will show tooltip on top only when it is clicked.";
				t9 = space();
				zoo_tooltip4 = element("zoo-tooltip");
				zoo_input = element("zoo-input");
				input = element("input");
				t10 = space();
				zoo_tooltip3 = element("zoo-tooltip");
				this.c = noop;
				add_location(h2, file$4, 2, 1, 88);
				div0.className = "context";
				add_location(div0, file$4, 1, 0, 65);
				set_custom_element_data(zoo_feedback0, "type", "info");
				set_custom_element_data(zoo_feedback0, "text", "This is an info message. This element will show tooltip on the right side on hover.");
				add_location(zoo_feedback0, file$4, 6, 2, 226);
				set_custom_element_data(zoo_tooltip0, "position", "right");
				set_custom_element_data(zoo_tooltip0, "text", "Hello from right side.");
				add_location(zoo_tooltip0, file$4, 7, 2, 361);
				div1.className = "feedback-tooltip";
				add_location(div1, file$4, 5, 1, 193);
				set_custom_element_data(zoo_feedback1, "type", "error");
				set_custom_element_data(zoo_feedback1, "text", "This is an error message. This element will show tooltip on the left side on hover.");
				add_location(zoo_feedback1, file$4, 10, 2, 478);
				set_custom_element_data(zoo_tooltip1, "position", "left");
				set_custom_element_data(zoo_tooltip1, "text", "Hello from left side.");
				add_location(zoo_tooltip1, file$4, 11, 2, 614);
				div2.className = "feedback-tooltip";
				add_location(div2, file$4, 9, 1, 445);
				set_custom_element_data(zoo_feedback2, "type", "success");
				set_custom_element_data(zoo_feedback2, "text", "This is a success message. This element will show tooltip on the bottom side on hover.");
				add_location(zoo_feedback2, file$4, 14, 2, 729);
				set_custom_element_data(zoo_tooltip2, "position", "bottom");
				set_custom_element_data(zoo_tooltip2, "text", "Hello from below");
				add_location(zoo_tooltip2, file$4, 15, 2, 870);
				div3.className = "feedback-tooltip";
				add_location(div3, file$4, 13, 1, 696);
				span.className = "slotted-span";
				attr(span, "slot", "buttoncontent");
				add_location(span, file$4, 19, 3, 1030);
				add_location(zoo_button, file$4, 18, 2, 982);
				attr(input, "slot", "inputelement");
				input.placeholder = "Search for more than 8.000 products";
				add_location(input, file$4, 23, 4, 1278);
				zoo_input.className = "input-in-tooltip";
				add_location(zoo_input, file$4, 22, 3, 1237);
				zoo_tooltip3.className = "nested-tooltip";
				set_custom_element_data(zoo_tooltip3, "position", "right");
				set_custom_element_data(zoo_tooltip3, "text", "Hello from nested tooltip.");
				add_location(zoo_tooltip3, file$4, 25, 3, 1376);
				set_custom_element_data(zoo_tooltip4, "text", "Hello from up above");
				add_location(zoo_tooltip4, file$4, 21, 2, 1166);
				div4.className = "special-tooltip";
				add_location(div4, file$4, 17, 1, 949);
				div5.className = "inner-content";
				add_location(div5, file$4, 4, 0, 164);
				dispose = listen(zoo_button, "click", ctx.showSpecialTooltip);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div0, anchor);
				append(div0, h2);
				insert(target, t1, anchor);
				insert(target, div5, anchor);
				append(div5, div1);
				append(div1, zoo_feedback0);
				append(div1, t2);
				append(div1, zoo_tooltip0);
				append(div5, t3);
				append(div5, div2);
				append(div2, zoo_feedback1);
				append(div2, t4);
				append(div2, zoo_tooltip1);
				append(div5, t5);
				append(div5, div3);
				append(div3, zoo_feedback2);
				append(div3, t6);
				append(div3, zoo_tooltip2);
				append(div5, t7);
				append(div5, div4);
				append(div4, zoo_button);
				append(zoo_button, span);
				append(div4, t9);
				append(div4, zoo_tooltip4);
				append(zoo_tooltip4, zoo_input);
				append(zoo_input, input);
				append(zoo_tooltip4, t10);
				append(zoo_tooltip4, zoo_tooltip3);
				add_binding_callback(() => ctx.zoo_tooltip4_binding(zoo_tooltip4, null));
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_tooltip4_binding(null, zoo_tooltip4);
					ctx.zoo_tooltip4_binding(zoo_tooltip4, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div0);
					detach(t1);
					detach(div5);
				}

				ctx.zoo_tooltip4_binding(null, zoo_tooltip4);
				dispose();
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		let specialTooltip;
		const showSpecialTooltip = () => {
			const elStyle = specialTooltip.style;
			const display = !elStyle.display || elStyle.display === 'none' ? 'block' : 'none';
			elStyle.display = display;
		};

		function zoo_tooltip4_binding($$node, check) {
			specialTooltip = $$node;
			$$invalidate('specialTooltip', specialTooltip);
		}

		return {
			specialTooltip,
			showSpecialTooltip,
			zoo_tooltip4_binding
		};
	}

	class TooltipAndFeedback extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.context{height:80px}.context h2{color:#3C9700;text-align:center}.inner-content{flex:1 0 auto;width:70%;margin:20px auto}.inner-content .feedback-tooltip{height:60px;margin-bottom:15px;position:relative}.inner-content .feedback-tooltip:hover zoo-tooltip{display:block}.special-tooltip{width:250px;position:relative;margin:0 auto;cursor:pointer}.special-tooltip .slotted-span{line-height:25px}zoo-tooltip{display:none}.input-in-tooltip:hover~.nested-tooltip{display:block}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHRpcEFuZEZlZWRiYWNrLnN2ZWx0ZSIsInNvdXJjZXMiOlsiVG9vbHRpcEFuZEZlZWRiYWNrLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiYXBwLXRvb2x0aXAtYW5kLWZlZWRiYWNrXCI+PC9zdmVsdGU6b3B0aW9ucz5cbjxkaXYgY2xhc3M9XCJjb250ZXh0XCI+XG5cdDxoMj5UaGlyZCBzZWN0aW9uIGlzIGEgc2hvd2Nhc2Ugb2YgdG9vbHRpcHMgYW5kIGZlZWRiYWNrIGJveGVzLjwvaDI+XG48L2Rpdj5cbjxkaXYgY2xhc3M9XCJpbm5lci1jb250ZW50XCI+XG5cdDxkaXYgY2xhc3M9XCJmZWVkYmFjay10b29sdGlwXCI+XG5cdFx0PHpvby1mZWVkYmFjayB0eXBlPVwiaW5mb1wiIHRleHQ9XCJUaGlzIGlzIGFuIGluZm8gbWVzc2FnZS4gVGhpcyBlbGVtZW50IHdpbGwgc2hvdyB0b29sdGlwIG9uIHRoZSByaWdodCBzaWRlIG9uIGhvdmVyLlwiPjwvem9vLWZlZWRiYWNrPlxuXHRcdDx6b28tdG9vbHRpcCBwb3NpdGlvbj1cInJpZ2h0XCIgdGV4dD1cIkhlbGxvIGZyb20gcmlnaHQgc2lkZS5cIj48L3pvby10b29sdGlwPlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImZlZWRiYWNrLXRvb2x0aXBcIj5cblx0XHQ8em9vLWZlZWRiYWNrIHR5cGU9XCJlcnJvclwiIHRleHQ9XCJUaGlzIGlzIGFuIGVycm9yIG1lc3NhZ2UuIFRoaXMgZWxlbWVudCB3aWxsIHNob3cgdG9vbHRpcCBvbiB0aGUgbGVmdCBzaWRlIG9uIGhvdmVyLlwiPjwvem9vLWZlZWRiYWNrPlxuXHRcdDx6b28tdG9vbHRpcCBwb3NpdGlvbj1cImxlZnRcIiB0ZXh0PVwiSGVsbG8gZnJvbSBsZWZ0IHNpZGUuXCI+PC96b28tdG9vbHRpcD5cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJmZWVkYmFjay10b29sdGlwXCI+XG5cdFx0PHpvby1mZWVkYmFjayB0eXBlPVwic3VjY2Vzc1wiIHRleHQ9XCJUaGlzIGlzIGEgc3VjY2VzcyBtZXNzYWdlLiBUaGlzIGVsZW1lbnQgd2lsbCBzaG93IHRvb2x0aXAgb24gdGhlIGJvdHRvbSBzaWRlIG9uIGhvdmVyLlwiPjwvem9vLWZlZWRiYWNrPlxuXHRcdDx6b28tdG9vbHRpcCBwb3NpdGlvbj1cImJvdHRvbVwiIHRleHQ9XCJIZWxsbyBmcm9tIGJlbG93XCI+PC96b28tdG9vbHRpcD5cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJzcGVjaWFsLXRvb2x0aXBcIj4gXG5cdFx0PHpvby1idXR0b24gb246Y2xpY2s9XCJ7c2hvd1NwZWNpYWxUb29sdGlwfVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzbG90dGVkLXNwYW5cIiBzbG90PVwiYnV0dG9uY29udGVudFwiPlRoaXMgZWxlbWVudCB3aWxsIHNob3cgdG9vbHRpcCBvbiB0b3Agb25seSB3aGVuIGl0IGlzIGNsaWNrZWQuPC9zcGFuPlxuXHRcdDwvem9vLWJ1dHRvbj5cblx0XHQ8em9vLXRvb2x0aXAgYmluZDp0aGlzPXtzcGVjaWFsVG9vbHRpcH0gdGV4dD1cIkhlbGxvIGZyb20gdXAgYWJvdmVcIj5cblx0XHRcdDx6b28taW5wdXQgY2xhc3M9XCJpbnB1dC1pbi10b29sdGlwXCI+XG5cdFx0XHRcdDxpbnB1dCBzbG90PVwiaW5wdXRlbGVtZW50XCIgcGxhY2Vob2xkZXI9XCJTZWFyY2ggZm9yIG1vcmUgdGhhbiA4LjAwMCBwcm9kdWN0c1wiLz5cblx0XHRcdDwvem9vLWlucHV0PlxuXHRcdFx0PHpvby10b29sdGlwIGNsYXNzPVwibmVzdGVkLXRvb2x0aXBcIiBwb3NpdGlvbj1cInJpZ2h0XCIgdGV4dD1cIkhlbGxvIGZyb20gbmVzdGVkIHRvb2x0aXAuXCI+XG5cdFx0XHQ8L3pvby10b29sdGlwPlxuXHRcdDwvem9vLXRvb2x0aXA+XG5cdDwvZGl2PlxuPC9kaXY+XG5cbjxzdHlsZSB0eXBlPSd0ZXh0L3Njc3MnPi5jb250ZXh0IHtcbiAgaGVpZ2h0OiA4MHB4OyB9XG4gIC5jb250ZXh0IGgyIHtcbiAgICBjb2xvcjogIzNDOTcwMDtcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7IH1cblxuLmlubmVyLWNvbnRlbnQge1xuICBmbGV4OiAxIDAgYXV0bztcbiAgd2lkdGg6IDcwJTtcbiAgbWFyZ2luOiAyMHB4IGF1dG87IH1cbiAgLmlubmVyLWNvbnRlbnQgLmZlZWRiYWNrLXRvb2x0aXAge1xuICAgIGhlaWdodDogNjBweDtcbiAgICBtYXJnaW4tYm90dG9tOiAxNXB4O1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgfVxuICAgIC5pbm5lci1jb250ZW50IC5mZWVkYmFjay10b29sdGlwOmhvdmVyIHpvby10b29sdGlwIHtcbiAgICAgIGRpc3BsYXk6IGJsb2NrOyB9XG5cbi5zcGVjaWFsLXRvb2x0aXAge1xuICB3aWR0aDogMjUwcHg7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgbWFyZ2luOiAwIGF1dG87XG4gIGN1cnNvcjogcG9pbnRlcjsgfVxuICAuc3BlY2lhbC10b29sdGlwIC5zbG90dGVkLXNwYW4ge1xuICAgIGxpbmUtaGVpZ2h0OiAyNXB4OyB9XG5cbi50b3AtdG9vbHRpcCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrOyB9XG4gIC50b3AtdG9vbHRpcDpob3ZlciB6b28tdG9vbHRpcCB7XG4gICAgZGlzcGxheTogYmxvY2s7IH1cblxuem9vLXRvb2x0aXAge1xuICBkaXNwbGF5OiBub25lOyB9XG5cbi5pbnB1dC1pbi10b29sdGlwOmhvdmVyIH4gLm5lc3RlZC10b29sdGlwIHtcbiAgZGlzcGxheTogYmxvY2s7IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRsZXQgc3BlY2lhbFRvb2x0aXA7XG5cdGNvbnN0IHNob3dTcGVjaWFsVG9vbHRpcCA9ICgpID0+IHtcblx0XHRjb25zdCBlbFN0eWxlID0gc3BlY2lhbFRvb2x0aXAuc3R5bGU7XG5cdFx0Y29uc3QgZGlzcGxheSA9ICFlbFN0eWxlLmRpc3BsYXkgfHwgZWxTdHlsZS5kaXNwbGF5ID09PSAnbm9uZScgPyAnYmxvY2snIDogJ25vbmUnO1xuXHRcdGVsU3R5bGUuZGlzcGxheSA9IGRpc3BsYXk7XG5cdH07XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBK0J3QixRQUFRLEFBQUMsQ0FBQyxBQUNoQyxNQUFNLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDZixRQUFRLENBQUMsRUFBRSxBQUFDLENBQUMsQUFDWCxLQUFLLENBQUUsT0FBTyxDQUNkLFVBQVUsQ0FBRSxNQUFNLEFBQUUsQ0FBQyxBQUV6QixjQUFjLEFBQUMsQ0FBQyxBQUNkLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDZCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxJQUFJLENBQUMsSUFBSSxBQUFFLENBQUMsQUFDcEIsY0FBYyxDQUFDLGlCQUFpQixBQUFDLENBQUMsQUFDaEMsTUFBTSxDQUFFLElBQUksQ0FDWixhQUFhLENBQUUsSUFBSSxDQUNuQixRQUFRLENBQUUsUUFBUSxBQUFFLENBQUMsQUFDckIsY0FBYyxDQUFDLGlCQUFpQixNQUFNLENBQUMsV0FBVyxBQUFDLENBQUMsQUFDbEQsT0FBTyxDQUFFLEtBQUssQUFBRSxDQUFDLEFBRXZCLGdCQUFnQixBQUFDLENBQUMsQUFDaEIsS0FBSyxDQUFFLEtBQUssQ0FDWixRQUFRLENBQUUsUUFBUSxDQUNsQixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FDZCxNQUFNLENBQUUsT0FBTyxBQUFFLENBQUMsQUFDbEIsZ0JBQWdCLENBQUMsYUFBYSxBQUFDLENBQUMsQUFDOUIsV0FBVyxDQUFFLElBQUksQUFBRSxDQUFDLEFBUXhCLFdBQVcsQUFBQyxDQUFDLEFBQ1gsT0FBTyxDQUFFLElBQUksQUFBRSxDQUFDLEFBRWxCLGlCQUFpQixNQUFNLENBQUcsZUFBZSxBQUFDLENBQUMsQUFDekMsT0FBTyxDQUFFLEtBQUssQUFBRSxDQUFDIn0= */</style>`;

			init(this, { target: this.shadowRoot }, instance$4, create_fragment$4, safe_not_equal, []);

			if (options) {
				if (options.target) {
					insert(options.target, this, options.anchor);
				}
			}
		}

		static get observedAttributes() {
			return [];
		}
	}

	customElements.define("app-tooltip-and-feedback", TooltipAndFeedback);

}());
//# sourceMappingURL=app.js.map