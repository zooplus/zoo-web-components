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

	function set_data(text, data) {
		text.data = '' + data;
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

	/* src/common/Context.svelte generated by Svelte v3.0.0-beta.20 */

	const file = "src/common/Context.svelte";

	function create_fragment(ctx) {
		var div, h2, t;

		return {
			c: function create() {
				div = element("div");
				h2 = element("h2");
				t = text(ctx.text);
				this.c = noop;
				add_location(h2, file, 2, 1, 75);
				div.className = "context";
				add_location(div, file, 1, 0, 52);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, h2);
				append(h2, t);
			},

			p: function update(changed, ctx) {
				if (changed.text) {
					set_data(t, ctx.text);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { text: text$$1 = '' } = $$props;

		$$self.$set = $$props => {
			if ('text' in $$props) $$invalidate('text', text$$1 = $$props.text);
		};

		return { text: text$$1 };
	}

	class Context extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.context{height:80px;display:flex;align-items:center;margin-left:20px}h2{color:var(--main-color, #3C9700)}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udGV4dC5zdmVsdGUiLCJzb3VyY2VzIjpbIkNvbnRleHQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJhcHAtY29udGV4dFwiPjwvc3ZlbHRlOm9wdGlvbnM+XG48ZGl2IGNsYXNzPVwiY29udGV4dFwiPlxuXHQ8aDI+e3RleHR9PC9oMj5cbjwvZGl2PlxuXG48c3R5bGU+XG5cdC5jb250ZXh0IHtcblx0XHRoZWlnaHQ6IDgwcHg7XG5cdFx0ZGlzcGxheTogZmxleDtcblx0XHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRcdG1hcmdpbi1sZWZ0OiAyMHB4O1xuXHR9XG5cdGgyIHtcblx0XHRjb2xvcjogdmFyKC0tbWFpbi1jb2xvciwgIzNDOTcwMCk7XG5cdH1cbjwvc3R5bGU+XG5cbjxzY3JpcHQ+IFxuXHRleHBvcnQgbGV0IHRleHQgPSAnJztcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFNQyxRQUFRLEFBQUMsQ0FBQyxBQUNULE1BQU0sQ0FBRSxJQUFJLENBQ1osT0FBTyxDQUFFLElBQUksQ0FDYixXQUFXLENBQUUsTUFBTSxDQUNuQixXQUFXLENBQUUsSUFBSSxBQUNsQixDQUFDLEFBQ0QsRUFBRSxBQUFDLENBQUMsQUFDSCxLQUFLLENBQUUsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLEFBQ2xDLENBQUMifQ== */</style>`;

			init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, ["text"]);

			const { ctx } = this.$$;
			const props = this.attributes;
			if (ctx.text === undefined && !('text' in props)) {
				console.warn("<app-context> was created without expected prop 'text'");
			}

			if (options) {
				if (options.target) {
					insert(options.target, this, options.anchor);
				}

				if (options.props) {
					this.$set(options.props);
					flush();
				}
			}
		}

		static get observedAttributes() {
			return ["text"];
		}

		get text() {
			return this.$$.ctx.text;
		}

		set text(text$$1) {
			this.$set({ text: text$$1 });
			flush();
		}
	}

	customElements.define("app-context", Context);

	/* src/sections/Header.svelte generated by Svelte v3.0.0-beta.20 */

	const file$1 = "src/sections/Header.svelte";

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
				add_location(zoo_link, file$1, 19, 4, 733);
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
		var header, zoo_header, div2, div0, zoo_button0, span0, zoo_button0_type_value, t1, div1, zoo_button1, span1, zoo_button1_type_value, t3, zoo_navigation, div3, dispose;

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
				zoo_button0 = element("zoo-button");
				span0 = element("span");
				span0.textContent = "Zoo+ theme";
				t1 = space();
				div1 = element("div");
				zoo_button1 = element("zoo-button");
				span1 = element("span");
				span1.textContent = "Grey theme";
				t3 = space();
				zoo_navigation = element("zoo-navigation");
				div3 = element("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				this.c = noop;
				attr(span0, "slot", "buttoncontent");
				span0.className = "slotted-span";
				add_location(span0, file$1, 6, 5, 304);
				set_custom_element_data(zoo_button0, "type", zoo_button0_type_value = ctx.theme === 'zoo' ? 'hot' : 'cold');
				set_custom_element_data(zoo_button0, "size", "medium");
				add_location(zoo_button0, file$1, 5, 4, 194);
				div0.className = "header-button";
				add_location(div0, file$1, 4, 3, 162);
				attr(span1, "slot", "buttoncontent");
				span1.className = "slotted-span";
				add_location(span1, file$1, 11, 5, 545);
				set_custom_element_data(zoo_button1, "type", zoo_button1_type_value = ctx.theme === 'grey' ? 'hot' : 'cold');
				set_custom_element_data(zoo_button1, "size", "medium");
				add_location(zoo_button1, file$1, 10, 4, 433);
				div1.className = "header-button";
				add_location(div1, file$1, 9, 3, 401);
				div2.className = "buttons-holder";
				add_location(div2, file$1, 3, 2, 130);
				set_custom_element_data(zoo_header, "imgsrc", "logo.png");
				set_custom_element_data(zoo_header, "headertext", "Zooplus web components");
				add_location(zoo_header, file$1, 2, 1, 61);
				add_location(div3, file$1, 17, 2, 695);
				zoo_navigation.className = "nav";
				add_location(zoo_navigation, file$1, 16, 1, 664);
				add_location(header, file$1, 1, 0, 51);

				dispose = [
					listen(zoo_button0, "click", ctx.click_handler),
					listen(zoo_button1, "click", ctx.click_handler_1)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, header, anchor);
				append(header, zoo_header);
				append(zoo_header, div2);
				append(div2, div0);
				append(div0, zoo_button0);
				append(zoo_button0, span0);
				append(div2, t1);
				append(div2, div1);
				append(div1, zoo_button1);
				append(zoo_button1, span1);
				append(header, t3);
				append(header, zoo_navigation);
				append(zoo_navigation, div3);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div3, null);
				}
			},

			p: function update(changed, ctx) {
				if ((changed.theme) && zoo_button0_type_value !== (zoo_button0_type_value = ctx.theme === 'zoo' ? 'hot' : 'cold')) {
					set_custom_element_data(zoo_button0, "type", zoo_button0_type_value);
				}

				if ((changed.theme) && zoo_button1_type_value !== (zoo_button1_type_value = ctx.theme === 'grey' ? 'hot' : 'cold')) {
					set_custom_element_data(zoo_button1, "type", zoo_button1_type_value);
				}

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

				run_all(dispose);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let theme = 'zoo';
		let navlinks = [
			{
				href: '#what',
				text: 'What is this project?',
				type: 'standard',
				target: '',
				active: false
			},
			{
				href: '#when',
				text: 'When can I use it?',
				type: 'standard',
				target: '',
				active: false
			},
			{
				href: '#how',
				text: 'How can I use it?',
				type: 'standard',
				target: '',
				active: false
			}
		];

		const changeTheme = (pallete) => {
			theme = pallete; $$invalidate('theme', theme);
			switch (pallete) {
				case 'zoo':
					document.documentElement.style.setProperty('--main-color', '#3C9700');
					document.documentElement.style.setProperty('--main-color-light', '#66B100');
					document.documentElement.style.setProperty('--main-color-dark', '#286400');
					document.documentElement.style.setProperty('--secondary-color', '#FF6200');
					document.documentElement.style.setProperty('--secondary-color-light', '#FF8800');
					document.documentElement.style.setProperty('--secondary-color-dark', '#CC4E00');
					break;
				case 'grey':
					document.documentElement.style.setProperty('--main-color', '#676778');
					document.documentElement.style.setProperty('--main-color-light', '#838399');
					document.documentElement.style.setProperty('--main-color-dark', '#565664');
					document.documentElement.style.setProperty('--secondary-color', '#ff3e00');
					document.documentElement.style.setProperty('--secondary-color-light', '#ff794d');
					document.documentElement.style.setProperty('--secondary-color-dark', '#c53100');
				default:
					break;
			}
		};

		function click_handler() {
			return changeTheme('zoo');
		}

		function click_handler_1() {
			return changeTheme('grey');
		}

		return {
			theme,
			navlinks,
			changeTheme,
			click_handler,
			click_handler_1
		};
	}

	class Header extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>header{position:relative}.buttons-holder{display:flex;justify-content:flex-end;flex-direction:row;flex-grow:1;padding:0 25px 0 0}.header-button{display:flex;width:250px;margin-left:15px}.header-button zoo-button{align-self:center}@media only screen and (max-width: 544px){.header-button .slotted-span{display:none}}.nav{position:sticky;top:0;color:white;font-size:14px;font-weight:bold;line-height:16px;cursor:pointer}.nav zoo-link{padding:0 15px;cursor:pointer}.nav zoo-link:hover,.nav zoo-link:active{background:rgba(255, 255, 255, 0.3)}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGVhZGVyLnN2ZWx0ZSIsInNvdXJjZXMiOlsiSGVhZGVyLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiYXBwLWhlYWRlclwiPjwvc3ZlbHRlOm9wdGlvbnM+XG48aGVhZGVyPlxuXHQ8em9vLWhlYWRlciBpbWdzcmM9XCJsb2dvLnBuZ1wiIGhlYWRlcnRleHQ9XCJab29wbHVzIHdlYiBjb21wb25lbnRzXCI+XG5cdFx0PGRpdiBjbGFzcz1cImJ1dHRvbnMtaG9sZGVyXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiaGVhZGVyLWJ1dHRvblwiPlxuXHRcdFx0XHQ8em9vLWJ1dHRvbiB0eXBlPVwie3RoZW1lID09PSAnem9vJyA/ICdob3QnIDogJ2NvbGQnfVwiIHNpemU9XCJtZWRpdW1cIiBvbjpjbGljaz17KCkgPT4gY2hhbmdlVGhlbWUoJ3pvbycpfT5cblx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiIGNsYXNzPVwic2xvdHRlZC1zcGFuXCI+Wm9vKyB0aGVtZTwvc3Bhbj5cblx0XHRcdFx0PC96b28tYnV0dG9uPlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiaGVhZGVyLWJ1dHRvblwiPlxuXHRcdFx0XHQ8em9vLWJ1dHRvbiB0eXBlPVwie3RoZW1lID09PSAnZ3JleScgPyAnaG90JyA6ICdjb2xkJ31cIiBzaXplPVwibWVkaXVtXCIgb246Y2xpY2s9eygpID0+IGNoYW5nZVRoZW1lKCdncmV5Jyl9PlxuXHRcdFx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCIgY2xhc3M9XCJzbG90dGVkLXNwYW5cIj5HcmV5IHRoZW1lPC9zcGFuPlxuXHRcdFx0XHQ8L3pvby1idXR0b24+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC96b28taGVhZGVyPlxuXHQ8em9vLW5hdmlnYXRpb24gY2xhc3M9XCJuYXZcIj5cblx0XHQ8ZGl2PlxuXHRcdFx0eyNlYWNoIG5hdmxpbmtzIGFzIGxpbmt9XG5cdFx0XHRcdDx6b28tbGluayBocmVmPVwie2xpbmsuaHJlZn1cIiB0YXJnZXQ9XCJ7bGluay50YXJnZXR9XCIgdHlwZT1cIntsaW5rLnR5cGV9XCJcblx0XHRcdFx0XHR0ZXh0PVwie2xpbmsudGV4dH1cIj5cblx0XHRcdFx0PC96b28tbGluaz5cblx0XHRcdHsvZWFjaH1cblx0XHQ8L2Rpdj5cblx0PC96b28tbmF2aWdhdGlvbj5cbjwvaGVhZGVyPlxuXG48c3R5bGUgdHlwZT0ndGV4dC9zY3NzJz5oZWFkZXIge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7IH1cblxuLmJ1dHRvbnMtaG9sZGVyIHtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdztcbiAgZmxleC1ncm93OiAxO1xuICBwYWRkaW5nOiAwIDI1cHggMCAwOyB9XG5cbi5oZWFkZXItYnV0dG9uIHtcbiAgZGlzcGxheTogZmxleDtcbiAgd2lkdGg6IDI1MHB4O1xuICBtYXJnaW4tbGVmdDogMTVweDsgfVxuICAuaGVhZGVyLWJ1dHRvbiB6b28tYnV0dG9uIHtcbiAgICBhbGlnbi1zZWxmOiBjZW50ZXI7IH1cbiAgQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA1NDRweCkge1xuICAgIC5oZWFkZXItYnV0dG9uIC5zbG90dGVkLXNwYW4ge1xuICAgICAgZGlzcGxheTogbm9uZTsgfSB9XG5cbi5uYXYge1xuICBwb3NpdGlvbjogc3RpY2t5O1xuICB0b3A6IDA7XG4gIGNvbG9yOiB3aGl0ZTtcbiAgZm9udC1zaXplOiAxNHB4O1xuICBmb250LXdlaWdodDogYm9sZDtcbiAgbGluZS1oZWlnaHQ6IDE2cHg7XG4gIGN1cnNvcjogcG9pbnRlcjsgfVxuICAubmF2IHpvby1saW5rIHtcbiAgICBwYWRkaW5nOiAwIDE1cHg7XG4gICAgY3Vyc29yOiBwb2ludGVyOyB9XG4gICAgLm5hdiB6b28tbGluazpob3ZlciwgLm5hdiB6b28tbGluazphY3RpdmUge1xuICAgICAgYmFja2dyb3VuZDogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjMpOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cblxuPHNjcmlwdD5cblx0bGV0IHRoZW1lID0gJ3pvbyc7XG5cdGxldCBuYXZsaW5rcyA9IFtcblx0XHR7XG5cdFx0XHRocmVmOiAnI3doYXQnLFxuXHRcdFx0dGV4dDogJ1doYXQgaXMgdGhpcyBwcm9qZWN0PycsXG5cdFx0XHR0eXBlOiAnc3RhbmRhcmQnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdGFjdGl2ZTogZmFsc2Vcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjd2hlbicsXG5cdFx0XHR0ZXh0OiAnV2hlbiBjYW4gSSB1c2UgaXQ/Jyxcblx0XHRcdHR5cGU6ICdzdGFuZGFyZCcsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0YWN0aXZlOiBmYWxzZVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNob3cnLFxuXHRcdFx0dGV4dDogJ0hvdyBjYW4gSSB1c2UgaXQ/Jyxcblx0XHRcdHR5cGU6ICdzdGFuZGFyZCcsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0YWN0aXZlOiBmYWxzZVxuXHRcdH1cblx0XTtcblxuXHRjb25zdCBjaGFuZ2VUaGVtZSA9IChwYWxsZXRlKSA9PiB7XG5cdFx0dGhlbWUgPSBwYWxsZXRlO1xuXHRcdHN3aXRjaCAocGFsbGV0ZSkge1xuXHRcdFx0Y2FzZSAnem9vJzpcblx0XHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLW1haW4tY29sb3InLCAnIzNDOTcwMCcpO1xuXHRcdFx0XHRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tbWFpbi1jb2xvci1saWdodCcsICcjNjZCMTAwJyk7XG5cdFx0XHRcdGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tYWluLWNvbG9yLWRhcmsnLCAnIzI4NjQwMCcpO1xuXHRcdFx0XHRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tc2Vjb25kYXJ5LWNvbG9yJywgJyNGRjYyMDAnKTtcblx0XHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLXNlY29uZGFyeS1jb2xvci1saWdodCcsICcjRkY4ODAwJyk7XG5cdFx0XHRcdGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1zZWNvbmRhcnktY29sb3ItZGFyaycsICcjQ0M0RTAwJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZ3JleSc6XG5cdFx0XHRcdGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tYWluLWNvbG9yJywgJyM2NzY3NzgnKTtcblx0XHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLW1haW4tY29sb3ItbGlnaHQnLCAnIzgzODM5OScpO1xuXHRcdFx0XHRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tbWFpbi1jb2xvci1kYXJrJywgJyM1NjU2NjQnKTtcblx0XHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLXNlY29uZGFyeS1jb2xvcicsICcjZmYzZTAwJyk7XG5cdFx0XHRcdGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1zZWNvbmRhcnktY29sb3ItbGlnaHQnLCAnI2ZmNzk0ZCcpO1xuXHRcdFx0XHRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tc2Vjb25kYXJ5LWNvbG9yLWRhcmsnLCAnI2M1MzEwMCcpO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG48L3NjcmlwdD5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUEyQndCLE1BQU0sQUFBQyxDQUFDLEFBQzlCLFFBQVEsQ0FBRSxRQUFRLEFBQUUsQ0FBQyxBQUV2QixlQUFlLEFBQUMsQ0FBQyxBQUNmLE9BQU8sQ0FBRSxJQUFJLENBQ2IsZUFBZSxDQUFFLFFBQVEsQ0FDekIsY0FBYyxDQUFFLEdBQUcsQ0FDbkIsU0FBUyxDQUFFLENBQUMsQ0FDWixPQUFPLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFFLENBQUMsQUFFeEIsY0FBYyxBQUFDLENBQUMsQUFDZCxPQUFPLENBQUUsSUFBSSxDQUNiLEtBQUssQ0FBRSxLQUFLLENBQ1osV0FBVyxDQUFFLElBQUksQUFBRSxDQUFDLEFBQ3BCLGNBQWMsQ0FBQyxVQUFVLEFBQUMsQ0FBQyxBQUN6QixVQUFVLENBQUUsTUFBTSxBQUFFLENBQUMsQUFDdkIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekMsY0FBYyxDQUFDLGFBQWEsQUFBQyxDQUFDLEFBQzVCLE9BQU8sQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUFDLENBQUMsQUFFeEIsSUFBSSxBQUFDLENBQUMsQUFDSixRQUFRLENBQUUsTUFBTSxDQUNoQixHQUFHLENBQUUsQ0FBQyxDQUNOLEtBQUssQ0FBRSxLQUFLLENBQ1osU0FBUyxDQUFFLElBQUksQ0FDZixXQUFXLENBQUUsSUFBSSxDQUNqQixXQUFXLENBQUUsSUFBSSxDQUNqQixNQUFNLENBQUUsT0FBTyxBQUFFLENBQUMsQUFDbEIsSUFBSSxDQUFDLFFBQVEsQUFBQyxDQUFDLEFBQ2IsT0FBTyxDQUFFLENBQUMsQ0FBQyxJQUFJLENBQ2YsTUFBTSxDQUFFLE9BQU8sQUFBRSxDQUFDLEFBQ2xCLElBQUksQ0FBQyxRQUFRLE1BQU0sQ0FBRSxJQUFJLENBQUMsUUFBUSxPQUFPLEFBQUMsQ0FBQyxBQUN6QyxVQUFVLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQUFBRSxDQUFDIn0= */</style>`;

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

	/* src/sections/Form.svelte generated by Svelte v3.0.0-beta.20 */

	const file$2 = "src/sections/Form.svelte";

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

	// (40:3) {#each options as option}
	function create_each_block_1(ctx) {
		var option, t_value = ctx.option.text, t, option_value_value;

		return {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = ctx.option.value;
				option.value = option.__value;
				add_location(option, file$2, 40, 3, 2368);
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

	// (49:3) {#each options as option}
	function create_each_block$1(ctx) {
		var option, t_value = ctx.option.text, t, option_value_value;

		return {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = ctx.option.value;
				option.value = option.__value;
				add_location(option, file$2, 49, 3, 2682);
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
		var app_context, t0, form, zoo_input0, input0, t1, zoo_input1, input1, t2, zoo_input2, input2, t3, zoo_input3, input3, t4, zoo_input4, textarea, t5, zoo_select0, select0, option0, option1, option2, option3, t10, zoo_select1, select1, option4, option5, option6, option7, t15, zoo_searchable_select0, select2, t16, zoo_searchable_select1, select3, t17, zoo_checkbox, input4, t18, zoo_radio0, template, input5, t19, label0, t21, input6, t22, label1, t24, input7, t25, label2, t27, zoo_radio1, input8, t28, label3, t30, input9, t31, label4, t33, div, zoo_button, span, dispose;

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
				app_context = element("app-context");
				t0 = space();
				form = element("form");
				zoo_input0 = element("zoo-input");
				input0 = element("input");
				t1 = space();
				zoo_input1 = element("zoo-input");
				input1 = element("input");
				t2 = space();
				zoo_input2 = element("zoo-input");
				input2 = element("input");
				t3 = space();
				zoo_input3 = element("zoo-input");
				input3 = element("input");
				t4 = space();
				zoo_input4 = element("zoo-input");
				textarea = element("textarea");
				t5 = space();
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
				t10 = space();
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
				t15 = space();
				zoo_searchable_select0 = element("zoo-searchable-select");
				select2 = element("select");

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t16 = space();
				zoo_searchable_select1 = element("zoo-searchable-select");
				select3 = element("select");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t17 = space();
				zoo_checkbox = element("zoo-checkbox");
				input4 = element("input");
				t18 = space();
				zoo_radio0 = element("zoo-radio");
				template = element("template");
				input5 = element("input");
				t19 = space();
				label0 = element("label");
				label0.textContent = "Email";
				t21 = space();
				input6 = element("input");
				t22 = space();
				label1 = element("label");
				label1.textContent = "Phone";
				t24 = space();
				input7 = element("input");
				t25 = space();
				label2 = element("label");
				label2.textContent = "Mail";
				t27 = space();
				zoo_radio1 = element("zoo-radio");
				input8 = element("input");
				t28 = space();
				label3 = element("label");
				label3.textContent = "Email";
				t30 = space();
				input9 = element("input");
				t31 = space();
				label4 = element("label");
				label4.textContent = "Phone";
				t33 = space();
				div = element("div");
				zoo_button = element("zoo-button");
				span = element("span");
				span.textContent = "Trigger invalid state!";
				this.c = noop;
				set_custom_element_data(app_context, "text", "First section is a showcase of different form elements like `input`, `textarea`, `select`.");
				add_location(app_context, file$2, 1, 0, 49);
				attr(input0, "slot", "inputelement");
				attr(input0, "type", "text");
				input0.placeholder = "input";
				add_location(input0, file$2, 5, 2, 432);
				set_custom_element_data(zoo_input0, "labeltext", "Input type text");
				set_custom_element_data(zoo_input0, "linktext", "Forgotten your password?");
				set_custom_element_data(zoo_input0, "linkhref", "https://google.com");
				set_custom_element_data(zoo_input0, "linktarget", "about:blank");
				set_custom_element_data(zoo_input0, "valid", ctx.inputState);
				set_custom_element_data(zoo_input0, "inputerrormsg", "invalid");
				set_custom_element_data(zoo_input0, "infotext", "Additional helpful information for our users");
				add_location(zoo_input0, file$2, 3, 1, 196);
				attr(input1, "slot", "inputelement");
				attr(input1, "type", "number");
				input1.placeholder = "input";
				add_location(input1, file$2, 9, 2, 702);
				set_custom_element_data(zoo_input1, "labeltext", "Input type number");
				set_custom_element_data(zoo_input1, "linktext", "Forgotten your password?");
				set_custom_element_data(zoo_input1, "linkhref", "https://google.com");
				set_custom_element_data(zoo_input1, "linktarget", "about:blank");
				set_custom_element_data(zoo_input1, "infotext", "Additional helpful information for our users");
				add_location(zoo_input1, file$2, 7, 1, 509);
				attr(input2, "slot", "inputelement");
				attr(input2, "type", "date");
				input2.placeholder = "Enter date";
				add_location(input2, file$2, 13, 2, 1027);
				set_custom_element_data(zoo_input2, "labeltext", "This input has type date");
				set_custom_element_data(zoo_input2, "linktext", "Native date picker -> click me");
				set_custom_element_data(zoo_input2, "linkhref", "https://github.com/jcgertig/date-input-polyfill");
				set_custom_element_data(zoo_input2, "linktarget", "about:blank");
				set_custom_element_data(zoo_input2, "infotext", "Click on input to show context menu with date selection");
				add_location(zoo_input2, file$2, 11, 1, 781);
				attr(input3, "slot", "inputelement");
				attr(input3, "type", "time");
				input3.placeholder = "Enter time";
				add_location(input3, file$2, 16, 2, 1183);
				set_custom_element_data(zoo_input3, "labeltext", "This input has type time");
				set_custom_element_data(zoo_input3, "infotext", "Select time");
				add_location(zoo_input3, file$2, 15, 1, 1109);
				attr(textarea, "slot", "inputelement");
				textarea.placeholder = "Textarea";
				add_location(textarea, file$2, 19, 2, 1329);
				set_custom_element_data(zoo_input4, "labeltext", "Textarea example");
				set_custom_element_data(zoo_input4, "valid", ctx.inputState);
				add_location(zoo_input4, file$2, 18, 1, 1265);
				option0.className = "placeholder";
				option0.__value = "";
				option0.value = option0.__value;
				option0.disabled = true;
				option0.selected = true;
				add_location(option0, file$2, 23, 3, 1601);
				option1.__value = "1";
				option1.value = option1.__value;
				add_location(option1, file$2, 24, 3, 1680);
				option2.__value = "2";
				option2.value = option2.__value;
				add_location(option2, file$2, 25, 3, 1702);
				option3.__value = "3";
				option3.value = option3.__value;
				add_location(option3, file$2, 26, 3, 1724);
				attr(select0, "slot", "selectelement");
				select0.multiple = true;
				add_location(select0, file$2, 22, 2, 1559);
				set_custom_element_data(zoo_select0, "labeltext", "Multiselect");
				set_custom_element_data(zoo_select0, "valid", ctx.inputState);
				set_custom_element_data(zoo_select0, "inputerrormsg", "Value is required");
				set_custom_element_data(zoo_select0, "infotext", "Additional helpful information for our users");
				add_location(zoo_select0, file$2, 21, 1, 1409);
				option4.className = "placeholder";
				option4.__value = "";
				option4.value = option4.__value;
				option4.disabled = true;
				option4.selected = true;
				add_location(option4, file$2, 31, 3, 1958);
				option5.__value = "1";
				option5.value = option5.__value;
				add_location(option5, file$2, 32, 3, 2037);
				option6.__value = "2";
				option6.value = option6.__value;
				add_location(option6, file$2, 33, 3, 2059);
				option7.__value = "3";
				option7.value = option7.__value;
				add_location(option7, file$2, 34, 3, 2081);
				attr(select1, "slot", "selectelement");
				add_location(select1, file$2, 30, 2, 1925);
				set_custom_element_data(zoo_select1, "labeltext", "Standard select");
				set_custom_element_data(zoo_select1, "valid", ctx.inputState);
				set_custom_element_data(zoo_select1, "inputerrormsg", "Value is required");
				set_custom_element_data(zoo_select1, "infotext", "Additional helpful information for our users");
				add_location(zoo_select1, file$2, 29, 1, 1771);
				select2.multiple = true;
				attr(select2, "slot", "selectelement");
				add_location(select2, file$2, 38, 2, 2297);
				set_custom_element_data(zoo_searchable_select0, "labeltext", "Searchable multiple select");
				set_custom_element_data(zoo_searchable_select0, "placeholder", "Placeholder");
				set_custom_element_data(zoo_searchable_select0, "infotext", "Additional helpful information for our users which is a long text.");
				add_location(zoo_searchable_select0, file$2, 37, 1, 2128);
				attr(select3, "slot", "selectelement");
				add_location(select3, file$2, 47, 2, 2620);
				set_custom_element_data(zoo_searchable_select1, "labeltext", "Searchable select");
				set_custom_element_data(zoo_searchable_select1, "placeholder", "Placeholder");
				set_custom_element_data(zoo_searchable_select1, "infotext", "Additional helpful information for our users.");
				add_location(zoo_searchable_select1, file$2, 46, 1, 2481);
				attr(input4, "slot", "checkboxelement");
				attr(input4, "type", "checkbox");
				add_location(input4, file$2, 56, 2, 2939);
				set_custom_element_data(zoo_checkbox, "highlighted", true);
				set_custom_element_data(zoo_checkbox, "valid", ctx.inputState);
				set_custom_element_data(zoo_checkbox, "labeltext", "An example checkbox with some additional event handling of clicks inside");
				add_location(zoo_checkbox, file$2, 55, 1, 2795);
				attr(input5, "type", "radio");
				input5.id = "contactChoice1";
				input5.name = "contact";
				input5.value = "email";
				input5.disabled = true;
				add_location(input5, file$2, 60, 3, 3095);
				label0.htmlFor = "contactChoice1";
				add_location(label0, file$2, 61, 3, 3177);
				attr(input6, "type", "radio");
				input6.id = "contactChoice2";
				input6.name = "contact";
				input6.value = "phone";
				add_location(input6, file$2, 62, 3, 3222);
				label1.htmlFor = "contactChoice2";
				add_location(label1, file$2, 63, 3, 3295);
				attr(input7, "type", "radio");
				input7.id = "contactChoice3";
				input7.name = "contact";
				input7.value = "mail";
				add_location(input7, file$2, 64, 3, 3340);
				label2.htmlFor = "contactChoice3";
				add_location(label2, file$2, 65, 3, 3412);
				add_location(template, file$2, 59, 2, 3081);
				set_custom_element_data(zoo_radio0, "valid", ctx.inputState);
				set_custom_element_data(zoo_radio0, "errormsg", "errormsg");
				set_custom_element_data(zoo_radio0, "infotext", "infotext");
				add_location(zoo_radio0, file$2, 58, 1, 3006);
				attr(input8, "type", "radio");
				input8.id = "contactChoice4";
				input8.name = "contact";
				input8.value = "email";
				input8.disabled = true;
				add_location(input8, file$2, 70, 2, 3558);
				label3.htmlFor = "contactChoice4";
				add_location(label3, file$2, 71, 2, 3639);
				attr(input9, "type", "radio");
				input9.id = "contactChoice5";
				input9.name = "contact";
				input9.value = "phone";
				add_location(input9, file$2, 72, 2, 3683);
				label4.htmlFor = "contactChoice5";
				add_location(label4, file$2, 73, 2, 3755);
				set_custom_element_data(zoo_radio1, "valid", ctx.inputState);
				set_custom_element_data(zoo_radio1, "errormsg", "errormsg");
				set_custom_element_data(zoo_radio1, "infotext", "infotext");
				add_location(zoo_radio1, file$2, 69, 1, 3483);
				form.className = "form";
				add_location(form, file$2, 2, 0, 175);
				attr(span, "slot", "buttoncontent");
				span.className = "slotted-span";
				add_location(span, file$2, 78, 2, 3906);
				set_custom_element_data(zoo_button, "type", "hot");
				set_custom_element_data(zoo_button, "size", "medium");
				add_location(zoo_button, file$2, 77, 1, 3841);
				div.className = "submit";
				add_location(div, file$2, 76, 0, 3819);
				dispose = listen(zoo_button, "click", ctx.changeState);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, form, anchor);
				append(form, zoo_input0);
				append(zoo_input0, input0);
				append(form, t1);
				append(form, zoo_input1);
				append(zoo_input1, input1);
				append(form, t2);
				append(form, zoo_input2);
				append(zoo_input2, input2);
				append(form, t3);
				append(form, zoo_input3);
				append(zoo_input3, input3);
				append(form, t4);
				append(form, zoo_input4);
				append(zoo_input4, textarea);
				append(form, t5);
				append(form, zoo_select0);
				append(zoo_select0, select0);
				append(select0, option0);
				append(select0, option1);
				append(select0, option2);
				append(select0, option3);
				append(form, t10);
				append(form, zoo_select1);
				append(zoo_select1, select1);
				append(select1, option4);
				append(select1, option5);
				append(select1, option6);
				append(select1, option7);
				append(form, t15);
				append(form, zoo_searchable_select0);
				append(zoo_searchable_select0, select2);

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].m(select2, null);
				}

				append(form, t16);
				append(form, zoo_searchable_select1);
				append(zoo_searchable_select1, select3);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(select3, null);
				}

				append(form, t17);
				append(form, zoo_checkbox);
				append(zoo_checkbox, input4);
				append(form, t18);
				append(form, zoo_radio0);
				append(zoo_radio0, template);
				append(template.content, input5);
				append(template.content, t19);
				append(template.content, label0);
				append(template.content, t21);
				append(template.content, input6);
				append(template.content, t22);
				append(template.content, label1);
				append(template.content, t24);
				append(template.content, input7);
				append(template.content, t25);
				append(template.content, label2);
				append(form, t27);
				append(form, zoo_radio1);
				append(zoo_radio1, input8);
				append(zoo_radio1, t28);
				append(zoo_radio1, label3);
				append(zoo_radio1, t30);
				append(zoo_radio1, input9);
				append(zoo_radio1, t31);
				append(zoo_radio1, label4);
				insert(target, t33, anchor);
				insert(target, div, anchor);
				append(div, zoo_button);
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
					detach(app_context);
					detach(t0);
					detach(form);
				}

				destroy_each(each_blocks_1, detaching);

				destroy_each(each_blocks, detaching);

				if (detaching) {
					detach(t33);
					detach(div);
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

			this.shadowRoot.innerHTML = `<style>.form{flex:1 0 auto;margin:20px auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));grid-template-rows:120px 150px 120px 70px;grid-gap:20px}@media only screen and (max-width: 544px){.form{grid-template-rows:auto}}.submit{width:250px;height:50px;margin:0 auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9ybS5zdmVsdGUiLCJzb3VyY2VzIjpbIkZvcm0uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJhcHAtZm9ybVwiPjwvc3ZlbHRlOm9wdGlvbnM+XG48YXBwLWNvbnRleHQgdGV4dD1cIkZpcnN0IHNlY3Rpb24gaXMgYSBzaG93Y2FzZSBvZiBkaWZmZXJlbnQgZm9ybSBlbGVtZW50cyBsaWtlIGBpbnB1dGAsIGB0ZXh0YXJlYWAsIGBzZWxlY3RgLlwiPjwvYXBwLWNvbnRleHQ+XG48Zm9ybSBjbGFzcz1cImZvcm1cIj5cblx0PHpvby1pbnB1dCBsYWJlbHRleHQ9XCJJbnB1dCB0eXBlIHRleHRcIiBsaW5rdGV4dD1cIkZvcmdvdHRlbiB5b3VyIHBhc3N3b3JkP1wiIGxpbmtocmVmPVwiaHR0cHM6Ly9nb29nbGUuY29tXCIgbGlua3RhcmdldD1cImFib3V0OmJsYW5rXCJcblx0IHZhbGlkPVwie2lucHV0U3RhdGV9XCIgaW5wdXRlcnJvcm1zZz1cImludmFsaWRcIiBpbmZvdGV4dD1cIkFkZGl0aW9uYWwgaGVscGZ1bCBpbmZvcm1hdGlvbiBmb3Igb3VyIHVzZXJzXCI+XG5cdFx0PGlucHV0IHNsb3Q9XCJpbnB1dGVsZW1lbnRcIiB0eXBlPVwidGV4dFwiIHBsYWNlaG9sZGVyPVwiaW5wdXRcIiAvPlxuXHQ8L3pvby1pbnB1dD5cblx0PHpvby1pbnB1dCBsYWJlbHRleHQ9XCJJbnB1dCB0eXBlIG51bWJlclwiIGxpbmt0ZXh0PVwiRm9yZ290dGVuIHlvdXIgcGFzc3dvcmQ/XCIgbGlua2hyZWY9XCJodHRwczovL2dvb2dsZS5jb21cIiBsaW5rdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIlxuXHQgaW5mb3RleHQ9XCJBZGRpdGlvbmFsIGhlbHBmdWwgaW5mb3JtYXRpb24gZm9yIG91ciB1c2Vyc1wiPlxuXHRcdDxpbnB1dCBzbG90PVwiaW5wdXRlbGVtZW50XCIgdHlwZT1cIm51bWJlclwiIHBsYWNlaG9sZGVyPVwiaW5wdXRcIiAvPlxuXHQ8L3pvby1pbnB1dD5cblx0PHpvby1pbnB1dCBsYWJlbHRleHQ9XCJUaGlzIGlucHV0IGhhcyB0eXBlIGRhdGVcIiBsaW5rdGV4dD1cIk5hdGl2ZSBkYXRlIHBpY2tlciAtPiBjbGljayBtZVwiIGxpbmtocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL2pjZ2VydGlnL2RhdGUtaW5wdXQtcG9seWZpbGxcIlxuXHQgbGlua3RhcmdldD1cImFib3V0OmJsYW5rXCIgaW5mb3RleHQ9XCJDbGljayBvbiBpbnB1dCB0byBzaG93IGNvbnRleHQgbWVudSB3aXRoIGRhdGUgc2VsZWN0aW9uXCI+XG5cdFx0PGlucHV0IHNsb3Q9XCJpbnB1dGVsZW1lbnRcIiB0eXBlPVwiZGF0ZVwiIHBsYWNlaG9sZGVyPVwiRW50ZXIgZGF0ZVwiIC8+XG5cdDwvem9vLWlucHV0PlxuXHQ8em9vLWlucHV0IGxhYmVsdGV4dD1cIlRoaXMgaW5wdXQgaGFzIHR5cGUgdGltZVwiIGluZm90ZXh0PVwiU2VsZWN0IHRpbWVcIj5cblx0XHQ8aW5wdXQgc2xvdD1cImlucHV0ZWxlbWVudFwiIHR5cGU9XCJ0aW1lXCIgcGxhY2Vob2xkZXI9XCJFbnRlciB0aW1lXCIgLz5cblx0PC96b28taW5wdXQ+XG5cdDx6b28taW5wdXQgbGFiZWx0ZXh0PVwiVGV4dGFyZWEgZXhhbXBsZVwiIHZhbGlkPVwie2lucHV0U3RhdGV9XCI+XG5cdFx0PHRleHRhcmVhIHNsb3Q9XCJpbnB1dGVsZW1lbnRcIiBwbGFjZWhvbGRlcj1cIlRleHRhcmVhXCI+PC90ZXh0YXJlYT5cblx0PC96b28taW5wdXQ+XG5cdDx6b28tc2VsZWN0IGxhYmVsdGV4dD1cIk11bHRpc2VsZWN0XCIgdmFsaWQ9XCJ7aW5wdXRTdGF0ZX1cIiBpbnB1dGVycm9ybXNnPVwiVmFsdWUgaXMgcmVxdWlyZWRcIiBpbmZvdGV4dD1cIkFkZGl0aW9uYWwgaGVscGZ1bCBpbmZvcm1hdGlvbiBmb3Igb3VyIHVzZXJzXCI+XG5cdFx0PHNlbGVjdCBzbG90PVwic2VsZWN0ZWxlbWVudFwiIG11bHRpcGxlPlxuXHRcdFx0PG9wdGlvbiBjbGFzcz1cInBsYWNlaG9sZGVyXCIgdmFsdWU9XCJcIiBkaXNhYmxlZCBzZWxlY3RlZD5QbGFjZWhvbGRlcjwvb3B0aW9uPlxuXHRcdFx0PG9wdGlvbj4xPC9vcHRpb24+XG5cdFx0XHQ8b3B0aW9uPjI8L29wdGlvbj5cblx0XHRcdDxvcHRpb24+Mzwvb3B0aW9uPlxuXHRcdDwvc2VsZWN0PlxuXHQ8L3pvby1zZWxlY3Q+XG5cdDx6b28tc2VsZWN0IGxhYmVsdGV4dD1cIlN0YW5kYXJkIHNlbGVjdFwiIHZhbGlkPVwie2lucHV0U3RhdGV9XCIgaW5wdXRlcnJvcm1zZz1cIlZhbHVlIGlzIHJlcXVpcmVkXCIgaW5mb3RleHQ9XCJBZGRpdGlvbmFsIGhlbHBmdWwgaW5mb3JtYXRpb24gZm9yIG91ciB1c2Vyc1wiPlxuXHRcdDxzZWxlY3Qgc2xvdD1cInNlbGVjdGVsZW1lbnRcIj5cblx0XHRcdDxvcHRpb24gY2xhc3M9XCJwbGFjZWhvbGRlclwiIHZhbHVlPVwiXCIgZGlzYWJsZWQgc2VsZWN0ZWQ+UGxhY2Vob2xkZXI8L29wdGlvbj5cblx0XHRcdDxvcHRpb24+MTwvb3B0aW9uPlxuXHRcdFx0PG9wdGlvbj4yPC9vcHRpb24+XG5cdFx0XHQ8b3B0aW9uPjM8L29wdGlvbj5cblx0XHQ8L3NlbGVjdD5cblx0PC96b28tc2VsZWN0PlxuXHQ8em9vLXNlYXJjaGFibGUtc2VsZWN0IGxhYmVsdGV4dD1cIlNlYXJjaGFibGUgbXVsdGlwbGUgc2VsZWN0XCIgcGxhY2Vob2xkZXI9XCJQbGFjZWhvbGRlclwiIGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnMgd2hpY2ggaXMgYSBsb25nIHRleHQuXCI+XG5cdFx0PHNlbGVjdCBtdWx0aXBsZSBzbG90PVwic2VsZWN0ZWxlbWVudFwiPlxuXHRcdFx0eyNlYWNoIG9wdGlvbnMgYXMgb3B0aW9ufVxuXHRcdFx0PG9wdGlvbiB2YWx1ZT1cIntvcHRpb24udmFsdWV9XCI+XG5cdFx0XHRcdHtvcHRpb24udGV4dH1cblx0XHRcdDwvb3B0aW9uPlxuXHRcdFx0ey9lYWNofVxuXHRcdDwvc2VsZWN0PlxuXHQ8L3pvby1zZWFyY2hhYmxlLXNlbGVjdD5cblx0PHpvby1zZWFyY2hhYmxlLXNlbGVjdCBsYWJlbHRleHQ9XCJTZWFyY2hhYmxlIHNlbGVjdFwiIHBsYWNlaG9sZGVyPVwiUGxhY2Vob2xkZXJcIiBpbmZvdGV4dD1cIkFkZGl0aW9uYWwgaGVscGZ1bCBpbmZvcm1hdGlvbiBmb3Igb3VyIHVzZXJzLlwiPlxuXHRcdDxzZWxlY3Qgc2xvdD1cInNlbGVjdGVsZW1lbnRcIj5cblx0XHRcdHsjZWFjaCBvcHRpb25zIGFzIG9wdGlvbn1cblx0XHRcdDxvcHRpb24gdmFsdWU9XCJ7b3B0aW9uLnZhbHVlfVwiPlxuXHRcdFx0XHR7b3B0aW9uLnRleHR9XG5cdFx0XHQ8L29wdGlvbj5cblx0XHRcdHsvZWFjaH1cblx0XHQ8L3NlbGVjdD5cblx0PC96b28tc2VhcmNoYWJsZS1zZWxlY3Q+XG5cdDx6b28tY2hlY2tib3ggaGlnaGxpZ2h0ZWQ9XCJ7dHJ1ZX1cIiB2YWxpZD1cIntpbnB1dFN0YXRlfVwiIGxhYmVsdGV4dD1cIkFuIGV4YW1wbGUgY2hlY2tib3ggd2l0aCBzb21lIGFkZGl0aW9uYWwgZXZlbnQgaGFuZGxpbmcgb2YgY2xpY2tzIGluc2lkZVwiPlxuXHRcdDxpbnB1dCBzbG90PVwiY2hlY2tib3hlbGVtZW50XCIgdHlwZT1cImNoZWNrYm94XCIgLz5cblx0PC96b28tY2hlY2tib3g+XG5cdDx6b28tcmFkaW8gdmFsaWQ9XCJ7aW5wdXRTdGF0ZX1cIiBlcnJvcm1zZz1cImVycm9ybXNnXCIgaW5mb3RleHQ9XCJpbmZvdGV4dFwiPlxuXHRcdDx0ZW1wbGF0ZT5cblx0XHRcdDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2UxXCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cImVtYWlsXCIgZGlzYWJsZWQ+XG5cdFx0XHQ8bGFiZWwgZm9yPVwiY29udGFjdENob2ljZTFcIj5FbWFpbDwvbGFiZWw+XG5cdFx0XHQ8aW5wdXQgdHlwZT1cInJhZGlvXCIgaWQ9XCJjb250YWN0Q2hvaWNlMlwiIG5hbWU9XCJjb250YWN0XCIgdmFsdWU9XCJwaG9uZVwiPlxuXHRcdFx0PGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2UyXCI+UGhvbmU8L2xhYmVsPlxuXHRcdFx0PGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwiY29udGFjdENob2ljZTNcIiBuYW1lPVwiY29udGFjdFwiIHZhbHVlPVwibWFpbFwiPlxuXHRcdFx0PGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2UzXCI+TWFpbDwvbGFiZWw+XG5cdFx0PC90ZW1wbGF0ZT5cblx0PC96b28tcmFkaW8+XG5cblx0PHpvby1yYWRpbyB2YWxpZD1cIntpbnB1dFN0YXRlfVwiIGVycm9ybXNnPVwiZXJyb3Jtc2dcIiBpbmZvdGV4dD1cImluZm90ZXh0XCI+XG5cdFx0PGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwiY29udGFjdENob2ljZTRcIiBuYW1lPVwiY29udGFjdFwiIHZhbHVlPVwiZW1haWxcIiBkaXNhYmxlZD5cblx0XHQ8bGFiZWwgZm9yPVwiY29udGFjdENob2ljZTRcIj5FbWFpbDwvbGFiZWw+XG5cdFx0PGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwiY29udGFjdENob2ljZTVcIiBuYW1lPVwiY29udGFjdFwiIHZhbHVlPVwicGhvbmVcIj5cblx0XHQ8bGFiZWwgZm9yPVwiY29udGFjdENob2ljZTVcIj5QaG9uZTwvbGFiZWw+XG5cdDwvem9vLXJhZGlvPlxuPC9mb3JtPlxuPGRpdiBjbGFzcz1cInN1Ym1pdFwiPlxuXHQ8em9vLWJ1dHRvbiB0eXBlPVwiaG90XCIgc2l6ZT1cIm1lZGl1bVwiIG9uOmNsaWNrPVwie2NoYW5nZVN0YXRlfVwiPlxuXHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCIgY2xhc3M9XCJzbG90dGVkLXNwYW5cIj5UcmlnZ2VyIGludmFsaWQgc3RhdGUhPC9zcGFuPlxuXHQ8L3pvby1idXR0b24+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9J3RleHQvc2Nzcyc+LmZvcm0ge1xuICBmbGV4OiAxIDAgYXV0bztcbiAgbWFyZ2luOiAyMHB4IGF1dG87XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KGF1dG8tZmlsbCwgbWlubWF4KDMyMHB4LCAxZnIpKTtcbiAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiAxMjBweCAxNTBweCAxMjBweCA3MHB4O1xuICBncmlkLWdhcDogMjBweDsgfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDU0NHB4KSB7XG4gICAgLmZvcm0ge1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiBhdXRvOyB9IH1cblxuLnN1Ym1pdCB7XG4gIHdpZHRoOiAyNTBweDtcbiAgaGVpZ2h0OiA1MHB4O1xuICBtYXJnaW46IDAgYXV0bzsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGxldCBvcHRpb25zID0gW1xuXHRcdHtcblx0XHRcdHRleHQ6ICd0ZXh0Jyxcblx0XHRcdHZhbHVlOiAndmFsdWUnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHR0ZXh0OiAncmFOZE9tJyxcblx0XHRcdHZhbHVlOiAncmFuZG9tJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0dGV4dDogJ3JhbmRvbTEnLFxuXHRcdFx0dmFsdWU6ICdyYW5kb20xJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0dGV4dDogJ3JhbmRvbTInLFxuXHRcdFx0dmFsdWU6ICdyYW5kb20yJ1xuXHRcdH1cblx0XTtcblx0bGV0IGlucHV0U3RhdGUgPSB0cnVlO1xuXHRjb25zdCBjaGFuZ2VTdGF0ZSA9ICgpID0+IHtcblx0XHRpbnB1dFN0YXRlID0gIWlucHV0U3RhdGU7XG5cdH1cbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFrRndCLEtBQUssQUFBQyxDQUFDLEFBQzdCLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDZCxNQUFNLENBQUUsSUFBSSxDQUFDLElBQUksQ0FDakIsT0FBTyxDQUFFLElBQUksQ0FDYixxQkFBcUIsQ0FBRSxPQUFPLFNBQVMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FDNUQsa0JBQWtCLENBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUMxQyxRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDakIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekMsS0FBSyxBQUFDLENBQUMsQUFDTCxrQkFBa0IsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUFDLENBQUMsQUFFbkMsT0FBTyxBQUFDLENBQUMsQUFDUCxLQUFLLENBQUUsS0FBSyxDQUNaLE1BQU0sQ0FBRSxJQUFJLENBQ1osTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

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

	/* src/sections/Buttons.svelte generated by Svelte v3.0.0-beta.20 */

	const file$3 = "src/sections/Buttons.svelte";

	function create_fragment$3(ctx) {
		var zoo_toast0, t0, zoo_toast1, t1, app_context, t2, div1, zoo_button0, span0, t4, zoo_button1, div0, t5, zoo_tooltip, t6, zoo_button2, span1, t8, zoo_modal, div2, zoo_feedback, t9, br0, t10, zoo_select, select, option0, option1, option2, option3, t15, br1, t16, zoo_checkbox, input, t17, br2, t18, zoo_button3, span2, dispose;

		return {
			c: function create() {
				zoo_toast0 = element("zoo-toast");
				t0 = space();
				zoo_toast1 = element("zoo-toast");
				t1 = space();
				app_context = element("app-context");
				t2 = space();
				div1 = element("div");
				zoo_button0 = element("zoo-button");
				span0 = element("span");
				span0.textContent = "Here we have a very long text indeed!";
				t4 = space();
				zoo_button1 = element("zoo-button");
				div0 = element("div");
				t5 = text("Disabled :(\n\t\t\t");
				zoo_tooltip = element("zoo-tooltip");
				t6 = space();
				zoo_button2 = element("zoo-button");
				span1 = element("span");
				span1.textContent = "Show modal";
				t8 = space();
				zoo_modal = element("zoo-modal");
				div2 = element("div");
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
				set_custom_element_data(zoo_toast0, "text", "Search for more than 8.000 products.");
				add_location(zoo_toast0, file$3, 1, 0, 52);
				set_custom_element_data(zoo_toast1, "text", "Added to cart!");
				add_location(zoo_toast1, file$3, 2, 0, 138);
				set_custom_element_data(app_context, "text", "Second section is a showcase of buttons and modals");
				add_location(app_context, file$3, 3, 0, 207);
				attr(span0, "slot", "buttoncontent");
				span0.className = "slotted-span";
				add_location(span0, file$3, 6, 2, 377);
				set_custom_element_data(zoo_button0, "size", "medium");
				add_location(zoo_button0, file$3, 5, 1, 316);
				set_custom_element_data(zoo_tooltip, "position", "bottom");
				set_custom_element_data(zoo_tooltip, "text", "Just set disabled attribute on `zoo-button`");
				add_location(zoo_tooltip, file$3, 11, 3, 598);
				attr(div0, "slot", "buttoncontent");
				add_location(div0, file$3, 9, 2, 553);
				set_custom_element_data(zoo_button1, "size", "medium");
				set_custom_element_data(zoo_button1, "disabled", true);
				zoo_button1.className = "top-tooltip";
				add_location(zoo_button1, file$3, 8, 1, 486);
				attr(span1, "slot", "buttoncontent");
				span1.className = "slotted-span";
				add_location(span1, file$3, 17, 2, 805);
				set_custom_element_data(zoo_button2, "type", "hot");
				set_custom_element_data(zoo_button2, "size", "medium");
				add_location(zoo_button2, file$3, 16, 1, 728);
				div1.className = "buttons";
				add_location(div1, file$3, 4, 0, 293);
				set_custom_element_data(zoo_feedback, "type", "info");
				set_custom_element_data(zoo_feedback, "text", "This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered.");
				add_location(zoo_feedback, file$3, 22, 2, 1004);
				add_location(br0, file$3, 26, 2, 1186);
				option0.className = "placeholder";
				option0.__value = "";
				option0.value = option0.__value;
				option0.disabled = true;
				option0.selected = true;
				add_location(option0, file$3, 30, 4, 1294);
				option1.__value = "Doge";
				option1.value = option1.__value;
				add_location(option1, file$3, 31, 4, 1367);
				option2.__value = "Catz";
				option2.value = option2.__value;
				add_location(option2, file$3, 32, 4, 1393);
				option3.__value = "Snek";
				option3.value = option3.__value;
				add_location(option3, file$3, 33, 4, 1419);
				attr(select, "slot", "selectelement");
				add_location(select, file$3, 29, 3, 1260);
				set_custom_element_data(zoo_select, "labeltext", "This product is for");
				set_custom_element_data(zoo_select, "valid", true);
				add_location(zoo_select, file$3, 27, 2, 1193);
				add_location(br1, file$3, 36, 2, 1472);
				attr(input, "slot", "checkboxelement");
				attr(input, "type", "checkbox");
				add_location(input, file$3, 39, 3, 1591);
				set_custom_element_data(zoo_checkbox, "highlighted", "");
				set_custom_element_data(zoo_checkbox, "labeltext", "I understand and confirm that ALL of the above statements are true");
				add_location(zoo_checkbox, file$3, 37, 2, 1479);
				add_location(br2, file$3, 41, 2, 1659);
				attr(span2, "slot", "buttoncontent");
				add_location(span2, file$3, 43, 3, 1739);
				set_custom_element_data(zoo_button3, "type", "hot");
				set_custom_element_data(zoo_button3, "size", "medium");
				add_location(zoo_button3, file$3, 42, 2, 1666);
				add_location(div2, file$3, 21, 1, 996);
				set_style(zoo_modal, "display", "none");
				set_custom_element_data(zoo_modal, "headertext", "Your basket contains licensed items");
				add_location(zoo_modal, file$3, 20, 0, 894);

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
				insert(target, zoo_toast0, anchor);
				add_binding_callback(() => ctx.zoo_toast0_binding(zoo_toast0, null));
				insert(target, t0, anchor);
				insert(target, zoo_toast1, anchor);
				add_binding_callback(() => ctx.zoo_toast1_binding(zoo_toast1, null));
				insert(target, t1, anchor);
				insert(target, app_context, anchor);
				insert(target, t2, anchor);
				insert(target, div1, anchor);
				append(div1, zoo_button0);
				append(zoo_button0, span0);
				append(div1, t4);
				append(div1, zoo_button1);
				append(zoo_button1, div0);
				append(div0, t5);
				append(div0, zoo_tooltip);
				append(div1, t6);
				append(div1, zoo_button2);
				append(zoo_button2, span1);
				insert(target, t8, anchor);
				insert(target, zoo_modal, anchor);
				append(zoo_modal, div2);
				append(div2, zoo_feedback);
				append(div2, t9);
				append(div2, br0);
				append(div2, t10);
				append(div2, zoo_select);
				append(zoo_select, select);
				append(select, option0);
				append(select, option1);
				append(select, option2);
				append(select, option3);
				append(div2, t15);
				append(div2, br1);
				append(div2, t16);
				append(div2, zoo_checkbox);
				append(zoo_checkbox, input);
				append(div2, t17);
				append(div2, br2);
				append(div2, t18);
				append(div2, zoo_button3);
				append(zoo_button3, span2);
				add_binding_callback(() => ctx.zoo_modal_binding(zoo_modal, null));
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_toast0_binding(null, zoo_toast0);
					ctx.zoo_toast0_binding(zoo_toast0, null);
				}
				if (changed.items) {
					ctx.zoo_toast1_binding(null, zoo_toast1);
					ctx.zoo_toast1_binding(zoo_toast1, null);
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
					detach(zoo_toast0);
				}

				ctx.zoo_toast0_binding(null, zoo_toast0);

				if (detaching) {
					detach(t0);
					detach(zoo_toast1);
				}

				ctx.zoo_toast1_binding(null, zoo_toast1);

				if (detaching) {
					detach(t1);
					detach(app_context);
					detach(t2);
					detach(div1);
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
		let modalToast;
		const closeModal = () => {
			modal.closeModal();
			modalToast.show();
		};

		function zoo_toast0_binding($$node, check) {
			toast = $$node;
			$$invalidate('toast', toast);
		}

		function zoo_toast1_binding($$node, check) {
			modalToast = $$node;
			$$invalidate('modalToast', modalToast);
		}

		function click_handler() {
			return toast.show();
		}

		function click_handler_1() {
			return modal.openModal();
		}

		function click_handler_2() {
			return closeModal();
		}

		function zoo_modal_binding($$node, check) {
			modal = $$node;
			$$invalidate('modal', modal);
		}

		return {
			toast,
			modal,
			modalToast,
			closeModal,
			zoo_toast0_binding,
			zoo_toast1_binding,
			click_handler,
			click_handler_1,
			click_handler_2,
			zoo_modal_binding
		};
	}

	class Buttons extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.buttons{max-width:1280px;margin:20px auto;display:flex;width:90%}.buttons zoo-button{margin-left:15px}.buttons zoo-button:first-of-type{margin-left:0}.slotted-span{display:block;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}zoo-tooltip{display:none}.top-tooltip{position:relative;display:inline-block}.top-tooltip:hover zoo-tooltip{display:block}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQnV0dG9ucy5zdmVsdGUiLCJzb3VyY2VzIjpbIkJ1dHRvbnMuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJhcHAtYnV0dG9uc1wiPjwvc3ZlbHRlOm9wdGlvbnM+XG48em9vLXRvYXN0IHRleHQ9XCJTZWFyY2ggZm9yIG1vcmUgdGhhbiA4LjAwMCBwcm9kdWN0cy5cIiBiaW5kOnRoaXM9e3RvYXN0fT48L3pvby10b2FzdD5cbjx6b28tdG9hc3QgdGV4dD1cIkFkZGVkIHRvIGNhcnQhXCIgYmluZDp0aGlzPXttb2RhbFRvYXN0fT48L3pvby10b2FzdD5cbjxhcHAtY29udGV4dCB0ZXh0PVwiU2Vjb25kIHNlY3Rpb24gaXMgYSBzaG93Y2FzZSBvZiBidXR0b25zIGFuZCBtb2RhbHNcIj48L2FwcC1jb250ZXh0PlxuPGRpdiBjbGFzcz1cImJ1dHRvbnNcIj5cblx0PHpvby1idXR0b24gc2l6ZT1cIm1lZGl1bVwiIG9uOmNsaWNrPVwieygpID0+IHRvYXN0LnNob3coKX1cIj5cblx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiIGNsYXNzPVwic2xvdHRlZC1zcGFuXCI+SGVyZSB3ZSBoYXZlIGEgdmVyeSBsb25nIHRleHQgaW5kZWVkITwvc3Bhbj5cblx0PC96b28tYnV0dG9uPlxuXHQ8em9vLWJ1dHRvbiBzaXplPVwibWVkaXVtXCIgZGlzYWJsZWQ9XCJ7dHJ1ZX1cIiBjbGFzcz1cInRvcC10b29sdGlwXCI+XG5cdFx0PGRpdiBzbG90PVwiYnV0dG9uY29udGVudFwiPlxuXHRcdFx0RGlzYWJsZWQgOihcblx0XHRcdDx6b28tdG9vbHRpcCBwb3NpdGlvbj1cImJvdHRvbVwiXG5cdFx0XHRcdHRleHQ9XCJKdXN0IHNldCBkaXNhYmxlZCBhdHRyaWJ1dGUgb24gYHpvby1idXR0b25gXCI+XG5cdFx0XHQ8L3pvby10b29sdGlwPlxuXHRcdDwvZGl2PlxuXHQ8L3pvby1idXR0b24+XG5cdDx6b28tYnV0dG9uIHR5cGU9XCJob3RcIiBzaXplPVwibWVkaXVtXCIgb246Y2xpY2s9XCJ7KCkgPT4gbW9kYWwub3Blbk1vZGFsKCl9XCI+XG5cdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIiBjbGFzcz1cInNsb3R0ZWQtc3BhblwiPlNob3cgbW9kYWw8L3NwYW4+XG5cdDwvem9vLWJ1dHRvbj5cbjwvZGl2PiBcbjx6b28tbW9kYWwgc3R5bGU9XCJkaXNwbGF5OiBub25lXCIgaGVhZGVydGV4dD1cIllvdXIgYmFza2V0IGNvbnRhaW5zIGxpY2Vuc2VkIGl0ZW1zXCIgYmluZDp0aGlzPXttb2RhbH0+XG5cdDxkaXY+XG5cdFx0PHpvby1mZWVkYmFjayBcblx0XHR0eXBlPVwiaW5mb1wiIFxuXHRcdHRleHQ9XCJUaGlzIGlzIGFuIGluZm8gbWVzc2FnZS4gT25seSBvbmUgY291cG9uIGNhbiBiZSBhY2NlcHRlZCB3aXRoIGVhY2ggb3JkZXIuIFBsZWFzZSBjaG9vc2Ugb25lIGNvdXBvbiB0aGF0IHlvdSBqdXN0IGVudGVyZWQuXCI+XG5cdFx0PC96b28tZmVlZGJhY2s+XG5cdFx0PGJyPlxuXHRcdDx6b28tc2VsZWN0IGxhYmVsdGV4dD1cIlRoaXMgcHJvZHVjdCBpcyBmb3JcIiBcblx0XHRcdHZhbGlkPVwie3RydWV9XCI+XG5cdFx0XHQ8c2VsZWN0IHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XG5cdFx0XHRcdDxvcHRpb24gY2xhc3M9XCJwbGFjZWhvbGRlclwiIHZhbHVlPVwiXCIgZGlzYWJsZWQgc2VsZWN0ZWQ+RG9nZTwvb3B0aW9uPlxuXHRcdFx0XHQ8b3B0aW9uPkRvZ2U8L29wdGlvbj5cblx0XHRcdFx0PG9wdGlvbj5DYXR6PC9vcHRpb24+XG5cdFx0XHRcdDxvcHRpb24+U25lazwvb3B0aW9uPlxuXHRcdFx0PC9zZWxlY3Q+XG5cdFx0PC96b28tc2VsZWN0PlxuXHRcdDxicj5cblx0XHQ8em9vLWNoZWNrYm94IGhpZ2hsaWdodGVkXG5cdFx0XHRsYWJlbHRleHQ9XCJJIHVuZGVyc3RhbmQgYW5kIGNvbmZpcm0gdGhhdCBBTEwgb2YgdGhlIGFib3ZlIHN0YXRlbWVudHMgYXJlIHRydWVcIj5cblx0XHRcdDxpbnB1dCBzbG90PVwiY2hlY2tib3hlbGVtZW50XCIgdHlwZT1cImNoZWNrYm94XCIvPlxuXHRcdDwvem9vLWNoZWNrYm94PlxuXHRcdDxicj5cblx0XHQ8em9vLWJ1dHRvbiB0eXBlPVwiaG90XCIgc2l6ZT1cIm1lZGl1bVwiIG9uOmNsaWNrPVwieygpID0+IGNsb3NlTW9kYWwoKX1cIj5cblx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+QWRkIHRvIGNhcnQ8L3NwYW4+XG5cdFx0PC96b28tYnV0dG9uPlxuXHQ8L2Rpdj5cbjwvem9vLW1vZGFsPlxuPHN0eWxlIHR5cGU9J3RleHQvc2Nzcyc+LmJ1dHRvbnMge1xuICBtYXgtd2lkdGg6IDEyODBweDtcbiAgbWFyZ2luOiAyMHB4IGF1dG87XG4gIGRpc3BsYXk6IGZsZXg7XG4gIHdpZHRoOiA5MCU7IH1cbiAgLmJ1dHRvbnMgem9vLWJ1dHRvbiB7XG4gICAgbWFyZ2luLWxlZnQ6IDE1cHg7IH1cbiAgICAuYnV0dG9ucyB6b28tYnV0dG9uOmZpcnN0LW9mLXR5cGUge1xuICAgICAgbWFyZ2luLWxlZnQ6IDA7IH1cblxuLnNsb3R0ZWQtc3BhbiB7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpcztcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfVxuXG56b28tdG9vbHRpcCB7XG4gIGRpc3BsYXk6IG5vbmU7IH1cblxuLnRvcC10b29sdGlwIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IH1cbiAgLnRvcC10b29sdGlwOmhvdmVyIHpvby10b29sdGlwIHtcbiAgICBkaXNwbGF5OiBibG9jazsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG48c2NyaXB0PlxuXHRsZXQgdG9hc3Q7XG5cdGxldCBtb2RhbDtcblx0bGV0IG1vZGFsVG9hc3Q7XG5cblx0Y29uc3Qgc2hvd01vZGFsID0gKCkgPT4ge1xuXHRcdG1vZGFsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuXHR9O1xuXHRjb25zdCBjbG9zZU1vZGFsID0gKCkgPT4ge1xuXHRcdG1vZGFsLmNsb3NlTW9kYWwoKTtcblx0XHRtb2RhbFRvYXN0LnNob3coKTtcblx0fVxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQStDd0IsUUFBUSxBQUFDLENBQUMsQUFDaEMsU0FBUyxDQUFFLE1BQU0sQ0FDakIsTUFBTSxDQUFFLElBQUksQ0FBQyxJQUFJLENBQ2pCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsS0FBSyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBQ2IsUUFBUSxDQUFDLFVBQVUsQUFBQyxDQUFDLEFBQ25CLFdBQVcsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUNwQixRQUFRLENBQUMsVUFBVSxjQUFjLEFBQUMsQ0FBQyxBQUNqQyxXQUFXLENBQUUsQ0FBQyxBQUFFLENBQUMsQUFFdkIsYUFBYSxBQUFDLENBQUMsQUFDYixPQUFPLENBQUUsS0FBSyxDQUNkLGFBQWEsQ0FBRSxRQUFRLENBQ3ZCLFFBQVEsQ0FBRSxNQUFNLENBQ2hCLFdBQVcsQ0FBRSxNQUFNLEFBQUUsQ0FBQyxBQUV4QixXQUFXLEFBQUMsQ0FBQyxBQUNYLE9BQU8sQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUVsQixZQUFZLEFBQUMsQ0FBQyxBQUNaLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxZQUFZLEFBQUUsQ0FBQyxBQUN4QixZQUFZLE1BQU0sQ0FBQyxXQUFXLEFBQUMsQ0FBQyxBQUM5QixPQUFPLENBQUUsS0FBSyxBQUFFLENBQUMifQ== */</style>`;

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

	/* src/sections/TooltipAndFeedback.svelte generated by Svelte v3.0.0-beta.20 */

	const file$4 = "src/sections/TooltipAndFeedback.svelte";

	function create_fragment$4(ctx) {
		var app_context, t0, div4, div0, zoo_feedback0, t1, zoo_tooltip0, t2, div1, zoo_feedback1, t3, zoo_tooltip1, t4, div2, zoo_feedback2, t5, zoo_tooltip2, t6, div3, zoo_button, span, t8, zoo_tooltip4, zoo_input, input, t9, zoo_tooltip3, dispose;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div4 = element("div");
				div0 = element("div");
				zoo_feedback0 = element("zoo-feedback");
				t1 = space();
				zoo_tooltip0 = element("zoo-tooltip");
				t2 = space();
				div1 = element("div");
				zoo_feedback1 = element("zoo-feedback");
				t3 = space();
				zoo_tooltip1 = element("zoo-tooltip");
				t4 = space();
				div2 = element("div");
				zoo_feedback2 = element("zoo-feedback");
				t5 = space();
				zoo_tooltip2 = element("zoo-tooltip");
				t6 = space();
				div3 = element("div");
				zoo_button = element("zoo-button");
				span = element("span");
				span.textContent = "This element will show tooltip on top only when it is clicked.";
				t8 = space();
				zoo_tooltip4 = element("zoo-tooltip");
				zoo_input = element("zoo-input");
				input = element("input");
				t9 = space();
				zoo_tooltip3 = element("zoo-tooltip");
				this.c = noop;
				set_custom_element_data(app_context, "text", "Third section is a showcase of tooltips and feedback boxes.");
				add_location(app_context, file$4, 1, 0, 65);
				set_custom_element_data(zoo_feedback0, "type", "info");
				set_custom_element_data(zoo_feedback0, "text", "This is an info message. This element will show tooltip on the right side on hover.");
				add_location(zoo_feedback0, file$4, 4, 2, 222);
				set_custom_element_data(zoo_tooltip0, "position", "right");
				set_custom_element_data(zoo_tooltip0, "text", "Hello from right side.");
				add_location(zoo_tooltip0, file$4, 5, 2, 357);
				div0.className = "feedback-tooltip";
				add_location(div0, file$4, 3, 1, 189);
				set_custom_element_data(zoo_feedback1, "type", "error");
				set_custom_element_data(zoo_feedback1, "text", "This is an error message. This element will show tooltip on the left side on hover.");
				add_location(zoo_feedback1, file$4, 8, 2, 474);
				set_custom_element_data(zoo_tooltip1, "position", "left");
				set_custom_element_data(zoo_tooltip1, "text", "Hello from left side.");
				add_location(zoo_tooltip1, file$4, 9, 2, 610);
				div1.className = "feedback-tooltip";
				add_location(div1, file$4, 7, 1, 441);
				set_custom_element_data(zoo_feedback2, "type", "success");
				set_custom_element_data(zoo_feedback2, "text", "This is a success message. This element will show tooltip on the bottom side on hover.");
				add_location(zoo_feedback2, file$4, 12, 2, 725);
				set_custom_element_data(zoo_tooltip2, "position", "bottom");
				set_custom_element_data(zoo_tooltip2, "text", "Hello from below");
				add_location(zoo_tooltip2, file$4, 13, 2, 866);
				div2.className = "feedback-tooltip";
				add_location(div2, file$4, 11, 1, 692);
				span.className = "slotted-span";
				attr(span, "slot", "buttoncontent");
				add_location(span, file$4, 17, 3, 1026);
				add_location(zoo_button, file$4, 16, 2, 978);
				attr(input, "slot", "inputelement");
				input.placeholder = "Search for more than 8.000 products";
				add_location(input, file$4, 21, 4, 1274);
				zoo_input.className = "input-in-tooltip";
				add_location(zoo_input, file$4, 20, 3, 1233);
				zoo_tooltip3.className = "nested-tooltip";
				set_custom_element_data(zoo_tooltip3, "position", "right");
				set_custom_element_data(zoo_tooltip3, "text", "Hello from nested tooltip.");
				add_location(zoo_tooltip3, file$4, 23, 3, 1372);
				set_custom_element_data(zoo_tooltip4, "text", "Hello from up above");
				add_location(zoo_tooltip4, file$4, 19, 2, 1162);
				div3.className = "special-tooltip";
				add_location(div3, file$4, 15, 1, 945);
				div4.className = "inner-content";
				add_location(div4, file$4, 2, 0, 160);
				dispose = listen(zoo_button, "click", ctx.showSpecialTooltip);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div4, anchor);
				append(div4, div0);
				append(div0, zoo_feedback0);
				append(div0, t1);
				append(div0, zoo_tooltip0);
				append(div4, t2);
				append(div4, div1);
				append(div1, zoo_feedback1);
				append(div1, t3);
				append(div1, zoo_tooltip1);
				append(div4, t4);
				append(div4, div2);
				append(div2, zoo_feedback2);
				append(div2, t5);
				append(div2, zoo_tooltip2);
				append(div4, t6);
				append(div4, div3);
				append(div3, zoo_button);
				append(zoo_button, span);
				append(div3, t8);
				append(div3, zoo_tooltip4);
				append(zoo_tooltip4, zoo_input);
				append(zoo_input, input);
				append(zoo_tooltip4, t9);
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
					detach(app_context);
					detach(t0);
					detach(div4);
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

			this.shadowRoot.innerHTML = `<style>.inner-content{flex:1 0 auto;width:70%;margin:0 auto}.inner-content .feedback-tooltip{height:60px;margin-bottom:15px;position:relative}.inner-content .feedback-tooltip:hover zoo-tooltip{display:block}.special-tooltip{width:250px;position:relative;margin:0 auto;cursor:pointer}.special-tooltip .slotted-span{line-height:25px}zoo-tooltip{display:none}.input-in-tooltip:hover~.nested-tooltip{display:block}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHRpcEFuZEZlZWRiYWNrLnN2ZWx0ZSIsInNvdXJjZXMiOlsiVG9vbHRpcEFuZEZlZWRiYWNrLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiYXBwLXRvb2x0aXAtYW5kLWZlZWRiYWNrXCI+PC9zdmVsdGU6b3B0aW9ucz5cbjxhcHAtY29udGV4dCB0ZXh0PVwiVGhpcmQgc2VjdGlvbiBpcyBhIHNob3djYXNlIG9mIHRvb2x0aXBzIGFuZCBmZWVkYmFjayBib3hlcy5cIj48L2FwcC1jb250ZXh0PlxuPGRpdiBjbGFzcz1cImlubmVyLWNvbnRlbnRcIj5cblx0PGRpdiBjbGFzcz1cImZlZWRiYWNrLXRvb2x0aXBcIj5cblx0XHQ8em9vLWZlZWRiYWNrIHR5cGU9XCJpbmZvXCIgdGV4dD1cIlRoaXMgaXMgYW4gaW5mbyBtZXNzYWdlLiBUaGlzIGVsZW1lbnQgd2lsbCBzaG93IHRvb2x0aXAgb24gdGhlIHJpZ2h0IHNpZGUgb24gaG92ZXIuXCI+PC96b28tZmVlZGJhY2s+XG5cdFx0PHpvby10b29sdGlwIHBvc2l0aW9uPVwicmlnaHRcIiB0ZXh0PVwiSGVsbG8gZnJvbSByaWdodCBzaWRlLlwiPjwvem9vLXRvb2x0aXA+XG5cdDwvZGl2PlxuXHQ8ZGl2IGNsYXNzPVwiZmVlZGJhY2stdG9vbHRpcFwiPlxuXHRcdDx6b28tZmVlZGJhY2sgdHlwZT1cImVycm9yXCIgdGV4dD1cIlRoaXMgaXMgYW4gZXJyb3IgbWVzc2FnZS4gVGhpcyBlbGVtZW50IHdpbGwgc2hvdyB0b29sdGlwIG9uIHRoZSBsZWZ0IHNpZGUgb24gaG92ZXIuXCI+PC96b28tZmVlZGJhY2s+XG5cdFx0PHpvby10b29sdGlwIHBvc2l0aW9uPVwibGVmdFwiIHRleHQ9XCJIZWxsbyBmcm9tIGxlZnQgc2lkZS5cIj48L3pvby10b29sdGlwPlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImZlZWRiYWNrLXRvb2x0aXBcIj5cblx0XHQ8em9vLWZlZWRiYWNrIHR5cGU9XCJzdWNjZXNzXCIgdGV4dD1cIlRoaXMgaXMgYSBzdWNjZXNzIG1lc3NhZ2UuIFRoaXMgZWxlbWVudCB3aWxsIHNob3cgdG9vbHRpcCBvbiB0aGUgYm90dG9tIHNpZGUgb24gaG92ZXIuXCI+PC96b28tZmVlZGJhY2s+XG5cdFx0PHpvby10b29sdGlwIHBvc2l0aW9uPVwiYm90dG9tXCIgdGV4dD1cIkhlbGxvIGZyb20gYmVsb3dcIj48L3pvby10b29sdGlwPlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cInNwZWNpYWwtdG9vbHRpcFwiPiBcblx0XHQ8em9vLWJ1dHRvbiBvbjpjbGljaz1cIntzaG93U3BlY2lhbFRvb2x0aXB9XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNsb3R0ZWQtc3BhblwiIHNsb3Q9XCJidXR0b25jb250ZW50XCI+VGhpcyBlbGVtZW50IHdpbGwgc2hvdyB0b29sdGlwIG9uIHRvcCBvbmx5IHdoZW4gaXQgaXMgY2xpY2tlZC48L3NwYW4+XG5cdFx0PC96b28tYnV0dG9uPlxuXHRcdDx6b28tdG9vbHRpcCBiaW5kOnRoaXM9e3NwZWNpYWxUb29sdGlwfSB0ZXh0PVwiSGVsbG8gZnJvbSB1cCBhYm92ZVwiPlxuXHRcdFx0PHpvby1pbnB1dCBjbGFzcz1cImlucHV0LWluLXRvb2x0aXBcIj5cblx0XHRcdFx0PGlucHV0IHNsb3Q9XCJpbnB1dGVsZW1lbnRcIiBwbGFjZWhvbGRlcj1cIlNlYXJjaCBmb3IgbW9yZSB0aGFuIDguMDAwIHByb2R1Y3RzXCIvPlxuXHRcdFx0PC96b28taW5wdXQ+XG5cdFx0XHQ8em9vLXRvb2x0aXAgY2xhc3M9XCJuZXN0ZWQtdG9vbHRpcFwiIHBvc2l0aW9uPVwicmlnaHRcIiB0ZXh0PVwiSGVsbG8gZnJvbSBuZXN0ZWQgdG9vbHRpcC5cIj5cblx0XHRcdDwvem9vLXRvb2x0aXA+XG5cdFx0PC96b28tdG9vbHRpcD5cblx0PC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9J3RleHQvc2Nzcyc+LmlubmVyLWNvbnRlbnQge1xuICBmbGV4OiAxIDAgYXV0bztcbiAgd2lkdGg6IDcwJTtcbiAgbWFyZ2luOiAwIGF1dG87IH1cbiAgLmlubmVyLWNvbnRlbnQgLmZlZWRiYWNrLXRvb2x0aXAge1xuICAgIGhlaWdodDogNjBweDtcbiAgICBtYXJnaW4tYm90dG9tOiAxNXB4O1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTsgfVxuICAgIC5pbm5lci1jb250ZW50IC5mZWVkYmFjay10b29sdGlwOmhvdmVyIHpvby10b29sdGlwIHtcbiAgICAgIGRpc3BsYXk6IGJsb2NrOyB9XG5cbi5zcGVjaWFsLXRvb2x0aXAge1xuICB3aWR0aDogMjUwcHg7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgbWFyZ2luOiAwIGF1dG87XG4gIGN1cnNvcjogcG9pbnRlcjsgfVxuICAuc3BlY2lhbC10b29sdGlwIC5zbG90dGVkLXNwYW4ge1xuICAgIGxpbmUtaGVpZ2h0OiAyNXB4OyB9XG5cbi50b3AtdG9vbHRpcCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrOyB9XG4gIC50b3AtdG9vbHRpcDpob3ZlciB6b28tdG9vbHRpcCB7XG4gICAgZGlzcGxheTogYmxvY2s7IH1cblxuem9vLXRvb2x0aXAge1xuICBkaXNwbGF5OiBub25lOyB9XG5cbi5pbnB1dC1pbi10b29sdGlwOmhvdmVyIH4gLm5lc3RlZC10b29sdGlwIHtcbiAgZGlzcGxheTogYmxvY2s7IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRsZXQgc3BlY2lhbFRvb2x0aXA7XG5cdGNvbnN0IHNob3dTcGVjaWFsVG9vbHRpcCA9ICgpID0+IHtcblx0XHRjb25zdCBlbFN0eWxlID0gc3BlY2lhbFRvb2x0aXAuc3R5bGU7XG5cdFx0Y29uc3QgZGlzcGxheSA9ICFlbFN0eWxlLmRpc3BsYXkgfHwgZWxTdHlsZS5kaXNwbGF5ID09PSAnbm9uZScgPyAnYmxvY2snIDogJ25vbmUnO1xuXHRcdGVsU3R5bGUuZGlzcGxheSA9IGRpc3BsYXk7XG5cdH07XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBNkJ3QixjQUFjLEFBQUMsQ0FBQyxBQUN0QyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ2QsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBQ2pCLGNBQWMsQ0FBQyxpQkFBaUIsQUFBQyxDQUFDLEFBQ2hDLE1BQU0sQ0FBRSxJQUFJLENBQ1osYUFBYSxDQUFFLElBQUksQ0FDbkIsUUFBUSxDQUFFLFFBQVEsQUFBRSxDQUFDLEFBQ3JCLGNBQWMsQ0FBQyxpQkFBaUIsTUFBTSxDQUFDLFdBQVcsQUFBQyxDQUFDLEFBQ2xELE9BQU8sQ0FBRSxLQUFLLEFBQUUsQ0FBQyxBQUV2QixnQkFBZ0IsQUFBQyxDQUFDLEFBQ2hCLEtBQUssQ0FBRSxLQUFLLENBQ1osUUFBUSxDQUFFLFFBQVEsQ0FDbEIsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLENBQ2QsTUFBTSxDQUFFLE9BQU8sQUFBRSxDQUFDLEFBQ2xCLGdCQUFnQixDQUFDLGFBQWEsQUFBQyxDQUFDLEFBQzlCLFdBQVcsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQVF4QixXQUFXLEFBQUMsQ0FBQyxBQUNYLE9BQU8sQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUVsQixpQkFBaUIsTUFBTSxDQUFHLGVBQWUsQUFBQyxDQUFDLEFBQ3pDLE9BQU8sQ0FBRSxLQUFLLEFBQUUsQ0FBQyJ9 */</style>`;

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

	/* src/docs/ButtonDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$5 = "src/docs/ButtonDocs.svelte";

	function create_fragment$5(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, b1, t4, b2, t6, b3, t8, t9, li1, b4, t11, b5, t13, b6, t15, b7, t17, b8, t19, t20, li2, b9, t22, t23, zoo_collapsable_list_item1, t24, b10, t25, t26, b11, t28, t29, div2, code, pre, t30, t31, div1, zoo_button, span;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "type";
				t2 = text(" - accepts following values: ");
				b1 = element("b");
				b1.textContent = "cold";
				t4 = text(", ");
				b2 = element("b");
				b2.textContent = "hot";
				t6 = text(". Default is ");
				b3 = element("b");
				b3.textContent = "cold";
				t8 = text(";");
				t9 = space();
				li1 = element("li");
				b4 = element("b");
				b4.textContent = "size";
				t11 = text(" - accepts following values: ");
				b5 = element("b");
				b5.textContent = "smal";
				t13 = text(", ");
				b6 = element("b");
				b6.textContent = "medium";
				t15 = text(", ");
				b7 = element("b");
				b7.textContent = "big";
				t17 = text(". Default is ");
				b8 = element("b");
				b8.textContent = "small";
				t19 = text(";");
				t20 = space();
				li2 = element("li");
				b9 = element("b");
				b9.textContent = "disable";
				t22 = text(" - whether the button should be disabled or not.");
				t23 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				t24 = text("This component accept one ");
				b10 = element("b");
				t25 = text(ctx.buttonSlotText);
				t26 = text(" which is replaced with provided ");
				b11 = element("b");
				b11.textContent = "element";
				t28 = text(" so that you can catch events/provide your css/attach framework specific directives from/to this element.");
				t29 = space();
				div2 = element("div");
				code = element("code");
				pre = element("pre");
				t30 = text(ctx.example);
				t31 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_button = element("zoo-button");
				span = element("span");
				span.textContent = "Shopping Cart";
				this.c = noop;
				set_custom_element_data(app_context, "text", "Button component API.");
				add_location(app_context, file$5, 2, 0, 53);
				add_location(b0, file$5, 9, 6, 267);
				add_location(b1, file$5, 9, 46, 307);
				add_location(b2, file$5, 9, 59, 320);
				add_location(b3, file$5, 9, 82, 343);
				add_location(li0, file$5, 8, 5, 256);
				add_location(b4, file$5, 12, 6, 383);
				add_location(b5, file$5, 12, 46, 423);
				add_location(b6, file$5, 12, 59, 436);
				add_location(b7, file$5, 12, 74, 451);
				add_location(b8, file$5, 12, 97, 474);
				add_location(li1, file$5, 11, 5, 372);
				add_location(b9, file$5, 15, 6, 515);
				add_location(li2, file$5, 14, 5, 504);
				add_location(ul, file$5, 7, 4, 246);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$5, 6, 3, 201);
				add_location(b10, file$5, 20, 30, 705);
				add_location(b11, file$5, 20, 86, 761);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$5, 19, 3, 634);
				add_location(zoo_collapsable_list, file$5, 5, 2, 158);
				div0.className = "list";
				add_location(div0, file$5, 4, 1, 137);
				add_location(pre, file$5, 25, 8, 983);
				add_location(code, file$5, 25, 2, 977);
				attr(span, "slot", "buttoncontent");
				add_location(span, file$5, 29, 4, 1116);
				set_custom_element_data(zoo_button, "type", "hot");
				set_custom_element_data(zoo_button, "size", "medium");
				add_location(zoo_button, file$5, 28, 3, 1074);
				set_style(div1, "width", "250px");
				add_location(div1, file$5, 27, 2, 1043);
				div2.className = "example";
				add_location(div2, file$5, 24, 1, 953);
				div3.className = "doc-element";
				add_location(div3, file$5, 3, 0, 110);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(li0, b1);
				append(li0, t4);
				append(li0, b2);
				append(li0, t6);
				append(li0, b3);
				append(li0, t8);
				append(ul, t9);
				append(ul, li1);
				append(li1, b4);
				append(li1, t11);
				append(li1, b5);
				append(li1, t13);
				append(li1, b6);
				append(li1, t15);
				append(li1, b7);
				append(li1, t17);
				append(li1, b8);
				append(li1, t19);
				append(ul, t20);
				append(ul, li2);
				append(li2, b9);
				append(li2, t22);
				append(zoo_collapsable_list, t23);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				append(zoo_collapsable_list_item1, t24);
				append(zoo_collapsable_list_item1, b10);
				append(b10, t25);
				append(zoo_collapsable_list_item1, t26);
				append(zoo_collapsable_list_item1, b11);
				append(zoo_collapsable_list_item1, t28);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div3, t29);
				append(div3, div2);
				append(div2, code);
				append(code, pre);
				append(pre, t30);
				append(div2, t31);
				append(div2, div1);
				append(div1, zoo_button);
				append(zoo_button, span);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		let list;
		let buttonSlotText = `<slot name="buttoncontent"></slot>`;
		let example = `<div style="width: 250px;">\n  <zoo-button type="hot" size="medium">\n    <span slot="buttoncontent">Shopping Cart</span>\n  </zoo-button>\n</div>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			buttonSlotText,
			example,
			zoo_collapsable_list_binding
		};
	}

	class ButtonDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQnV0dG9uRG9jcy5zdmVsdGUiLCJzb3VyY2VzIjpbIkJ1dHRvbkRvY3Muc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJkb2NzLWJ1dHRvblwiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiQnV0dG9uIGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XG5cdFx0XHRcdDx1bD5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj50eXBlPC9iPiAtIGFjY2VwdHMgZm9sbG93aW5nIHZhbHVlczogPGI+Y29sZDwvYj4sIDxiPmhvdDwvYj4uIERlZmF1bHQgaXMgPGI+Y29sZDwvYj47XG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5zaXplPC9iPiAtIGFjY2VwdHMgZm9sbG93aW5nIHZhbHVlczogPGI+c21hbDwvYj4sIDxiPm1lZGl1bTwvYj4sIDxiPmJpZzwvYj4uIERlZmF1bHQgaXMgPGI+c21hbGw8L2I+O1xuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+ZGlzYWJsZTwvYj4gLSB3aGV0aGVyIHRoZSBidXR0b24gc2hvdWxkIGJlIGRpc2FibGVkIG9yIG5vdC5cblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHQ8L3VsPlxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XG5cdFx0XHRcdFRoaXMgY29tcG9uZW50IGFjY2VwdCBvbmUgPGI+e2J1dHRvblNsb3RUZXh0fTwvYj4gd2hpY2ggaXMgcmVwbGFjZWQgd2l0aCBwcm92aWRlZCA8Yj5lbGVtZW50PC9iPiBzbyB0aGF0IHlvdSBjYW4gY2F0Y2ggZXZlbnRzL3Byb3ZpZGUgeW91ciBjc3MvYXR0YWNoIGZyYW1ld29yayBzcGVjaWZpYyBkaXJlY3RpdmVzIGZyb20vdG8gdGhpcyBlbGVtZW50LiAgICAgXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0PC96b28tY29sbGFwc2FibGUtbGlzdD5cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XG5cdFx0PGNvZGU+PHByZT57ZXhhbXBsZX08L3ByZT48L2NvZGU+XG5cdFx0d2lsbCBwcm9kdWNlIHRoZSBmb2xsb3dpbmc6XG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cblx0XHRcdDx6b28tYnV0dG9uIHR5cGU9XCJob3RcIiBzaXplPVwibWVkaXVtXCI+XG5cdFx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+U2hvcHBpbmcgQ2FydDwvc3Bhbj5cblx0XHRcdDwvem9vLWJ1dHRvbj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uZG9jLWVsZW1lbnQge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93OyB9XG5cbi5saXN0IHtcbiAgd2lkdGg6IDM1JTtcbiAgbWFyZ2luOiAwIDIwcHg7IH1cblxuLmV4YW1wbGUge1xuICBvdmVyZmxvdzogYXV0bzsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xuXHRsZXQgbGlzdDtcblx0bGV0IGJ1dHRvblNsb3RUZXh0ID0gYDxzbG90IG5hbWU9XCJidXR0b25jb250ZW50XCI+PC9zbG90PmA7XG5cdGxldCBleGFtcGxlID0gYDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHg7XCI+XFxuICA8em9vLWJ1dHRvbiB0eXBlPVwiaG90XCIgc2l6ZT1cIm1lZGl1bVwiPlxcbiAgICA8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPlNob3BwaW5nIENhcnQ8L3NwYW4+XFxuICA8L3pvby1idXR0b24+XFxuPC9kaXY+YDtcblx0b25Nb3VudCgoKSA9PiB7XG5cdFx0bGlzdC5pdGVtcyA9IFtcblx0XHRcdHtcblx0XHRcdFx0aGVhZGVyOiAnQVBJJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aGVhZGVyOiAnU2xvdHMnXG5cdFx0XHR9XG5cdFx0XTtcblx0fSk7XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBbUN3QixZQUFZLEFBQUMsQ0FBQyxBQUNwQyxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUV4QixLQUFLLEFBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxHQUFHLENBQ1YsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixRQUFRLEFBQUMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

			init(this, { target: this.shadowRoot }, instance$5, create_fragment$5, safe_not_equal, []);

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

	customElements.define("docs-button", ButtonDocs);

	/* src/docs/CheckboxDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$6 = "src/docs/CheckboxDocs.svelte";

	function create_fragment$6(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, t3, li1, b1, t5, t6, li2, b2, t8, t9, li3, b3, t11, t12, zoo_collapsable_list_item1, t13, b4, t14, t15, b5, t17, t18, div2, code, pre, t19, t20, div1, zoo_checkbox, input;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "labeltext";
				t2 = text(" - text to be presented on the right side of the checkbox;");
				t3 = space();
				li1 = element("li");
				b1 = element("b");
				b1.textContent = "valid";
				t5 = text(" - flag which indicates whether the input is valid or not;");
				t6 = space();
				li2 = element("li");
				b2 = element("b");
				b2.textContent = "disabled";
				t8 = text(" - flag indicating whether the input is disabled.");
				t9 = space();
				li3 = element("li");
				b3 = element("b");
				b3.textContent = "highlighted";
				t11 = text(" - flag indicating whether the outline around the input should be visible (border).");
				t12 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				t13 = text("This component accept one ");
				b4 = element("b");
				t14 = text(ctx.inputSlotText);
				t15 = text(" which is replaced with provided ");
				b5 = element("b");
				b5.textContent = "element";
				t17 = text(" so that you can catch events/provide your css/attach framework specific directives from/to this element.");
				t18 = space();
				div2 = element("div");
				code = element("code");
				pre = element("pre");
				t19 = text(ctx.example);
				t20 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_checkbox = element("zoo-checkbox");
				input = element("input");
				this.c = noop;
				set_custom_element_data(app_context, "text", "Checkbox component API.");
				add_location(app_context, file$6, 1, 0, 54);
				add_location(b0, file$6, 8, 6, 270);
				add_location(li0, file$6, 7, 5, 259);
				add_location(b1, file$6, 11, 6, 372);
				add_location(li1, file$6, 10, 5, 361);
				add_location(b2, file$6, 14, 6, 470);
				add_location(li2, file$6, 13, 5, 459);
				add_location(b3, file$6, 17, 6, 562);
				add_location(li3, file$6, 16, 5, 551);
				add_location(ul, file$6, 6, 4, 249);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$6, 5, 3, 204);
				add_location(b4, file$6, 22, 30, 791);
				add_location(b5, file$6, 22, 85, 846);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$6, 21, 3, 720);
				add_location(zoo_collapsable_list, file$6, 4, 2, 161);
				div0.className = "list";
				add_location(div0, file$6, 3, 1, 140);
				add_location(pre, file$6, 27, 8, 1068);
				add_location(code, file$6, 27, 2, 1062);
				attr(input, "slot", "checkboxelement");
				attr(input, "type", "checkbox");
				add_location(input, file$6, 31, 4, 1249);
				set_custom_element_data(zoo_checkbox, "highlighted", "1");
				set_custom_element_data(zoo_checkbox, "labeltext", "Example label for this particular checkbox");
				add_location(zoo_checkbox, file$6, 30, 3, 1159);
				set_style(div1, "width", "250px");
				add_location(div1, file$6, 29, 2, 1128);
				div2.className = "example";
				add_location(div2, file$6, 26, 1, 1038);
				div3.className = "doc-element";
				add_location(div3, file$6, 2, 0, 113);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(ul, t3);
				append(ul, li1);
				append(li1, b1);
				append(li1, t5);
				append(ul, t6);
				append(ul, li2);
				append(li2, b2);
				append(li2, t8);
				append(ul, t9);
				append(ul, li3);
				append(li3, b3);
				append(li3, t11);
				append(zoo_collapsable_list, t12);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				append(zoo_collapsable_list_item1, t13);
				append(zoo_collapsable_list_item1, b4);
				append(b4, t14);
				append(zoo_collapsable_list_item1, t15);
				append(zoo_collapsable_list_item1, b5);
				append(zoo_collapsable_list_item1, t17);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div3, t18);
				append(div3, div2);
				append(div2, code);
				append(code, pre);
				append(pre, t19);
				append(div2, t20);
				append(div2, div1);
				append(div1, zoo_checkbox);
				append(zoo_checkbox, input);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$6($$self, $$props, $$invalidate) {
		let list;
		let inputSlotText = `<slot name="checkboxelement"></slot>`;
		let example = `<div style="width: 250px;">\n  <zoo-checkbox highlighted="1" labeltext="Example label for this particular checkbox">\n    <input slot="checkboxelement" type="checkbox"/>\n  </zoo-checkbox>\n</div>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			inputSlotText,
			example,
			zoo_collapsable_list_binding
		};
	}

	class CheckboxDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hlY2tib3hEb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQ2hlY2tib3hEb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy1jaGVja2JveFwiPjwvc3ZlbHRlOm9wdGlvbnM+XG48YXBwLWNvbnRleHQgdGV4dD1cIkNoZWNrYm94IGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XG5cdFx0XHRcdDx1bD5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5sYWJlbHRleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgb24gdGhlIHJpZ2h0IHNpZGUgb2YgdGhlIGNoZWNrYm94O1xuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+dmFsaWQ8L2I+IC0gZmxhZyB3aGljaCBpbmRpY2F0ZXMgd2hldGhlciB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90O1xuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+ZGlzYWJsZWQ8L2I+IC0gZmxhZyBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIGlucHV0IGlzIGRpc2FibGVkLlxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+aGlnaGxpZ2h0ZWQ8L2I+IC0gZmxhZyBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIG91dGxpbmUgYXJvdW5kIHRoZSBpbnB1dCBzaG91bGQgYmUgdmlzaWJsZSAoYm9yZGVyKS5cblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHQ8L3VsPlxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XG5cdFx0XHRcdFRoaXMgY29tcG9uZW50IGFjY2VwdCBvbmUgPGI+e2lucHV0U2xvdFRleHR9PC9iPiB3aGljaCBpcyByZXBsYWNlZCB3aXRoIHByb3ZpZGVkIDxiPmVsZW1lbnQ8L2I+IHNvIHRoYXQgeW91IGNhbiBjYXRjaCBldmVudHMvcHJvdmlkZSB5b3VyIGNzcy9hdHRhY2ggZnJhbWV3b3JrIHNwZWNpZmljIGRpcmVjdGl2ZXMgZnJvbS90byB0aGlzIGVsZW1lbnQuICAgICBcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cblx0XHR3aWxsIHByb2R1Y2UgdGhlIGZvbGxvd2luZzpcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxuXHRcdFx0PHpvby1jaGVja2JveCBoaWdobGlnaHRlZD1cIjFcIiBsYWJlbHRleHQ9XCJFeGFtcGxlIGxhYmVsIGZvciB0aGlzIHBhcnRpY3VsYXIgY2hlY2tib3hcIj5cblx0XHRcdFx0PGlucHV0IHNsb3Q9XCJjaGVja2JveGVsZW1lbnRcIiB0eXBlPVwiY2hlY2tib3hcIi8+XG5cdFx0XHQ8L3pvby1jaGVja2JveD5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uZG9jLWVsZW1lbnQge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93OyB9XG5cbi5saXN0IHtcbiAgd2lkdGg6IDM1JTtcbiAgbWFyZ2luOiAwIDIwcHg7IH1cblxuLmV4YW1wbGUge1xuICBvdmVyZmxvdzogYXV0bzsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xuXHRsZXQgbGlzdDtcblx0bGV0IGlucHV0U2xvdFRleHQgPSBgPHNsb3QgbmFtZT1cImNoZWNrYm94ZWxlbWVudFwiPjwvc2xvdD5gO1xuXHRsZXQgZXhhbXBsZSA9IGA8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxcbiAgPHpvby1jaGVja2JveCBoaWdobGlnaHRlZD1cIjFcIiBsYWJlbHRleHQ9XCJFeGFtcGxlIGxhYmVsIGZvciB0aGlzIHBhcnRpY3VsYXIgY2hlY2tib3hcIj5cXG4gICAgPGlucHV0IHNsb3Q9XCJjaGVja2JveGVsZW1lbnRcIiB0eXBlPVwiY2hlY2tib3hcIi8+XFxuICA8L3pvby1jaGVja2JveD5cXG48L2Rpdj5gO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRsaXN0Lml0ZW1zID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdBUEknXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcblx0XHRcdH1cblx0XHRdO1xuXHR9KTtcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFxQ3dCLFlBQVksQUFBQyxDQUFDLEFBQ3BDLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBRXhCLEtBQUssQUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBRW5CLFFBQVEsQUFBQyxDQUFDLEFBQ1IsUUFBUSxDQUFFLElBQUksQUFBRSxDQUFDIn0= */</style>`;

			init(this, { target: this.shadowRoot }, instance$6, create_fragment$6, safe_not_equal, []);

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

	customElements.define("docs-checkbox", CheckboxDocs);

	/* src/docs/CollapsableListDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$7 = "src/docs/CollapsableListDocs.svelte";

	function create_fragment$7(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list0, zoo_collapsable_list_item0, ul, li0, b0, t2, code0, t4, li1, b1, t6, t7, zoo_collapsable_list_item1, t8, b2, t9, t10, b3, t12, t13, div2, code1, pre, t14, t15, t16, div1, zoo_collapsable_list1, zoo_collapsable_list_item2, span0, t18, zoo_collapsable_list_item3, span1;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list0 = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "items";
				t2 = text(" - array of objects of with one field ");
				code0 = element("code");
				code0.textContent = "header: string";
				t4 = space();
				li1 = element("li");
				b1 = element("b");
				b1.textContent = "highlighted";
				t6 = text(" - flag indicating whether the outline around the input should be visible (border)");
				t7 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				t8 = text("This component accepts multiple ");
				b2 = element("b");
				t9 = text(ctx.listSlotText);
				t10 = text(" which are replaced with provided ");
				b3 = element("b");
				b3.textContent = "elements";
				t12 = text(".");
				t13 = space();
				div2 = element("div");
				code1 = element("code");
				pre = element("pre");
				t14 = text(ctx.example);
				t15 = text(ctx.scriptExample);
				t16 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_collapsable_list1 = element("zoo-collapsable-list");
				zoo_collapsable_list_item2 = element("zoo-collapsable-list-item");
				span0 = element("span");
				span0.textContent = "inner item0";
				t18 = space();
				zoo_collapsable_list_item3 = element("zoo-collapsable-list-item");
				span1 = element("span");
				span1.textContent = "inner item1";
				this.c = noop;
				set_custom_element_data(app_context, "text", "Collapsable List component API.");
				add_location(app_context, file$7, 1, 0, 62);
				add_location(b0, file$7, 8, 6, 286);
				add_location(code0, file$7, 8, 56, 336);
				add_location(li0, file$7, 7, 5, 275);
				add_location(b1, file$7, 11, 6, 391);
				add_location(li1, file$7, 10, 5, 380);
				add_location(ul, file$7, 6, 4, 265);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$7, 5, 3, 220);
				add_location(b2, file$7, 16, 36, 625);
				add_location(b3, file$7, 16, 91, 680);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$7, 15, 3, 548);
				add_location(zoo_collapsable_list0, file$7, 4, 2, 177);
				div0.className = "list";
				add_location(div0, file$7, 3, 1, 156);
				add_location(pre, file$7, 21, 8, 794);
				add_location(code1, file$7, 21, 2, 788);
				add_location(span0, file$7, 26, 5, 997);
				set_custom_element_data(zoo_collapsable_list_item2, "slot", "item0");
				add_location(zoo_collapsable_list_item2, file$7, 25, 4, 951);
				add_location(span1, file$7, 29, 5, 1105);
				set_custom_element_data(zoo_collapsable_list_item3, "slot", "item1");
				add_location(zoo_collapsable_list_item3, file$7, 28, 4, 1059);
				add_location(zoo_collapsable_list1, file$7, 24, 3, 900);
				set_style(div1, "width", "250px");
				add_location(div1, file$7, 23, 2, 869);
				div2.className = "example";
				add_location(div2, file$7, 20, 1, 764);
				div3.className = "doc-element";
				add_location(div3, file$7, 2, 0, 129);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list0);
				append(zoo_collapsable_list0, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(li0, code0);
				append(ul, t4);
				append(ul, li1);
				append(li1, b1);
				append(li1, t6);
				append(zoo_collapsable_list0, t7);
				append(zoo_collapsable_list0, zoo_collapsable_list_item1);
				append(zoo_collapsable_list_item1, t8);
				append(zoo_collapsable_list_item1, b2);
				append(b2, t9);
				append(zoo_collapsable_list_item1, t10);
				append(zoo_collapsable_list_item1, b3);
				append(zoo_collapsable_list_item1, t12);
				add_binding_callback(() => ctx.zoo_collapsable_list0_binding(zoo_collapsable_list0, null));
				append(div3, t13);
				append(div3, div2);
				append(div2, code1);
				append(code1, pre);
				append(pre, t14);
				append(pre, t15);
				append(div2, t16);
				append(div2, div1);
				append(div1, zoo_collapsable_list1);
				append(zoo_collapsable_list1, zoo_collapsable_list_item2);
				append(zoo_collapsable_list_item2, span0);
				append(zoo_collapsable_list1, t18);
				append(zoo_collapsable_list1, zoo_collapsable_list_item3);
				append(zoo_collapsable_list_item3, span1);
				add_binding_callback(() => ctx.zoo_collapsable_list1_binding(zoo_collapsable_list1, null));
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list0_binding(null, zoo_collapsable_list0);
					ctx.zoo_collapsable_list0_binding(zoo_collapsable_list0, null);
				}
				if (changed.items) {
					ctx.zoo_collapsable_list1_binding(null, zoo_collapsable_list1);
					ctx.zoo_collapsable_list1_binding(zoo_collapsable_list1, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list0_binding(null, zoo_collapsable_list0);
				ctx.zoo_collapsable_list1_binding(null, zoo_collapsable_list1);
			}
		};
	}

	function instance$7($$self, $$props, $$invalidate) {
		let list;
		let listSlotText = `<slot name="item{idx}"></slot>`;
		let example = `<div style="width: 250px;">\n  <zoo-collapsable-list id="list">\n    <zoo-collapsable-list-item slot="item0">\n      <span>inner item0</span>\n    </zoo-collapsable-list-item>\n    <zoo-collapsable-list-item slot="item1">\n      <span>inner item1</span>\n    </zoo-collapsable-list-item>\n  </zoo-collapsable-list>\n</div>`;
		let scriptExample = `\n<script>\n  document.getElementById('list').items=[{header: item0}, {header: item1}];\n<\/script>`;
		let exampleList;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
			exampleList.items = [
				{
					header: 'item0'
				},
				{
					header: 'item1'
				}
			]; $$invalidate('exampleList', exampleList);
		});

		function zoo_collapsable_list0_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		function zoo_collapsable_list1_binding($$node, check) {
			exampleList = $$node;
			$$invalidate('exampleList', exampleList);
		}

		return {
			list,
			listSlotText,
			example,
			scriptExample,
			exampleList,
			zoo_collapsable_list0_binding,
			zoo_collapsable_list1_binding
		};
	}

	class CollapsableListDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29sbGFwc2FibGVMaXN0RG9jcy5zdmVsdGUiLCJzb3VyY2VzIjpbIkNvbGxhcHNhYmxlTGlzdERvY3Muc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJkb2NzLWNvbGxhcHNhYmxlLWxpc3RcIj48L3N2ZWx0ZTpvcHRpb25zPlxuPGFwcC1jb250ZXh0IHRleHQ9XCJDb2xsYXBzYWJsZSBMaXN0IGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XG5cdFx0XHRcdDx1bD5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5pdGVtczwvYj4gLSBhcnJheSBvZiBvYmplY3RzIG9mIHdpdGggb25lIGZpZWxkIDxjb2RlPmhlYWRlcjogc3RyaW5nPC9jb2RlPlxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+aGlnaGxpZ2h0ZWQ8L2I+IC0gZmxhZyBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIG91dGxpbmUgYXJvdW5kIHRoZSBpbnB1dCBzaG91bGQgYmUgdmlzaWJsZSAoYm9yZGVyKVxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdDwvdWw+XG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTFcIj5cblx0XHRcdFx0VGhpcyBjb21wb25lbnQgYWNjZXB0cyBtdWx0aXBsZSA8Yj57bGlzdFNsb3RUZXh0fTwvYj4gd2hpY2ggYXJlIHJlcGxhY2VkIHdpdGggcHJvdmlkZWQgPGI+ZWxlbWVudHM8L2I+LlxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxuXHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3Q+XG5cdDwvZGl2PlxuXHQ8ZGl2IGNsYXNzPVwiZXhhbXBsZVwiPlxuXHRcdDxjb2RlPjxwcmU+e2V4YW1wbGV9e3NjcmlwdEV4YW1wbGV9PC9wcmU+PC9jb2RlPlxuXHRcdHdpbGwgcHJvZHVjZSB0aGUgZm9sbG93aW5nOlxuXHRcdDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHg7XCI+XG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtleGFtcGxlTGlzdH0+XG5cdFx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMFwiPlxuXHRcdFx0XHRcdDxzcGFuPmlubmVyIGl0ZW0wPC9zcGFuPlxuXHRcdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMVwiPlxuXHRcdFx0XHRcdDxzcGFuPmlubmVyIGl0ZW0xPC9zcGFuPlxuXHRcdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5cbjwvZGl2PlxuXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5kb2MtZWxlbWVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7IH1cblxuLmxpc3Qge1xuICB3aWR0aDogMzUlO1xuICBtYXJnaW46IDAgMjBweDsgfVxuXG4uZXhhbXBsZSB7XG4gIG92ZXJmbG93OiBhdXRvOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cblxuPHNjcmlwdD5cblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XG5cdGxldCBsaXN0O1xuXHRsZXQgbGlzdFNsb3RUZXh0ID0gYDxzbG90IG5hbWU9XCJpdGVte2lkeH1cIj48L3Nsb3Q+YDtcblx0bGV0IGV4YW1wbGUgPSBgPGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cXG4gIDx6b28tY29sbGFwc2FibGUtbGlzdCBpZD1cImxpc3RcIj5cXG4gICAgPHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XFxuICAgICAgPHNwYW4+aW5uZXIgaXRlbTA8L3NwYW4+XFxuICAgIDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cXG4gICAgPHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XFxuICAgICAgPHNwYW4+aW5uZXIgaXRlbTE8L3NwYW4+XFxuICAgIDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cXG4gIDwvem9vLWNvbGxhcHNhYmxlLWxpc3Q+XFxuPC9kaXY+YDtcblx0bGV0IHNjcmlwdEV4YW1wbGUgPSBgXFxuPHNjcmlwdD5cXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsaXN0JykuaXRlbXM9W3toZWFkZXI6IGl0ZW0wfSwge2hlYWRlcjogaXRlbTF9XTtcXG48XFwvc2NyaXB0PmA7XG5cdGxldCBleGFtcGxlTGlzdDtcblx0b25Nb3VudCgoKSA9PiB7XG5cdFx0bGlzdC5pdGVtcyA9IFtcblx0XHRcdHtcblx0XHRcdFx0aGVhZGVyOiAnQVBJJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aGVhZGVyOiAnU2xvdHMnXG5cdFx0XHR9XG5cdFx0XTtcblx0XHRleGFtcGxlTGlzdC5pdGVtcyA9IFtcblx0XHRcdHtcblx0XHRcdFx0aGVhZGVyOiAnaXRlbTAnXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdpdGVtMSdcblx0XHRcdH1cblx0XHRdO1xuXHR9KTtcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFvQ3dCLFlBQVksQUFBQyxDQUFDLEFBQ3BDLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBRXhCLEtBQUssQUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBRW5CLFFBQVEsQUFBQyxDQUFDLEFBQ1IsUUFBUSxDQUFFLElBQUksQUFBRSxDQUFDIn0= */</style>`;

			init(this, { target: this.shadowRoot }, instance$7, create_fragment$7, safe_not_equal, []);

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

	customElements.define("docs-collapsable-list", CollapsableListDocs);

	/* src/docs/FeedbackDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$8 = "src/docs/FeedbackDocs.svelte";

	function create_fragment$8(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, t3, li1, b1, t5, b2, t7, b3, t9, b4, t11, b5, t13, t14, zoo_collapsable_list_item1, t16, div2, code, pre, t17, t18, div1, zoo_feedback;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "text";
				t2 = text(" - text to be presented in the feedback box");
				t3 = space();
				li1 = element("li");
				b1 = element("b");
				b1.textContent = "type";
				t5 = text(" - type of the feedback. Possible values are: ");
				b2 = element("b");
				b2.textContent = "error";
				t7 = text(", ");
				b3 = element("b");
				b3.textContent = "info";
				t9 = text(", ");
				b4 = element("b");
				b4.textContent = "success";
				t11 = text(". Default is ");
				b5 = element("b");
				b5.textContent = "info";
				t13 = text(";");
				t14 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				zoo_collapsable_list_item1.textContent = "This component does not accept any slots.";
				t16 = space();
				div2 = element("div");
				code = element("code");
				pre = element("pre");
				t17 = text(ctx.example);
				t18 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_feedback = element("zoo-feedback");
				this.c = noop;
				set_custom_element_data(app_context, "text", "Feedback component API.");
				add_location(app_context, file$8, 1, 0, 54);
				add_location(b0, file$8, 8, 6, 270);
				add_location(li0, file$8, 7, 5, 259);
				add_location(b1, file$8, 11, 6, 352);
				add_location(b2, file$8, 11, 63, 409);
				add_location(b3, file$8, 11, 77, 423);
				add_location(b4, file$8, 11, 90, 436);
				add_location(b5, file$8, 11, 117, 463);
				add_location(li1, file$8, 10, 5, 341);
				add_location(ul, file$8, 6, 4, 249);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$8, 5, 3, 204);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$8, 15, 3, 532);
				add_location(zoo_collapsable_list, file$8, 4, 2, 161);
				div0.className = "list";
				add_location(div0, file$8, 3, 1, 140);
				add_location(pre, file$8, 21, 8, 716);
				add_location(code, file$8, 21, 2, 710);
				set_custom_element_data(zoo_feedback, "text", "This is an info message.");
				add_location(zoo_feedback, file$8, 24, 3, 807);
				set_style(div1, "width", "250px");
				add_location(div1, file$8, 23, 2, 776);
				div2.className = "example";
				add_location(div2, file$8, 20, 1, 686);
				div3.className = "doc-element";
				add_location(div3, file$8, 2, 0, 113);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(ul, t3);
				append(ul, li1);
				append(li1, b1);
				append(li1, t5);
				append(li1, b2);
				append(li1, t7);
				append(li1, b3);
				append(li1, t9);
				append(li1, b4);
				append(li1, t11);
				append(li1, b5);
				append(li1, t13);
				append(zoo_collapsable_list, t14);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div3, t16);
				append(div3, div2);
				append(div2, code);
				append(code, pre);
				append(pre, t17);
				append(div2, t18);
				append(div2, div1);
				append(div1, zoo_feedback);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$8($$self, $$props, $$invalidate) {
		let list;
		let example = `<div style="width: 250px;">\n  <zoo-feedback text="This is an info message."></zoo-feedback>\n</div>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			example,
			zoo_collapsable_list_binding
		};
	}

	class FeedbackDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmVlZGJhY2tEb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiRmVlZGJhY2tEb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy1mZWVkYmFja1wiPjwvc3ZlbHRlOm9wdGlvbnM+XG48YXBwLWNvbnRleHQgdGV4dD1cIkZlZWRiYWNrIGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XG5cdFx0XHRcdDx1bD5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj50ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGluIHRoZSBmZWVkYmFjayBib3hcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPnR5cGU8L2I+IC0gdHlwZSBvZiB0aGUgZmVlZGJhY2suIFBvc3NpYmxlIHZhbHVlcyBhcmU6IDxiPmVycm9yPC9iPiwgPGI+aW5mbzwvYj4sIDxiPnN1Y2Nlc3M8L2I+LiBEZWZhdWx0IGlzIDxiPmluZm88L2I+O1xuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdDwvdWw+XG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTFcIj5cblx0XHRcdFx0VGhpcyBjb21wb25lbnQgZG9lcyBub3QgYWNjZXB0IGFueSBzbG90cy5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cblx0XHR3aWxsIHByb2R1Y2UgdGhlIGZvbGxvd2luZzpcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxuXHRcdFx0PHpvby1mZWVkYmFjayB0ZXh0PVwiVGhpcyBpcyBhbiBpbmZvIG1lc3NhZ2UuXCI+PC96b28tZmVlZGJhY2s+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PlxuPC9kaXY+XG5cbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcblx0bGV0IGxpc3Q7XG5cdGxldCBpbnB1dFNsb3RUZXh0ID0gYDxzbG90IG5hbWU9XCJjaGVja2JveGVsZW1lbnRcIj48L3Nsb3Q+YDtcblx0bGV0IGV4YW1wbGUgPSBgPGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cXG4gIDx6b28tZmVlZGJhY2sgdGV4dD1cIlRoaXMgaXMgYW4gaW5mbyBtZXNzYWdlLlwiPjwvem9vLWZlZWRiYWNrPlxcbjwvZGl2PmA7XG5cdG9uTW91bnQoKCkgPT4ge1xuXHRcdGxpc3QuaXRlbXMgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcjogJ0FQSSdcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcjogJ1Nsb3RzJ1xuXHRcdFx0fVxuXHRcdF07XG5cdH0pO1xuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQTZCd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

			init(this, { target: this.shadowRoot }, instance$8, create_fragment$8, safe_not_equal, []);

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

	customElements.define("docs-feedback", FeedbackDocs);

	/* src/docs/FooterDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$9 = "src/docs/FooterDocs.svelte";

	function create_fragment$9(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul1, li6, b0, t2, b1, t4, ul0, li0, b2, t6, t7, li1, b3, t9, t10, li2, b4, t12, b5, t14, t15, li3, b6, t17, b7, t19, b8, t21, b9, t23, t24, li4, b10, t26, t27, li5, b11, t29, t30, zoo_collapsable_list_item1, t32, div2, code, pre, t33, t34, t35, div1, zoo_footer;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul1 = element("ul");
				li6 = element("li");
				b0 = element("b");
				b0.textContent = "footerlinks";
				t2 = text(" - an ");
				b1 = element("b");
				b1.textContent = "array";
				t4 = text(" of objects where each object has the following structure:\n\t\t\t\t\t\t");
				ul0 = element("ul");
				li0 = element("li");
				b2 = element("b");
				b2.textContent = "href";
				t6 = text(" - direct link");
				t7 = space();
				li1 = element("li");
				b3 = element("b");
				b3.textContent = "text";
				t9 = text(" - text to be displayed as link");
				t10 = space();
				li2 = element("li");
				b4 = element("b");
				b4.textContent = "target";
				t12 = text(" - how the link should behave (default - ");
				b5 = element("b");
				b5.textContent = "about:blank";
				t14 = text(")");
				t15 = space();
				li3 = element("li");
				b6 = element("b");
				b6.textContent = "type";
				t17 = text(" - currently supports 2 values: ");
				b7 = element("b");
				b7.textContent = "standard";
				t19 = text(" and ");
				b8 = element("b");
				b8.textContent = "green";
				t21 = text(", default - ");
				b9 = element("b");
				b9.textContent = "standard";
				t23 = text(". Responsible for coloring of the links, standard is white");
				t24 = space();
				li4 = element("li");
				b10 = element("b");
				b10.textContent = "disabled";
				t26 = text(" - flag indicating whether the anchor link should be disabled");
				t27 = space();
				li5 = element("li");
				b11 = element("b");
				b11.textContent = "copyright";
				t29 = text(" - text to be presented as a copyright unde links (foe example, 'zooplus AG')");
				t30 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				zoo_collapsable_list_item1.textContent = "This component does not accept slots.";
				t32 = space();
				div2 = element("div");
				code = element("code");
				pre = element("pre");
				t33 = text(ctx.example);
				t34 = text(ctx.scriptExample);
				t35 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_footer = element("zoo-footer");
				this.c = noop;
				set_custom_element_data(app_context, "text", "Footer component API.");
				add_location(app_context, file$9, 2, 0, 53);
				add_location(b0, file$9, 9, 6, 267);
				add_location(b1, file$9, 9, 30, 291);
				add_location(b2, file$9, 12, 8, 393);
				add_location(li0, file$9, 11, 7, 380);
				add_location(b3, file$9, 15, 8, 452);
				add_location(li1, file$9, 14, 7, 439);
				add_location(b4, file$9, 18, 8, 528);
				add_location(b5, file$9, 18, 62, 582);
				add_location(li2, file$9, 17, 7, 515);
				add_location(b6, file$9, 21, 8, 635);
				add_location(b7, file$9, 21, 51, 678);
				add_location(b8, file$9, 21, 71, 698);
				add_location(b9, file$9, 21, 95, 722);
				add_location(li3, file$9, 20, 7, 622);
				add_location(b10, file$9, 24, 8, 829);
				add_location(li4, file$9, 23, 7, 816);
				add_location(b11, file$9, 27, 8, 939);
				add_location(li5, file$9, 26, 7, 926);
				add_location(ul0, file$9, 10, 6, 368);
				add_location(li6, file$9, 8, 5, 256);
				add_location(ul1, file$9, 7, 4, 246);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$9, 6, 3, 201);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$9, 33, 3, 1114);
				add_location(zoo_collapsable_list, file$9, 5, 2, 158);
				div0.className = "list";
				add_location(div0, file$9, 4, 1, 137);
				add_location(pre, file$9, 39, 8, 1294);
				add_location(code, file$9, 39, 2, 1288);
				add_location(zoo_footer, file$9, 42, 3, 1400);
				set_style(div1, "width", "250px");
				add_location(div1, file$9, 41, 2, 1369);
				div2.className = "example";
				add_location(div2, file$9, 38, 1, 1264);
				div3.className = "doc-element";
				add_location(div3, file$9, 3, 0, 110);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul1);
				append(ul1, li6);
				append(li6, b0);
				append(li6, t2);
				append(li6, b1);
				append(li6, t4);
				append(li6, ul0);
				append(ul0, li0);
				append(li0, b2);
				append(li0, t6);
				append(ul0, t7);
				append(ul0, li1);
				append(li1, b3);
				append(li1, t9);
				append(ul0, t10);
				append(ul0, li2);
				append(li2, b4);
				append(li2, t12);
				append(li2, b5);
				append(li2, t14);
				append(ul0, t15);
				append(ul0, li3);
				append(li3, b6);
				append(li3, t17);
				append(li3, b7);
				append(li3, t19);
				append(li3, b8);
				append(li3, t21);
				append(li3, b9);
				append(li3, t23);
				append(ul0, t24);
				append(ul0, li4);
				append(li4, b10);
				append(li4, t26);
				append(ul0, t27);
				append(ul0, li5);
				append(li5, b11);
				append(li5, t29);
				append(zoo_collapsable_list, t30);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div3, t32);
				append(div3, div2);
				append(div2, code);
				append(code, pre);
				append(pre, t33);
				append(pre, t34);
				append(div2, t35);
				append(div2, div1);
				append(div1, zoo_footer);
				add_binding_callback(() => ctx.zoo_footer_binding(zoo_footer, null));
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
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
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
				ctx.zoo_footer_binding(null, zoo_footer);
			}
		};
	}

	function instance$9($$self, $$props, $$invalidate) {
		let list;
		let exampleFooter;
		let example = `<div style="width: 250px;">\n  <zoo-footer id="footer"></zoo-footer>\n</div>`;
		let scriptExample = `\n<script>\n  document.getElementById('footer').footerlinks=[{\n    href: 'https://github.com/zooplus/zoo-web-components',\n    text: 'Github',\n    type: 'standard'\n  },\n  {\n    href: 'https://www.npmjs.com/package/@zooplus/zoo-web-components',\n    text: 'NPM',\n    type: 'standard'\n  }];\n<\/script>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
			exampleFooter.footerlinks = [
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
			]; $$invalidate('exampleFooter', exampleFooter);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		function zoo_footer_binding($$node, check) {
			exampleFooter = $$node;
			$$invalidate('exampleFooter', exampleFooter);
		}

		return {
			list,
			exampleFooter,
			example,
			scriptExample,
			zoo_collapsable_list_binding,
			zoo_footer_binding
		};
	}

	class FooterDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9vdGVyRG9jcy5zdmVsdGUiLCJzb3VyY2VzIjpbIkZvb3RlckRvY3Muc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJkb2NzLWZvb3RlclwiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiRm9vdGVyIGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XG5cdFx0XHRcdDx1bD5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5mb290ZXJsaW5rczwvYj4gLSBhbiA8Yj5hcnJheTwvYj4gb2Ygb2JqZWN0cyB3aGVyZSBlYWNoIG9iamVjdCBoYXMgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XG5cdFx0XHRcdFx0XHQ8dWw+XG5cdFx0XHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdFx0XHQ8Yj5ocmVmPC9iPiAtIGRpcmVjdCBsaW5rXG5cdFx0XHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdFx0XHQ8Yj50ZXh0PC9iPiAtIHRleHQgdG8gYmUgZGlzcGxheWVkIGFzIGxpbmtcblx0XHRcdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0XHRcdDxiPnRhcmdldDwvYj4gLSBob3cgdGhlIGxpbmsgc2hvdWxkIGJlaGF2ZSAoZGVmYXVsdCAtIDxiPmFib3V0OmJsYW5rPC9iPilcblx0XHRcdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0XHRcdDxiPnR5cGU8L2I+IC0gY3VycmVudGx5IHN1cHBvcnRzIDIgdmFsdWVzOiA8Yj5zdGFuZGFyZDwvYj4gYW5kIDxiPmdyZWVuPC9iPiwgZGVmYXVsdCAtIDxiPnN0YW5kYXJkPC9iPi4gUmVzcG9uc2libGUgZm9yIGNvbG9yaW5nIG9mIHRoZSBsaW5rcywgc3RhbmRhcmQgaXMgd2hpdGVcblx0XHRcdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0XHRcdDxiPmRpc2FibGVkPC9iPiAtIGZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBhbmNob3IgbGluayBzaG91bGQgYmUgZGlzYWJsZWRcblx0XHRcdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0XHRcdDxiPmNvcHlyaWdodDwvYj4gLSB0ZXh0IHRvIGJlIHByZXNlbnRlZCBhcyBhIGNvcHlyaWdodCB1bmRlIGxpbmtzIChmb2UgZXhhbXBsZSwgJ3pvb3BsdXMgQUcnKVxuXHRcdFx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdFx0PC91bD5cblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHQ8L3VsPlxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XG5cdFx0XHRcdFRoaXMgY29tcG9uZW50IGRvZXMgbm90IGFjY2VwdCBzbG90cy5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfXtzY3JpcHRFeGFtcGxlfTwvcHJlPjwvY29kZT5cblx0XHR3aWxsIHByb2R1Y2UgdGhlIGZvbGxvd2luZzpcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxuXHRcdFx0PHpvby1mb290ZXIgYmluZDp0aGlzPXtleGFtcGxlRm9vdGVyfT48L3pvby1mb290ZXI+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PlxuPC9kaXY+XG5cbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcblx0bGV0IGxpc3Q7XG5cdGxldCBleGFtcGxlRm9vdGVyO1xuXHRsZXQgZXhhbXBsZSA9IGA8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxcbiAgPHpvby1mb290ZXIgaWQ9XCJmb290ZXJcIj48L3pvby1mb290ZXI+XFxuPC9kaXY+YDtcblx0bGV0IHNjcmlwdEV4YW1wbGUgPSBgXFxuPHNjcmlwdD5cXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmb290ZXInKS5mb290ZXJsaW5rcz1be1xcbiAgICBocmVmOiAnaHR0cHM6Ly9naXRodWIuY29tL3pvb3BsdXMvem9vLXdlYi1jb21wb25lbnRzJyxcXG4gICAgdGV4dDogJ0dpdGh1YicsXFxuICAgIHR5cGU6ICdzdGFuZGFyZCdcXG4gIH0sXFxuICB7XFxuICAgIGhyZWY6ICdodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9Aem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxcbiAgICB0ZXh0OiAnTlBNJyxcXG4gICAgdHlwZTogJ3N0YW5kYXJkJ1xcbiAgfV07XFxuPFxcL3NjcmlwdD5gO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRsaXN0Lml0ZW1zID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdBUEknXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcblx0XHRcdH1cblx0XHRdO1xuXHRcdGV4YW1wbGVGb290ZXIuZm9vdGVybGlua3MgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdGhyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxuXHRcdFx0XHR0ZXh0OiAnR2l0aHViJyxcblx0XHRcdFx0dHlwZTogJ3N0YW5kYXJkJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL0B6b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXG5cdFx0XHRcdHRleHQ6ICdOUE0nLFxuXHRcdFx0XHR0eXBlOiAnc3RhbmRhcmQnXG5cdFx0XHR9XG5cdFx0XTtcblx0fSk7XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBK0N3QixZQUFZLEFBQUMsQ0FBQyxBQUNwQyxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUV4QixLQUFLLEFBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxHQUFHLENBQ1YsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixRQUFRLEFBQUMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

			init(this, { target: this.shadowRoot }, instance$9, create_fragment$9, safe_not_equal, []);

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

	customElements.define("docs-footer", FooterDocs);

	/* src/docs/HeaderDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$a = "src/docs/HeaderDocs.svelte";

	function create_fragment$a(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, t3, li1, b1, t5, t6, li2, b2, t8, t9, zoo_collapsable_list_item1, t11, div2, code, pre, t12, t13, div1, zoo_header;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "imgsrc";
				t2 = text(" - path to logo of your app");
				t3 = space();
				li1 = element("li");
				b1 = element("b");
				b1.textContent = "imgalt";
				t5 = text(" - text to be displayed when logo cannot be found");
				t6 = space();
				li2 = element("li");
				b2 = element("b");
				b2.textContent = "headertext";
				t8 = text(" - text to be displayed next to the logo");
				t9 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				zoo_collapsable_list_item1.textContent = "This component accepts unnamed slots, which will be rendered to the right after logo or text.";
				t11 = space();
				div2 = element("div");
				code = element("code");
				pre = element("pre");
				t12 = text(ctx.example);
				t13 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_header = element("zoo-header");
				this.c = noop;
				set_custom_element_data(app_context, "text", "Header component API.");
				add_location(app_context, file$a, 2, 0, 53);
				add_location(b0, file$a, 9, 6, 267);
				add_location(li0, file$a, 8, 5, 256);
				add_location(b1, file$a, 12, 6, 335);
				add_location(li1, file$a, 11, 5, 324);
				add_location(b2, file$a, 15, 6, 425);
				add_location(li2, file$a, 14, 5, 414);
				add_location(ul, file$a, 7, 4, 246);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$a, 6, 3, 201);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$a, 19, 3, 539);
				add_location(zoo_collapsable_list, file$a, 5, 2, 158);
				div0.className = "list";
				add_location(div0, file$a, 4, 1, 137);
				add_location(pre, file$a, 25, 8, 775);
				add_location(code, file$a, 25, 2, 769);
				set_custom_element_data(zoo_header, "imgsrc", "logo.png");
				set_custom_element_data(zoo_header, "imgalt", "zooplus");
				set_custom_element_data(zoo_header, "headertext", "App name");
				add_location(zoo_header, file$a, 28, 3, 866);
				set_style(div1, "width", "250px");
				add_location(div1, file$a, 27, 2, 835);
				div2.className = "example";
				add_location(div2, file$a, 24, 1, 745);
				div3.className = "doc-element";
				add_location(div3, file$a, 3, 0, 110);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(ul, t3);
				append(ul, li1);
				append(li1, b1);
				append(li1, t5);
				append(ul, t6);
				append(ul, li2);
				append(li2, b2);
				append(li2, t8);
				append(zoo_collapsable_list, t9);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div3, t11);
				append(div3, div2);
				append(div2, code);
				append(code, pre);
				append(pre, t12);
				append(div2, t13);
				append(div2, div1);
				append(div1, zoo_header);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$a($$self, $$props, $$invalidate) {
		let list;
		let example = `<div style="width: 250px;">\n  <zoo-header imgsrc="logo.png" imgalt="imgalt" headertext="App name"></zoo-header>\n</div>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			example,
			zoo_collapsable_list_binding
		};
	}

	class HeaderDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGVhZGVyRG9jcy5zdmVsdGUiLCJzb3VyY2VzIjpbIkhlYWRlckRvY3Muc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJkb2NzLWhlYWRlclwiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiSGVhZGVyIGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XG5cdFx0XHRcdDx1bD5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5pbWdzcmM8L2I+IC0gcGF0aCB0byBsb2dvIG9mIHlvdXIgYXBwXG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5pbWdhbHQ8L2I+IC0gdGV4dCB0byBiZSBkaXNwbGF5ZWQgd2hlbiBsb2dvIGNhbm5vdCBiZSBmb3VuZFxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+aGVhZGVydGV4dDwvYj4gLSB0ZXh0IHRvIGJlIGRpc3BsYXllZCBuZXh0IHRvIHRoZSBsb2dvXG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0PC91bD5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMVwiPlxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBhY2NlcHRzIHVubmFtZWQgc2xvdHMsIHdoaWNoIHdpbGwgYmUgcmVuZGVyZWQgdG8gdGhlIHJpZ2h0IGFmdGVyIGxvZ28gb3IgdGV4dC5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cblx0XHR3aWxsIHByb2R1Y2UgdGhlIGZvbGxvd2luZzpcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxuXHRcdFx0PHpvby1oZWFkZXIgaW1nc3JjPVwibG9nby5wbmdcIiBpbWdhbHQ9XCJ6b29wbHVzXCIgaGVhZGVydGV4dD1cIkFwcCBuYW1lXCI+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PlxuPC9kaXY+XG5cbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcblx0bGV0IGxpc3Q7XG5cdGxldCBleGFtcGxlID0gYDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHg7XCI+XFxuICA8em9vLWhlYWRlciBpbWdzcmM9XCJsb2dvLnBuZ1wiIGltZ2FsdD1cImltZ2FsdFwiIGhlYWRlcnRleHQ9XCJBcHAgbmFtZVwiPjwvem9vLWhlYWRlcj5cXG48L2Rpdj5gO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRsaXN0Lml0ZW1zID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdBUEknXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcblx0XHRcdH1cblx0XHRdO1xuXHR9KTtcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFpQ3dCLFlBQVksQUFBQyxDQUFDLEFBQ3BDLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBRXhCLEtBQUssQUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBRW5CLFFBQVEsQUFBQyxDQUFDLEFBQ1IsUUFBUSxDQUFFLElBQUksQUFBRSxDQUFDIn0= */</style>`;

			init(this, { target: this.shadowRoot }, instance$a, create_fragment$a, safe_not_equal, []);

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

	customElements.define("docs-header", HeaderDocs);

	/* src/docs/InputDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$b = "src/docs/InputDocs.svelte";

	function create_fragment$b(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, b1, t4, b2, t6, b3, t8, li1, b4, t10, t11, li2, b5, t13, t14, li3, b6, t16, t17, li4, b7, t19, b8, t21, li5, b9, t23, t24, li6, b10, t26, t27, li7, b11, t29, t30, zoo_collapsable_list_item1, t31, t32, t33, t34, div2, code, pre, t35, t36, div1, zoo_input, input;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "labelposition";
				t2 = text(" - accepts following values: ");
				b1 = element("b");
				b1.textContent = "top";
				t4 = text(", ");
				b2 = element("b");
				b2.textContent = "left";
				t6 = text(". Default is ");
				b3 = element("b");
				b3.textContent = "top";
				t8 = space();
				li1 = element("li");
				b4 = element("b");
				b4.textContent = "labeltext";
				t10 = text(" - text to be presented as the label of the input");
				t11 = space();
				li2 = element("li");
				b5 = element("b");
				b5.textContent = "linktext";
				t13 = text(" - text to be presented as a link text");
				t14 = space();
				li3 = element("li");
				b6 = element("b");
				b6.textContent = "linkhref";
				t16 = text(" - where the link should lead");
				t17 = space();
				li4 = element("li");
				b7 = element("b");
				b7.textContent = "linktarget";
				t19 = text(" - target of the anchor link, default is ");
				b8 = element("b");
				b8.textContent = "about:blank";
				t21 = space();
				li5 = element("li");
				b9 = element("b");
				b9.textContent = "inputerrormsg";
				t23 = text(" - error message to be presented when input is in invalid state");
				t24 = space();
				li6 = element("li");
				b10 = element("b");
				b10.textContent = "infotext";
				t26 = text(" - text to be presented below the input");
				t27 = space();
				li7 = element("li");
				b11 = element("b");
				b11.textContent = "valid";
				t29 = text(" - flag which indicates whether the input is valid or not");
				t30 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				t31 = text("This component accepts one slot ");
				t32 = text(ctx.inputSlotExample);
				t33 = text(".");
				t34 = space();
				div2 = element("div");
				code = element("code");
				pre = element("pre");
				t35 = text(ctx.example);
				t36 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_input = element("zoo-input");
				input = element("input");
				this.c = noop;
				set_custom_element_data(app_context, "text", "Input component API.");
				add_location(app_context, file$b, 2, 0, 52);
				add_location(b0, file$b, 9, 6, 265);
				add_location(b1, file$b, 9, 55, 314);
				add_location(b2, file$b, 9, 67, 326);
				add_location(b3, file$b, 9, 91, 350);
				add_location(li0, file$b, 8, 5, 254);
				add_location(b4, file$b, 12, 6, 388);
				add_location(li1, file$b, 11, 5, 377);
				add_location(b5, file$b, 15, 6, 481);
				add_location(li2, file$b, 14, 5, 470);
				add_location(b6, file$b, 18, 6, 562);
				add_location(li3, file$b, 17, 5, 551);
				add_location(b7, file$b, 21, 6, 634);
				add_location(b8, file$b, 21, 64, 692);
				add_location(li4, file$b, 20, 5, 623);
				add_location(b9, file$b, 24, 6, 738);
				add_location(li5, file$b, 23, 5, 727);
				add_location(b10, file$b, 27, 6, 849);
				add_location(li6, file$b, 26, 5, 838);
				add_location(b11, file$b, 30, 6, 931);
				add_location(li7, file$b, 29, 5, 920);
				add_location(ul, file$b, 7, 4, 244);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$b, 6, 3, 199);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$b, 34, 3, 1057);
				add_location(zoo_collapsable_list, file$b, 5, 2, 156);
				div0.className = "list";
				add_location(div0, file$b, 4, 1, 135);
				add_location(pre, file$b, 40, 8, 1251);
				add_location(code, file$b, 40, 2, 1245);
				attr(input, "slot", "inputelement");
				input.placeholder = "input";
				add_location(input, file$b, 49, 4, 1566);
				set_custom_element_data(zoo_input, "labeltext", "Input label");
				set_custom_element_data(zoo_input, "linktext", "Forgotten your password?");
				set_custom_element_data(zoo_input, "linkhref", "https://google.com");
				set_custom_element_data(zoo_input, "linktarget", "about:blank");
				set_custom_element_data(zoo_input, "valid", true);
				set_custom_element_data(zoo_input, "infotext", "Additional helpful information for our users");
				add_location(zoo_input, file$b, 43, 3, 1342);
				set_style(div1, "width", "250px");
				add_location(div1, file$b, 42, 2, 1311);
				div2.className = "example";
				add_location(div2, file$b, 39, 1, 1221);
				div3.className = "doc-element";
				add_location(div3, file$b, 3, 0, 108);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(li0, b1);
				append(li0, t4);
				append(li0, b2);
				append(li0, t6);
				append(li0, b3);
				append(ul, t8);
				append(ul, li1);
				append(li1, b4);
				append(li1, t10);
				append(ul, t11);
				append(ul, li2);
				append(li2, b5);
				append(li2, t13);
				append(ul, t14);
				append(ul, li3);
				append(li3, b6);
				append(li3, t16);
				append(ul, t17);
				append(ul, li4);
				append(li4, b7);
				append(li4, t19);
				append(li4, b8);
				append(ul, t21);
				append(ul, li5);
				append(li5, b9);
				append(li5, t23);
				append(ul, t24);
				append(ul, li6);
				append(li6, b10);
				append(li6, t26);
				append(ul, t27);
				append(ul, li7);
				append(li7, b11);
				append(li7, t29);
				append(zoo_collapsable_list, t30);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				append(zoo_collapsable_list_item1, t31);
				append(zoo_collapsable_list_item1, t32);
				append(zoo_collapsable_list_item1, t33);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div3, t34);
				append(div3, div2);
				append(div2, code);
				append(code, pre);
				append(pre, t35);
				append(div2, t36);
				append(div2, div1);
				append(div1, zoo_input);
				append(zoo_input, input);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$b($$self, $$props, $$invalidate) {
		let list;
		let inputSlotExample = `<slot name="inputelement"></slot>`;
		let example = `<div style="width: 250px;">\n  <zoo-input labeltext="Input label"\n    linktext="Forgotten your password?"\n    linkhref="https://google.com"\n    linktarget="about:blank"\n    infotext="Additional helpful information for our users" >\n    <input slot="inputelement" placeholder="input"/>\n  </zoo-input>\n</div>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			inputSlotExample,
			example,
			zoo_collapsable_list_binding
		};
	}

	class InputDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5wdXREb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiSW5wdXREb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy1pbnB1dFwiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiSW5wdXQgY29tcG9uZW50IEFQSS5cIj48L2FwcC1jb250ZXh0PlxuPGRpdiBjbGFzcz1cImRvYy1lbGVtZW50XCI+XG5cdDxkaXYgY2xhc3M9XCJsaXN0XCI+XG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTBcIj5cblx0XHRcdFx0PHVsPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPmxhYmVscG9zaXRpb248L2I+IC0gYWNjZXB0cyBmb2xsb3dpbmcgdmFsdWVzOiA8Yj50b3A8L2I+LCA8Yj5sZWZ0PC9iPi4gRGVmYXVsdCBpcyA8Yj50b3A8L2I+XG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5sYWJlbHRleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgYXMgdGhlIGxhYmVsIG9mIHRoZSBpbnB1dFxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+bGlua3RleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgYXMgYSBsaW5rIHRleHRcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPmxpbmtocmVmPC9iPiAtIHdoZXJlIHRoZSBsaW5rIHNob3VsZCBsZWFkXG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5saW5rdGFyZ2V0PC9iPiAtIHRhcmdldCBvZiB0aGUgYW5jaG9yIGxpbmssIGRlZmF1bHQgaXMgPGI+YWJvdXQ6Ymxhbms8L2I+XG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5pbnB1dGVycm9ybXNnPC9iPiAtIGVycm9yIG1lc3NhZ2UgdG8gYmUgcHJlc2VudGVkIHdoZW4gaW5wdXQgaXMgaW4gaW52YWxpZCBzdGF0ZVxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+aW5mb3RleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgYmVsb3cgdGhlIGlucHV0XG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj52YWxpZDwvYj4gLSBmbGFnIHdoaWNoIGluZGljYXRlcyB3aGV0aGVyIHRoZSBpbnB1dCBpcyB2YWxpZCBvciBub3Rcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHQ8L3VsPlxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XG5cdFx0XHRcdFRoaXMgY29tcG9uZW50IGFjY2VwdHMgb25lIHNsb3Qge2lucHV0U2xvdEV4YW1wbGV9LlxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxuXHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3Q+XG5cdDwvZGl2PlxuXHQ8ZGl2IGNsYXNzPVwiZXhhbXBsZVwiPlxuXHRcdDxjb2RlPjxwcmU+e2V4YW1wbGV9PC9wcmU+PC9jb2RlPlxuXHRcdHdpbGwgcHJvZHVjZSB0aGUgZm9sbG93aW5nOlxuXHRcdDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHg7XCI+XG5cdFx0XHQ8em9vLWlucHV0IGxhYmVsdGV4dD1cIklucHV0IGxhYmVsXCIgXG5cdFx0XHRcdGxpbmt0ZXh0PVwiRm9yZ290dGVuIHlvdXIgcGFzc3dvcmQ/XCJcblx0XHRcdFx0bGlua2hyZWY9XCJodHRwczovL2dvb2dsZS5jb21cIlxuXHRcdFx0XHRsaW5rdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIlxuXHRcdFx0XHR2YWxpZD1cInt0cnVlfVwiXG5cdFx0XHRcdGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnNcIiA+XG5cdFx0XHRcdDxpbnB1dCBzbG90PVwiaW5wdXRlbGVtZW50XCIgcGxhY2Vob2xkZXI9XCJpbnB1dFwiLz5cblx0XHRcdDwvem9vLWlucHV0PlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5cbjwvZGl2PlxuXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5kb2MtZWxlbWVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7IH1cblxuLmxpc3Qge1xuICB3aWR0aDogMzUlO1xuICBtYXJnaW46IDAgMjBweDsgfVxuXG4uZXhhbXBsZSB7XG4gIG92ZXJmbG93OiBhdXRvOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cblxuPHNjcmlwdD5cblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XG5cdGxldCBsaXN0O1xuXHRsZXQgaW5wdXRTbG90RXhhbXBsZSA9IGA8c2xvdCBuYW1lPVwiaW5wdXRlbGVtZW50XCI+PC9zbG90PmA7XG5cdGxldCBleGFtcGxlID0gYDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHg7XCI+XFxuICA8em9vLWlucHV0IGxhYmVsdGV4dD1cIklucHV0IGxhYmVsXCJcXG4gICAgbGlua3RleHQ9XCJGb3Jnb3R0ZW4geW91ciBwYXNzd29yZD9cIlxcbiAgICBsaW5raHJlZj1cImh0dHBzOi8vZ29vZ2xlLmNvbVwiXFxuICAgIGxpbmt0YXJnZXQ9XCJhYm91dDpibGFua1wiXFxuICAgIGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnNcIiA+XFxuICAgIDxpbnB1dCBzbG90PVwiaW5wdXRlbGVtZW50XCIgcGxhY2Vob2xkZXI9XCJpbnB1dFwiLz5cXG4gIDwvem9vLWlucHV0PlxcbjwvZGl2PmA7XG5cdG9uTW91bnQoKCkgPT4ge1xuXHRcdGxpc3QuaXRlbXMgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcjogJ0FQSSdcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcjogJ1Nsb3RzJ1xuXHRcdFx0fVxuXHRcdF07XG5cdH0pO1xuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXVEd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

			init(this, { target: this.shadowRoot }, instance$b, create_fragment$b, safe_not_equal, []);

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

	customElements.define("docs-input", InputDocs);

	/* src/docs/LinkDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$c = "src/docs/LinkDocs.svelte";

	function create_fragment$c(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul1, ul0, li0, b0, t2, t3, li1, b1, t5, t6, li2, b2, t8, b3, t10, t11, li3, b4, t13, b5, t15, b6, t17, b7, t19, t20, li4, b8, t22, t23, li5, b9, t25, b10, t27, zoo_collapsable_list_item1, t29, div2, code, pre, t30, t31, div1, zoo_link;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul1 = element("ul");
				ul0 = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "href";
				t2 = text(" - direct link");
				t3 = space();
				li1 = element("li");
				b1 = element("b");
				b1.textContent = "text";
				t5 = text(" - text to be displayed as link");
				t6 = space();
				li2 = element("li");
				b2 = element("b");
				b2.textContent = "target";
				t8 = text(" - how the link should behave (default - ");
				b3 = element("b");
				b3.textContent = "about:blank";
				t10 = text(")");
				t11 = space();
				li3 = element("li");
				b4 = element("b");
				b4.textContent = "type";
				t13 = text(" - currently supports 2 values: ");
				b5 = element("b");
				b5.textContent = "standard";
				t15 = text(" and ");
				b6 = element("b");
				b6.textContent = "green";
				t17 = text(", default - ");
				b7 = element("b");
				b7.textContent = "standard";
				t19 = text(". Responsible for coloring of the links, standard is white");
				t20 = space();
				li4 = element("li");
				b8 = element("b");
				b8.textContent = "disabled";
				t22 = text(" - flag indicating whether the anchor link should be disabled");
				t23 = space();
				li5 = element("li");
				b9 = element("b");
				b9.textContent = "textalign";
				t25 = text(" - standard css behaviour. Default value is ");
				b10 = element("b");
				b10.textContent = "center";
				t27 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				zoo_collapsable_list_item1.textContent = "This component does not accept slots.";
				t29 = space();
				div2 = element("div");
				code = element("code");
				pre = element("pre");
				t30 = text(ctx.example);
				t31 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_link = element("zoo-link");
				this.c = noop;
				set_custom_element_data(app_context, "text", "Link component API.");
				add_location(app_context, file$c, 2, 0, 51);
				add_location(b0, file$c, 10, 7, 275);
				add_location(li0, file$c, 9, 6, 263);
				add_location(b1, file$c, 13, 7, 331);
				add_location(li1, file$c, 12, 6, 319);
				add_location(b2, file$c, 16, 7, 404);
				add_location(b3, file$c, 16, 61, 458);
				add_location(li2, file$c, 15, 6, 392);
				add_location(b4, file$c, 19, 7, 508);
				add_location(b5, file$c, 19, 50, 551);
				add_location(b6, file$c, 19, 70, 571);
				add_location(b7, file$c, 19, 94, 595);
				add_location(li3, file$c, 18, 6, 496);
				add_location(b8, file$c, 22, 7, 699);
				add_location(li4, file$c, 21, 6, 687);
				add_location(b9, file$c, 25, 7, 806);
				add_location(b10, file$c, 25, 67, 866);
				add_location(li5, file$c, 24, 6, 794);
				add_location(ul0, file$c, 8, 5, 252);
				add_location(ul1, file$c, 7, 4, 242);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$c, 6, 3, 197);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$c, 30, 3, 948);
				add_location(zoo_collapsable_list, file$c, 5, 2, 154);
				div0.className = "list";
				add_location(div0, file$c, 4, 1, 133);
				add_location(pre, file$c, 36, 8, 1128);
				add_location(code, file$c, 36, 2, 1122);
				set_custom_element_data(zoo_link, "href", "https://google.com");
				set_custom_element_data(zoo_link, "text", "Link to google");
				set_custom_element_data(zoo_link, "type", "green");
				add_location(zoo_link, file$c, 39, 3, 1219);
				set_style(div1, "width", "250px");
				add_location(div1, file$c, 38, 2, 1188);
				div2.className = "example";
				add_location(div2, file$c, 35, 1, 1098);
				div3.className = "doc-element";
				add_location(div3, file$c, 3, 0, 106);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul1);
				append(ul1, ul0);
				append(ul0, li0);
				append(li0, b0);
				append(li0, t2);
				append(ul0, t3);
				append(ul0, li1);
				append(li1, b1);
				append(li1, t5);
				append(ul0, t6);
				append(ul0, li2);
				append(li2, b2);
				append(li2, t8);
				append(li2, b3);
				append(li2, t10);
				append(ul0, t11);
				append(ul0, li3);
				append(li3, b4);
				append(li3, t13);
				append(li3, b5);
				append(li3, t15);
				append(li3, b6);
				append(li3, t17);
				append(li3, b7);
				append(li3, t19);
				append(ul0, t20);
				append(ul0, li4);
				append(li4, b8);
				append(li4, t22);
				append(ul0, t23);
				append(ul0, li5);
				append(li5, b9);
				append(li5, t25);
				append(li5, b10);
				append(zoo_collapsable_list, t27);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div3, t29);
				append(div3, div2);
				append(div2, code);
				append(code, pre);
				append(pre, t30);
				append(div2, t31);
				append(div2, div1);
				append(div1, zoo_link);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$c($$self, $$props, $$invalidate) {
		let list;
		let example = `<div style="width: 250px;">\n  <zoo-link href="https://google.com" text="Link to google" type="green"></zoo-link>\n</div>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			example,
			zoo_collapsable_list_binding
		};
	}

	class LinkDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGlua0RvY3Muc3ZlbHRlIiwic291cmNlcyI6WyJMaW5rRG9jcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRvY3MtbGlua1wiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiTGluayBjb21wb25lbnQgQVBJLlwiPjwvYXBwLWNvbnRleHQ+XG48ZGl2IGNsYXNzPVwiZG9jLWVsZW1lbnRcIj5cblx0PGRpdiBjbGFzcz1cImxpc3RcIj5cblx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtsaXN0fT5cblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMFwiPlxuXHRcdFx0XHQ8dWw+XG5cdFx0XHRcdFx0PHVsPlxuXHRcdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0XHQ8Yj5ocmVmPC9iPiAtIGRpcmVjdCBsaW5rXG5cdFx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0XHQ8Yj50ZXh0PC9iPiAtIHRleHQgdG8gYmUgZGlzcGxheWVkIGFzIGxpbmtcblx0XHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHRcdDxiPnRhcmdldDwvYj4gLSBob3cgdGhlIGxpbmsgc2hvdWxkIGJlaGF2ZSAoZGVmYXVsdCAtIDxiPmFib3V0OmJsYW5rPC9iPilcblx0XHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHRcdDxiPnR5cGU8L2I+IC0gY3VycmVudGx5IHN1cHBvcnRzIDIgdmFsdWVzOiA8Yj5zdGFuZGFyZDwvYj4gYW5kIDxiPmdyZWVuPC9iPiwgZGVmYXVsdCAtIDxiPnN0YW5kYXJkPC9iPi4gUmVzcG9uc2libGUgZm9yIGNvbG9yaW5nIG9mIHRoZSBsaW5rcywgc3RhbmRhcmQgaXMgd2hpdGVcblx0XHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHRcdDxiPmRpc2FibGVkPC9iPiAtIGZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBhbmNob3IgbGluayBzaG91bGQgYmUgZGlzYWJsZWRcblx0XHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHRcdDxiPnRleHRhbGlnbjwvYj4gLSBzdGFuZGFyZCBjc3MgYmVoYXZpb3VyLiBEZWZhdWx0IHZhbHVlIGlzIDxiPmNlbnRlcjwvYj5cblx0XHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PC91bD5cblx0XHRcdFx0PC91bD5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMVwiPlxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBkb2VzIG5vdCBhY2NlcHQgc2xvdHMuXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0PC96b28tY29sbGFwc2FibGUtbGlzdD5cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XG5cdFx0PGNvZGU+PHByZT57ZXhhbXBsZX08L3ByZT48L2NvZGU+XG5cdFx0d2lsbCBwcm9kdWNlIHRoZSBmb2xsb3dpbmc6XG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cblx0XHRcdDx6b28tbGluayBocmVmPVwiaHR0cHM6Ly9nb29nbGUuY29tXCIgdGV4dD1cIkxpbmsgdG8gZ29vZ2xlXCIgdHlwZT1cImdyZWVuXCI+PC96b28tbGluaz5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uZG9jLWVsZW1lbnQge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93OyB9XG5cbi5saXN0IHtcbiAgd2lkdGg6IDM1JTtcbiAgbWFyZ2luOiAwIDIwcHg7IH1cblxuLmV4YW1wbGUge1xuICBvdmVyZmxvdzogYXV0bzsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xuXHRsZXQgbGlzdDtcblx0bGV0IGlucHV0U2xvdEV4YW1wbGUgPSBgPHNsb3QgbmFtZT1cImlucHV0ZWxlbWVudFwiPjwvc2xvdD5gO1xuXHRsZXQgZXhhbXBsZSA9IGA8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxcbiAgPHpvby1saW5rIGhyZWY9XCJodHRwczovL2dvb2dsZS5jb21cIiB0ZXh0PVwiTGluayB0byBnb29nbGVcIiB0eXBlPVwiZ3JlZW5cIj48L3pvby1saW5rPlxcbjwvZGl2PmA7XG5cdG9uTW91bnQoKCkgPT4ge1xuXHRcdGxpc3QuaXRlbXMgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcjogJ0FQSSdcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcjogJ1Nsb3RzJ1xuXHRcdFx0fVxuXHRcdF07XG5cdH0pO1xuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQTRDd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

			init(this, { target: this.shadowRoot }, instance$c, create_fragment$c, safe_not_equal, []);

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

	customElements.define("docs-link", LinkDocs);

	/* src/docs/ModalDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$d = "src/docs/ModalDocs.svelte";

	function create_fragment$d(ctx) {
		var app_context, t0, div2, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, t3, li1, b1, t5, t6, li2, b2, t8, t9, zoo_collapsable_list_item1, t11, div1, code, pre, t12;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div2 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "headertext";
				t2 = text(" - text to be displayed as modal's header");
				t3 = space();
				li1 = element("li");
				b1 = element("b");
				b1.textContent = "openModal()";
				t5 = text(" - function which can be called to open this particular modal window.");
				t6 = space();
				li2 = element("li");
				b2 = element("b");
				b2.textContent = "closeModal()";
				t8 = text(" - function which can be called to close this particular modal window.");
				t9 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				zoo_collapsable_list_item1.textContent = "This component accepts multiple unnamed slots.";
				t11 = space();
				div1 = element("div");
				code = element("code");
				pre = element("pre");
				t12 = text(ctx.example);
				this.c = noop;
				set_custom_element_data(app_context, "text", "Modal component API.");
				add_location(app_context, file$d, 2, 0, 52);
				add_location(b0, file$d, 9, 6, 265);
				add_location(li0, file$d, 8, 5, 254);
				add_location(b1, file$d, 12, 6, 351);
				add_location(li1, file$d, 11, 5, 340);
				add_location(b2, file$d, 15, 6, 466);
				add_location(li2, file$d, 14, 5, 455);
				add_location(ul, file$d, 7, 4, 244);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$d, 6, 3, 199);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$d, 19, 3, 612);
				add_location(zoo_collapsable_list, file$d, 5, 2, 156);
				div0.className = "list";
				add_location(div0, file$d, 4, 1, 135);
				add_location(pre, file$d, 25, 8, 801);
				add_location(code, file$d, 25, 2, 795);
				div1.className = "example";
				add_location(div1, file$d, 24, 1, 771);
				div2.className = "doc-element";
				add_location(div2, file$d, 3, 0, 108);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div2, anchor);
				append(div2, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(ul, t3);
				append(ul, li1);
				append(li1, b1);
				append(li1, t5);
				append(ul, t6);
				append(ul, li2);
				append(li2, b2);
				append(li2, t8);
				append(zoo_collapsable_list, t9);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div2, t11);
				append(div2, div1);
				append(div1, code);
				append(code, pre);
				append(pre, t12);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div2);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$d($$self, $$props, $$invalidate) {
		let list;
		let example = `<zoo-modal headertext="Your basket contains licensed items">\n  <zoo-feedback text="This is an info message."></zoo-feedback>\n</zoo-modal>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			example,
			zoo_collapsable_list_binding
		};
	}

	class ModalDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kYWxEb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiTW9kYWxEb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy1tb2RhbFwiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiTW9kYWwgY29tcG9uZW50IEFQSS5cIj48L2FwcC1jb250ZXh0PlxuPGRpdiBjbGFzcz1cImRvYy1lbGVtZW50XCI+XG5cdDxkaXYgY2xhc3M9XCJsaXN0XCI+XG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTBcIj5cblx0XHRcdFx0PHVsPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPmhlYWRlcnRleHQ8L2I+IC0gdGV4dCB0byBiZSBkaXNwbGF5ZWQgYXMgbW9kYWwncyBoZWFkZXJcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPm9wZW5Nb2RhbCgpPC9iPiAtIGZ1bmN0aW9uIHdoaWNoIGNhbiBiZSBjYWxsZWQgdG8gb3BlbiB0aGlzIHBhcnRpY3VsYXIgbW9kYWwgd2luZG93LlxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+Y2xvc2VNb2RhbCgpPC9iPiAtIGZ1bmN0aW9uIHdoaWNoIGNhbiBiZSBjYWxsZWQgdG8gY2xvc2UgdGhpcyBwYXJ0aWN1bGFyIG1vZGFsIHdpbmRvdy5cblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHQ8L3VsPlxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XG5cdFx0XHRcdFRoaXMgY29tcG9uZW50IGFjY2VwdHMgbXVsdGlwbGUgdW5uYW1lZCBzbG90cy5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cblx0PC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uZG9jLWVsZW1lbnQge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93OyB9XG5cbi5saXN0IHtcbiAgd2lkdGg6IDM1JTtcbiAgbWFyZ2luOiAwIDIwcHg7IH1cblxuLmV4YW1wbGUge1xuICBvdmVyZmxvdzogYXV0bzsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xuXHRsZXQgbGlzdDtcblx0bGV0IGV4YW1wbGUgPSBgPHpvby1tb2RhbCBoZWFkZXJ0ZXh0PVwiWW91ciBiYXNrZXQgY29udGFpbnMgbGljZW5zZWQgaXRlbXNcIj5cXG4gIDx6b28tZmVlZGJhY2sgdGV4dD1cIlRoaXMgaXMgYW4gaW5mbyBtZXNzYWdlLlwiPjwvem9vLWZlZWRiYWNrPlxcbjwvem9vLW1vZGFsPmA7XG5cdG9uTW91bnQoKCkgPT4ge1xuXHRcdGxpc3QuaXRlbXMgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcjogJ0FQSSdcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcjogJ1Nsb3RzJ1xuXHRcdFx0fVxuXHRcdF07XG5cdH0pO1xuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQTZCd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

			init(this, { target: this.shadowRoot }, instance$d, create_fragment$d, safe_not_equal, []);

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

	customElements.define("docs-modal", ModalDocs);

	/* src/docs/NavigationDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$e = "src/docs/NavigationDocs.svelte";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.link = list[i];
		return child_ctx;
	}

	// (17:5) {#each navlinks as link}
	function create_each_block$2(ctx) {
		var zoo_link, zoo_link_href_value, zoo_link_text_value;

		return {
			c: function create() {
				zoo_link = element("zoo-link");
				set_style(zoo_link, "margin-left", "10px");
				set_custom_element_data(zoo_link, "href", zoo_link_href_value = ctx.link.href);
				set_custom_element_data(zoo_link, "text", zoo_link_text_value = ctx.link.text);
				add_location(zoo_link, file$e, 17, 6, 533);
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

	function create_fragment$e(ctx) {
		var app_context, t0, div4, div0, zoo_collapsable_list, zoo_collapsable_list_item, t2, div3, code, pre, t3, t4, div2, zoo_navigation, div1;

		var each_value = ctx.navlinks;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
		}

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div4 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item = element("zoo-collapsable-list-item");
				zoo_collapsable_list_item.textContent = "This component accepts multiple unnamed slots.";
				t2 = space();
				div3 = element("div");
				code = element("code");
				pre = element("pre");
				t3 = text(ctx.example);
				t4 = space();
				div2 = element("div");
				zoo_navigation = element("zoo-navigation");
				div1 = element("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				this.c = noop;
				set_custom_element_data(app_context, "text", "Navigation component API.");
				add_location(app_context, file$e, 2, 0, 57);
				set_custom_element_data(zoo_collapsable_list_item, "slot", "item0");
				add_location(zoo_collapsable_list_item, file$e, 6, 3, 209);
				add_location(zoo_collapsable_list, file$e, 5, 2, 166);
				div0.className = "list";
				add_location(div0, file$e, 4, 1, 145);
				add_location(pre, file$e, 12, 8, 398);
				add_location(code, file$e, 12, 2, 392);
				add_location(div1, file$e, 15, 4, 491);
				zoo_navigation.className = "nav";
				add_location(zoo_navigation, file$e, 14, 3, 458);
				set_style(div2, "width", "250px");
				add_location(div2, file$e, 13, 2, 428);
				div3.className = "example";
				add_location(div3, file$e, 11, 1, 368);
				div4.className = "doc-element";
				add_location(div4, file$e, 3, 0, 118);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div4, anchor);
				append(div4, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div4, t2);
				append(div4, div3);
				append(div3, code);
				append(code, pre);
				append(pre, t3);
				append(div3, t4);
				append(div3, div2);
				append(div2, zoo_navigation);
				append(zoo_navigation, div1);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div1, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}

				if (changed.navlinks) {
					each_value = ctx.navlinks;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div1, null);
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
					detach(app_context);
					detach(t0);
					detach(div4);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);

				destroy_each(each_blocks, detaching);
			}
		};
	}

	function instance$e($$self, $$props, $$invalidate) {
		let list;
		let navlinks = [
			{
				href: 'https://google.com',
				text: 'Google'
			},
			{
				href: 'https://svelte.technology/',
				text: 'Svelte'
			}
		];
		let example = `<div style="width: 250px">\n  <zoo-navigation class="nav">\n    <div>\n      {#each navlinks as link}\n        <zoo-link style="margin-left: 10px;" href="{link.href}" text="{link.text}"></zoo-link>\n      {/each}\n    </div>\n  </zoo-navigation></div>`;
		onMount(() => {
			list.items = [
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			navlinks,
			example,
			zoo_collapsable_list_binding
		};
	}

	class NavigationDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTmF2aWdhdGlvbkRvY3Muc3ZlbHRlIiwic291cmNlcyI6WyJOYXZpZ2F0aW9uRG9jcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRvY3MtbmF2aWdhdGlvblwiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiTmF2aWdhdGlvbiBjb21wb25lbnQgQVBJLlwiPjwvYXBwLWNvbnRleHQ+XG48ZGl2IGNsYXNzPVwiZG9jLWVsZW1lbnRcIj5cblx0PGRpdiBjbGFzcz1cImxpc3RcIj5cblx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtsaXN0fT5cblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMFwiPlxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBhY2NlcHRzIG11bHRpcGxlIHVubmFtZWQgc2xvdHMuXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0PC96b28tY29sbGFwc2FibGUtbGlzdD5cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XG5cdFx0PGNvZGU+PHByZT57ZXhhbXBsZX08L3ByZT48L2NvZGU+XG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweFwiPlxuXHRcdFx0PHpvby1uYXZpZ2F0aW9uIGNsYXNzPVwibmF2XCI+XG5cdFx0XHRcdDxkaXY+XG5cdFx0XHRcdFx0eyNlYWNoIG5hdmxpbmtzIGFzIGxpbmt9XG5cdFx0XHRcdFx0XHQ8em9vLWxpbmsgc3R5bGU9XCJtYXJnaW4tbGVmdDogMTBweDtcIiBocmVmPVwie2xpbmsuaHJlZn1cIiB0ZXh0PVwie2xpbmsudGV4dH1cIj48L3pvby1saW5rPlxuXHRcdFx0XHRcdHsvZWFjaH1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L3pvby1uYXZpZ2F0aW9uPlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5cbjwvZGl2PlxuXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5kb2MtZWxlbWVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7IH1cblxuLmxpc3Qge1xuICB3aWR0aDogMzUlO1xuICBtYXJnaW46IDAgMjBweDsgfVxuXG4uZXhhbXBsZSB7XG4gIG92ZXJmbG93OiBhdXRvOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cblxuPHNjcmlwdD5cblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XG5cdGxldCBsaXN0O1xuXHRsZXQgbmF2bGlua3MgPSBbXG5cdFx0e1xuXHRcdFx0aHJlZjogJ2h0dHBzOi8vZ29vZ2xlLmNvbScsXG5cdFx0XHR0ZXh0OiAnR29vZ2xlJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJ2h0dHBzOi8vc3ZlbHRlLnRlY2hub2xvZ3kvJyxcblx0XHRcdHRleHQ6ICdTdmVsdGUnXG5cdFx0fVxuXHRdO1xuXHRsZXQgZXhhbXBsZSA9IGA8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4XCI+XFxuICA8em9vLW5hdmlnYXRpb24gY2xhc3M9XCJuYXZcIj5cXG4gICAgPGRpdj5cXG4gICAgICB7I2VhY2ggbmF2bGlua3MgYXMgbGlua31cXG4gICAgICAgIDx6b28tbGluayBzdHlsZT1cIm1hcmdpbi1sZWZ0OiAxMHB4O1wiIGhyZWY9XCJ7bGluay5ocmVmfVwiIHRleHQ9XCJ7bGluay50ZXh0fVwiPjwvem9vLWxpbms+XFxuICAgICAgey9lYWNofVxcbiAgICA8L2Rpdj5cXG4gIDwvem9vLW5hdmlnYXRpb24+PC9kaXY+YDtcblx0b25Nb3VudCgoKSA9PiB7XG5cdFx0bGlzdC5pdGVtcyA9IFtcblx0XHRcdHtcblx0XHRcdFx0aGVhZGVyOiAnU2xvdHMnXG5cdFx0XHR9XG5cdFx0XTtcblx0fSk7XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBeUJ3QixZQUFZLEFBQUMsQ0FBQyxBQUNwQyxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUV4QixLQUFLLEFBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxHQUFHLENBQ1YsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixRQUFRLEFBQUMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

			init(this, { target: this.shadowRoot }, instance$e, create_fragment$e, safe_not_equal, []);

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

	customElements.define("docs-navigation", NavigationDocs);

	/* src/docs/RadioDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$f = "src/docs/RadioDocs.svelte";

	function create_fragment$f(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, t3, li1, b1, t5, t6, li2, b2, t8, t9, zoo_collapsable_list_item1, t11, div2, code, pre, t12, t13, div1, zoo_radio, input0, t14, label0, t16, input1, t17, label1;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "errormsg";
				t2 = text(" - error message to be presented when input is in invalid state");
				t3 = space();
				li1 = element("li");
				b1 = element("b");
				b1.textContent = "infotext";
				t5 = text(" - text to be presented below the input");
				t6 = space();
				li2 = element("li");
				b2 = element("b");
				b2.textContent = "valid";
				t8 = text(" - flag which indicates whether the input is valid or not");
				t9 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				zoo_collapsable_list_item1.textContent = "This component accepts multiple unnamed slots.";
				t11 = space();
				div2 = element("div");
				code = element("code");
				pre = element("pre");
				t12 = text(ctx.example);
				t13 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_radio = element("zoo-radio");
				input0 = element("input");
				t14 = space();
				label0 = element("label");
				label0.textContent = "Email";
				t16 = space();
				input1 = element("input");
				t17 = space();
				label1 = element("label");
				label1.textContent = "Phone";
				this.c = noop;
				set_custom_element_data(app_context, "text", "Radio component API.");
				add_location(app_context, file$f, 2, 0, 52);
				add_location(b0, file$f, 9, 6, 265);
				add_location(li0, file$f, 8, 5, 254);
				add_location(b1, file$f, 12, 6, 371);
				add_location(li1, file$f, 11, 5, 360);
				add_location(b2, file$f, 15, 6, 453);
				add_location(li2, file$f, 14, 5, 442);
				add_location(ul, file$f, 7, 4, 244);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$f, 6, 3, 199);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$f, 19, 3, 579);
				add_location(zoo_collapsable_list, file$f, 5, 2, 156);
				div0.className = "list";
				add_location(div0, file$f, 4, 1, 135);
				add_location(pre, file$f, 25, 8, 768);
				add_location(code, file$f, 25, 2, 762);
				attr(input0, "type", "radio");
				input0.id = "contactChoice4";
				input0.name = "contact";
				input0.value = "email";
				input0.disabled = true;
				add_location(input0, file$f, 29, 4, 895);
				label0.htmlFor = "contactChoice4";
				add_location(label0, file$f, 30, 4, 978);
				attr(input1, "type", "radio");
				input1.id = "contactChoice5";
				input1.name = "contact";
				input1.value = "phone";
				add_location(input1, file$f, 31, 4, 1024);
				label1.htmlFor = "contactChoice5";
				add_location(label1, file$f, 32, 4, 1098);
				set_custom_element_data(zoo_radio, "infotext", "infotext");
				add_location(zoo_radio, file$f, 28, 3, 859);
				set_style(div1, "width", "250px");
				add_location(div1, file$f, 27, 2, 828);
				div2.className = "example";
				add_location(div2, file$f, 24, 1, 738);
				div3.className = "doc-element";
				add_location(div3, file$f, 3, 0, 108);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(ul, t3);
				append(ul, li1);
				append(li1, b1);
				append(li1, t5);
				append(ul, t6);
				append(ul, li2);
				append(li2, b2);
				append(li2, t8);
				append(zoo_collapsable_list, t9);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div3, t11);
				append(div3, div2);
				append(div2, code);
				append(code, pre);
				append(pre, t12);
				append(div2, t13);
				append(div2, div1);
				append(div1, zoo_radio);
				append(zoo_radio, input0);
				append(zoo_radio, t14);
				append(zoo_radio, label0);
				append(zoo_radio, t16);
				append(zoo_radio, input1);
				append(zoo_radio, t17);
				append(zoo_radio, label1);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$f($$self, $$props, $$invalidate) {
		let list;
		let example = `<div style="width: 250px;">\n  <zoo-radio infotext="infotext">\n    <input type="radio" id="contactChoice4" name="contact" value="email" disabled>\n    <label for="contactChoice4">Email</label>\n    <input type="radio" id="contactChoice5" name="contact" value="phone">\n    <label for="contactChoice5">Phone</label>\n  </zoo-radio>\n</div>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			example,
			zoo_collapsable_list_binding
		};
	}

	class RadioDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmFkaW9Eb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiUmFkaW9Eb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy1yYWRpb1wiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiUmFkaW8gY29tcG9uZW50IEFQSS5cIj48L2FwcC1jb250ZXh0PlxuPGRpdiBjbGFzcz1cImRvYy1lbGVtZW50XCI+XG5cdDxkaXYgY2xhc3M9XCJsaXN0XCI+XG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTBcIj5cblx0XHRcdFx0PHVsPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPmVycm9ybXNnPC9iPiAtIGVycm9yIG1lc3NhZ2UgdG8gYmUgcHJlc2VudGVkIHdoZW4gaW5wdXQgaXMgaW4gaW52YWxpZCBzdGF0ZVxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+aW5mb3RleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgYmVsb3cgdGhlIGlucHV0XG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj52YWxpZDwvYj4gLSBmbGFnIHdoaWNoIGluZGljYXRlcyB3aGV0aGVyIHRoZSBpbnB1dCBpcyB2YWxpZCBvciBub3Rcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHQ8L3VsPlxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XG5cdFx0XHRcdFRoaXMgY29tcG9uZW50IGFjY2VwdHMgbXVsdGlwbGUgdW5uYW1lZCBzbG90cy5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cblx0XHR3aWxsIHByb2R1Y2UgdGhlIGZvbGxvd2luZzpcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxuXHRcdFx0PHpvby1yYWRpbyBpbmZvdGV4dD1cImluZm90ZXh0XCI+XG5cdFx0XHRcdDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2U0XCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cImVtYWlsXCIgZGlzYWJsZWQ+XG5cdFx0XHRcdDxsYWJlbCBmb3I9XCJjb250YWN0Q2hvaWNlNFwiPkVtYWlsPC9sYWJlbD5cblx0XHRcdFx0PGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwiY29udGFjdENob2ljZTVcIiBuYW1lPVwiY29udGFjdFwiIHZhbHVlPVwicGhvbmVcIj5cblx0XHRcdFx0PGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2U1XCI+UGhvbmU8L2xhYmVsPlxuXHRcdFx0PC96b28tcmFkaW8+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PlxuPC9kaXY+XG5cbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcblx0bGV0IGxpc3Q7XG5cdGxldCBpbnB1dFNsb3RFeGFtcGxlID0gYDxzbG90IG5hbWU9XCJpbnB1dGVsZW1lbnRcIj48L3Nsb3Q+YDtcblx0bGV0IGV4YW1wbGUgPSBgPGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cXG4gIDx6b28tcmFkaW8gaW5mb3RleHQ9XCJpbmZvdGV4dFwiPlxcbiAgICA8aW5wdXQgdHlwZT1cInJhZGlvXCIgaWQ9XCJjb250YWN0Q2hvaWNlNFwiIG5hbWU9XCJjb250YWN0XCIgdmFsdWU9XCJlbWFpbFwiIGRpc2FibGVkPlxcbiAgICA8bGFiZWwgZm9yPVwiY29udGFjdENob2ljZTRcIj5FbWFpbDwvbGFiZWw+XFxuICAgIDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2U1XCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cInBob25lXCI+XFxuICAgIDxsYWJlbCBmb3I9XCJjb250YWN0Q2hvaWNlNVwiPlBob25lPC9sYWJlbD5cXG4gIDwvem9vLXJhZGlvPlxcbjwvZGl2PmA7XG5cdG9uTW91bnQoKCkgPT4ge1xuXHRcdGxpc3QuaXRlbXMgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcjogJ0FQSSdcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcjogJ1Nsb3RzJ1xuXHRcdFx0fVxuXHRcdF07XG5cdH0pO1xuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXNDd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

			init(this, { target: this.shadowRoot }, instance$f, create_fragment$f, safe_not_equal, []);

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

	customElements.define("docs-radio", RadioDocs);

	/* src/docs/SearchableSelectDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$g = "src/docs/SearchableSelectDocs.svelte";

	function create_fragment$g(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, b1, t4, b2, t6, b3, t8, li1, b4, t10, t11, li2, b5, t13, t14, li3, b6, t16, t17, li4, b7, t19, b8, t21, li5, b9, t23, t24, li6, b10, t26, t27, li7, b11, t29, t30, li8, b12, t32, t33, zoo_collapsable_list_item1, t34, t35, t36, t37, div2, code, pre, t38, t39, div1, zoo_searchable_select, select, option0, option1;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "labelposition";
				t2 = text(" - accepts following values: ");
				b1 = element("b");
				b1.textContent = "top";
				t4 = text(", ");
				b2 = element("b");
				b2.textContent = "left";
				t6 = text(". Default is ");
				b3 = element("b");
				b3.textContent = "top";
				t8 = space();
				li1 = element("li");
				b4 = element("b");
				b4.textContent = "labeltext";
				t10 = text(" - text to be presented as the label of the input");
				t11 = space();
				li2 = element("li");
				b5 = element("b");
				b5.textContent = "linktext";
				t13 = text(" - text to be presented as a link text");
				t14 = space();
				li3 = element("li");
				b6 = element("b");
				b6.textContent = "linkhref";
				t16 = text(" - where the link should lead");
				t17 = space();
				li4 = element("li");
				b7 = element("b");
				b7.textContent = "linktarget";
				t19 = text(" - target of the anchor link, default is ");
				b8 = element("b");
				b8.textContent = "about:blank";
				t21 = space();
				li5 = element("li");
				b9 = element("b");
				b9.textContent = "inputerrormsg";
				t23 = text(" - error message to be presented when input is in invalid state");
				t24 = space();
				li6 = element("li");
				b10 = element("b");
				b10.textContent = "infotext";
				t26 = text(" - text to be presented below the input");
				t27 = space();
				li7 = element("li");
				b11 = element("b");
				b11.textContent = "valid";
				t29 = text(" - flag which indicates whether the input is valid or not");
				t30 = space();
				li8 = element("li");
				b12 = element("b");
				b12.textContent = "placeholder";
				t32 = text(" - text which should be displayed inside input used for searching");
				t33 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				t34 = text("This component accepts one slot ");
				t35 = text(ctx.inputSlotExample);
				t36 = text(".");
				t37 = space();
				div2 = element("div");
				code = element("code");
				pre = element("pre");
				t38 = text(ctx.example);
				t39 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_searchable_select = element("zoo-searchable-select");
				select = element("select");
				option0 = element("option");
				option0.textContent = "1";
				option1 = element("option");
				option1.textContent = "2";
				this.c = noop;
				set_custom_element_data(app_context, "text", "Searchable select component API.");
				add_location(app_context, file$g, 2, 0, 64);
				add_location(b0, file$g, 9, 6, 289);
				add_location(b1, file$g, 9, 55, 338);
				add_location(b2, file$g, 9, 67, 350);
				add_location(b3, file$g, 9, 91, 374);
				add_location(li0, file$g, 8, 5, 278);
				add_location(b4, file$g, 12, 6, 412);
				add_location(li1, file$g, 11, 5, 401);
				add_location(b5, file$g, 15, 6, 505);
				add_location(li2, file$g, 14, 5, 494);
				add_location(b6, file$g, 18, 6, 586);
				add_location(li3, file$g, 17, 5, 575);
				add_location(b7, file$g, 21, 6, 658);
				add_location(b8, file$g, 21, 64, 716);
				add_location(li4, file$g, 20, 5, 647);
				add_location(b9, file$g, 24, 6, 762);
				add_location(li5, file$g, 23, 5, 751);
				add_location(b10, file$g, 27, 6, 873);
				add_location(li6, file$g, 26, 5, 862);
				add_location(b11, file$g, 30, 6, 955);
				add_location(li7, file$g, 29, 5, 944);
				add_location(b12, file$g, 33, 6, 1052);
				add_location(li8, file$g, 32, 5, 1041);
				add_location(ul, file$g, 7, 4, 268);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$g, 6, 3, 223);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$g, 37, 3, 1192);
				add_location(zoo_collapsable_list, file$g, 5, 2, 180);
				div0.className = "list";
				add_location(div0, file$g, 4, 1, 159);
				add_location(pre, file$g, 43, 8, 1386);
				add_location(code, file$g, 43, 2, 1380);
				option0.__value = "1";
				option0.value = option0.__value;
				add_location(option0, file$g, 48, 5, 1605);
				option1.__value = "2";
				option1.value = option1.__value;
				add_location(option1, file$g, 49, 5, 1639);
				select.multiple = true;
				attr(select, "slot", "selectelement");
				add_location(select, file$g, 47, 4, 1561);
				set_custom_element_data(zoo_searchable_select, "labeltext", "Searchable select");
				set_custom_element_data(zoo_searchable_select, "placeholder", "Placeholder");
				add_location(zoo_searchable_select, file$g, 46, 3, 1477);
				set_style(div1, "width", "250px");
				add_location(div1, file$g, 45, 2, 1446);
				div2.className = "example";
				add_location(div2, file$g, 42, 1, 1356);
				div3.className = "doc-element";
				add_location(div3, file$g, 3, 0, 132);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(li0, b1);
				append(li0, t4);
				append(li0, b2);
				append(li0, t6);
				append(li0, b3);
				append(ul, t8);
				append(ul, li1);
				append(li1, b4);
				append(li1, t10);
				append(ul, t11);
				append(ul, li2);
				append(li2, b5);
				append(li2, t13);
				append(ul, t14);
				append(ul, li3);
				append(li3, b6);
				append(li3, t16);
				append(ul, t17);
				append(ul, li4);
				append(li4, b7);
				append(li4, t19);
				append(li4, b8);
				append(ul, t21);
				append(ul, li5);
				append(li5, b9);
				append(li5, t23);
				append(ul, t24);
				append(ul, li6);
				append(li6, b10);
				append(li6, t26);
				append(ul, t27);
				append(ul, li7);
				append(li7, b11);
				append(li7, t29);
				append(ul, t30);
				append(ul, li8);
				append(li8, b12);
				append(li8, t32);
				append(zoo_collapsable_list, t33);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				append(zoo_collapsable_list_item1, t34);
				append(zoo_collapsable_list_item1, t35);
				append(zoo_collapsable_list_item1, t36);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div3, t37);
				append(div3, div2);
				append(div2, code);
				append(code, pre);
				append(pre, t38);
				append(div2, t39);
				append(div2, div1);
				append(div1, zoo_searchable_select);
				append(zoo_searchable_select, select);
				append(select, option0);
				append(select, option1);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$g($$self, $$props, $$invalidate) {
		let list;
		let inputSlotExample = `<slot name="selectelement"></slot>`;
		let example = `<div style="width: 250px;">\n  <zoo-searchable-select labeltext="Searchable select" placeholder="Placeholder">\n    <select multiple slot="selectelement">\n      <option value="1">1</option>\n      <option value="2">2</option>\n    </select>\n  </zoo-searchable-select>\n</div>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			inputSlotExample,
			example,
			zoo_collapsable_list_binding
		};
	}

	class SearchableSelectDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VhcmNoYWJsZVNlbGVjdERvY3Muc3ZlbHRlIiwic291cmNlcyI6WyJTZWFyY2hhYmxlU2VsZWN0RG9jcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRvY3Mtc2VhcmNoYWJsZS1zZWxlY3RcIj48L3N2ZWx0ZTpvcHRpb25zPlxuXG48YXBwLWNvbnRleHQgdGV4dD1cIlNlYXJjaGFibGUgc2VsZWN0IGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XG5cdFx0XHRcdDx1bD5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5sYWJlbHBvc2l0aW9uPC9iPiAtIGFjY2VwdHMgZm9sbG93aW5nIHZhbHVlczogPGI+dG9wPC9iPiwgPGI+bGVmdDwvYj4uIERlZmF1bHQgaXMgPGI+dG9wPC9iPlxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+bGFiZWx0ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGFzIHRoZSBsYWJlbCBvZiB0aGUgaW5wdXRcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPmxpbmt0ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGFzIGEgbGluayB0ZXh0XG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5saW5raHJlZjwvYj4gLSB3aGVyZSB0aGUgbGluayBzaG91bGQgbGVhZFxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+bGlua3RhcmdldDwvYj4gLSB0YXJnZXQgb2YgdGhlIGFuY2hvciBsaW5rLCBkZWZhdWx0IGlzIDxiPmFib3V0OmJsYW5rPC9iPlxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+aW5wdXRlcnJvcm1zZzwvYj4gLSBlcnJvciBtZXNzYWdlIHRvIGJlIHByZXNlbnRlZCB3aGVuIGlucHV0IGlzIGluIGludmFsaWQgc3RhdGVcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPmluZm90ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGJlbG93IHRoZSBpbnB1dFxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+dmFsaWQ8L2I+IC0gZmxhZyB3aGljaCBpbmRpY2F0ZXMgd2hldGhlciB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90XG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5wbGFjZWhvbGRlcjwvYj4gLSB0ZXh0IHdoaWNoIHNob3VsZCBiZSBkaXNwbGF5ZWQgaW5zaWRlIGlucHV0IHVzZWQgZm9yIHNlYXJjaGluZ1xuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdDwvdWw+XG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTFcIj5cblx0XHRcdFx0VGhpcyBjb21wb25lbnQgYWNjZXB0cyBvbmUgc2xvdCB7aW5wdXRTbG90RXhhbXBsZX0uXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0PC96b28tY29sbGFwc2FibGUtbGlzdD5cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XG5cdFx0PGNvZGU+PHByZT57ZXhhbXBsZX08L3ByZT48L2NvZGU+XG5cdFx0d2lsbCBwcm9kdWNlIHRoZSBmb2xsb3dpbmc6XG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cblx0XHRcdDx6b28tc2VhcmNoYWJsZS1zZWxlY3QgbGFiZWx0ZXh0PVwiU2VhcmNoYWJsZSBzZWxlY3RcIiBwbGFjZWhvbGRlcj1cIlBsYWNlaG9sZGVyXCI+XG5cdFx0XHRcdDxzZWxlY3QgbXVsdGlwbGUgc2xvdD1cInNlbGVjdGVsZW1lbnRcIj5cblx0XHRcdFx0XHQ8b3B0aW9uIHZhbHVlPVwiMVwiPjE8L29wdGlvbj5cblx0XHRcdFx0XHQ8b3B0aW9uIHZhbHVlPVwiMlwiPjI8L29wdGlvbj5cblx0XHRcdFx0PC9zZWxlY3Q+XG5cdFx0XHQ8L3pvby1zZWFyY2hhYmxlLXNlbGVjdD5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uZG9jLWVsZW1lbnQge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93OyB9XG5cbi5saXN0IHtcbiAgd2lkdGg6IDM1JTtcbiAgbWFyZ2luOiAwIDIwcHg7IH1cblxuLmV4YW1wbGUge1xuICBvdmVyZmxvdzogYXV0bzsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xuXHRsZXQgbGlzdDtcblx0bGV0IGlucHV0U2xvdEV4YW1wbGUgPSBgPHNsb3QgbmFtZT1cInNlbGVjdGVsZW1lbnRcIj48L3Nsb3Q+YDtcblx0bGV0IGV4YW1wbGUgPSBgPGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cXG4gIDx6b28tc2VhcmNoYWJsZS1zZWxlY3QgbGFiZWx0ZXh0PVwiU2VhcmNoYWJsZSBzZWxlY3RcIiBwbGFjZWhvbGRlcj1cIlBsYWNlaG9sZGVyXCI+XFxuICAgIDxzZWxlY3QgbXVsdGlwbGUgc2xvdD1cInNlbGVjdGVsZW1lbnRcIj5cXG4gICAgICA8b3B0aW9uIHZhbHVlPVwiMVwiPjE8L29wdGlvbj5cXG4gICAgICA8b3B0aW9uIHZhbHVlPVwiMlwiPjI8L29wdGlvbj5cXG4gICAgPC9zZWxlY3Q+XFxuICA8L3pvby1zZWFyY2hhYmxlLXNlbGVjdD5cXG48L2Rpdj5gO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRsaXN0Lml0ZW1zID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdBUEknXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcblx0XHRcdH1cblx0XHRdO1xuXHR9KTtcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUF3RHdCLFlBQVksQUFBQyxDQUFDLEFBQ3BDLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBRXhCLEtBQUssQUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBRW5CLFFBQVEsQUFBQyxDQUFDLEFBQ1IsUUFBUSxDQUFFLElBQUksQUFBRSxDQUFDIn0= */</style>`;

			init(this, { target: this.shadowRoot }, instance$g, create_fragment$g, safe_not_equal, []);

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

	customElements.define("docs-searchable-select", SearchableSelectDocs);

	/* src/docs/SelectDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$h = "src/docs/SelectDocs.svelte";

	function create_fragment$h(ctx) {
		var app_context, t0, div3, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, b1, t4, b2, t6, b3, t8, li1, b4, t10, t11, li2, b5, t13, t14, li3, b6, t16, t17, li4, b7, t19, b8, t21, li5, b9, t23, t24, li6, b10, t26, t27, li7, b11, t29, t30, zoo_collapsable_list_item1, t31, t32, t33, t34, div2, code, pre, t35, t36, div1, zoo_select, select, option0, option1, option2, option3;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div3 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "labelposition";
				t2 = text(" - accepts following values: ");
				b1 = element("b");
				b1.textContent = "top";
				t4 = text(", ");
				b2 = element("b");
				b2.textContent = "left";
				t6 = text(". Default is ");
				b3 = element("b");
				b3.textContent = "top";
				t8 = space();
				li1 = element("li");
				b4 = element("b");
				b4.textContent = "labeltext";
				t10 = text(" - text to be presented as the label of the input");
				t11 = space();
				li2 = element("li");
				b5 = element("b");
				b5.textContent = "linktext";
				t13 = text(" - text to be presented as a link text");
				t14 = space();
				li3 = element("li");
				b6 = element("b");
				b6.textContent = "linkhref";
				t16 = text(" - where the link should lead");
				t17 = space();
				li4 = element("li");
				b7 = element("b");
				b7.textContent = "linktarget";
				t19 = text(" - target of the anchor link, default is ");
				b8 = element("b");
				b8.textContent = "about:blank";
				t21 = space();
				li5 = element("li");
				b9 = element("b");
				b9.textContent = "inputerrormsg";
				t23 = text(" - error message to be presented when input is in invalid state");
				t24 = space();
				li6 = element("li");
				b10 = element("b");
				b10.textContent = "infotext";
				t26 = text(" - text to be presented below the input");
				t27 = space();
				li7 = element("li");
				b11 = element("b");
				b11.textContent = "valid";
				t29 = text(" - flag which indicates whether the input is valid or not");
				t30 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				t31 = text("This component accepts one slot ");
				t32 = text(ctx.inputSlotExample);
				t33 = text(".");
				t34 = space();
				div2 = element("div");
				code = element("code");
				pre = element("pre");
				t35 = text(ctx.example);
				t36 = text("\n\t\twill produce the following:\n\t\t");
				div1 = element("div");
				zoo_select = element("zoo-select");
				select = element("select");
				option0 = element("option");
				option0.textContent = "Placeholder";
				option1 = element("option");
				option1.textContent = "1";
				option2 = element("option");
				option2.textContent = "2";
				option3 = element("option");
				option3.textContent = "3";
				this.c = noop;
				set_custom_element_data(app_context, "text", "Select component API.");
				add_location(app_context, file$h, 2, 0, 53);
				add_location(b0, file$h, 9, 6, 267);
				add_location(b1, file$h, 9, 55, 316);
				add_location(b2, file$h, 9, 67, 328);
				add_location(b3, file$h, 9, 91, 352);
				add_location(li0, file$h, 8, 5, 256);
				add_location(b4, file$h, 12, 6, 390);
				add_location(li1, file$h, 11, 5, 379);
				add_location(b5, file$h, 15, 6, 483);
				add_location(li2, file$h, 14, 5, 472);
				add_location(b6, file$h, 18, 6, 564);
				add_location(li3, file$h, 17, 5, 553);
				add_location(b7, file$h, 21, 6, 636);
				add_location(b8, file$h, 21, 64, 694);
				add_location(li4, file$h, 20, 5, 625);
				add_location(b9, file$h, 24, 6, 740);
				add_location(li5, file$h, 23, 5, 729);
				add_location(b10, file$h, 27, 6, 851);
				add_location(li6, file$h, 26, 5, 840);
				add_location(b11, file$h, 30, 6, 933);
				add_location(li7, file$h, 29, 5, 922);
				add_location(ul, file$h, 7, 4, 246);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$h, 6, 3, 201);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$h, 34, 3, 1059);
				add_location(zoo_collapsable_list, file$h, 5, 2, 158);
				div0.className = "list";
				add_location(div0, file$h, 4, 1, 137);
				add_location(pre, file$h, 40, 8, 1253);
				add_location(code, file$h, 40, 2, 1247);
				option0.className = "placeholder";
				option0.__value = "";
				option0.value = option0.__value;
				option0.disabled = true;
				option0.selected = true;
				add_location(option0, file$h, 45, 5, 1477);
				option1.__value = "1";
				option1.value = option1.__value;
				add_location(option1, file$h, 46, 5, 1558);
				option2.__value = "2";
				option2.value = option2.__value;
				add_location(option2, file$h, 47, 5, 1582);
				option3.__value = "3";
				option3.value = option3.__value;
				add_location(option3, file$h, 48, 5, 1606);
				attr(select, "slot", "selectelement");
				add_location(select, file$h, 44, 4, 1442);
				set_custom_element_data(zoo_select, "labeltext", "Select label");
				set_custom_element_data(zoo_select, "infotext", "Additional helpful information for our users");
				add_location(zoo_select, file$h, 43, 3, 1344);
				set_style(div1, "width", "250px");
				add_location(div1, file$h, 42, 2, 1313);
				div2.className = "example";
				add_location(div2, file$h, 39, 1, 1223);
				div3.className = "doc-element";
				add_location(div3, file$h, 3, 0, 110);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div3, anchor);
				append(div3, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(li0, b1);
				append(li0, t4);
				append(li0, b2);
				append(li0, t6);
				append(li0, b3);
				append(ul, t8);
				append(ul, li1);
				append(li1, b4);
				append(li1, t10);
				append(ul, t11);
				append(ul, li2);
				append(li2, b5);
				append(li2, t13);
				append(ul, t14);
				append(ul, li3);
				append(li3, b6);
				append(li3, t16);
				append(ul, t17);
				append(ul, li4);
				append(li4, b7);
				append(li4, t19);
				append(li4, b8);
				append(ul, t21);
				append(ul, li5);
				append(li5, b9);
				append(li5, t23);
				append(ul, t24);
				append(ul, li6);
				append(li6, b10);
				append(li6, t26);
				append(ul, t27);
				append(ul, li7);
				append(li7, b11);
				append(li7, t29);
				append(zoo_collapsable_list, t30);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				append(zoo_collapsable_list_item1, t31);
				append(zoo_collapsable_list_item1, t32);
				append(zoo_collapsable_list_item1, t33);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div3, t34);
				append(div3, div2);
				append(div2, code);
				append(code, pre);
				append(pre, t35);
				append(div2, t36);
				append(div2, div1);
				append(div1, zoo_select);
				append(zoo_select, select);
				append(select, option0);
				append(select, option1);
				append(select, option2);
				append(select, option3);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div3);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$h($$self, $$props, $$invalidate) {
		let list;
		let inputSlotExample = `<slot name="selectelement"></slot>`;
		let example = `<div style="width: 250px;">\n  <zoo-select labeltext="Select label" infotext="Additional helpful information for our users">\n    <select slot="selectelement">\n      <option class="placeholder" value="" disabled selected>Placeholder</option>\n      <option>1</option>\n      <option>2</option>\n      <option>3</option>\n    </select>\n  </zoo-select>\n</div>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			inputSlotExample,
			example,
			zoo_collapsable_list_binding
		};
	}

	class SelectDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VsZWN0RG9jcy5zdmVsdGUiLCJzb3VyY2VzIjpbIlNlbGVjdERvY3Muc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJkb2NzLXNlbGVjdFwiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiU2VsZWN0IGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XG5cdFx0XHRcdDx1bD5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5sYWJlbHBvc2l0aW9uPC9iPiAtIGFjY2VwdHMgZm9sbG93aW5nIHZhbHVlczogPGI+dG9wPC9iPiwgPGI+bGVmdDwvYj4uIERlZmF1bHQgaXMgPGI+dG9wPC9iPlxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+bGFiZWx0ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGFzIHRoZSBsYWJlbCBvZiB0aGUgaW5wdXRcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPmxpbmt0ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGFzIGEgbGluayB0ZXh0XG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5saW5raHJlZjwvYj4gLSB3aGVyZSB0aGUgbGluayBzaG91bGQgbGVhZFxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+bGlua3RhcmdldDwvYj4gLSB0YXJnZXQgb2YgdGhlIGFuY2hvciBsaW5rLCBkZWZhdWx0IGlzIDxiPmFib3V0OmJsYW5rPC9iPlxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+aW5wdXRlcnJvcm1zZzwvYj4gLSBlcnJvciBtZXNzYWdlIHRvIGJlIHByZXNlbnRlZCB3aGVuIGlucHV0IGlzIGluIGludmFsaWQgc3RhdGVcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPmluZm90ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGJlbG93IHRoZSBpbnB1dFxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+dmFsaWQ8L2I+IC0gZmxhZyB3aGljaCBpbmRpY2F0ZXMgd2hldGhlciB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90XG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0PC91bD5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMVwiPlxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBhY2NlcHRzIG9uZSBzbG90IHtpbnB1dFNsb3RFeGFtcGxlfS5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cblx0XHR3aWxsIHByb2R1Y2UgdGhlIGZvbGxvd2luZzpcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxuXHRcdFx0PHpvby1zZWxlY3QgbGFiZWx0ZXh0PVwiU2VsZWN0IGxhYmVsXCIgaW5mb3RleHQ9XCJBZGRpdGlvbmFsIGhlbHBmdWwgaW5mb3JtYXRpb24gZm9yIG91ciB1c2Vyc1wiPlxuXHRcdFx0XHQ8c2VsZWN0IHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XG5cdFx0XHRcdFx0PG9wdGlvbiBjbGFzcz1cInBsYWNlaG9sZGVyXCIgdmFsdWU9XCJcIiBkaXNhYmxlZCBzZWxlY3RlZD5QbGFjZWhvbGRlcjwvb3B0aW9uPlxuXHRcdFx0XHRcdDxvcHRpb24+MTwvb3B0aW9uPlxuXHRcdFx0XHRcdDxvcHRpb24+Mjwvb3B0aW9uPlxuXHRcdFx0XHRcdDxvcHRpb24+Mzwvb3B0aW9uPlxuXHRcdFx0XHQ8L3NlbGVjdD5cblx0XHRcdDwvem9vLXNlbGVjdD5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uZG9jLWVsZW1lbnQge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93OyB9XG5cbi5saXN0IHtcbiAgd2lkdGg6IDM1JTtcbiAgbWFyZ2luOiAwIDIwcHg7IH1cblxuLmV4YW1wbGUge1xuICBvdmVyZmxvdzogYXV0bzsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xuXHRsZXQgbGlzdDtcblx0bGV0IGlucHV0U2xvdEV4YW1wbGUgPSBgPHNsb3QgbmFtZT1cInNlbGVjdGVsZW1lbnRcIj48L3Nsb3Q+YDtcblx0bGV0IGV4YW1wbGUgPSBgPGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cXG4gIDx6b28tc2VsZWN0IGxhYmVsdGV4dD1cIlNlbGVjdCBsYWJlbFwiIGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnNcIj5cXG4gICAgPHNlbGVjdCBzbG90PVwic2VsZWN0ZWxlbWVudFwiPlxcbiAgICAgIDxvcHRpb24gY2xhc3M9XCJwbGFjZWhvbGRlclwiIHZhbHVlPVwiXCIgZGlzYWJsZWQgc2VsZWN0ZWQ+UGxhY2Vob2xkZXI8L29wdGlvbj5cXG4gICAgICA8b3B0aW9uPjE8L29wdGlvbj5cXG4gICAgICA8b3B0aW9uPjI8L29wdGlvbj5cXG4gICAgICA8b3B0aW9uPjM8L29wdGlvbj5cXG4gICAgPC9zZWxlY3Q+XFxuICA8L3pvby1zZWxlY3Q+XFxuPC9kaXY+YDtcblx0b25Nb3VudCgoKSA9PiB7XG5cdFx0bGlzdC5pdGVtcyA9IFtcblx0XHRcdHtcblx0XHRcdFx0aGVhZGVyOiAnQVBJJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aGVhZGVyOiAnU2xvdHMnXG5cdFx0XHR9XG5cdFx0XTtcblx0fSk7XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBdUR3QixZQUFZLEFBQUMsQ0FBQyxBQUNwQyxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUV4QixLQUFLLEFBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxHQUFHLENBQ1YsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixRQUFRLEFBQUMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

			init(this, { target: this.shadowRoot }, instance$h, create_fragment$h, safe_not_equal, []);

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

	customElements.define("docs-select", SelectDocs);

	/* src/docs/ToastDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$i = "src/docs/ToastDocs.svelte";

	function create_fragment$i(ctx) {
		var app_context, t0, div2, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, t3, li1, b1, t5, b2, t7, b3, t9, b4, t11, b5, t13, li2, b6, t15, t16, li3, b7, t18, b8, t20, t21, li4, b9, t23, b10, t25, t26, zoo_collapsable_list_item1, t28, div1, code, pre, t29;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div2 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "text";
				t2 = text(" - text to be presented in the toast box");
				t3 = space();
				li1 = element("li");
				b1 = element("b");
				b1.textContent = "type";
				t5 = text(" - type of the toast. Possible values are: ");
				b2 = element("b");
				b2.textContent = "error";
				t7 = text(", ");
				b3 = element("b");
				b3.textContent = "info";
				t9 = text(", ");
				b4 = element("b");
				b4.textContent = "success";
				t11 = text(". Default is ");
				b5 = element("b");
				b5.textContent = "info";
				t13 = space();
				li2 = element("li");
				b6 = element("b");
				b6.textContent = "timeout";
				t15 = text(" - how long the toast should be visible for (in seconds)");
				t16 = space();
				li3 = element("li");
				b7 = element("b");
				b7.textContent = "show()";
				t18 = text(" - ");
				b8 = element("b");
				b8.textContent = "function";
				t20 = text(" to show the toast. Multiple calls to this functions until the toast is hidden will be ignored");
				t21 = space();
				li4 = element("li");
				b9 = element("b");
				b9.textContent = "hide()";
				t23 = text(" - ");
				b10 = element("b");
				b10.textContent = "function";
				t25 = text(" to hide the toast. Multiple calls to this functions until the toast is shown will be ignored");
				t26 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				zoo_collapsable_list_item1.textContent = "This component does not accept slots.";
				t28 = space();
				div1 = element("div");
				code = element("code");
				pre = element("pre");
				t29 = text(ctx.example);
				this.c = noop;
				set_custom_element_data(app_context, "text", "Toast component API.");
				add_location(app_context, file$i, 2, 0, 52);
				add_location(b0, file$i, 9, 6, 265);
				add_location(li0, file$i, 8, 5, 254);
				add_location(b1, file$i, 12, 6, 344);
				add_location(b2, file$i, 12, 60, 398);
				add_location(b3, file$i, 12, 74, 412);
				add_location(b4, file$i, 12, 87, 425);
				add_location(b5, file$i, 12, 114, 452);
				add_location(li1, file$i, 11, 5, 333);
				add_location(b6, file$i, 15, 6, 491);
				add_location(li2, file$i, 14, 5, 480);
				add_location(b7, file$i, 18, 6, 589);
				add_location(b8, file$i, 18, 22, 605);
				add_location(li3, file$i, 17, 5, 578);
				add_location(b9, file$i, 21, 6, 742);
				add_location(b10, file$i, 21, 22, 758);
				add_location(li4, file$i, 20, 5, 731);
				add_location(ul, file$i, 7, 4, 244);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$i, 6, 3, 199);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$i, 25, 3, 923);
				add_location(zoo_collapsable_list, file$i, 5, 2, 156);
				div0.className = "list";
				add_location(div0, file$i, 4, 1, 135);
				add_location(pre, file$i, 31, 8, 1103);
				add_location(code, file$i, 31, 2, 1097);
				div1.className = "example";
				add_location(div1, file$i, 30, 1, 1073);
				div2.className = "doc-element";
				add_location(div2, file$i, 3, 0, 108);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div2, anchor);
				append(div2, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(ul, t3);
				append(ul, li1);
				append(li1, b1);
				append(li1, t5);
				append(li1, b2);
				append(li1, t7);
				append(li1, b3);
				append(li1, t9);
				append(li1, b4);
				append(li1, t11);
				append(li1, b5);
				append(ul, t13);
				append(ul, li2);
				append(li2, b6);
				append(li2, t15);
				append(ul, t16);
				append(ul, li3);
				append(li3, b7);
				append(li3, t18);
				append(li3, b8);
				append(li3, t20);
				append(ul, t21);
				append(ul, li4);
				append(li4, b9);
				append(li4, t23);
				append(li4, b10);
				append(li4, t25);
				append(zoo_collapsable_list, t26);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div2, t28);
				append(div2, div1);
				append(div1, code);
				append(code, pre);
				append(pre, t29);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div2);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$i($$self, $$props, $$invalidate) {
		let list;
		let example = `<zoo-toast type="info" text="This is an info message."></zoo-toast>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			example,
			zoo_collapsable_list_binding
		};
	}

	class ToastDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9hc3REb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiVG9hc3REb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy10b2FzdFwiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiVG9hc3QgY29tcG9uZW50IEFQSS5cIj48L2FwcC1jb250ZXh0PlxuPGRpdiBjbGFzcz1cImRvYy1lbGVtZW50XCI+XG5cdDxkaXYgY2xhc3M9XCJsaXN0XCI+XG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTBcIj5cblx0XHRcdFx0PHVsPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPnRleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgaW4gdGhlIHRvYXN0IGJveFxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+dHlwZTwvYj4gLSB0eXBlIG9mIHRoZSB0b2FzdC4gUG9zc2libGUgdmFsdWVzIGFyZTogPGI+ZXJyb3I8L2I+LCA8Yj5pbmZvPC9iPiwgPGI+c3VjY2VzczwvYj4uIERlZmF1bHQgaXMgPGI+aW5mbzwvYj5cblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPnRpbWVvdXQ8L2I+IC0gaG93IGxvbmcgdGhlIHRvYXN0IHNob3VsZCBiZSB2aXNpYmxlIGZvciAoaW4gc2Vjb25kcylcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPnNob3coKTwvYj4gLSA8Yj5mdW5jdGlvbjwvYj4gdG8gc2hvdyB0aGUgdG9hc3QuIE11bHRpcGxlIGNhbGxzIHRvIHRoaXMgZnVuY3Rpb25zIHVudGlsIHRoZSB0b2FzdCBpcyBoaWRkZW4gd2lsbCBiZSBpZ25vcmVkXG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5oaWRlKCk8L2I+IC0gPGI+ZnVuY3Rpb248L2I+IHRvIGhpZGUgdGhlIHRvYXN0LiBNdWx0aXBsZSBjYWxscyB0byB0aGlzIGZ1bmN0aW9ucyB1bnRpbCB0aGUgdG9hc3QgaXMgc2hvd24gd2lsbCBiZSBpZ25vcmVkXG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0PC91bD5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMVwiPlxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBkb2VzIG5vdCBhY2NlcHQgc2xvdHMuXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0PC96b28tY29sbGFwc2FibGUtbGlzdD5cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XG5cdFx0PGNvZGU+PHByZT57ZXhhbXBsZX08L3ByZT48L2NvZGU+XG5cdDwvZGl2PlxuPC9kaXY+XG5cbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcblx0bGV0IGxpc3Q7XG5cdGxldCBpbnB1dFNsb3RFeGFtcGxlID0gYDxzbG90IG5hbWU9XCJpbnB1dGVsZW1lbnRcIj48L3Nsb3Q+YDtcblx0bGV0IGV4YW1wbGUgPSBgPHpvby10b2FzdCB0eXBlPVwiaW5mb1wiIHRleHQ9XCJUaGlzIGlzIGFuIGluZm8gbWVzc2FnZS5cIj48L3pvby10b2FzdD5gO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRsaXN0Lml0ZW1zID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdBUEknXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcblx0XHRcdH1cblx0XHRdO1xuXHR9KTtcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFtQ3dCLFlBQVksQUFBQyxDQUFDLEFBQ3BDLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBRXhCLEtBQUssQUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBRW5CLFFBQVEsQUFBQyxDQUFDLEFBQ1IsUUFBUSxDQUFFLElBQUksQUFBRSxDQUFDIn0= */</style>`;

			init(this, { target: this.shadowRoot }, instance$i, create_fragment$i, safe_not_equal, []);

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

	customElements.define("docs-toast", ToastDocs);

	/* src/docs/TooltipDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$j = "src/docs/TooltipDocs.svelte";

	function create_fragment$j(ctx) {
		var app_context, t0, div4, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, t3, li1, b1, t5, b2, t7, b3, t9, b4, t11, b5, t13, b6, t15, zoo_collapsable_list_item1, t17, div3, code, pre, t18, t19, div2, zoo_button, div1, t20, zoo_tooltip;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div4 = element("div");
				div0 = element("div");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item0 = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "text";
				t2 = text(" - text to be presented in the toast box");
				t3 = space();
				li1 = element("li");
				b1 = element("b");
				b1.textContent = "position";
				t5 = text(" - Possible values are: ");
				b2 = element("b");
				b2.textContent = "top";
				t7 = text(", ");
				b3 = element("b");
				b3.textContent = "right";
				t9 = text(", ");
				b4 = element("b");
				b4.textContent = "bottom";
				t11 = text(" or ");
				b5 = element("b");
				b5.textContent = "left";
				t13 = text(". Default is ");
				b6 = element("b");
				b6.textContent = "top";
				t15 = space();
				zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
				zoo_collapsable_list_item1.textContent = "This component either renders a unnamed slot or presents text supplied as an attribute.";
				t17 = space();
				div3 = element("div");
				code = element("code");
				pre = element("pre");
				t18 = text(ctx.example);
				t19 = text("\n\t\twill produce the following:\n\t\t");
				div2 = element("div");
				zoo_button = element("zoo-button");
				div1 = element("div");
				t20 = text("Button\n\t\t\t\t\t");
				zoo_tooltip = element("zoo-tooltip");
				this.c = noop;
				set_custom_element_data(app_context, "text", "Tooltip component API.");
				add_location(app_context, file$j, 2, 0, 54);
				add_location(b0, file$j, 9, 6, 269);
				add_location(li0, file$j, 8, 5, 258);
				add_location(b1, file$j, 12, 6, 348);
				add_location(b2, file$j, 12, 45, 387);
				add_location(b3, file$j, 12, 57, 399);
				add_location(b4, file$j, 12, 71, 413);
				add_location(b5, file$j, 12, 88, 430);
				add_location(b6, file$j, 12, 112, 454);
				add_location(li1, file$j, 11, 5, 337);
				add_location(ul, file$j, 7, 4, 248);
				set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
				add_location(zoo_collapsable_list_item0, file$j, 6, 3, 203);
				set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
				add_location(zoo_collapsable_list_item1, file$j, 16, 3, 521);
				add_location(zoo_collapsable_list, file$j, 5, 2, 160);
				div0.className = "list";
				add_location(div0, file$j, 4, 1, 139);
				add_location(pre, file$j, 22, 8, 751);
				add_location(code, file$j, 22, 2, 745);
				set_custom_element_data(zoo_tooltip, "text", "Tooltip text");
				add_location(zoo_tooltip, file$j, 28, 5, 943);
				attr(div1, "slot", "buttoncontent");
				add_location(div1, file$j, 26, 4, 899);
				zoo_button.className = "top-tooltip";
				add_location(zoo_button, file$j, 25, 3, 862);
				set_style(div2, "width", "250px");
				set_style(div2, "margin-bottom", "2px");
				add_location(div2, file$j, 24, 2, 811);
				div3.className = "example";
				add_location(div3, file$j, 21, 1, 721);
				div4.className = "doc-element";
				add_location(div4, file$j, 3, 0, 112);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div4, anchor);
				append(div4, div0);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item0);
				append(zoo_collapsable_list_item0, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t2);
				append(ul, t3);
				append(ul, li1);
				append(li1, b1);
				append(li1, t5);
				append(li1, b2);
				append(li1, t7);
				append(li1, b3);
				append(li1, t9);
				append(li1, b4);
				append(li1, t11);
				append(li1, b5);
				append(li1, t13);
				append(li1, b6);
				append(zoo_collapsable_list, t15);
				append(zoo_collapsable_list, zoo_collapsable_list_item1);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div4, t17);
				append(div4, div3);
				append(div3, code);
				append(code, pre);
				append(pre, t18);
				append(div3, t19);
				append(div3, div2);
				append(div2, zoo_button);
				append(zoo_button, div1);
				append(div1, t20);
				append(div1, zoo_tooltip);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div4);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$j($$self, $$props, $$invalidate) {
		let list;
		let example = `<div style="width: 250px;">\n  <zoo-button>\n    <div slot="buttoncontent">\n      Button\n      <zoo-tooltip text="Tooltip text"></zoo-tooltip>\n    </div>\n  </zoo-button>\n</div>`;
		onMount(() => {
			list.items = [
				{
					header: 'API'
				},
				{
					header: 'Slots'
				}
			]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			example,
			zoo_collapsable_list_binding
		};
	}

	class TooltipDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}zoo-tooltip{display:none}.top-tooltip:hover zoo-tooltip{display:block}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHRpcERvY3Muc3ZlbHRlIiwic291cmNlcyI6WyJUb29sdGlwRG9jcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRvY3MtdG9vbHRpcFwiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiVG9vbHRpcCBjb21wb25lbnQgQVBJLlwiPjwvYXBwLWNvbnRleHQ+XG48ZGl2IGNsYXNzPVwiZG9jLWVsZW1lbnRcIj5cblx0PGRpdiBjbGFzcz1cImxpc3RcIj5cblx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtsaXN0fT5cblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMFwiPlxuXHRcdFx0XHQ8dWw+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+dGV4dDwvYj4gLSB0ZXh0IHRvIGJlIHByZXNlbnRlZCBpbiB0aGUgdG9hc3QgYm94XG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj5wb3NpdGlvbjwvYj4gLSBQb3NzaWJsZSB2YWx1ZXMgYXJlOiA8Yj50b3A8L2I+LCA8Yj5yaWdodDwvYj4sIDxiPmJvdHRvbTwvYj4gb3IgPGI+bGVmdDwvYj4uIERlZmF1bHQgaXMgPGI+dG9wPC9iPlxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdDwvdWw+XG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTFcIj5cblx0XHRcdFx0VGhpcyBjb21wb25lbnQgZWl0aGVyIHJlbmRlcnMgYSB1bm5hbWVkIHNsb3Qgb3IgcHJlc2VudHMgdGV4dCBzdXBwbGllZCBhcyBhbiBhdHRyaWJ1dGUuXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XG5cdFx0PC96b28tY29sbGFwc2FibGUtbGlzdD5cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XG5cdFx0PGNvZGU+PHByZT57ZXhhbXBsZX08L3ByZT48L2NvZGU+XG5cdFx0d2lsbCBwcm9kdWNlIHRoZSBmb2xsb3dpbmc6XG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDsgbWFyZ2luLWJvdHRvbTogMnB4O1wiPlxuXHRcdFx0PHpvby1idXR0b24gY2xhc3M9XCJ0b3AtdG9vbHRpcFwiPlxuXHRcdFx0XHQ8ZGl2IHNsb3Q9XCJidXR0b25jb250ZW50XCI+XG5cdFx0XHRcdFx0QnV0dG9uXG5cdFx0XHRcdFx0PHpvby10b29sdGlwIHRleHQ9XCJUb29sdGlwIHRleHRcIj48L3pvby10b29sdGlwPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvem9vLWJ1dHRvbj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uZG9jLWVsZW1lbnQge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93OyB9XG5cbi5saXN0IHtcbiAgd2lkdGg6IDM1JTtcbiAgbWFyZ2luOiAwIDIwcHg7IH1cblxuLmV4YW1wbGUge1xuICBvdmVyZmxvdzogYXV0bzsgfVxuXG56b28tdG9vbHRpcCB7XG4gIGRpc3BsYXk6IG5vbmU7IH1cblxuLnRvcC10b29sdGlwOmhvdmVyIHpvby10b29sdGlwIHtcbiAgZGlzcGxheTogYmxvY2s7IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcblx0bGV0IGxpc3Q7XG5cdGxldCBpbnB1dFNsb3RFeGFtcGxlID0gYDxzbG90IG5hbWU9XCJpbnB1dGVsZW1lbnRcIj48L3Nsb3Q+YDtcblx0bGV0IGV4YW1wbGUgPSBgPGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cXG4gIDx6b28tYnV0dG9uPlxcbiAgICA8ZGl2IHNsb3Q9XCJidXR0b25jb250ZW50XCI+XFxuICAgICAgQnV0dG9uXFxuICAgICAgPHpvby10b29sdGlwIHRleHQ9XCJUb29sdGlwIHRleHRcIj48L3pvby10b29sdGlwPlxcbiAgICA8L2Rpdj5cXG4gIDwvem9vLWJ1dHRvbj5cXG48L2Rpdj5gO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRsaXN0Lml0ZW1zID0gW1xuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdBUEknXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcblx0XHRcdH1cblx0XHRdO1xuXHR9KTtcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFtQ3dCLFlBQVksQUFBQyxDQUFDLEFBQ3BDLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBRXhCLEtBQUssQUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBRW5CLFFBQVEsQUFBQyxDQUFDLEFBQ1IsUUFBUSxDQUFFLElBQUksQUFBRSxDQUFDLEFBRW5CLFdBQVcsQUFBQyxDQUFDLEFBQ1gsT0FBTyxDQUFFLElBQUksQUFBRSxDQUFDLEFBRWxCLFlBQVksTUFBTSxDQUFDLFdBQVcsQUFBQyxDQUFDLEFBQzlCLE9BQU8sQ0FBRSxLQUFLLEFBQUUsQ0FBQyJ9 */</style>`;

			init(this, { target: this.shadowRoot }, instance$j, create_fragment$j, safe_not_equal, []);

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

	customElements.define("docs-tooltip", TooltipDocs);

	/* src/docs/ThemingDocs.svelte generated by Svelte v3.0.0-beta.20 */

	const file$k = "src/docs/ThemingDocs.svelte";

	function create_fragment$k(ctx) {
		var app_context, t0, div2, div0, t1, a, t3, zoo_collapsable_list, zoo_collapsable_list_item, ul, li0, b0, t5, t6, li1, b1, t8, t9, li2, b2, t11, t12, li3, b3, t14, t15, li4, b4, t17, t18, li5, b5, t20, t21, div1, t22, code0, pre0, t23, t24, code1, pre1, t25;

		return {
			c: function create() {
				app_context = element("app-context");
				t0 = space();
				div2 = element("div");
				div0 = element("div");
				t1 = text("Theming can be achieved by using CSS Custom Properties ");
				a = element("a");
				a.textContent = "docs";
				t3 = text(".\n\t\tAPI describes possible variables which are understood by the library.\n\t\t");
				zoo_collapsable_list = element("zoo-collapsable-list");
				zoo_collapsable_list_item = element("zoo-collapsable-list-item");
				ul = element("ul");
				li0 = element("li");
				b0 = element("b");
				b0.textContent = "--main-color";
				t5 = text(" -");
				t6 = space();
				li1 = element("li");
				b1 = element("b");
				b1.textContent = "--main-color-light";
				t8 = text(" -");
				t9 = space();
				li2 = element("li");
				b2 = element("b");
				b2.textContent = "--main-color-dark";
				t11 = text(" -");
				t12 = space();
				li3 = element("li");
				b3 = element("b");
				b3.textContent = "--secondary-color";
				t14 = text(" -");
				t15 = space();
				li4 = element("li");
				b4 = element("b");
				b4.textContent = "--secondary-color-light";
				t17 = text(" -");
				t18 = space();
				li5 = element("li");
				b5 = element("b");
				b5.textContent = "--secondary-color-dark";
				t20 = text(" -");
				t21 = space();
				div1 = element("div");
				t22 = text("Example with a preprocessor:\n\t\t");
				code0 = element("code");
				pre0 = element("pre");
				t23 = text(ctx.exampleScss);
				t24 = text("\n\t\tExample with pure css:\n\t\t");
				code1 = element("code");
				pre1 = element("pre");
				t25 = text(ctx.exampleCss);
				this.c = noop;
				set_custom_element_data(app_context, "text", "Theming API.");
				add_location(app_context, file$k, 2, 0, 54);
				a.href = "https://developer.mozilla.org/en-US/docs/Web/CSS/--*";
				a.target = "about:blank";
				add_location(a, file$k, 5, 57, 205);
				add_location(b0, file$k, 11, 6, 482);
				add_location(li0, file$k, 10, 5, 471);
				add_location(b1, file$k, 14, 6, 532);
				add_location(li1, file$k, 13, 5, 521);
				add_location(b2, file$k, 17, 6, 588);
				add_location(li2, file$k, 16, 5, 577);
				add_location(b3, file$k, 20, 6, 643);
				add_location(li3, file$k, 19, 5, 632);
				add_location(b4, file$k, 23, 6, 698);
				add_location(li4, file$k, 22, 5, 687);
				add_location(b5, file$k, 26, 6, 759);
				add_location(li5, file$k, 25, 5, 748);
				add_location(ul, file$k, 9, 4, 461);
				set_custom_element_data(zoo_collapsable_list_item, "slot", "item0");
				add_location(zoo_collapsable_list_item, file$k, 8, 3, 416);
				add_location(zoo_collapsable_list, file$k, 7, 2, 373);
				div0.className = "list";
				add_location(div0, file$k, 4, 1, 129);
				add_location(pre0, file$k, 34, 8, 941);
				add_location(code0, file$k, 34, 2, 935);
				add_location(pre1, file$k, 36, 8, 1006);
				add_location(code1, file$k, 36, 2, 1000);
				div1.className = "example";
				add_location(div1, file$k, 32, 1, 880);
				div2.className = "doc-element";
				add_location(div2, file$k, 3, 0, 102);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, app_context, anchor);
				insert(target, t0, anchor);
				insert(target, div2, anchor);
				append(div2, div0);
				append(div0, t1);
				append(div0, a);
				append(div0, t3);
				append(div0, zoo_collapsable_list);
				append(zoo_collapsable_list, zoo_collapsable_list_item);
				append(zoo_collapsable_list_item, ul);
				append(ul, li0);
				append(li0, b0);
				append(li0, t5);
				append(ul, t6);
				append(ul, li1);
				append(li1, b1);
				append(li1, t8);
				append(ul, t9);
				append(ul, li2);
				append(li2, b2);
				append(li2, t11);
				append(ul, t12);
				append(ul, li3);
				append(li3, b3);
				append(li3, t14);
				append(ul, t15);
				append(ul, li4);
				append(li4, b4);
				append(li4, t17);
				append(ul, t18);
				append(ul, li5);
				append(li5, b5);
				append(li5, t20);
				add_binding_callback(() => ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null));
				append(div2, t21);
				append(div2, div1);
				append(div1, t22);
				append(div1, code0);
				append(code0, pre0);
				append(pre0, t23);
				append(div1, t24);
				append(div1, code1);
				append(code1, pre1);
				append(pre1, t25);
			},

			p: function update(changed, ctx) {
				if (changed.items) {
					ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
					ctx.zoo_collapsable_list_binding(zoo_collapsable_list, null);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(app_context);
					detach(t0);
					detach(div2);
				}

				ctx.zoo_collapsable_list_binding(null, zoo_collapsable_list);
			}
		};
	}

	function instance$k($$self, $$props, $$invalidate) {
		let list;
		let exampleScss = `@import "variables";\n:root {\n  --main-color: #{$main-color};\n  --main-color-light: #{$main-color-light};\n  --main-color-dark: #{$main-color-dark};\n  --secondary-color: #{$secondary-color};\n  --secondary-color-light: #{$secondary-color-light};\n  --secondary-color-dark: #{$secondary-color-dark};\n}`;
		let exampleCss = `:root {\n  --main-color: #040C40;\n  --main-color-light: #040C40;\n  --main-color-dark: #020729;\n  --secondary-color: #5D4200;\n  --secondary-color-light: #745300;\n  --secondary-color-dark: #3B2B00;\n}`;
		onMount(() => {
			list.items = [{header: 'API'}]; $$invalidate('list', list);
		});

		function zoo_collapsable_list_binding($$node, check) {
			list = $$node;
			$$invalidate('list', list);
		}

		return {
			list,
			exampleScss,
			exampleCss,
			zoo_collapsable_list_binding
		};
	}

	class ThemingDocs extends SvelteElement {
		constructor(options) {
			super();

			this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGhlbWluZ0RvY3Muc3ZlbHRlIiwic291cmNlcyI6WyJUaGVtaW5nRG9jcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRvY3MtdGhlbWluZ1wiPjwvc3ZlbHRlOm9wdGlvbnM+XG5cbjxhcHAtY29udGV4dCB0ZXh0PVwiVGhlbWluZyBBUEkuXCI+PC9hcHAtY29udGV4dD5cbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxuXHRcdFRoZW1pbmcgY2FuIGJlIGFjaGlldmVkIGJ5IHVzaW5nIENTUyBDdXN0b20gUHJvcGVydGllcyA8YSBocmVmPVwiaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQ1NTLy0tKlwiIHRhcmdldD1cImFib3V0OmJsYW5rXCI+ZG9jczwvYT4uXG5cdFx0QVBJIGRlc2NyaWJlcyBwb3NzaWJsZSB2YXJpYWJsZXMgd2hpY2ggYXJlIHVuZGVyc3Rvb2QgYnkgdGhlIGxpYnJhcnkuXG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTBcIj5cblx0XHRcdFx0PHVsPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPi0tbWFpbi1jb2xvcjwvYj4gLSBcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPi0tbWFpbi1jb2xvci1saWdodDwvYj4gLSBcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPi0tbWFpbi1jb2xvci1kYXJrPC9iPiAtIFxuXHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0PGxpPlxuXHRcdFx0XHRcdFx0PGI+LS1zZWNvbmRhcnktY29sb3I8L2I+IC0gXG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0XHQ8bGk+XG5cdFx0XHRcdFx0XHQ8Yj4tLXNlY29uZGFyeS1jb2xvci1saWdodDwvYj4gLSBcblx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdDxsaT5cblx0XHRcdFx0XHRcdDxiPi0tc2Vjb25kYXJ5LWNvbG9yLWRhcms8L2I+IC0gXG5cdFx0XHRcdFx0PC9saT5cblx0XHRcdFx0PC91bD5cblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cblx0XHRFeGFtcGxlIHdpdGggYSBwcmVwcm9jZXNzb3I6XG5cdFx0PGNvZGU+PHByZT57ZXhhbXBsZVNjc3N9PC9wcmU+PC9jb2RlPlxuXHRcdEV4YW1wbGUgd2l0aCBwdXJlIGNzczpcblx0XHQ8Y29kZT48cHJlPntleGFtcGxlQ3NzfTwvcHJlPjwvY29kZT5cblx0PC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uZG9jLWVsZW1lbnQge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93OyB9XG5cbi5saXN0IHtcbiAgd2lkdGg6IDM1JTtcbiAgbWFyZ2luOiAwIDIwcHg7IH1cblxuLmV4YW1wbGUge1xuICBvdmVyZmxvdzogYXV0bzsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5pbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcblx0bGV0IGxpc3Q7XG5cdGxldCBleGFtcGxlU2NzcyA9IGBAaW1wb3J0IFwidmFyaWFibGVzXCI7XFxuOnJvb3Qge1xcbiAgLS1tYWluLWNvbG9yOiAjeyRtYWluLWNvbG9yfTtcXG4gIC0tbWFpbi1jb2xvci1saWdodDogI3skbWFpbi1jb2xvci1saWdodH07XFxuICAtLW1haW4tY29sb3ItZGFyazogI3skbWFpbi1jb2xvci1kYXJrfTtcXG4gIC0tc2Vjb25kYXJ5LWNvbG9yOiAjeyRzZWNvbmRhcnktY29sb3J9O1xcbiAgLS1zZWNvbmRhcnktY29sb3ItbGlnaHQ6ICN7JHNlY29uZGFyeS1jb2xvci1saWdodH07XFxuICAtLXNlY29uZGFyeS1jb2xvci1kYXJrOiAjeyRzZWNvbmRhcnktY29sb3ItZGFya307XFxufWA7XG5cdGxldCBleGFtcGxlQ3NzID0gYDpyb290IHtcXG4gIC0tbWFpbi1jb2xvcjogIzA0MEM0MDtcXG4gIC0tbWFpbi1jb2xvci1saWdodDogIzA0MEM0MDtcXG4gIC0tbWFpbi1jb2xvci1kYXJrOiAjMDIwNzI5O1xcbiAgLS1zZWNvbmRhcnktY29sb3I6ICM1RDQyMDA7XFxuICAtLXNlY29uZGFyeS1jb2xvci1saWdodDogIzc0NTMwMDtcXG4gIC0tc2Vjb25kYXJ5LWNvbG9yLWRhcms6ICMzQjJCMDA7XFxufWA7XG5cdG9uTW91bnQoKCkgPT4ge1xuXHRcdGxpc3QuaXRlbXMgPSBbe2hlYWRlcjogJ0FQSSd9XTtcblx0fSk7XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBd0N3QixZQUFZLEFBQUMsQ0FBQyxBQUNwQyxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUV4QixLQUFLLEFBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxHQUFHLENBQ1YsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixRQUFRLEFBQUMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

			init(this, { target: this.shadowRoot }, instance$k, create_fragment$k, safe_not_equal, []);

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

	customElements.define("docs-theming", ThemingDocs);

}());
//# sourceMappingURL=bundle-docs.js.map
