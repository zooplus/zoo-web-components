(function () {
    'use strict';

    function noop() { }
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
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
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
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_style(node, key, value) {
        node.style.setProperty(key, value);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
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
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
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
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
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
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set() {
                // overridden by instance, if it has props
            }
        };
    }

    /* src\common\Context.svelte generated by Svelte v3.9.0 */

    const file = "src\\common\\Context.svelte";

    // (4:1) {#if backbtn}
    function create_if_block(ctx) {
    	var div, zoo_button, span, a;

    	return {
    		c: function create() {
    			div = element("div");
    			zoo_button = element("zoo-button");
    			span = element("span");
    			a = element("a");
    			a.textContent = "Go to top";
    			attr(a, "href", "#");
    			add_location(a, file, 6, 31, 184);
    			attr(span, "slot", "buttoncontent");
    			add_location(span, file, 6, 4, 157);
    			add_location(zoo_button, file, 5, 3, 139);
    			attr(div, "class", "back-btn");
    			add_location(div, file, 4, 2, 112);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, zoo_button);
    			append(zoo_button, span);
    			append(span, a);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    function create_fragment(ctx) {
    	var div, h2, t0, t1;

    	var if_block = (ctx.backbtn) && create_if_block();

    	return {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text(ctx.text);
    			t1 = space();
    			if (if_block) if_block.c();
    			this.c = noop;
    			add_location(h2, file, 2, 1, 77);
    			attr(div, "class", "context");
    			add_location(div, file, 1, 0, 53);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h2);
    			append(h2, t0);
    			append(div, t1);
    			if (if_block) if_block.m(div, null);
    		},

    		p: function update(changed, ctx) {
    			if (changed.text) {
    				set_data(t0, ctx.text);
    			}

    			if (ctx.backbtn) {
    				if (!if_block) {
    					if_block = create_if_block();
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { text = '', backbtn = false } = $$props;

    	const writable_props = ['text', 'backbtn'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<app-context> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('text' in $$props) $$invalidate('text', text = $$props.text);
    		if ('backbtn' in $$props) $$invalidate('backbtn', backbtn = $$props.backbtn);
    	};

    	return { text, backbtn };
    }

    class Context extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>.context{min-height:80px;display:flex;align-items:center;margin-left:20px;background:white}.back-btn{margin-left:5px}.back-btn a{text-decoration:none;color:white}h2{color:var(--main-color, #3C9700)}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udGV4dC5zdmVsdGUiLCJzb3VyY2VzIjpbIkNvbnRleHQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJhcHAtY29udGV4dFwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcbjxkaXYgY2xhc3M9XCJjb250ZXh0XCI+XHJcblx0PGgyPnt0ZXh0fTwvaDI+XHJcblx0eyNpZiBiYWNrYnRufVxyXG5cdFx0PGRpdiBjbGFzcz1cImJhY2stYnRuXCI+XHJcblx0XHRcdDx6b28tYnV0dG9uPlxyXG5cdFx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+PGEgaHJlZj1cIiNcIj5HbyB0byB0b3A8L2E+PC9zcGFuPlxyXG5cdFx0XHQ8L3pvby1idXR0b24+XHJcblx0XHQ8L2Rpdj5cclxuXHR7L2lmfVxyXG48L2Rpdj5cclxuXHJcbjxzdHlsZT5cclxuXHQuY29udGV4dCB7XHJcblx0XHRtaW4taGVpZ2h0OiA4MHB4O1xyXG5cdFx0ZGlzcGxheTogZmxleDtcclxuXHRcdGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcblx0XHRtYXJnaW4tbGVmdDogMjBweDtcclxuXHRcdGJhY2tncm91bmQ6IHdoaXRlO1xyXG5cdH1cclxuXHJcblx0LmJhY2stYnRuIHtcclxuXHRcdG1hcmdpbi1sZWZ0OiA1cHg7XHJcblx0fVxyXG5cdFxyXG5cdC5iYWNrLWJ0biBhIHtcclxuXHRcdHRleHQtZGVjb3JhdGlvbjogbm9uZTtcclxuXHRcdGNvbG9yOiB3aGl0ZTtcclxuXHR9XHJcblxyXG5cdGgyIHtcclxuXHRcdGNvbG9yOiB2YXIoLS1tYWluLWNvbG9yLCAjM0M5NzAwKTtcclxuXHR9XHJcbjwvc3R5bGU+XHJcblxyXG48c2NyaXB0PiBcclxuXHRleHBvcnQgbGV0IHRleHQgPSAnJztcclxuXHRleHBvcnQgbGV0IGJhY2tidG4gPSBmYWxzZTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWFDLFFBQVEsQUFBQyxDQUFDLEFBQ1QsVUFBVSxDQUFFLElBQUksQ0FDaEIsT0FBTyxDQUFFLElBQUksQ0FDYixXQUFXLENBQUUsTUFBTSxDQUNuQixXQUFXLENBQUUsSUFBSSxDQUNqQixVQUFVLENBQUUsS0FBSyxBQUNsQixDQUFDLEFBRUQsU0FBUyxBQUFDLENBQUMsQUFDVixXQUFXLENBQUUsR0FBRyxBQUNqQixDQUFDLEFBRUQsU0FBUyxDQUFDLENBQUMsQUFBQyxDQUFDLEFBQ1osZUFBZSxDQUFFLElBQUksQ0FDckIsS0FBSyxDQUFFLEtBQUssQUFDYixDQUFDLEFBRUQsRUFBRSxBQUFDLENBQUMsQUFDSCxLQUFLLENBQUUsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLEFBQ2xDLENBQUMifQ== */</style>`;

    		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, ["text", "backbtn"]);

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
    		return ["text","backbtn"];
    	}

    	get text() {
    		return this.$$.ctx.text;
    	}

    	set text(text) {
    		this.$set({ text });
    		flush();
    	}

    	get backbtn() {
    		return this.$$.ctx.backbtn;
    	}

    	set backbtn(backbtn) {
    		this.$set({ backbtn });
    		flush();
    	}
    }

    customElements.define("app-context", Context);

    /* src\sections\Header.svelte generated by Svelte v3.9.0 */

    const file$1 = "src\\sections\\Header.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.link = list[i];
    	return child_ctx;
    }

    // (24:3) {#each navlinks as link}
    function create_each_block(ctx) {
    	var div, a, t0_value = ctx.link.text + "", t0, a_href_value, t1;

    	return {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr(a, "href", a_href_value = ctx.link.href);
    			add_location(a, file$1, 25, 5, 1033);
    			attr(div, "class", "nav-link");
    			add_location(div, file$1, 24, 4, 1004);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, a);
    			append(a, t0);
    			append(div, t1);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var header, zoo_header, div3, div0, zoo_button0, span0, zoo_button0_type_value, t1, div1, zoo_button1, span1, zoo_button1_type_value, t3, div2, zoo_button2, span2, zoo_button2_type_value, t5, zoo_navigation, div4, dispose;

    	var each_value = ctx.navlinks;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c: function create() {
    			header = element("header");
    			zoo_header = element("zoo-header");
    			div3 = element("div");
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
    			div2 = element("div");
    			zoo_button2 = element("zoo-button");
    			span2 = element("span");
    			span2.textContent = "Random theme";
    			t5 = space();
    			zoo_navigation = element("zoo-navigation");
    			div4 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.c = noop;
    			attr(span0, "slot", "buttoncontent");
    			attr(span0, "class", "slotted-span");
    			add_location(span0, file$1, 6, 5, 310);
    			set_custom_element_data(zoo_button0, "type", zoo_button0_type_value = ctx.theme === 'zoo' ? 'hot' : 'cold');
    			set_custom_element_data(zoo_button0, "size", "medium");
    			add_location(zoo_button0, file$1, 5, 4, 199);
    			attr(div0, "class", "header-button");
    			add_location(div0, file$1, 4, 3, 166);
    			attr(span1, "slot", "buttoncontent");
    			attr(span1, "class", "slotted-span");
    			add_location(span1, file$1, 11, 5, 556);
    			set_custom_element_data(zoo_button1, "type", zoo_button1_type_value = ctx.theme === 'grey' ? 'hot' : 'cold');
    			set_custom_element_data(zoo_button1, "size", "medium");
    			add_location(zoo_button1, file$1, 10, 4, 443);
    			attr(div1, "class", "header-button");
    			add_location(div1, file$1, 9, 3, 410);
    			attr(span2, "slot", "buttoncontent");
    			attr(span2, "class", "slotted-span");
    			add_location(span2, file$1, 16, 5, 806);
    			set_custom_element_data(zoo_button2, "type", zoo_button2_type_value = ctx.theme === 'random' ? 'hot' : 'cold');
    			set_custom_element_data(zoo_button2, "size", "medium");
    			add_location(zoo_button2, file$1, 15, 4, 689);
    			attr(div2, "class", "header-button");
    			add_location(div2, file$1, 14, 3, 656);
    			attr(div3, "class", "buttons-holder");
    			add_location(div3, file$1, 3, 2, 133);
    			set_custom_element_data(zoo_header, "imgsrc", "logo.png");
    			set_custom_element_data(zoo_header, "headertext", "Zooplus web components");
    			add_location(zoo_header, file$1, 2, 1, 63);
    			add_location(div4, file$1, 22, 2, 964);
    			set_custom_element_data(zoo_navigation, "class", "nav");
    			add_location(zoo_navigation, file$1, 21, 1, 932);
    			add_location(header, file$1, 1, 0, 52);

    			dispose = [
    				listen(zoo_button0, "click", ctx.click_handler),
    				listen(zoo_button1, "click", ctx.click_handler_1),
    				listen(zoo_button2, "click", ctx.click_handler_2)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, header, anchor);
    			append(header, zoo_header);
    			append(zoo_header, div3);
    			append(div3, div0);
    			append(div0, zoo_button0);
    			append(zoo_button0, span0);
    			append(div3, t1);
    			append(div3, div1);
    			append(div1, zoo_button1);
    			append(zoo_button1, span1);
    			append(div3, t3);
    			append(div3, div2);
    			append(div2, zoo_button2);
    			append(zoo_button2, span2);
    			append(header, t5);
    			append(header, zoo_navigation);
    			append(zoo_navigation, div4);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if ((changed.theme) && zoo_button0_type_value !== (zoo_button0_type_value = ctx.theme === 'zoo' ? 'hot' : 'cold')) {
    				set_custom_element_data(zoo_button0, "type", zoo_button0_type_value);
    			}

    			if ((changed.theme) && zoo_button1_type_value !== (zoo_button1_type_value = ctx.theme === 'grey' ? 'hot' : 'cold')) {
    				set_custom_element_data(zoo_button1, "type", zoo_button1_type_value);
    			}

    			if ((changed.theme) && zoo_button2_type_value !== (zoo_button2_type_value = ctx.theme === 'random' ? 'hot' : 'cold')) {
    				set_custom_element_data(zoo_button2, "type", zoo_button2_type_value);
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
    						each_blocks[i].m(div4, null);
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
    			text: 'What is this project?'
    		},
    		{
    			href: '#when',
    			text: 'When can I use it?'
    		},
    		{
    			href: '#how',
    			text: 'How can I use it?'
    		}
    	];

    	const changeTheme = (pallete) => {
    		$$invalidate('theme', theme = pallete);
    		switch (pallete) {
    			case 'zoo':
    				setColorVar('--main-color', '#3C9700');
    				setColorVar('--main-color-light', '#66B100');
    				setColorVar('--main-color-dark', '#286400');
    				setColorVar('--secondary-color', '#FF6200');
    				setColorVar('--secondary-color-light', '#FF8800');
    				setColorVar('--secondary-color-dark', '#CC4E00');
    				break;
    			case 'grey':
    				setColorVar('--main-color', '#676778');
    				setColorVar('--main-color-light', '#838399');
    				setColorVar('--main-color-dark', '#565664');
    				setColorVar('--secondary-color', '#ff3e00');
    				setColorVar('--secondary-color-light', '#ff794d');
    				setColorVar('--secondary-color-dark', '#c53100');
    				break;
    			case 'black':
    				setColorVar('--main-color', '#20232a');
    				setColorVar('--main-color-light', '#3b414e');
    				setColorVar('--main-color-dark', '#0e1013');
    				setColorVar('--secondary-color', '#1cb11c');
    				setColorVar('--secondary-color-light', '#39d639');
    				setColorVar('--secondary-color-dark', '#157915');
    				break;
    			default:
    				break;
    		}
    	};

    	const setColorVar = (name, value) => {
    		document.documentElement.style.setProperty(name, value);
    	};

    	const generateRandomTheme = () => {
    		$$invalidate('theme', theme = 'random');
    		const main = randomRgbaString();
    		const mainHex = rgbToHex(main.r, main.g, main.b);
    		setColorVar('--main-color', mainHex);
    		setColorVar('--main-color-light', lightenDarkenColor(mainHex, 30));
    		setColorVar('--main-color-dark', lightenDarkenColor(mainHex, -30));
    		const second = randomRgbaString();
    		const secondHex = rgbToHex(second.r, second.g, second.b);
    		setColorVar('--secondary-color', rgbToHex(second.r, second.g, second.b));
    		setColorVar('--secondary-color-light', lightenDarkenColor(secondHex, 30));
    		setColorVar('--secondary-color-dark', lightenDarkenColor(secondHex, -30));
    	};

    	const randomRgbaString = () => {
    		let r = Math.floor(Math.random() * 255);
    		let g = Math.floor(Math.random() * 255);
    		let b = Math.floor(Math.random() * 255);
    		return {r: r, g: g, b: b};
    	};

    	const rgbToHex = (r, g, b) => {
        	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    	};

    	const componentToHex = (c) => {
    		let hex = c.toString(16);
    		return hex.length == 1 ? "0" + hex : hex;
    	};

    	const lightenDarkenColor = (col, amt) => {
    	
    		var usePound = false;
    	
    		if (col[0] == "#") {
    			col = col.slice(1);
    			usePound = true;
    		}
    	
    		var num = parseInt(col,16);
    	
    		var r = (num >> 16) + amt;
    	
    		if (r > 255) r = 255;
    		else if  (r < 0) r = 0;
    	
    		var b = ((num >> 8) & 0x00FF) + amt;
    	
    		if (b > 255) b = 255;
    		else if  (b < 0) b = 0;
    	
    		var g = (num & 0x0000FF) + amt;
    	
    		if (g > 255) g = 255;
    		else if (g < 0) g = 0;
    	
    		return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);
    	
    	};

    	function click_handler() {
    		return changeTheme('zoo');
    	}

    	function click_handler_1() {
    		return changeTheme('grey');
    	}

    	function click_handler_2() {
    		return generateRandomTheme();
    	}

    	return {
    		theme,
    		navlinks,
    		changeTheme,
    		generateRandomTheme,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	};
    }

    class Header extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>header{position:relative}.buttons-holder{display:flex;justify-content:flex-end;flex-direction:row;flex-grow:1;padding:0 25px 0 0}.header-button{display:flex;max-width:250px;min-width:140px;margin-left:15px}.header-button zoo-button{align-self:center}@media only screen and (max-width: 544px){.header-button .slotted-span{display:none}}.nav{position:sticky;top:0;color:white;font-size:14px;font-weight:bold;line-height:16px;cursor:pointer}.nav .nav-link{cursor:pointer;display:flex;align-items:center}.nav .nav-link:hover{background:rgba(255, 255, 255, 0.3)}.nav .nav-link a{color:white;text-decoration:none;padding:0 15px}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGVhZGVyLnN2ZWx0ZSIsInNvdXJjZXMiOlsiSGVhZGVyLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiYXBwLWhlYWRlclwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcbjxoZWFkZXI+XHJcblx0PHpvby1oZWFkZXIgaW1nc3JjPVwibG9nby5wbmdcIiBoZWFkZXJ0ZXh0PVwiWm9vcGx1cyB3ZWIgY29tcG9uZW50c1wiPlxyXG5cdFx0PGRpdiBjbGFzcz1cImJ1dHRvbnMtaG9sZGVyXCI+XHJcblx0XHRcdDxkaXYgY2xhc3M9XCJoZWFkZXItYnV0dG9uXCI+XHJcblx0XHRcdFx0PHpvby1idXR0b24gdHlwZT1cInt0aGVtZSA9PT0gJ3pvbycgPyAnaG90JyA6ICdjb2xkJ31cIiBzaXplPVwibWVkaXVtXCIgb246Y2xpY2s9eygpID0+IGNoYW5nZVRoZW1lKCd6b28nKX0+XHJcblx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiIGNsYXNzPVwic2xvdHRlZC1zcGFuXCI+Wm9vKyB0aGVtZTwvc3Bhbj5cclxuXHRcdFx0XHQ8L3pvby1idXR0b24+XHJcblx0XHRcdDwvZGl2PlxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwiaGVhZGVyLWJ1dHRvblwiPlxyXG5cdFx0XHRcdDx6b28tYnV0dG9uIHR5cGU9XCJ7dGhlbWUgPT09ICdncmV5JyA/ICdob3QnIDogJ2NvbGQnfVwiIHNpemU9XCJtZWRpdW1cIiBvbjpjbGljaz17KCkgPT4gY2hhbmdlVGhlbWUoJ2dyZXknKX0+XHJcblx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiIGNsYXNzPVwic2xvdHRlZC1zcGFuXCI+R3JleSB0aGVtZTwvc3Bhbj5cclxuXHRcdFx0XHQ8L3pvby1idXR0b24+XHJcblx0XHRcdDwvZGl2PlxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwiaGVhZGVyLWJ1dHRvblwiPlxyXG5cdFx0XHRcdDx6b28tYnV0dG9uIHR5cGU9XCJ7dGhlbWUgPT09ICdyYW5kb20nID8gJ2hvdCcgOiAnY29sZCd9XCIgc2l6ZT1cIm1lZGl1bVwiIG9uOmNsaWNrPXsoKSA9PiBnZW5lcmF0ZVJhbmRvbVRoZW1lKCl9PlxyXG5cdFx0XHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIiBjbGFzcz1cInNsb3R0ZWQtc3BhblwiPlJhbmRvbSB0aGVtZTwvc3Bhbj5cclxuXHRcdFx0XHQ8L3pvby1idXR0b24+XHJcblx0XHRcdDwvZGl2PlxyXG5cdFx0PC9kaXY+XHJcblx0PC96b28taGVhZGVyPlxyXG5cdDx6b28tbmF2aWdhdGlvbiBjbGFzcz1cIm5hdlwiPlxyXG5cdFx0PGRpdj5cclxuXHRcdFx0eyNlYWNoIG5hdmxpbmtzIGFzIGxpbmt9XHJcblx0XHRcdFx0PGRpdiBjbGFzcz1cIm5hdi1saW5rXCI+XHJcblx0XHRcdFx0XHQ8YSBocmVmPVwie2xpbmsuaHJlZn1cIj57bGluay50ZXh0fTwvYT5cclxuXHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0ey9lYWNofVxyXG5cdFx0PC9kaXY+XHJcblx0PC96b28tbmF2aWdhdGlvbj5cclxuPC9oZWFkZXI+XHJcblxyXG48c3R5bGUgdHlwZT0ndGV4dC9zY3NzJz5oZWFkZXIge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7IH1cblxuLmJ1dHRvbnMtaG9sZGVyIHtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdztcbiAgZmxleC1ncm93OiAxO1xuICBwYWRkaW5nOiAwIDI1cHggMCAwOyB9XG5cbi5oZWFkZXItYnV0dG9uIHtcbiAgZGlzcGxheTogZmxleDtcbiAgbWF4LXdpZHRoOiAyNTBweDtcbiAgbWluLXdpZHRoOiAxNDBweDtcbiAgbWFyZ2luLWxlZnQ6IDE1cHg7IH1cbiAgLmhlYWRlci1idXR0b24gem9vLWJ1dHRvbiB7XG4gICAgYWxpZ24tc2VsZjogY2VudGVyOyB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogNTQ0cHgpIHtcbiAgICAuaGVhZGVyLWJ1dHRvbiAuc2xvdHRlZC1zcGFuIHtcbiAgICAgIGRpc3BsYXk6IG5vbmU7IH0gfVxuXG4ubmF2IHtcbiAgcG9zaXRpb246IHN0aWNreTtcbiAgdG9wOiAwO1xuICBjb2xvcjogd2hpdGU7XG4gIGZvbnQtc2l6ZTogMTRweDtcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XG4gIGxpbmUtaGVpZ2h0OiAxNnB4O1xuICBjdXJzb3I6IHBvaW50ZXI7IH1cbiAgLm5hdiAubmF2LWxpbmsge1xuICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7IH1cbiAgICAubmF2IC5uYXYtbGluazpob3ZlciB7XG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMyk7IH1cbiAgICAubmF2IC5uYXYtbGluayBhIHtcbiAgICAgIGNvbG9yOiB3aGl0ZTtcbiAgICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICAgIHBhZGRpbmc6IDAgMTVweDsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XHJcblxyXG48c2NyaXB0PlxyXG5cdGxldCB0aGVtZSA9ICd6b28nO1xyXG5cdGxldCBuYXZsaW5rcyA9IFtcclxuXHRcdHtcclxuXHRcdFx0aHJlZjogJyN3aGF0JyxcclxuXHRcdFx0dGV4dDogJ1doYXQgaXMgdGhpcyBwcm9qZWN0PydcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjd2hlbicsXHJcblx0XHRcdHRleHQ6ICdXaGVuIGNhbiBJIHVzZSBpdD8nXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI2hvdycsXHJcblx0XHRcdHRleHQ6ICdIb3cgY2FuIEkgdXNlIGl0PydcclxuXHRcdH1cclxuXHRdO1xyXG5cclxuXHRjb25zdCBjaGFuZ2VUaGVtZSA9IChwYWxsZXRlKSA9PiB7XHJcblx0XHR0aGVtZSA9IHBhbGxldGU7XHJcblx0XHRzd2l0Y2ggKHBhbGxldGUpIHtcclxuXHRcdFx0Y2FzZSAnem9vJzpcclxuXHRcdFx0XHRzZXRDb2xvclZhcignLS1tYWluLWNvbG9yJywgJyMzQzk3MDAnKTtcclxuXHRcdFx0XHRzZXRDb2xvclZhcignLS1tYWluLWNvbG9yLWxpZ2h0JywgJyM2NkIxMDAnKTtcclxuXHRcdFx0XHRzZXRDb2xvclZhcignLS1tYWluLWNvbG9yLWRhcmsnLCAnIzI4NjQwMCcpO1xyXG5cdFx0XHRcdHNldENvbG9yVmFyKCctLXNlY29uZGFyeS1jb2xvcicsICcjRkY2MjAwJyk7XHJcblx0XHRcdFx0c2V0Q29sb3JWYXIoJy0tc2Vjb25kYXJ5LWNvbG9yLWxpZ2h0JywgJyNGRjg4MDAnKTtcclxuXHRcdFx0XHRzZXRDb2xvclZhcignLS1zZWNvbmRhcnktY29sb3ItZGFyaycsICcjQ0M0RTAwJyk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgJ2dyZXknOlxyXG5cdFx0XHRcdHNldENvbG9yVmFyKCctLW1haW4tY29sb3InLCAnIzY3Njc3OCcpO1xyXG5cdFx0XHRcdHNldENvbG9yVmFyKCctLW1haW4tY29sb3ItbGlnaHQnLCAnIzgzODM5OScpO1xyXG5cdFx0XHRcdHNldENvbG9yVmFyKCctLW1haW4tY29sb3ItZGFyaycsICcjNTY1NjY0Jyk7XHJcblx0XHRcdFx0c2V0Q29sb3JWYXIoJy0tc2Vjb25kYXJ5LWNvbG9yJywgJyNmZjNlMDAnKTtcclxuXHRcdFx0XHRzZXRDb2xvclZhcignLS1zZWNvbmRhcnktY29sb3ItbGlnaHQnLCAnI2ZmNzk0ZCcpO1xyXG5cdFx0XHRcdHNldENvbG9yVmFyKCctLXNlY29uZGFyeS1jb2xvci1kYXJrJywgJyNjNTMxMDAnKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSAnYmxhY2snOlxyXG5cdFx0XHRcdHNldENvbG9yVmFyKCctLW1haW4tY29sb3InLCAnIzIwMjMyYScpO1xyXG5cdFx0XHRcdHNldENvbG9yVmFyKCctLW1haW4tY29sb3ItbGlnaHQnLCAnIzNiNDE0ZScpO1xyXG5cdFx0XHRcdHNldENvbG9yVmFyKCctLW1haW4tY29sb3ItZGFyaycsICcjMGUxMDEzJyk7XHJcblx0XHRcdFx0c2V0Q29sb3JWYXIoJy0tc2Vjb25kYXJ5LWNvbG9yJywgJyMxY2IxMWMnKTtcclxuXHRcdFx0XHRzZXRDb2xvclZhcignLS1zZWNvbmRhcnktY29sb3ItbGlnaHQnLCAnIzM5ZDYzOScpO1xyXG5cdFx0XHRcdHNldENvbG9yVmFyKCctLXNlY29uZGFyeS1jb2xvci1kYXJrJywgJyMxNTc5MTUnKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNvbnN0IHNldENvbG9yVmFyID0gKG5hbWUsIHZhbHVlKSA9PiB7XHJcblx0XHRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdmFsdWUpO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgZ2VuZXJhdGVSYW5kb21UaGVtZSA9ICgpID0+IHtcclxuXHRcdHRoZW1lID0gJ3JhbmRvbSc7XHJcblx0XHRjb25zdCBtYWluID0gcmFuZG9tUmdiYVN0cmluZygpO1xyXG5cdFx0Y29uc3QgbWFpbkhleCA9IHJnYlRvSGV4KG1haW4uciwgbWFpbi5nLCBtYWluLmIpO1xyXG5cdFx0c2V0Q29sb3JWYXIoJy0tbWFpbi1jb2xvcicsIG1haW5IZXgpO1xyXG5cdFx0c2V0Q29sb3JWYXIoJy0tbWFpbi1jb2xvci1saWdodCcsIGxpZ2h0ZW5EYXJrZW5Db2xvcihtYWluSGV4LCAzMCkpO1xyXG5cdFx0c2V0Q29sb3JWYXIoJy0tbWFpbi1jb2xvci1kYXJrJywgbGlnaHRlbkRhcmtlbkNvbG9yKG1haW5IZXgsIC0zMCkpO1xyXG5cdFx0Y29uc3Qgc2Vjb25kID0gcmFuZG9tUmdiYVN0cmluZygpO1xyXG5cdFx0Y29uc3Qgc2Vjb25kSGV4ID0gcmdiVG9IZXgoc2Vjb25kLnIsIHNlY29uZC5nLCBzZWNvbmQuYik7XHJcblx0XHRzZXRDb2xvclZhcignLS1zZWNvbmRhcnktY29sb3InLCByZ2JUb0hleChzZWNvbmQuciwgc2Vjb25kLmcsIHNlY29uZC5iKSk7XHJcblx0XHRzZXRDb2xvclZhcignLS1zZWNvbmRhcnktY29sb3ItbGlnaHQnLCBsaWdodGVuRGFya2VuQ29sb3Ioc2Vjb25kSGV4LCAzMCkpO1xyXG5cdFx0c2V0Q29sb3JWYXIoJy0tc2Vjb25kYXJ5LWNvbG9yLWRhcmsnLCBsaWdodGVuRGFya2VuQ29sb3Ioc2Vjb25kSGV4LCAtMzApKTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IHJhbmRvbVJnYmFTdHJpbmcgPSAoKSA9PiB7XHJcblx0XHRsZXQgciA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDI1NSk7XHJcblx0XHRsZXQgZyA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDI1NSk7XHJcblx0XHRsZXQgYiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDI1NSk7XHJcblx0XHRyZXR1cm4ge3I6IHIsIGc6IGcsIGI6IGJ9O1xyXG5cdH1cclxuXHJcblx0Y29uc3QgcmdiVG9IZXggPSAociwgZywgYikgPT4ge1xyXG4gICAgXHRyZXR1cm4gXCIjXCIgKyBjb21wb25lbnRUb0hleChyKSArIGNvbXBvbmVudFRvSGV4KGcpICsgY29tcG9uZW50VG9IZXgoYik7XHJcblx0fVxyXG5cclxuXHRjb25zdCBjb21wb25lbnRUb0hleCA9IChjKSA9PiB7XHJcblx0XHRsZXQgaGV4ID0gYy50b1N0cmluZygxNik7XHJcblx0XHRyZXR1cm4gaGV4Lmxlbmd0aCA9PSAxID8gXCIwXCIgKyBoZXggOiBoZXg7XHJcblx0fVxyXG5cclxuXHRjb25zdCBsaWdodGVuRGFya2VuQ29sb3IgPSAoY29sLCBhbXQpID0+IHtcclxuXHRcclxuXHRcdHZhciB1c2VQb3VuZCA9IGZhbHNlO1xyXG5cdFxyXG5cdFx0aWYgKGNvbFswXSA9PSBcIiNcIikge1xyXG5cdFx0XHRjb2wgPSBjb2wuc2xpY2UoMSk7XHJcblx0XHRcdHVzZVBvdW5kID0gdHJ1ZTtcclxuXHRcdH1cclxuXHRcclxuXHRcdHZhciBudW0gPSBwYXJzZUludChjb2wsMTYpO1xyXG5cdFxyXG5cdFx0dmFyIHIgPSAobnVtID4+IDE2KSArIGFtdDtcclxuXHRcclxuXHRcdGlmIChyID4gMjU1KSByID0gMjU1O1xyXG5cdFx0ZWxzZSBpZiAgKHIgPCAwKSByID0gMDtcclxuXHRcclxuXHRcdHZhciBiID0gKChudW0gPj4gOCkgJiAweDAwRkYpICsgYW10O1xyXG5cdFxyXG5cdFx0aWYgKGIgPiAyNTUpIGIgPSAyNTU7XHJcblx0XHRlbHNlIGlmICAoYiA8IDApIGIgPSAwO1xyXG5cdFxyXG5cdFx0dmFyIGcgPSAobnVtICYgMHgwMDAwRkYpICsgYW10O1xyXG5cdFxyXG5cdFx0aWYgKGcgPiAyNTUpIGcgPSAyNTU7XHJcblx0XHRlbHNlIGlmIChnIDwgMCkgZyA9IDA7XHJcblx0XHJcblx0XHRyZXR1cm4gKHVzZVBvdW5kP1wiI1wiOlwiXCIpICsgKGcgfCAoYiA8PCA4KSB8IChyIDw8IDE2KSkudG9TdHJpbmcoMTYpO1xyXG5cdFxyXG5cdH1cclxuPC9zY3JpcHQ+XHJcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFnQ3dCLE1BQU0sQUFBQyxDQUFDLEFBQzlCLFFBQVEsQ0FBRSxRQUFRLEFBQUUsQ0FBQyxBQUV2QixlQUFlLEFBQUMsQ0FBQyxBQUNmLE9BQU8sQ0FBRSxJQUFJLENBQ2IsZUFBZSxDQUFFLFFBQVEsQ0FDekIsY0FBYyxDQUFFLEdBQUcsQ0FDbkIsU0FBUyxDQUFFLENBQUMsQ0FDWixPQUFPLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFFLENBQUMsQUFFeEIsY0FBYyxBQUFDLENBQUMsQUFDZCxPQUFPLENBQUUsSUFBSSxDQUNiLFNBQVMsQ0FBRSxLQUFLLENBQ2hCLFNBQVMsQ0FBRSxLQUFLLENBQ2hCLFdBQVcsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUNwQixjQUFjLENBQUMsVUFBVSxBQUFDLENBQUMsQUFDekIsVUFBVSxDQUFFLE1BQU0sQUFBRSxDQUFDLEFBQ3ZCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pDLGNBQWMsQ0FBQyxhQUFhLEFBQUMsQ0FBQyxBQUM1QixPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMsQUFBQyxDQUFDLEFBRXhCLElBQUksQUFBQyxDQUFDLEFBQ0osUUFBUSxDQUFFLE1BQU0sQ0FDaEIsR0FBRyxDQUFFLENBQUMsQ0FDTixLQUFLLENBQUUsS0FBSyxDQUNaLFNBQVMsQ0FBRSxJQUFJLENBQ2YsV0FBVyxDQUFFLElBQUksQ0FDakIsV0FBVyxDQUFFLElBQUksQ0FDakIsTUFBTSxDQUFFLE9BQU8sQUFBRSxDQUFDLEFBQ2xCLElBQUksQ0FBQyxTQUFTLEFBQUMsQ0FBQyxBQUNkLE1BQU0sQ0FBRSxPQUFPLENBQ2YsT0FBTyxDQUFFLElBQUksQ0FDYixXQUFXLENBQUUsTUFBTSxBQUFFLENBQUMsQUFDdEIsSUFBSSxDQUFDLFNBQVMsTUFBTSxBQUFDLENBQUMsQUFDcEIsVUFBVSxDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUUsQ0FBQyxBQUN6QyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQUFBQyxDQUFDLEFBQ2hCLEtBQUssQ0FBRSxLQUFLLENBQ1osZUFBZSxDQUFFLElBQUksQ0FDckIsT0FBTyxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

    		init(this, { target: this.shadowRoot }, instance$1, create_fragment$1, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("app-header", Header);

    /* src\sections\Form.svelte generated by Svelte v3.9.0 */

    const file$2 = "src\\sections\\Form.svelte";

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
    	var option, t0_value = ctx.option.text + "", t0, t1, option_value_value;

    	return {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = ctx.option.value;
    			option.value = option.__value;
    			add_location(option, file$2, 40, 4, 2621);
    		},

    		m: function mount(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t0);
    			append(option, t1);
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
    	var option, t0_value = ctx.option.text + "", t0, t1, option_value_value;

    	return {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = ctx.option.value;
    			option.value = option.__value;
    			add_location(option, file$2, 49, 4, 2947);
    		},

    		m: function mount(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t0);
    			append(option, t1);
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
    			add_location(app_context, file$2, 1, 0, 50);
    			attr(input0, "slot", "inputelement");
    			attr(input0, "type", "text");
    			attr(input0, "placeholder", "input");
    			add_location(input0, file$2, 5, 2, 487);
    			set_custom_element_data(zoo_input0, "labeltext", "Input type text that will be wrapped when linktext is present");
    			set_custom_element_data(zoo_input0, "linktext", "Forgotten your password?");
    			set_custom_element_data(zoo_input0, "linkhref", "https://google.com");
    			set_custom_element_data(zoo_input0, "linktarget", "about:blank");
    			set_custom_element_data(zoo_input0, "valid", ctx.inputState);
    			set_custom_element_data(zoo_input0, "inputerrormsg", "invalid");
    			set_custom_element_data(zoo_input0, "infotext", "Additional helpful information for our users");
    			add_location(zoo_input0, file$2, 3, 1, 199);
    			attr(input1, "slot", "inputelement");
    			attr(input1, "type", "number");
    			attr(input1, "placeholder", "input");
    			add_location(input1, file$2, 9, 2, 763);
    			set_custom_element_data(zoo_input1, "labeltext", "Input type number, not wrapped as linktext is empty");
    			set_custom_element_data(zoo_input1, "linkhref", "https://google.com");
    			set_custom_element_data(zoo_input1, "linktarget", "about:blank");
    			set_custom_element_data(zoo_input1, "infotext", "Additional helpful information for our users");
    			add_location(zoo_input1, file$2, 7, 1, 566);
    			attr(input2, "slot", "inputelement");
    			attr(input2, "type", "date");
    			attr(input2, "placeholder", "Enter date");
    			add_location(input2, file$2, 13, 2, 1096);
    			set_custom_element_data(zoo_input2, "labeltext", "This input has type date");
    			set_custom_element_data(zoo_input2, "linktext", "Native date picker -> click me");
    			set_custom_element_data(zoo_input2, "linkhref", "https://github.com/jcgertig/date-input-polyfill");
    			set_custom_element_data(zoo_input2, "linktarget", "about:blank");
    			set_custom_element_data(zoo_input2, "infotext", "Click on input to show context menu with date selection");
    			add_location(zoo_input2, file$2, 11, 1, 844);
    			attr(input3, "slot", "inputelement");
    			attr(input3, "type", "time");
    			attr(input3, "placeholder", "Enter time");
    			add_location(input3, file$2, 16, 2, 1255);
    			set_custom_element_data(zoo_input3, "labeltext", "This input has type time");
    			set_custom_element_data(zoo_input3, "infotext", "Select time");
    			add_location(zoo_input3, file$2, 15, 1, 1180);
    			attr(textarea, "slot", "inputelement");
    			attr(textarea, "placeholder", "Textarea");
    			add_location(textarea, file$2, 19, 2, 1404);
    			set_custom_element_data(zoo_input4, "labeltext", "Textarea example");
    			set_custom_element_data(zoo_input4, "valid", ctx.inputState);
    			add_location(zoo_input4, file$2, 18, 1, 1339);
    			attr(option0, "class", "placeholder");
    			option0.__value = "";
    			option0.value = option0.__value;
    			option0.disabled = true;
    			option0.selected = true;
    			add_location(option0, file$2, 23, 3, 1802);
    			option1.__value = "1";
    			option1.value = option1.__value;
    			add_location(option1, file$2, 24, 3, 1882);
    			option2.__value = "2";
    			option2.value = option2.__value;
    			add_location(option2, file$2, 25, 3, 1905);
    			option3.__value = "3";
    			option3.value = option3.__value;
    			add_location(option3, file$2, 26, 3, 1928);
    			attr(select0, "slot", "selectelement");
    			select0.multiple = true;
    			add_location(select0, file$2, 22, 2, 1759);
    			set_custom_element_data(zoo_select0, "labeltext", "Multiselect with long label that will be wrapped");
    			set_custom_element_data(zoo_select0, "linktext", "Documentation link");
    			set_custom_element_data(zoo_select0, "linkhref", "https://google.com");
    			set_custom_element_data(zoo_select0, "linktarget", "about:blank");
    			set_custom_element_data(zoo_select0, "valid", ctx.inputState);
    			set_custom_element_data(zoo_select0, "inputerrormsg", "Value is required");
    			set_custom_element_data(zoo_select0, "infotext", "Additional helpful information for our users");
    			add_location(zoo_select0, file$2, 21, 1, 1486);
    			attr(option4, "class", "placeholder");
    			option4.__value = "";
    			option4.value = option4.__value;
    			option4.disabled = true;
    			option4.selected = true;
    			add_location(option4, file$2, 31, 3, 2201);
    			option5.__value = "1";
    			option5.value = option5.__value;
    			add_location(option5, file$2, 32, 3, 2281);
    			option6.__value = "2";
    			option6.value = option6.__value;
    			add_location(option6, file$2, 33, 3, 2304);
    			option7.__value = "3";
    			option7.value = option7.__value;
    			add_location(option7, file$2, 34, 3, 2327);
    			attr(select1, "slot", "selectelement");
    			add_location(select1, file$2, 30, 2, 2167);
    			set_custom_element_data(zoo_select1, "labeltext", "Standard select, not wrapped as linktext is empty");
    			set_custom_element_data(zoo_select1, "valid", ctx.inputState);
    			set_custom_element_data(zoo_select1, "inputerrormsg", "Value is required");
    			set_custom_element_data(zoo_select1, "infotext", "Additional helpful information for our users");
    			add_location(zoo_select1, file$2, 29, 1, 1978);
    			select2.multiple = true;
    			attr(select2, "slot", "selectelement");
    			add_location(select2, file$2, 38, 2, 2547);
    			set_custom_element_data(zoo_searchable_select0, "labeltext", "Searchable multiple select");
    			set_custom_element_data(zoo_searchable_select0, "placeholder", "Placeholder");
    			set_custom_element_data(zoo_searchable_select0, "infotext", "Additional helpful information for our users which is a long text.");
    			add_location(zoo_searchable_select0, file$2, 37, 1, 2377);
    			attr(select3, "slot", "selectelement");
    			add_location(select3, file$2, 47, 2, 2882);
    			set_custom_element_data(zoo_searchable_select1, "labeltext", "Searchable select");
    			set_custom_element_data(zoo_searchable_select1, "placeholder", "Placeholder");
    			set_custom_element_data(zoo_searchable_select1, "infotext", "Additional helpful information for our users.");
    			add_location(zoo_searchable_select1, file$2, 46, 1, 2742);
    			attr(input4, "slot", "checkboxelement");
    			attr(input4, "type", "checkbox");
    			add_location(input4, file$2, 56, 2, 3213);
    			set_custom_element_data(zoo_checkbox, "highlighted", true);
    			set_custom_element_data(zoo_checkbox, "valid", ctx.inputState);
    			set_custom_element_data(zoo_checkbox, "labeltext", "An example checkbox with some additional event handling of clicks inside");
    			add_location(zoo_checkbox, file$2, 55, 1, 3068);
    			attr(input5, "type", "radio");
    			attr(input5, "id", "contactChoice1");
    			attr(input5, "name", "contact");
    			input5.value = "email";
    			input5.disabled = true;
    			add_location(input5, file$2, 60, 3, 3395);
    			attr(label0, "for", "contactChoice1");
    			add_location(label0, file$2, 61, 3, 3478);
    			attr(input6, "type", "radio");
    			attr(input6, "id", "contactChoice2");
    			attr(input6, "name", "contact");
    			input6.value = "phone";
    			add_location(input6, file$2, 62, 3, 3524);
    			attr(label1, "for", "contactChoice2");
    			add_location(label1, file$2, 63, 3, 3598);
    			attr(input7, "type", "radio");
    			attr(input7, "id", "contactChoice3");
    			attr(input7, "name", "contact");
    			input7.value = "mail";
    			add_location(input7, file$2, 64, 3, 3644);
    			attr(label2, "for", "contactChoice3");
    			add_location(label2, file$2, 65, 3, 3717);
    			add_location(template, file$2, 59, 2, 3380);
    			set_custom_element_data(zoo_radio0, "valid", ctx.inputState);
    			set_custom_element_data(zoo_radio0, "errormsg", "errormsg");
    			set_custom_element_data(zoo_radio0, "infotext", "infotext");
    			set_custom_element_data(zoo_radio0, "labeltext", "Label text");
    			add_location(zoo_radio0, file$2, 58, 1, 3281);
    			attr(input8, "type", "radio");
    			attr(input8, "id", "contactChoice4");
    			attr(input8, "name", "contact");
    			input8.value = "email";
    			input8.disabled = true;
    			add_location(input8, file$2, 70, 2, 3868);
    			attr(label3, "for", "contactChoice4");
    			add_location(label3, file$2, 71, 2, 3950);
    			attr(input9, "type", "radio");
    			attr(input9, "id", "contactChoice5");
    			attr(input9, "name", "contact");
    			input9.value = "phone";
    			add_location(input9, file$2, 72, 2, 3995);
    			attr(label4, "for", "contactChoice5");
    			add_location(label4, file$2, 73, 2, 4068);
    			set_custom_element_data(zoo_radio1, "valid", ctx.inputState);
    			set_custom_element_data(zoo_radio1, "errormsg", "errormsg");
    			set_custom_element_data(zoo_radio1, "infotext", "infotext");
    			add_location(zoo_radio1, file$2, 69, 1, 3792);
    			attr(form, "class", "form");
    			add_location(form, file$2, 2, 0, 177);
    			attr(span, "slot", "buttoncontent");
    			attr(span, "class", "slotted-span");
    			add_location(span, file$2, 78, 2, 4224);
    			set_custom_element_data(zoo_button, "type", "hot");
    			set_custom_element_data(zoo_button, "size", "medium");
    			add_location(zoo_button, file$2, 77, 1, 4158);
    			attr(div, "class", "submit");
    			add_location(div, file$2, 76, 0, 4135);
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
    		$$invalidate('inputState', inputState = !inputState);
    	};

    	return { options, inputState, changeState };
    }

    class Form extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>.form{flex:1 0 auto;margin:20px auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));grid-template-rows:120px 150px 120px 80px;grid-gap:20px}@media only screen and (max-width: 544px){.form{width:300px;grid-template-columns:auto}}@media only screen and (max-width: 812px){.form{grid-template-rows:120px 150px 120px 120px}}.submit{width:250px;height:50px;margin:0 auto}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9ybS5zdmVsdGUiLCJzb3VyY2VzIjpbIkZvcm0uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJhcHAtZm9ybVwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcbjxhcHAtY29udGV4dCB0ZXh0PVwiRmlyc3Qgc2VjdGlvbiBpcyBhIHNob3djYXNlIG9mIGRpZmZlcmVudCBmb3JtIGVsZW1lbnRzIGxpa2UgYGlucHV0YCwgYHRleHRhcmVhYCwgYHNlbGVjdGAuXCI+PC9hcHAtY29udGV4dD5cclxuPGZvcm0gY2xhc3M9XCJmb3JtXCI+XHJcblx0PHpvby1pbnB1dCBsYWJlbHRleHQ9XCJJbnB1dCB0eXBlIHRleHQgdGhhdCB3aWxsIGJlIHdyYXBwZWQgd2hlbiBsaW5rdGV4dCBpcyBwcmVzZW50XCIgbGlua3RleHQ9XCJGb3Jnb3R0ZW4geW91ciBwYXNzd29yZD9cIiBsaW5raHJlZj1cImh0dHBzOi8vZ29vZ2xlLmNvbVwiIGxpbmt0YXJnZXQ9XCJhYm91dDpibGFua1wiXHJcblx0XHRcdCAgIHZhbGlkPVwie2lucHV0U3RhdGV9XCIgaW5wdXRlcnJvcm1zZz1cImludmFsaWRcIiBpbmZvdGV4dD1cIkFkZGl0aW9uYWwgaGVscGZ1bCBpbmZvcm1hdGlvbiBmb3Igb3VyIHVzZXJzXCI+XHJcblx0XHQ8aW5wdXQgc2xvdD1cImlucHV0ZWxlbWVudFwiIHR5cGU9XCJ0ZXh0XCIgcGxhY2Vob2xkZXI9XCJpbnB1dFwiIC8+XHJcblx0PC96b28taW5wdXQ+XHJcblx0PHpvby1pbnB1dCBsYWJlbHRleHQ9XCJJbnB1dCB0eXBlIG51bWJlciwgbm90IHdyYXBwZWQgYXMgbGlua3RleHQgaXMgZW1wdHlcIiBsaW5raHJlZj1cImh0dHBzOi8vZ29vZ2xlLmNvbVwiIGxpbmt0YXJnZXQ9XCJhYm91dDpibGFua1wiXHJcblx0XHRcdCAgIGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnNcIj5cclxuXHRcdDxpbnB1dCBzbG90PVwiaW5wdXRlbGVtZW50XCIgdHlwZT1cIm51bWJlclwiIHBsYWNlaG9sZGVyPVwiaW5wdXRcIiAvPlxyXG5cdDwvem9vLWlucHV0PlxyXG5cdDx6b28taW5wdXQgbGFiZWx0ZXh0PVwiVGhpcyBpbnB1dCBoYXMgdHlwZSBkYXRlXCIgbGlua3RleHQ9XCJOYXRpdmUgZGF0ZSBwaWNrZXIgLT4gY2xpY2sgbWVcIiBsaW5raHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9qY2dlcnRpZy9kYXRlLWlucHV0LXBvbHlmaWxsXCJcclxuXHRcdFx0ICAgbGlua3RhcmdldD1cImFib3V0OmJsYW5rXCIgaW5mb3RleHQ9XCJDbGljayBvbiBpbnB1dCB0byBzaG93IGNvbnRleHQgbWVudSB3aXRoIGRhdGUgc2VsZWN0aW9uXCI+XHJcblx0XHQ8aW5wdXQgc2xvdD1cImlucHV0ZWxlbWVudFwiIHR5cGU9XCJkYXRlXCIgcGxhY2Vob2xkZXI9XCJFbnRlciBkYXRlXCIgLz5cclxuXHQ8L3pvby1pbnB1dD5cclxuXHQ8em9vLWlucHV0IGxhYmVsdGV4dD1cIlRoaXMgaW5wdXQgaGFzIHR5cGUgdGltZVwiIGluZm90ZXh0PVwiU2VsZWN0IHRpbWVcIj5cclxuXHRcdDxpbnB1dCBzbG90PVwiaW5wdXRlbGVtZW50XCIgdHlwZT1cInRpbWVcIiBwbGFjZWhvbGRlcj1cIkVudGVyIHRpbWVcIiAvPlxyXG5cdDwvem9vLWlucHV0PlxyXG5cdDx6b28taW5wdXQgbGFiZWx0ZXh0PVwiVGV4dGFyZWEgZXhhbXBsZVwiIHZhbGlkPVwie2lucHV0U3RhdGV9XCI+XHJcblx0XHQ8dGV4dGFyZWEgc2xvdD1cImlucHV0ZWxlbWVudFwiIHBsYWNlaG9sZGVyPVwiVGV4dGFyZWFcIj48L3RleHRhcmVhPlxyXG5cdDwvem9vLWlucHV0PlxyXG5cdDx6b28tc2VsZWN0IGxhYmVsdGV4dD1cIk11bHRpc2VsZWN0IHdpdGggbG9uZyBsYWJlbCB0aGF0IHdpbGwgYmUgd3JhcHBlZFwiIGxpbmt0ZXh0PVwiRG9jdW1lbnRhdGlvbiBsaW5rXCIgbGlua2hyZWY9XCJodHRwczovL2dvb2dsZS5jb21cIiBsaW5rdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIiB2YWxpZD1cIntpbnB1dFN0YXRlfVwiIGlucHV0ZXJyb3Jtc2c9XCJWYWx1ZSBpcyByZXF1aXJlZFwiIGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnNcIj5cclxuXHRcdDxzZWxlY3Qgc2xvdD1cInNlbGVjdGVsZW1lbnRcIiBtdWx0aXBsZT5cclxuXHRcdFx0PG9wdGlvbiBjbGFzcz1cInBsYWNlaG9sZGVyXCIgdmFsdWU9XCJcIiBkaXNhYmxlZCBzZWxlY3RlZD5QbGFjZWhvbGRlcjwvb3B0aW9uPlxyXG5cdFx0XHQ8b3B0aW9uPjE8L29wdGlvbj5cclxuXHRcdFx0PG9wdGlvbj4yPC9vcHRpb24+XHJcblx0XHRcdDxvcHRpb24+Mzwvb3B0aW9uPlxyXG5cdFx0PC9zZWxlY3Q+XHJcblx0PC96b28tc2VsZWN0PlxyXG5cdDx6b28tc2VsZWN0IGxhYmVsdGV4dD1cIlN0YW5kYXJkIHNlbGVjdCwgbm90IHdyYXBwZWQgYXMgbGlua3RleHQgaXMgZW1wdHlcIiB2YWxpZD1cIntpbnB1dFN0YXRlfVwiIGlucHV0ZXJyb3Jtc2c9XCJWYWx1ZSBpcyByZXF1aXJlZFwiIGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnNcIj5cclxuXHRcdDxzZWxlY3Qgc2xvdD1cInNlbGVjdGVsZW1lbnRcIj5cclxuXHRcdFx0PG9wdGlvbiBjbGFzcz1cInBsYWNlaG9sZGVyXCIgdmFsdWU9XCJcIiBkaXNhYmxlZCBzZWxlY3RlZD5QbGFjZWhvbGRlcjwvb3B0aW9uPlxyXG5cdFx0XHQ8b3B0aW9uPjE8L29wdGlvbj5cclxuXHRcdFx0PG9wdGlvbj4yPC9vcHRpb24+XHJcblx0XHRcdDxvcHRpb24+Mzwvb3B0aW9uPlxyXG5cdFx0PC9zZWxlY3Q+XHJcblx0PC96b28tc2VsZWN0PlxyXG5cdDx6b28tc2VhcmNoYWJsZS1zZWxlY3QgbGFiZWx0ZXh0PVwiU2VhcmNoYWJsZSBtdWx0aXBsZSBzZWxlY3RcIiBwbGFjZWhvbGRlcj1cIlBsYWNlaG9sZGVyXCIgaW5mb3RleHQ9XCJBZGRpdGlvbmFsIGhlbHBmdWwgaW5mb3JtYXRpb24gZm9yIG91ciB1c2VycyB3aGljaCBpcyBhIGxvbmcgdGV4dC5cIj5cclxuXHRcdDxzZWxlY3QgbXVsdGlwbGUgc2xvdD1cInNlbGVjdGVsZW1lbnRcIj5cclxuXHRcdFx0eyNlYWNoIG9wdGlvbnMgYXMgb3B0aW9ufVxyXG5cdFx0XHRcdDxvcHRpb24gdmFsdWU9XCJ7b3B0aW9uLnZhbHVlfVwiPlxyXG5cdFx0XHRcdFx0e29wdGlvbi50ZXh0fVxyXG5cdFx0XHRcdDwvb3B0aW9uPlxyXG5cdFx0XHR7L2VhY2h9XHJcblx0XHQ8L3NlbGVjdD5cclxuXHQ8L3pvby1zZWFyY2hhYmxlLXNlbGVjdD5cclxuXHQ8em9vLXNlYXJjaGFibGUtc2VsZWN0IGxhYmVsdGV4dD1cIlNlYXJjaGFibGUgc2VsZWN0XCIgcGxhY2Vob2xkZXI9XCJQbGFjZWhvbGRlclwiIGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnMuXCI+XHJcblx0XHQ8c2VsZWN0IHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XHJcblx0XHRcdHsjZWFjaCBvcHRpb25zIGFzIG9wdGlvbn1cclxuXHRcdFx0XHQ8b3B0aW9uIHZhbHVlPVwie29wdGlvbi52YWx1ZX1cIj5cclxuXHRcdFx0XHRcdHtvcHRpb24udGV4dH1cclxuXHRcdFx0XHQ8L29wdGlvbj5cclxuXHRcdFx0ey9lYWNofVxyXG5cdFx0PC9zZWxlY3Q+XHJcblx0PC96b28tc2VhcmNoYWJsZS1zZWxlY3Q+XHJcblx0PHpvby1jaGVja2JveCBoaWdobGlnaHRlZD1cInt0cnVlfVwiIHZhbGlkPVwie2lucHV0U3RhdGV9XCIgbGFiZWx0ZXh0PVwiQW4gZXhhbXBsZSBjaGVja2JveCB3aXRoIHNvbWUgYWRkaXRpb25hbCBldmVudCBoYW5kbGluZyBvZiBjbGlja3MgaW5zaWRlXCI+XHJcblx0XHQ8aW5wdXQgc2xvdD1cImNoZWNrYm94ZWxlbWVudFwiIHR5cGU9XCJjaGVja2JveFwiLz5cclxuXHQ8L3pvby1jaGVja2JveD5cclxuXHQ8em9vLXJhZGlvIHZhbGlkPVwie2lucHV0U3RhdGV9XCIgZXJyb3Jtc2c9XCJlcnJvcm1zZ1wiIGluZm90ZXh0PVwiaW5mb3RleHRcIiBsYWJlbHRleHQ9XCJMYWJlbCB0ZXh0XCI+XHJcblx0XHQ8dGVtcGxhdGU+XHJcblx0XHRcdDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2UxXCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cImVtYWlsXCIgZGlzYWJsZWQ+XHJcblx0XHRcdDxsYWJlbCBmb3I9XCJjb250YWN0Q2hvaWNlMVwiPkVtYWlsPC9sYWJlbD5cclxuXHRcdFx0PGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwiY29udGFjdENob2ljZTJcIiBuYW1lPVwiY29udGFjdFwiIHZhbHVlPVwicGhvbmVcIj5cclxuXHRcdFx0PGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2UyXCI+UGhvbmU8L2xhYmVsPlxyXG5cdFx0XHQ8aW5wdXQgdHlwZT1cInJhZGlvXCIgaWQ9XCJjb250YWN0Q2hvaWNlM1wiIG5hbWU9XCJjb250YWN0XCIgdmFsdWU9XCJtYWlsXCI+XHJcblx0XHRcdDxsYWJlbCBmb3I9XCJjb250YWN0Q2hvaWNlM1wiPk1haWw8L2xhYmVsPlxyXG5cdFx0PC90ZW1wbGF0ZT5cclxuXHQ8L3pvby1yYWRpbz5cclxuXHJcblx0PHpvby1yYWRpbyB2YWxpZD1cIntpbnB1dFN0YXRlfVwiIGVycm9ybXNnPVwiZXJyb3Jtc2dcIiBpbmZvdGV4dD1cImluZm90ZXh0XCI+XHJcblx0XHQ8aW5wdXQgdHlwZT1cInJhZGlvXCIgaWQ9XCJjb250YWN0Q2hvaWNlNFwiIG5hbWU9XCJjb250YWN0XCIgdmFsdWU9XCJlbWFpbFwiIGRpc2FibGVkPlxyXG5cdFx0PGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2U0XCI+RW1haWw8L2xhYmVsPlxyXG5cdFx0PGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwiY29udGFjdENob2ljZTVcIiBuYW1lPVwiY29udGFjdFwiIHZhbHVlPVwicGhvbmVcIj5cclxuXHRcdDxsYWJlbCBmb3I9XCJjb250YWN0Q2hvaWNlNVwiPlBob25lPC9sYWJlbD5cclxuXHQ8L3pvby1yYWRpbz5cclxuPC9mb3JtPlxyXG48ZGl2IGNsYXNzPVwic3VibWl0XCI+XHJcblx0PHpvby1idXR0b24gdHlwZT1cImhvdFwiIHNpemU9XCJtZWRpdW1cIiBvbjpjbGljaz1cIntjaGFuZ2VTdGF0ZX1cIj5cclxuXHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCIgY2xhc3M9XCJzbG90dGVkLXNwYW5cIj5UcmlnZ2VyIGludmFsaWQgc3RhdGUhPC9zcGFuPlxyXG5cdDwvem9vLWJ1dHRvbj5cclxuPC9kaXY+XHJcblxyXG48c3R5bGUgdHlwZT0ndGV4dC9zY3NzJz4uZm9ybSB7XG4gIGZsZXg6IDEgMCBhdXRvO1xuICBtYXJnaW46IDIwcHggYXV0bztcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoYXV0by1maWxsLCBtaW5tYXgoMzIwcHgsIDFmcikpO1xuICBncmlkLXRlbXBsYXRlLXJvd3M6IDEyMHB4IDE1MHB4IDEyMHB4IDgwcHg7XG4gIGdyaWQtZ2FwOiAyMHB4OyB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogNTQ0cHgpIHtcbiAgICAuZm9ybSB7XG4gICAgICB3aWR0aDogMzAwcHg7XG4gICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IGF1dG87IH0gfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDgxMnB4KSB7XG4gICAgLmZvcm0ge1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiAxMjBweCAxNTBweCAxMjBweCAxMjBweDsgfSB9XG5cbi5zdWJtaXQge1xuICB3aWR0aDogMjUwcHg7XG4gIGhlaWdodDogNTBweDtcbiAgbWFyZ2luOiAwIGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxyXG5cclxuPHNjcmlwdD5cclxuXHRsZXQgb3B0aW9ucyA9IFtcclxuXHRcdHtcclxuXHRcdFx0dGV4dDogJ3RleHQnLFxyXG5cdFx0XHR2YWx1ZTogJ3ZhbHVlJ1xyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0dGV4dDogJ3JhTmRPbScsXHJcblx0XHRcdHZhbHVlOiAncmFuZG9tJ1xyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0dGV4dDogJ3JhbmRvbTEnLFxyXG5cdFx0XHR2YWx1ZTogJ3JhbmRvbTEnXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHR0ZXh0OiAncmFuZG9tMicsXHJcblx0XHRcdHZhbHVlOiAncmFuZG9tMidcclxuXHRcdH1cclxuXHRdO1xyXG5cdGxldCBpbnB1dFN0YXRlID0gdHJ1ZTtcclxuXHRjb25zdCBjaGFuZ2VTdGF0ZSA9ICgpID0+IHtcclxuXHRcdGlucHV0U3RhdGUgPSAhaW5wdXRTdGF0ZTtcclxuXHR9XHJcbjwvc2NyaXB0PlxyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBa0Z3QixLQUFLLEFBQUMsQ0FBQyxBQUM3QixJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ2QsTUFBTSxDQUFFLElBQUksQ0FBQyxJQUFJLENBQ2pCLE9BQU8sQ0FBRSxJQUFJLENBQ2IscUJBQXFCLENBQUUsT0FBTyxTQUFTLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQzVELGtCQUFrQixDQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDMUMsUUFBUSxDQUFFLElBQUksQUFBRSxDQUFDLEFBQ2pCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pDLEtBQUssQUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEtBQUssQ0FDWixxQkFBcUIsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUFDLENBQUMsQUFDcEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekMsS0FBSyxBQUFDLENBQUMsQUFDTCxrQkFBa0IsQ0FBRSxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEFBQUUsQ0FBQyxBQUFDLENBQUMsQUFFdEQsT0FBTyxBQUFDLENBQUMsQUFDUCxLQUFLLENBQUUsS0FBSyxDQUNaLE1BQU0sQ0FBRSxJQUFJLENBQ1osTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

    		init(this, { target: this.shadowRoot }, instance$2, create_fragment$2, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("app-form", Form);

    /* src\sections\Buttons.svelte generated by Svelte v3.9.0 */

    const file$3 = "src\\sections\\Buttons.svelte";

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
    			t5 = text("Disabled :(\r\n\t\t\t");
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
    			add_location(zoo_toast0, file$3, 1, 0, 53);
    			set_custom_element_data(zoo_toast1, "text", "Added to cart!");
    			add_location(zoo_toast1, file$3, 2, 0, 140);
    			set_custom_element_data(app_context, "text", "Second section is a showcase of buttons and modals");
    			add_location(app_context, file$3, 3, 0, 210);
    			attr(span0, "slot", "buttoncontent");
    			attr(span0, "class", "slotted-span");
    			add_location(span0, file$3, 6, 2, 382);
    			set_custom_element_data(zoo_button0, "size", "small");
    			add_location(zoo_button0, file$3, 5, 1, 321);
    			set_custom_element_data(zoo_tooltip, "position", "bottom");
    			set_custom_element_data(zoo_tooltip, "text", "Just set disabled attribute on `zoo-button`");
    			add_location(zoo_tooltip, file$3, 11, 3, 607);
    			attr(div0, "slot", "buttoncontent");
    			add_location(div0, file$3, 9, 2, 560);
    			set_custom_element_data(zoo_button1, "size", "small");
    			set_custom_element_data(zoo_button1, "disabled", true);
    			set_custom_element_data(zoo_button1, "class", "top-tooltip");
    			add_location(zoo_button1, file$3, 8, 1, 493);
    			attr(span1, "slot", "buttoncontent");
    			attr(span1, "class", "slotted-span");
    			add_location(span1, file$3, 15, 2, 809);
    			set_custom_element_data(zoo_button2, "type", "hot");
    			set_custom_element_data(zoo_button2, "size", "small");
    			add_location(zoo_button2, file$3, 14, 1, 732);
    			attr(div1, "class", "buttons");
    			add_location(div1, file$3, 4, 0, 297);
    			set_custom_element_data(zoo_feedback, "type", "info");
    			set_custom_element_data(zoo_feedback, "text", "This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered.");
    			add_location(zoo_feedback, file$3, 20, 2, 1013);
    			add_location(br0, file$3, 24, 2, 1199);
    			attr(option0, "class", "placeholder");
    			option0.__value = "";
    			option0.value = option0.__value;
    			option0.disabled = true;
    			option0.selected = true;
    			add_location(option0, file$3, 28, 4, 1311);
    			option1.__value = "Doge";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 29, 4, 1385);
    			option2.__value = "Catz";
    			option2.value = option2.__value;
    			add_location(option2, file$3, 30, 4, 1412);
    			option3.__value = "Snek";
    			option3.value = option3.__value;
    			add_location(option3, file$3, 31, 4, 1439);
    			attr(select, "slot", "selectelement");
    			add_location(select, file$3, 27, 3, 1276);
    			set_custom_element_data(zoo_select, "labeltext", "This product is for");
    			set_custom_element_data(zoo_select, "valid", true);
    			add_location(zoo_select, file$3, 25, 2, 1207);
    			add_location(br1, file$3, 34, 2, 1495);
    			attr(input, "slot", "checkboxelement");
    			attr(input, "type", "checkbox");
    			add_location(input, file$3, 37, 3, 1617);
    			set_custom_element_data(zoo_checkbox, "highlighted", "");
    			set_custom_element_data(zoo_checkbox, "labeltext", "I understand and confirm that ALL of the above statements are true");
    			add_location(zoo_checkbox, file$3, 35, 2, 1503);
    			add_location(br2, file$3, 39, 2, 1687);
    			attr(span2, "slot", "buttoncontent");
    			add_location(span2, file$3, 41, 3, 1769);
    			set_custom_element_data(zoo_button3, "type", "hot");
    			set_custom_element_data(zoo_button3, "size", "medium");
    			add_location(zoo_button3, file$3, 40, 2, 1695);
    			add_location(div2, file$3, 19, 1, 1004);
    			set_style(zoo_modal, "display", "none");
    			set_custom_element_data(zoo_modal, "headertext", "Your basket contains licensed items");
    			add_location(zoo_modal, file$3, 18, 0, 901);

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
    			ctx.zoo_toast0_binding(zoo_toast0);
    			insert(target, t0, anchor);
    			insert(target, zoo_toast1, anchor);
    			ctx.zoo_toast1_binding(zoo_toast1);
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
    			ctx.zoo_modal_binding(zoo_modal);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(zoo_toast0);
    			}

    			ctx.zoo_toast0_binding(null);

    			if (detaching) {
    				detach(t0);
    				detach(zoo_toast1);
    			}

    			ctx.zoo_toast1_binding(null);

    			if (detaching) {
    				detach(t1);
    				detach(app_context);
    				detach(t2);
    				detach(div1);
    				detach(t8);
    				detach(zoo_modal);
    			}

    			ctx.zoo_modal_binding(null);
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

    	function zoo_toast0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('toast', toast = $$value);
    		});
    	}

    	function zoo_toast1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('modalToast', modalToast = $$value);
    		});
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

    	function zoo_modal_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('modal', modal = $$value);
    		});
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

    		this.shadowRoot.innerHTML = `<style>.buttons{max-width:1280px;margin:20px auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));grid-gap:15px;width:90%}@media only screen and (max-width: 850px){.buttons{grid-template-columns:auto}}.slotted-span{display:block;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}zoo-tooltip{display:none}.top-tooltip{position:relative;display:inline-block}.top-tooltip:hover zoo-tooltip{display:block;animation:fadeTooltipIn 0.2s}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQnV0dG9ucy5zdmVsdGUiLCJzb3VyY2VzIjpbIkJ1dHRvbnMuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJhcHAtYnV0dG9uc1wiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcbjx6b28tdG9hc3QgdGV4dD1cIlNlYXJjaCBmb3IgbW9yZSB0aGFuIDguMDAwIHByb2R1Y3RzLlwiIGJpbmQ6dGhpcz17dG9hc3R9Pjwvem9vLXRvYXN0PlxyXG48em9vLXRvYXN0IHRleHQ9XCJBZGRlZCB0byBjYXJ0IVwiIGJpbmQ6dGhpcz17bW9kYWxUb2FzdH0+PC96b28tdG9hc3Q+XHJcbjxhcHAtY29udGV4dCB0ZXh0PVwiU2Vjb25kIHNlY3Rpb24gaXMgYSBzaG93Y2FzZSBvZiBidXR0b25zIGFuZCBtb2RhbHNcIj48L2FwcC1jb250ZXh0PlxyXG48ZGl2IGNsYXNzPVwiYnV0dG9uc1wiPlxyXG5cdDx6b28tYnV0dG9uIHNpemU9XCJzbWFsbFwiIG9uOmNsaWNrPVwieygpID0+IHRvYXN0LnNob3coKX1cIj5cclxuXHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCIgY2xhc3M9XCJzbG90dGVkLXNwYW5cIj5IZXJlIHdlIGhhdmUgYSB2ZXJ5IGxvbmcgdGV4dCBpbmRlZWQhPC9zcGFuPlxyXG5cdDwvem9vLWJ1dHRvbj5cclxuXHQ8em9vLWJ1dHRvbiBzaXplPVwic21hbGxcIiBkaXNhYmxlZD1cInt0cnVlfVwiIGNsYXNzPVwidG9wLXRvb2x0aXBcIj5cclxuXHRcdDxkaXYgc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj5cclxuXHRcdFx0RGlzYWJsZWQgOihcclxuXHRcdFx0PHpvby10b29sdGlwIHBvc2l0aW9uPVwiYm90dG9tXCIgdGV4dD1cIkp1c3Qgc2V0IGRpc2FibGVkIGF0dHJpYnV0ZSBvbiBgem9vLWJ1dHRvbmBcIj48L3pvby10b29sdGlwPlxyXG5cdFx0PC9kaXY+XHJcblx0PC96b28tYnV0dG9uPlxyXG5cdDx6b28tYnV0dG9uIHR5cGU9XCJob3RcIiBzaXplPVwic21hbGxcIiBvbjpjbGljaz1cInsoKSA9PiBtb2RhbC5vcGVuTW9kYWwoKX1cIj5cclxuXHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCIgY2xhc3M9XCJzbG90dGVkLXNwYW5cIj5TaG93IG1vZGFsPC9zcGFuPlxyXG5cdDwvem9vLWJ1dHRvbj5cclxuPC9kaXY+IFxyXG48em9vLW1vZGFsIHN0eWxlPVwiZGlzcGxheTogbm9uZVwiIGhlYWRlcnRleHQ9XCJZb3VyIGJhc2tldCBjb250YWlucyBsaWNlbnNlZCBpdGVtc1wiIGJpbmQ6dGhpcz17bW9kYWx9PlxyXG5cdDxkaXY+XHJcblx0XHQ8em9vLWZlZWRiYWNrIFxyXG5cdFx0dHlwZT1cImluZm9cIiBcclxuXHRcdHRleHQ9XCJUaGlzIGlzIGFuIGluZm8gbWVzc2FnZS4gT25seSBvbmUgY291cG9uIGNhbiBiZSBhY2NlcHRlZCB3aXRoIGVhY2ggb3JkZXIuIFBsZWFzZSBjaG9vc2Ugb25lIGNvdXBvbiB0aGF0IHlvdSBqdXN0IGVudGVyZWQuXCI+XHJcblx0XHQ8L3pvby1mZWVkYmFjaz5cclxuXHRcdDxicj5cclxuXHRcdDx6b28tc2VsZWN0IGxhYmVsdGV4dD1cIlRoaXMgcHJvZHVjdCBpcyBmb3JcIiBcclxuXHRcdFx0dmFsaWQ9XCJ7dHJ1ZX1cIj5cclxuXHRcdFx0PHNlbGVjdCBzbG90PVwic2VsZWN0ZWxlbWVudFwiPlxyXG5cdFx0XHRcdDxvcHRpb24gY2xhc3M9XCJwbGFjZWhvbGRlclwiIHZhbHVlPVwiXCIgZGlzYWJsZWQgc2VsZWN0ZWQ+RG9nZTwvb3B0aW9uPlxyXG5cdFx0XHRcdDxvcHRpb24+RG9nZTwvb3B0aW9uPlxyXG5cdFx0XHRcdDxvcHRpb24+Q2F0ejwvb3B0aW9uPlxyXG5cdFx0XHRcdDxvcHRpb24+U25lazwvb3B0aW9uPlxyXG5cdFx0XHQ8L3NlbGVjdD5cclxuXHRcdDwvem9vLXNlbGVjdD5cclxuXHRcdDxicj5cclxuXHRcdDx6b28tY2hlY2tib3ggaGlnaGxpZ2h0ZWRcclxuXHRcdFx0bGFiZWx0ZXh0PVwiSSB1bmRlcnN0YW5kIGFuZCBjb25maXJtIHRoYXQgQUxMIG9mIHRoZSBhYm92ZSBzdGF0ZW1lbnRzIGFyZSB0cnVlXCI+XHJcblx0XHRcdDxpbnB1dCBzbG90PVwiY2hlY2tib3hlbGVtZW50XCIgdHlwZT1cImNoZWNrYm94XCIvPlxyXG5cdFx0PC96b28tY2hlY2tib3g+XHJcblx0XHQ8YnI+XHJcblx0XHQ8em9vLWJ1dHRvbiB0eXBlPVwiaG90XCIgc2l6ZT1cIm1lZGl1bVwiIG9uOmNsaWNrPVwieygpID0+IGNsb3NlTW9kYWwoKX1cIj5cclxuXHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj5BZGQgdG8gY2FydDwvc3Bhbj5cclxuXHRcdDwvem9vLWJ1dHRvbj5cclxuXHQ8L2Rpdj5cclxuPC96b28tbW9kYWw+XHJcbjxzdHlsZSB0eXBlPSd0ZXh0L3Njc3MnPi5idXR0b25zIHtcbiAgbWF4LXdpZHRoOiAxMjgwcHg7XG4gIG1hcmdpbjogMjBweCBhdXRvO1xuICBkaXNwbGF5OiBncmlkO1xuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdChhdXRvLWZpbGwsIG1pbm1heCgzMjBweCwgMWZyKSk7XG4gIGdyaWQtZ2FwOiAxNXB4O1xuICB3aWR0aDogOTAlOyB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogODUwcHgpIHtcbiAgICAuYnV0dG9ucyB7XG4gICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IGF1dG87IH0gfVxuXG4uc2xvdHRlZC1zcGFuIHtcbiAgZGlzcGxheTogYmxvY2s7XG4gIHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzO1xuICBvdmVyZmxvdzogaGlkZGVuO1xuICB3aGl0ZS1zcGFjZTogbm93cmFwOyB9XG5cbnpvby10b29sdGlwIHtcbiAgZGlzcGxheTogbm9uZTsgfVxuXG4udG9wLXRvb2x0aXAge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGRpc3BsYXk6IGlubGluZS1ibG9jazsgfVxuICAudG9wLXRvb2x0aXA6aG92ZXIgem9vLXRvb2x0aXAge1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIGFuaW1hdGlvbjogZmFkZVRvb2x0aXBJbiAwLjJzOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cclxuPHNjcmlwdD5cclxuXHRsZXQgdG9hc3Q7XHJcblx0bGV0IG1vZGFsO1xyXG5cdGxldCBtb2RhbFRvYXN0O1xyXG5cclxuXHRjb25zdCBzaG93TW9kYWwgPSAoKSA9PiB7XHJcblx0XHRtb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuXHR9O1xyXG5cdGNvbnN0IGNsb3NlTW9kYWwgPSAoKSA9PiB7XHJcblx0XHRtb2RhbC5jbG9zZU1vZGFsKCk7XHJcblx0XHRtb2RhbFRvYXN0LnNob3coKTtcclxuXHR9XHJcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUE2Q3dCLFFBQVEsQUFBQyxDQUFDLEFBQ2hDLFNBQVMsQ0FBRSxNQUFNLENBQ2pCLE1BQU0sQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUNqQixPQUFPLENBQUUsSUFBSSxDQUNiLHFCQUFxQixDQUFFLE9BQU8sU0FBUyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUM1RCxRQUFRLENBQUUsSUFBSSxDQUNkLEtBQUssQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUNiLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pDLFFBQVEsQUFBQyxDQUFDLEFBQ1IscUJBQXFCLENBQUUsSUFBSSxBQUFFLENBQUMsQUFBQyxDQUFDLEFBRXRDLGFBQWEsQUFBQyxDQUFDLEFBQ2IsT0FBTyxDQUFFLEtBQUssQ0FDZCxhQUFhLENBQUUsUUFBUSxDQUN2QixRQUFRLENBQUUsTUFBTSxDQUNoQixXQUFXLENBQUUsTUFBTSxBQUFFLENBQUMsQUFFeEIsV0FBVyxBQUFDLENBQUMsQUFDWCxPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFbEIsWUFBWSxBQUFDLENBQUMsQUFDWixRQUFRLENBQUUsUUFBUSxDQUNsQixPQUFPLENBQUUsWUFBWSxBQUFFLENBQUMsQUFDeEIsWUFBWSxNQUFNLENBQUMsV0FBVyxBQUFDLENBQUMsQUFDOUIsT0FBTyxDQUFFLEtBQUssQ0FDZCxTQUFTLENBQUUsYUFBYSxDQUFDLElBQUksQUFBRSxDQUFDIn0= */</style>`;

    		init(this, { target: this.shadowRoot }, instance$3, create_fragment$3, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("app-buttons", Buttons);

    /* src\sections\TooltipAndFeedback.svelte generated by Svelte v3.9.0 */

    const file$4 = "src\\sections\\TooltipAndFeedback.svelte";

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
    			add_location(app_context, file$4, 1, 0, 66);
    			set_custom_element_data(zoo_feedback0, "type", "info");
    			set_custom_element_data(zoo_feedback0, "text", "This is an info message. This element will show tooltip on the right side on hover.");
    			add_location(zoo_feedback0, file$4, 4, 2, 226);
    			set_custom_element_data(zoo_tooltip0, "position", "right");
    			set_custom_element_data(zoo_tooltip0, "text", "Hello from right side.");
    			add_location(zoo_tooltip0, file$4, 5, 2, 362);
    			attr(div0, "class", "feedback-tooltip");
    			add_location(div0, file$4, 3, 1, 192);
    			set_custom_element_data(zoo_feedback1, "type", "error");
    			set_custom_element_data(zoo_feedback1, "text", "This is an error message. This element will show tooltip on the left side on hover.");
    			add_location(zoo_feedback1, file$4, 8, 2, 482);
    			set_custom_element_data(zoo_tooltip1, "position", "left");
    			set_custom_element_data(zoo_tooltip1, "text", "Hello from left side.");
    			add_location(zoo_tooltip1, file$4, 9, 2, 619);
    			attr(div1, "class", "feedback-tooltip");
    			add_location(div1, file$4, 7, 1, 448);
    			set_custom_element_data(zoo_feedback2, "type", "success");
    			set_custom_element_data(zoo_feedback2, "text", "This is a success message. This element will show tooltip on the bottom side on hover.");
    			add_location(zoo_feedback2, file$4, 12, 2, 737);
    			set_custom_element_data(zoo_tooltip2, "position", "bottom");
    			set_custom_element_data(zoo_tooltip2, "text", "Hello from below");
    			add_location(zoo_tooltip2, file$4, 13, 2, 879);
    			attr(div2, "class", "feedback-tooltip");
    			add_location(div2, file$4, 11, 1, 703);
    			attr(span, "class", "slotted-span");
    			attr(span, "slot", "buttoncontent");
    			add_location(span, file$4, 17, 3, 1043);
    			add_location(zoo_button, file$4, 16, 2, 994);
    			attr(input, "slot", "inputelement");
    			attr(input, "placeholder", "Search for more than 8.000 products");
    			add_location(input, file$4, 21, 4, 1295);
    			set_custom_element_data(zoo_input, "class", "input-in-tooltip");
    			add_location(zoo_input, file$4, 20, 3, 1253);
    			set_custom_element_data(zoo_tooltip3, "class", "nested-tooltip");
    			set_custom_element_data(zoo_tooltip3, "position", "right");
    			set_custom_element_data(zoo_tooltip3, "text", "Hello from nested tooltip.");
    			add_location(zoo_tooltip3, file$4, 23, 3, 1395);
    			set_custom_element_data(zoo_tooltip4, "text", "Hello from up above");
    			add_location(zoo_tooltip4, file$4, 19, 2, 1181);
    			attr(div3, "class", "special-tooltip");
    			add_location(div3, file$4, 15, 1, 960);
    			attr(div4, "class", "inner-content");
    			add_location(div4, file$4, 2, 0, 162);
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
    			ctx.zoo_tooltip4_binding(zoo_tooltip4);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div4);
    			}

    			ctx.zoo_tooltip4_binding(null);
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

    	function zoo_tooltip4_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('specialTooltip', specialTooltip = $$value);
    		});
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

    		this.shadowRoot.innerHTML = `<style>.inner-content{flex:1 0 auto;width:70%;margin:0 auto}.inner-content .feedback-tooltip{height:60px;margin-bottom:15px;position:relative}.inner-content .feedback-tooltip:hover zoo-tooltip{display:block;animation:fadeTooltipIn 0.2s}.special-tooltip{max-width:250px;position:relative;margin:0 auto;cursor:pointer}.special-tooltip .slotted-span{line-height:25px}zoo-tooltip{display:none}.input-in-tooltip:hover~.nested-tooltip{display:block;animation:fadeTooltipIn 0.2s}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHRpcEFuZEZlZWRiYWNrLnN2ZWx0ZSIsInNvdXJjZXMiOlsiVG9vbHRpcEFuZEZlZWRiYWNrLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiYXBwLXRvb2x0aXAtYW5kLWZlZWRiYWNrXCI+PC9zdmVsdGU6b3B0aW9ucz5cclxuPGFwcC1jb250ZXh0IHRleHQ9XCJUaGlyZCBzZWN0aW9uIGlzIGEgc2hvd2Nhc2Ugb2YgdG9vbHRpcHMgYW5kIGZlZWRiYWNrIGJveGVzLlwiPjwvYXBwLWNvbnRleHQ+XHJcbjxkaXYgY2xhc3M9XCJpbm5lci1jb250ZW50XCI+XHJcblx0PGRpdiBjbGFzcz1cImZlZWRiYWNrLXRvb2x0aXBcIj5cclxuXHRcdDx6b28tZmVlZGJhY2sgdHlwZT1cImluZm9cIiB0ZXh0PVwiVGhpcyBpcyBhbiBpbmZvIG1lc3NhZ2UuIFRoaXMgZWxlbWVudCB3aWxsIHNob3cgdG9vbHRpcCBvbiB0aGUgcmlnaHQgc2lkZSBvbiBob3Zlci5cIj48L3pvby1mZWVkYmFjaz5cclxuXHRcdDx6b28tdG9vbHRpcCBwb3NpdGlvbj1cInJpZ2h0XCIgdGV4dD1cIkhlbGxvIGZyb20gcmlnaHQgc2lkZS5cIj48L3pvby10b29sdGlwPlxyXG5cdDwvZGl2PlxyXG5cdDxkaXYgY2xhc3M9XCJmZWVkYmFjay10b29sdGlwXCI+XHJcblx0XHQ8em9vLWZlZWRiYWNrIHR5cGU9XCJlcnJvclwiIHRleHQ9XCJUaGlzIGlzIGFuIGVycm9yIG1lc3NhZ2UuIFRoaXMgZWxlbWVudCB3aWxsIHNob3cgdG9vbHRpcCBvbiB0aGUgbGVmdCBzaWRlIG9uIGhvdmVyLlwiPjwvem9vLWZlZWRiYWNrPlxyXG5cdFx0PHpvby10b29sdGlwIHBvc2l0aW9uPVwibGVmdFwiIHRleHQ9XCJIZWxsbyBmcm9tIGxlZnQgc2lkZS5cIj48L3pvby10b29sdGlwPlxyXG5cdDwvZGl2PlxyXG5cdDxkaXYgY2xhc3M9XCJmZWVkYmFjay10b29sdGlwXCI+XHJcblx0XHQ8em9vLWZlZWRiYWNrIHR5cGU9XCJzdWNjZXNzXCIgdGV4dD1cIlRoaXMgaXMgYSBzdWNjZXNzIG1lc3NhZ2UuIFRoaXMgZWxlbWVudCB3aWxsIHNob3cgdG9vbHRpcCBvbiB0aGUgYm90dG9tIHNpZGUgb24gaG92ZXIuXCI+PC96b28tZmVlZGJhY2s+XHJcblx0XHQ8em9vLXRvb2x0aXAgcG9zaXRpb249XCJib3R0b21cIiB0ZXh0PVwiSGVsbG8gZnJvbSBiZWxvd1wiPjwvem9vLXRvb2x0aXA+XHJcblx0PC9kaXY+XHJcblx0PGRpdiBjbGFzcz1cInNwZWNpYWwtdG9vbHRpcFwiPiBcclxuXHRcdDx6b28tYnV0dG9uIG9uOmNsaWNrPVwie3Nob3dTcGVjaWFsVG9vbHRpcH1cIj5cclxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzbG90dGVkLXNwYW5cIiBzbG90PVwiYnV0dG9uY29udGVudFwiPlRoaXMgZWxlbWVudCB3aWxsIHNob3cgdG9vbHRpcCBvbiB0b3Agb25seSB3aGVuIGl0IGlzIGNsaWNrZWQuPC9zcGFuPlxyXG5cdFx0PC96b28tYnV0dG9uPlxyXG5cdFx0PHpvby10b29sdGlwIGJpbmQ6dGhpcz17c3BlY2lhbFRvb2x0aXB9IHRleHQ9XCJIZWxsbyBmcm9tIHVwIGFib3ZlXCI+XHJcblx0XHRcdDx6b28taW5wdXQgY2xhc3M9XCJpbnB1dC1pbi10b29sdGlwXCI+XHJcblx0XHRcdFx0PGlucHV0IHNsb3Q9XCJpbnB1dGVsZW1lbnRcIiBwbGFjZWhvbGRlcj1cIlNlYXJjaCBmb3IgbW9yZSB0aGFuIDguMDAwIHByb2R1Y3RzXCIvPlxyXG5cdFx0XHQ8L3pvby1pbnB1dD5cclxuXHRcdFx0PHpvby10b29sdGlwIGNsYXNzPVwibmVzdGVkLXRvb2x0aXBcIiBwb3NpdGlvbj1cInJpZ2h0XCIgdGV4dD1cIkhlbGxvIGZyb20gbmVzdGVkIHRvb2x0aXAuXCI+XHJcblx0XHRcdDwvem9vLXRvb2x0aXA+XHJcblx0XHQ8L3pvby10b29sdGlwPlxyXG5cdDwvZGl2PlxyXG48L2Rpdj5cclxuXHJcbjxzdHlsZSB0eXBlPSd0ZXh0L3Njc3MnPi5pbm5lci1jb250ZW50IHtcbiAgZmxleDogMSAwIGF1dG87XG4gIHdpZHRoOiA3MCU7XG4gIG1hcmdpbjogMCBhdXRvOyB9XG4gIC5pbm5lci1jb250ZW50IC5mZWVkYmFjay10b29sdGlwIHtcbiAgICBoZWlnaHQ6IDYwcHg7XG4gICAgbWFyZ2luLWJvdHRvbTogMTVweDtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7IH1cbiAgICAuaW5uZXItY29udGVudCAuZmVlZGJhY2stdG9vbHRpcDpob3ZlciB6b28tdG9vbHRpcCB7XG4gICAgICBkaXNwbGF5OiBibG9jaztcbiAgICAgIGFuaW1hdGlvbjogZmFkZVRvb2x0aXBJbiAwLjJzOyB9XG5cbi5zcGVjaWFsLXRvb2x0aXAge1xuICBtYXgtd2lkdGg6IDI1MHB4O1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIG1hcmdpbjogMCBhdXRvO1xuICBjdXJzb3I6IHBvaW50ZXI7IH1cbiAgLnNwZWNpYWwtdG9vbHRpcCAuc2xvdHRlZC1zcGFuIHtcbiAgICBsaW5lLWhlaWdodDogMjVweDsgfVxuXG4udG9wLXRvb2x0aXAge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGRpc3BsYXk6IGlubGluZS1ibG9jazsgfVxuICAudG9wLXRvb2x0aXA6aG92ZXIgem9vLXRvb2x0aXAge1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIGFuaW1hdGlvbjogZmFkZVRvb2x0aXBJbiAwLjJzOyB9XG5cbnpvby10b29sdGlwIHtcbiAgZGlzcGxheTogbm9uZTsgfVxuXG4uaW5wdXQtaW4tdG9vbHRpcDpob3ZlciB+IC5uZXN0ZWQtdG9vbHRpcCB7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICBhbmltYXRpb246IGZhZGVUb29sdGlwSW4gMC4yczsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XHJcblxyXG48c2NyaXB0PlxyXG5cdGxldCBzcGVjaWFsVG9vbHRpcDtcclxuXHRjb25zdCBzaG93U3BlY2lhbFRvb2x0aXAgPSAoKSA9PiB7XHJcblx0XHRjb25zdCBlbFN0eWxlID0gc3BlY2lhbFRvb2x0aXAuc3R5bGU7XHJcblx0XHRjb25zdCBkaXNwbGF5ID0gIWVsU3R5bGUuZGlzcGxheSB8fCBlbFN0eWxlLmRpc3BsYXkgPT09ICdub25lJyA/ICdibG9jaycgOiAnbm9uZSc7XHJcblx0XHRlbFN0eWxlLmRpc3BsYXkgPSBkaXNwbGF5O1xyXG5cdH07XHJcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUE2QndCLGNBQWMsQUFBQyxDQUFDLEFBQ3RDLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDZCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFDakIsY0FBYyxDQUFDLGlCQUFpQixBQUFDLENBQUMsQUFDaEMsTUFBTSxDQUFFLElBQUksQ0FDWixhQUFhLENBQUUsSUFBSSxDQUNuQixRQUFRLENBQUUsUUFBUSxBQUFFLENBQUMsQUFDckIsY0FBYyxDQUFDLGlCQUFpQixNQUFNLENBQUMsV0FBVyxBQUFDLENBQUMsQUFDbEQsT0FBTyxDQUFFLEtBQUssQ0FDZCxTQUFTLENBQUUsYUFBYSxDQUFDLElBQUksQUFBRSxDQUFDLEFBRXRDLGdCQUFnQixBQUFDLENBQUMsQUFDaEIsU0FBUyxDQUFFLEtBQUssQ0FDaEIsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLENBQ2QsTUFBTSxDQUFFLE9BQU8sQUFBRSxDQUFDLEFBQ2xCLGdCQUFnQixDQUFDLGFBQWEsQUFBQyxDQUFDLEFBQzlCLFdBQVcsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQVN4QixXQUFXLEFBQUMsQ0FBQyxBQUNYLE9BQU8sQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUVsQixpQkFBaUIsTUFBTSxDQUFHLGVBQWUsQUFBQyxDQUFDLEFBQ3pDLE9BQU8sQ0FBRSxLQUFLLENBQ2QsU0FBUyxDQUFFLGFBQWEsQ0FBQyxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

    		init(this, { target: this.shadowRoot }, instance$4, create_fragment$4, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("app-tooltip-and-feedback", TooltipAndFeedback);

    /* src\docs\ButtonDocs.svelte generated by Svelte v3.9.0 */

    const file$5 = "src\\docs\\ButtonDocs.svelte";

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
    			t31 = text("\r\n\t\twill produce the following:\r\n\t\t");
    			div1 = element("div");
    			zoo_button = element("zoo-button");
    			span = element("span");
    			span.textContent = "Shopping Cart";
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Button component API.");
    			add_location(app_context, file$5, 2, 0, 55);
    			add_location(b0, file$5, 9, 6, 276);
    			add_location(b1, file$5, 9, 46, 316);
    			add_location(b2, file$5, 9, 59, 329);
    			add_location(b3, file$5, 9, 82, 352);
    			add_location(li0, file$5, 8, 5, 264);
    			add_location(b4, file$5, 12, 6, 395);
    			add_location(b5, file$5, 12, 46, 435);
    			add_location(b6, file$5, 12, 59, 448);
    			add_location(b7, file$5, 12, 74, 463);
    			add_location(b8, file$5, 12, 97, 486);
    			add_location(li1, file$5, 11, 5, 383);
    			add_location(b9, file$5, 15, 6, 530);
    			add_location(li2, file$5, 14, 5, 518);
    			add_location(ul, file$5, 7, 4, 253);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$5, 6, 3, 207);
    			add_location(b10, file$5, 20, 30, 725);
    			add_location(b11, file$5, 20, 86, 781);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$5, 19, 3, 653);
    			add_location(zoo_collapsable_list, file$5, 5, 2, 163);
    			attr(div0, "class", "list");
    			add_location(div0, file$5, 4, 1, 141);
    			add_location(pre, file$5, 25, 8, 1008);
    			add_location(code, file$5, 25, 2, 1002);
    			attr(span, "slot", "buttoncontent");
    			add_location(span, file$5, 29, 4, 1145);
    			set_custom_element_data(zoo_button, "type", "hot");
    			set_custom_element_data(zoo_button, "size", "medium");
    			add_location(zoo_button, file$5, 28, 3, 1102);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$5, 27, 2, 1070);
    			attr(div2, "class", "example");
    			add_location(div2, file$5, 24, 1, 977);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$5, 3, 0, 113);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
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

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQnV0dG9uRG9jcy5zdmVsdGUiLCJzb3VyY2VzIjpbIkJ1dHRvbkRvY3Muc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJkb2NzLWJ1dHRvblwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIkJ1dHRvbiBjb21wb25lbnQgQVBJLlwiPjwvYXBwLWNvbnRleHQ+XHJcbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxyXG5cdDxkaXYgY2xhc3M9XCJsaXN0XCI+XHJcblx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtsaXN0fT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XHJcblx0XHRcdFx0PHVsPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj50eXBlPC9iPiAtIGFjY2VwdHMgZm9sbG93aW5nIHZhbHVlczogPGI+Y29sZDwvYj4sIDxiPmhvdDwvYj4uIERlZmF1bHQgaXMgPGI+Y29sZDwvYj47XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5zaXplPC9iPiAtIGFjY2VwdHMgZm9sbG93aW5nIHZhbHVlczogPGI+c21hbDwvYj4sIDxiPm1lZGl1bTwvYj4sIDxiPmJpZzwvYj4uIERlZmF1bHQgaXMgPGI+c21hbGw8L2I+O1xyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+ZGlzYWJsZTwvYj4gLSB3aGV0aGVyIHRoZSBidXR0b24gc2hvdWxkIGJlIGRpc2FibGVkIG9yIG5vdC5cclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0PC91bD5cclxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTFcIj5cclxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBhY2NlcHQgb25lIDxiPntidXR0b25TbG90VGV4dH08L2I+IHdoaWNoIGlzIHJlcGxhY2VkIHdpdGggcHJvdmlkZWQgPGI+ZWxlbWVudDwvYj4gc28gdGhhdCB5b3UgY2FuIGNhdGNoIGV2ZW50cy9wcm92aWRlIHlvdXIgY3NzL2F0dGFjaCBmcmFtZXdvcmsgc3BlY2lmaWMgZGlyZWN0aXZlcyBmcm9tL3RvIHRoaXMgZWxlbWVudC4gICAgIFxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxyXG5cdDwvZGl2PlxyXG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XHJcblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cclxuXHRcdHdpbGwgcHJvZHVjZSB0aGUgZm9sbG93aW5nOlxyXG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cclxuXHRcdFx0PHpvby1idXR0b24gdHlwZT1cImhvdFwiIHNpemU9XCJtZWRpdW1cIj5cclxuXHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPlNob3BwaW5nIENhcnQ8L3NwYW4+XHJcblx0XHRcdDwvem9vLWJ1dHRvbj5cclxuXHRcdDwvZGl2PlxyXG5cdDwvZGl2PlxyXG48L2Rpdj5cclxuXHJcbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxyXG5cclxuPHNjcmlwdD5cclxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcclxuXHRsZXQgbGlzdDtcclxuXHRsZXQgYnV0dG9uU2xvdFRleHQgPSBgPHNsb3QgbmFtZT1cImJ1dHRvbmNvbnRlbnRcIj48L3Nsb3Q+YDtcclxuXHRsZXQgZXhhbXBsZSA9IGA8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxcbiAgPHpvby1idXR0b24gdHlwZT1cImhvdFwiIHNpemU9XCJtZWRpdW1cIj5cXG4gICAgPHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj5TaG9wcGluZyBDYXJ0PC9zcGFuPlxcbiAgPC96b28tYnV0dG9uPlxcbjwvZGl2PmA7XHJcblx0b25Nb3VudCgoKSA9PiB7XHJcblx0XHRsaXN0Lml0ZW1zID0gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0aGVhZGVyOiAnQVBJJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aGVhZGVyOiAnU2xvdHMnXHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSk7XHJcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFtQ3dCLFlBQVksQUFBQyxDQUFDLEFBQ3BDLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBRXhCLEtBQUssQUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBRW5CLFFBQVEsQUFBQyxDQUFDLEFBQ1IsUUFBUSxDQUFFLElBQUksQUFBRSxDQUFDIn0= */</style>`;

    		init(this, { target: this.shadowRoot }, instance$5, create_fragment$5, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-button", ButtonDocs);

    /* src\docs\CheckboxDocs.svelte generated by Svelte v3.9.0 */

    const file$6 = "src\\docs\\CheckboxDocs.svelte";

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
    			t20 = text("\r\n\t\twill produce the following:\r\n\t\t");
    			div1 = element("div");
    			zoo_checkbox = element("zoo-checkbox");
    			input = element("input");
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Checkbox component API.");
    			add_location(app_context, file$6, 1, 0, 55);
    			add_location(b0, file$6, 8, 6, 278);
    			add_location(li0, file$6, 7, 5, 266);
    			add_location(b1, file$6, 11, 6, 383);
    			add_location(li1, file$6, 10, 5, 371);
    			add_location(b2, file$6, 14, 6, 484);
    			add_location(li2, file$6, 13, 5, 472);
    			add_location(b3, file$6, 17, 6, 579);
    			add_location(li3, file$6, 16, 5, 567);
    			add_location(ul, file$6, 6, 4, 255);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$6, 5, 3, 209);
    			add_location(b4, file$6, 22, 30, 813);
    			add_location(b5, file$6, 22, 85, 868);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$6, 21, 3, 741);
    			add_location(zoo_collapsable_list, file$6, 4, 2, 165);
    			attr(div0, "class", "list");
    			add_location(div0, file$6, 3, 1, 143);
    			add_location(pre, file$6, 27, 8, 1095);
    			add_location(code, file$6, 27, 2, 1089);
    			attr(input, "slot", "checkboxelement");
    			attr(input, "type", "checkbox");
    			add_location(input, file$6, 31, 4, 1280);
    			set_custom_element_data(zoo_checkbox, "highlighted", "1");
    			set_custom_element_data(zoo_checkbox, "labeltext", "Example label for this particular checkbox");
    			add_location(zoo_checkbox, file$6, 30, 3, 1189);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$6, 29, 2, 1157);
    			attr(div2, "class", "example");
    			add_location(div2, file$6, 26, 1, 1064);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$6, 2, 0, 115);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
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

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hlY2tib3hEb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQ2hlY2tib3hEb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy1jaGVja2JveFwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcbjxhcHAtY29udGV4dCB0ZXh0PVwiQ2hlY2tib3ggY29tcG9uZW50IEFQSS5cIj48L2FwcC1jb250ZXh0PlxyXG48ZGl2IGNsYXNzPVwiZG9jLWVsZW1lbnRcIj5cclxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxyXG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XHJcblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMFwiPlxyXG5cdFx0XHRcdDx1bD5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+bGFiZWx0ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIG9uIHRoZSByaWdodCBzaWRlIG9mIHRoZSBjaGVja2JveDtcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPnZhbGlkPC9iPiAtIGZsYWcgd2hpY2ggaW5kaWNhdGVzIHdoZXRoZXIgdGhlIGlucHV0IGlzIHZhbGlkIG9yIG5vdDtcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmRpc2FibGVkPC9iPiAtIGZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBpbnB1dCBpcyBkaXNhYmxlZC5cclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmhpZ2hsaWdodGVkPC9iPiAtIGZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBvdXRsaW5lIGFyb3VuZCB0aGUgaW5wdXQgc2hvdWxkIGJlIHZpc2libGUgKGJvcmRlcikuXHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdDwvdWw+XHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XHJcblx0XHRcdFx0VGhpcyBjb21wb25lbnQgYWNjZXB0IG9uZSA8Yj57aW5wdXRTbG90VGV4dH08L2I+IHdoaWNoIGlzIHJlcGxhY2VkIHdpdGggcHJvdmlkZWQgPGI+ZWxlbWVudDwvYj4gc28gdGhhdCB5b3UgY2FuIGNhdGNoIGV2ZW50cy9wcm92aWRlIHlvdXIgY3NzL2F0dGFjaCBmcmFtZXdvcmsgc3BlY2lmaWMgZGlyZWN0aXZlcyBmcm9tL3RvIHRoaXMgZWxlbWVudC4gICAgIFxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxyXG5cdDwvZGl2PlxyXG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XHJcblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cclxuXHRcdHdpbGwgcHJvZHVjZSB0aGUgZm9sbG93aW5nOlxyXG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cclxuXHRcdFx0PHpvby1jaGVja2JveCBoaWdobGlnaHRlZD1cIjFcIiBsYWJlbHRleHQ9XCJFeGFtcGxlIGxhYmVsIGZvciB0aGlzIHBhcnRpY3VsYXIgY2hlY2tib3hcIj5cclxuXHRcdFx0XHQ8aW5wdXQgc2xvdD1cImNoZWNrYm94ZWxlbWVudFwiIHR5cGU9XCJjaGVja2JveFwiLz5cclxuXHRcdFx0PC96b28tY2hlY2tib3g+XHJcblx0XHQ8L2Rpdj5cclxuXHQ8L2Rpdj5cclxuPC9kaXY+XHJcblxyXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5kb2MtZWxlbWVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7IH1cblxuLmxpc3Qge1xuICB3aWR0aDogMzUlO1xuICBtYXJnaW46IDAgMjBweDsgfVxuXG4uZXhhbXBsZSB7XG4gIG92ZXJmbG93OiBhdXRvOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cclxuXHJcbjxzY3JpcHQ+XHJcblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XHJcblx0bGV0IGxpc3Q7XHJcblx0bGV0IGlucHV0U2xvdFRleHQgPSBgPHNsb3QgbmFtZT1cImNoZWNrYm94ZWxlbWVudFwiPjwvc2xvdD5gO1xyXG5cdGxldCBleGFtcGxlID0gYDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHg7XCI+XFxuICA8em9vLWNoZWNrYm94IGhpZ2hsaWdodGVkPVwiMVwiIGxhYmVsdGV4dD1cIkV4YW1wbGUgbGFiZWwgZm9yIHRoaXMgcGFydGljdWxhciBjaGVja2JveFwiPlxcbiAgICA8aW5wdXQgc2xvdD1cImNoZWNrYm94ZWxlbWVudFwiIHR5cGU9XCJjaGVja2JveFwiLz5cXG4gIDwvem9vLWNoZWNrYm94PlxcbjwvZGl2PmA7XHJcblx0b25Nb3VudCgoKSA9PiB7XHJcblx0XHRsaXN0Lml0ZW1zID0gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0aGVhZGVyOiAnQVBJJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aGVhZGVyOiAnU2xvdHMnXHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSk7XHJcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFxQ3dCLFlBQVksQUFBQyxDQUFDLEFBQ3BDLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBRXhCLEtBQUssQUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBRW5CLFFBQVEsQUFBQyxDQUFDLEFBQ1IsUUFBUSxDQUFFLElBQUksQUFBRSxDQUFDIn0= */</style>`;

    		init(this, { target: this.shadowRoot }, instance$6, create_fragment$6, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-checkbox", CheckboxDocs);

    /* src\docs\CollapsableListDocs.svelte generated by Svelte v3.9.0 */

    const file$7 = "src\\docs\\CollapsableListDocs.svelte";

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
    			t16 = text("\r\n\t\twill produce the following:\r\n\t\t");
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
    			add_location(app_context, file$7, 1, 0, 63);
    			add_location(b0, file$7, 8, 6, 294);
    			add_location(code0, file$7, 8, 56, 344);
    			add_location(li0, file$7, 7, 5, 282);
    			add_location(b1, file$7, 11, 6, 402);
    			add_location(li1, file$7, 10, 5, 390);
    			add_location(ul, file$7, 6, 4, 271);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$7, 5, 3, 225);
    			add_location(b2, file$7, 16, 36, 641);
    			add_location(b3, file$7, 16, 91, 696);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$7, 15, 3, 563);
    			add_location(zoo_collapsable_list0, file$7, 4, 2, 181);
    			attr(div0, "class", "list");
    			add_location(div0, file$7, 3, 1, 159);
    			add_location(pre, file$7, 21, 8, 815);
    			add_location(code1, file$7, 21, 2, 809);
    			add_location(span0, file$7, 26, 5, 1023);
    			set_custom_element_data(zoo_collapsable_list_item2, "slot", "item0");
    			add_location(zoo_collapsable_list_item2, file$7, 25, 4, 976);
    			add_location(span1, file$7, 29, 5, 1134);
    			set_custom_element_data(zoo_collapsable_list_item3, "slot", "item1");
    			add_location(zoo_collapsable_list_item3, file$7, 28, 4, 1087);
    			add_location(zoo_collapsable_list1, file$7, 24, 3, 924);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$7, 23, 2, 892);
    			attr(div2, "class", "example");
    			add_location(div2, file$7, 20, 1, 784);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$7, 2, 0, 131);
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
    			ctx.zoo_collapsable_list0_binding(zoo_collapsable_list0);
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
    			ctx.zoo_collapsable_list1_binding(zoo_collapsable_list1);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list0_binding(null);
    			ctx.zoo_collapsable_list1_binding(null);
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

    	function zoo_collapsable_list0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
    	}

    	function zoo_collapsable_list1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('exampleList', exampleList = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29sbGFwc2FibGVMaXN0RG9jcy5zdmVsdGUiLCJzb3VyY2VzIjpbIkNvbGxhcHNhYmxlTGlzdERvY3Muc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJkb2NzLWNvbGxhcHNhYmxlLWxpc3RcIj48L3N2ZWx0ZTpvcHRpb25zPlxyXG48YXBwLWNvbnRleHQgdGV4dD1cIkNvbGxhcHNhYmxlIExpc3QgY29tcG9uZW50IEFQSS5cIj48L2FwcC1jb250ZXh0PlxyXG48ZGl2IGNsYXNzPVwiZG9jLWVsZW1lbnRcIj5cclxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxyXG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XHJcblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMFwiPlxyXG5cdFx0XHRcdDx1bD5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+aXRlbXM8L2I+IC0gYXJyYXkgb2Ygb2JqZWN0cyBvZiB3aXRoIG9uZSBmaWVsZCA8Y29kZT5oZWFkZXI6IHN0cmluZzwvY29kZT5cclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmhpZ2hsaWdodGVkPC9iPiAtIGZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBvdXRsaW5lIGFyb3VuZCB0aGUgaW5wdXQgc2hvdWxkIGJlIHZpc2libGUgKGJvcmRlcilcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0PC91bD5cclxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTFcIj5cclxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBhY2NlcHRzIG11bHRpcGxlIDxiPntsaXN0U2xvdFRleHR9PC9iPiB3aGljaCBhcmUgcmVwbGFjZWQgd2l0aCBwcm92aWRlZCA8Yj5lbGVtZW50czwvYj4uXHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cclxuXHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3Q+XHJcblx0PC9kaXY+XHJcblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cclxuXHRcdDxjb2RlPjxwcmU+e2V4YW1wbGV9e3NjcmlwdEV4YW1wbGV9PC9wcmU+PC9jb2RlPlxyXG5cdFx0d2lsbCBwcm9kdWNlIHRoZSBmb2xsb3dpbmc6XHJcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtleGFtcGxlTGlzdH0+XHJcblx0XHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XHJcblx0XHRcdFx0XHQ8c3Bhbj5pbm5lciBpdGVtMDwvc3Bhbj5cclxuXHRcdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XHJcblx0XHRcdFx0XHQ8c3Bhbj5pbm5lciBpdGVtMTwvc3Bhbj5cclxuXHRcdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3Q+XHJcblx0XHQ8L2Rpdj5cclxuXHQ8L2Rpdj5cclxuPC9kaXY+XHJcblxyXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5kb2MtZWxlbWVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7IH1cblxuLmxpc3Qge1xuICB3aWR0aDogMzUlO1xuICBtYXJnaW46IDAgMjBweDsgfVxuXG4uZXhhbXBsZSB7XG4gIG92ZXJmbG93OiBhdXRvOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cclxuXHJcbjxzY3JpcHQ+XHJcblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XHJcblx0bGV0IGxpc3Q7XHJcblx0bGV0IGxpc3RTbG90VGV4dCA9IGA8c2xvdCBuYW1lPVwiaXRlbXtpZHh9XCI+PC9zbG90PmA7XHJcblx0bGV0IGV4YW1wbGUgPSBgPGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cXG4gIDx6b28tY29sbGFwc2FibGUtbGlzdCBpZD1cImxpc3RcIj5cXG4gICAgPHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XFxuICAgICAgPHNwYW4+aW5uZXIgaXRlbTA8L3NwYW4+XFxuICAgIDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cXG4gICAgPHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XFxuICAgICAgPHNwYW4+aW5uZXIgaXRlbTE8L3NwYW4+XFxuICAgIDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cXG4gIDwvem9vLWNvbGxhcHNhYmxlLWxpc3Q+XFxuPC9kaXY+YDtcclxuXHRsZXQgc2NyaXB0RXhhbXBsZSA9IGBcXG48c2NyaXB0PlxcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xpc3QnKS5pdGVtcz1be2hlYWRlcjogaXRlbTB9LCB7aGVhZGVyOiBpdGVtMX1dO1xcbjxcXC9zY3JpcHQ+YDtcclxuXHRsZXQgZXhhbXBsZUxpc3Q7XHJcblx0b25Nb3VudCgoKSA9PiB7XHJcblx0XHRsaXN0Lml0ZW1zID0gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0aGVhZGVyOiAnQVBJJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aGVhZGVyOiAnU2xvdHMnXHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0XHRleGFtcGxlTGlzdC5pdGVtcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhlYWRlcjogJ2l0ZW0wJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aGVhZGVyOiAnaXRlbTEnXHJcblx0XHRcdH1cclxuXHRcdF07XHJcblx0fSk7XHJcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFvQ3dCLFlBQVksQUFBQyxDQUFDLEFBQ3BDLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBRXhCLEtBQUssQUFBQyxDQUFDLEFBQ0wsS0FBSyxDQUFFLEdBQUcsQ0FDVixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQUFBRSxDQUFDLEFBRW5CLFFBQVEsQUFBQyxDQUFDLEFBQ1IsUUFBUSxDQUFFLElBQUksQUFBRSxDQUFDIn0= */</style>`;

    		init(this, { target: this.shadowRoot }, instance$7, create_fragment$7, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-collapsable-list", CollapsableListDocs);

    /* src\docs\FeedbackDocs.svelte generated by Svelte v3.9.0 */

    const file$8 = "src\\docs\\FeedbackDocs.svelte";

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
    			t18 = text("\r\n\t\twill produce the following:\r\n\t\t");
    			div1 = element("div");
    			zoo_feedback = element("zoo-feedback");
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Feedback component API.");
    			add_location(app_context, file$8, 1, 0, 55);
    			add_location(b0, file$8, 8, 6, 278);
    			add_location(li0, file$8, 7, 5, 266);
    			add_location(b1, file$8, 11, 6, 363);
    			add_location(b2, file$8, 11, 63, 420);
    			add_location(b3, file$8, 11, 77, 434);
    			add_location(b4, file$8, 11, 90, 447);
    			add_location(b5, file$8, 11, 117, 474);
    			add_location(li1, file$8, 10, 5, 351);
    			add_location(ul, file$8, 6, 4, 255);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$8, 5, 3, 209);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$8, 15, 3, 547);
    			add_location(zoo_collapsable_list, file$8, 4, 2, 165);
    			attr(div0, "class", "list");
    			add_location(div0, file$8, 3, 1, 143);
    			add_location(pre, file$8, 21, 8, 737);
    			add_location(code, file$8, 21, 2, 731);
    			set_custom_element_data(zoo_feedback, "text", "This is an info message.");
    			add_location(zoo_feedback, file$8, 24, 3, 831);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$8, 23, 2, 799);
    			attr(div2, "class", "example");
    			add_location(div2, file$8, 20, 1, 706);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$8, 2, 0, 115);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
    			append(div3, t16);
    			append(div3, div2);
    			append(div2, code);
    			append(code, pre);
    			append(pre, t17);
    			append(div2, t18);
    			append(div2, div1);
    			append(div1, zoo_feedback);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmVlZGJhY2tEb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiRmVlZGJhY2tEb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy1mZWVkYmFja1wiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcbjxhcHAtY29udGV4dCB0ZXh0PVwiRmVlZGJhY2sgY29tcG9uZW50IEFQSS5cIj48L2FwcC1jb250ZXh0PlxyXG48ZGl2IGNsYXNzPVwiZG9jLWVsZW1lbnRcIj5cclxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxyXG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XHJcblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMFwiPlxyXG5cdFx0XHRcdDx1bD5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+dGV4dDwvYj4gLSB0ZXh0IHRvIGJlIHByZXNlbnRlZCBpbiB0aGUgZmVlZGJhY2sgYm94XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj50eXBlPC9iPiAtIHR5cGUgb2YgdGhlIGZlZWRiYWNrLiBQb3NzaWJsZSB2YWx1ZXMgYXJlOiA8Yj5lcnJvcjwvYj4sIDxiPmluZm88L2I+LCA8Yj5zdWNjZXNzPC9iPi4gRGVmYXVsdCBpcyA8Yj5pbmZvPC9iPjtcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0PC91bD5cclxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTFcIj5cclxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBkb2VzIG5vdCBhY2NlcHQgYW55IHNsb3RzLlxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxyXG5cdDwvZGl2PlxyXG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XHJcblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cclxuXHRcdHdpbGwgcHJvZHVjZSB0aGUgZm9sbG93aW5nOlxyXG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cclxuXHRcdFx0PHpvby1mZWVkYmFjayB0ZXh0PVwiVGhpcyBpcyBhbiBpbmZvIG1lc3NhZ2UuXCI+PC96b28tZmVlZGJhY2s+XHJcblx0XHQ8L2Rpdj5cclxuXHQ8L2Rpdj5cclxuPC9kaXY+XHJcblxyXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5kb2MtZWxlbWVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7IH1cblxuLmxpc3Qge1xuICB3aWR0aDogMzUlO1xuICBtYXJnaW46IDAgMjBweDsgfVxuXG4uZXhhbXBsZSB7XG4gIG92ZXJmbG93OiBhdXRvOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cclxuXHJcbjxzY3JpcHQ+XHJcblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XHJcblx0bGV0IGxpc3Q7XHJcblx0bGV0IGlucHV0U2xvdFRleHQgPSBgPHNsb3QgbmFtZT1cImNoZWNrYm94ZWxlbWVudFwiPjwvc2xvdD5gO1xyXG5cdGxldCBleGFtcGxlID0gYDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHg7XCI+XFxuICA8em9vLWZlZWRiYWNrIHRleHQ9XCJUaGlzIGlzIGFuIGluZm8gbWVzc2FnZS5cIj48L3pvby1mZWVkYmFjaz5cXG48L2Rpdj5gO1xyXG5cdG9uTW91bnQoKCkgPT4ge1xyXG5cdFx0bGlzdC5pdGVtcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhlYWRlcjogJ0FQSSdcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhlYWRlcjogJ1Nsb3RzJ1xyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0pO1xyXG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBNkJ3QixZQUFZLEFBQUMsQ0FBQyxBQUNwQyxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUV4QixLQUFLLEFBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxHQUFHLENBQ1YsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixRQUFRLEFBQUMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

    		init(this, { target: this.shadowRoot }, instance$8, create_fragment$8, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-feedback", FeedbackDocs);

    /* src\docs\FooterDocs.svelte generated by Svelte v3.9.0 */

    const file$9 = "src\\docs\\FooterDocs.svelte";

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
    			t4 = text(" of objects where each object has the following structure:\r\n\t\t\t\t\t\t");
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
    			t35 = text("\r\n\t\twill produce the following:\r\n\t\t");
    			div1 = element("div");
    			zoo_footer = element("zoo-footer");
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Footer component API.");
    			add_location(app_context, file$9, 2, 0, 55);
    			add_location(b0, file$9, 9, 6, 276);
    			add_location(b1, file$9, 9, 30, 300);
    			add_location(b2, file$9, 12, 8, 405);
    			add_location(li0, file$9, 11, 7, 391);
    			add_location(b3, file$9, 15, 8, 467);
    			add_location(li1, file$9, 14, 7, 453);
    			add_location(b4, file$9, 18, 8, 546);
    			add_location(b5, file$9, 18, 62, 600);
    			add_location(li2, file$9, 17, 7, 532);
    			add_location(b6, file$9, 21, 8, 656);
    			add_location(b7, file$9, 21, 51, 699);
    			add_location(b8, file$9, 21, 71, 719);
    			add_location(b9, file$9, 21, 95, 743);
    			add_location(li3, file$9, 20, 7, 642);
    			add_location(b10, file$9, 24, 8, 853);
    			add_location(li4, file$9, 23, 7, 839);
    			add_location(b11, file$9, 27, 8, 966);
    			add_location(li5, file$9, 26, 7, 952);
    			add_location(ul0, file$9, 10, 6, 378);
    			add_location(li6, file$9, 8, 5, 264);
    			add_location(ul1, file$9, 7, 4, 253);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$9, 6, 3, 207);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$9, 33, 3, 1147);
    			add_location(zoo_collapsable_list, file$9, 5, 2, 163);
    			attr(div0, "class", "list");
    			add_location(div0, file$9, 4, 1, 141);
    			add_location(pre, file$9, 39, 8, 1333);
    			add_location(code, file$9, 39, 2, 1327);
    			add_location(zoo_footer, file$9, 42, 3, 1442);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$9, 41, 2, 1410);
    			attr(div2, "class", "example");
    			add_location(div2, file$9, 38, 1, 1302);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$9, 3, 0, 113);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
    			append(div3, t32);
    			append(div3, div2);
    			append(div2, code);
    			append(code, pre);
    			append(pre, t33);
    			append(pre, t34);
    			append(div2, t35);
    			append(div2, div1);
    			append(div1, zoo_footer);
    			ctx.zoo_footer_binding(zoo_footer);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list_binding(null);
    			ctx.zoo_footer_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
    	}

    	function zoo_footer_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('exampleFooter', exampleFooter = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9vdGVyRG9jcy5zdmVsdGUiLCJzb3VyY2VzIjpbIkZvb3RlckRvY3Muc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJkb2NzLWZvb3RlclwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIkZvb3RlciBjb21wb25lbnQgQVBJLlwiPjwvYXBwLWNvbnRleHQ+XHJcbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxyXG5cdDxkaXYgY2xhc3M9XCJsaXN0XCI+XHJcblx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtsaXN0fT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XHJcblx0XHRcdFx0PHVsPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5mb290ZXJsaW5rczwvYj4gLSBhbiA8Yj5hcnJheTwvYj4gb2Ygb2JqZWN0cyB3aGVyZSBlYWNoIG9iamVjdCBoYXMgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XHJcblx0XHRcdFx0XHRcdDx1bD5cclxuXHRcdFx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdFx0XHQ8Yj5ocmVmPC9iPiAtIGRpcmVjdCBsaW5rXHJcblx0XHRcdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdFx0XHQ8Yj50ZXh0PC9iPiAtIHRleHQgdG8gYmUgZGlzcGxheWVkIGFzIGxpbmtcclxuXHRcdFx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0XHRcdDxiPnRhcmdldDwvYj4gLSBob3cgdGhlIGxpbmsgc2hvdWxkIGJlaGF2ZSAoZGVmYXVsdCAtIDxiPmFib3V0OmJsYW5rPC9iPilcclxuXHRcdFx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0XHRcdDxiPnR5cGU8L2I+IC0gY3VycmVudGx5IHN1cHBvcnRzIDIgdmFsdWVzOiA8Yj5zdGFuZGFyZDwvYj4gYW5kIDxiPmdyZWVuPC9iPiwgZGVmYXVsdCAtIDxiPnN0YW5kYXJkPC9iPi4gUmVzcG9uc2libGUgZm9yIGNvbG9yaW5nIG9mIHRoZSBsaW5rcywgc3RhbmRhcmQgaXMgd2hpdGVcclxuXHRcdFx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0XHRcdDxiPmRpc2FibGVkPC9iPiAtIGZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBhbmNob3IgbGluayBzaG91bGQgYmUgZGlzYWJsZWRcclxuXHRcdFx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0XHRcdDxiPmNvcHlyaWdodDwvYj4gLSB0ZXh0IHRvIGJlIHByZXNlbnRlZCBhcyBhIGNvcHlyaWdodCB1bmRlIGxpbmtzIChmb2UgZXhhbXBsZSwgJ3pvb3BsdXMgQUcnKVxyXG5cdFx0XHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHRcdDwvdWw+XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdDwvdWw+XHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XHJcblx0XHRcdFx0VGhpcyBjb21wb25lbnQgZG9lcyBub3QgYWNjZXB0IHNsb3RzLlxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxyXG5cdDwvZGl2PlxyXG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XHJcblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfXtzY3JpcHRFeGFtcGxlfTwvcHJlPjwvY29kZT5cclxuXHRcdHdpbGwgcHJvZHVjZSB0aGUgZm9sbG93aW5nOlxyXG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cclxuXHRcdFx0PHpvby1mb290ZXIgYmluZDp0aGlzPXtleGFtcGxlRm9vdGVyfT48L3pvby1mb290ZXI+XHJcblx0XHQ8L2Rpdj5cclxuXHQ8L2Rpdj5cclxuPC9kaXY+XHJcblxyXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5kb2MtZWxlbWVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7IH1cblxuLmxpc3Qge1xuICB3aWR0aDogMzUlO1xuICBtYXJnaW46IDAgMjBweDsgfVxuXG4uZXhhbXBsZSB7XG4gIG92ZXJmbG93OiBhdXRvOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cclxuXHJcbjxzY3JpcHQ+XHJcblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XHJcblx0bGV0IGxpc3Q7XHJcblx0bGV0IGV4YW1wbGVGb290ZXI7XHJcblx0bGV0IGV4YW1wbGUgPSBgPGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cXG4gIDx6b28tZm9vdGVyIGlkPVwiZm9vdGVyXCI+PC96b28tZm9vdGVyPlxcbjwvZGl2PmA7XHJcblx0bGV0IHNjcmlwdEV4YW1wbGUgPSBgXFxuPHNjcmlwdD5cXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmb290ZXInKS5mb290ZXJsaW5rcz1be1xcbiAgICBocmVmOiAnaHR0cHM6Ly9naXRodWIuY29tL3pvb3BsdXMvem9vLXdlYi1jb21wb25lbnRzJyxcXG4gICAgdGV4dDogJ0dpdGh1YicsXFxuICAgIHR5cGU6ICdzdGFuZGFyZCdcXG4gIH0sXFxuICB7XFxuICAgIGhyZWY6ICdodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9Aem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxcbiAgICB0ZXh0OiAnTlBNJyxcXG4gICAgdHlwZTogJ3N0YW5kYXJkJ1xcbiAgfV07XFxuPFxcL3NjcmlwdD5gO1xyXG5cdG9uTW91bnQoKCkgPT4ge1xyXG5cdFx0bGlzdC5pdGVtcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhlYWRlcjogJ0FQSSdcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhlYWRlcjogJ1Nsb3RzJ1xyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdFx0ZXhhbXBsZUZvb3Rlci5mb290ZXJsaW5rcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxyXG5cdFx0XHRcdHRleHQ6ICdHaXRodWInLFxyXG5cdFx0XHRcdHR5cGU6ICdzdGFuZGFyZCdcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhyZWY6ICdodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9Aem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxyXG5cdFx0XHRcdHRleHQ6ICdOUE0nLFxyXG5cdFx0XHRcdHR5cGU6ICdzdGFuZGFyZCdcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9KTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQStDd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

    		init(this, { target: this.shadowRoot }, instance$9, create_fragment$9, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-footer", FooterDocs);

    /* src\docs\HeaderDocs.svelte generated by Svelte v3.9.0 */

    const file$a = "src\\docs\\HeaderDocs.svelte";

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
    			t13 = text("\r\n\t\twill produce the following:\r\n\t\t");
    			div1 = element("div");
    			zoo_header = element("zoo-header");
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Header component API.");
    			add_location(app_context, file$a, 2, 0, 55);
    			add_location(b0, file$a, 9, 6, 276);
    			add_location(li0, file$a, 8, 5, 264);
    			add_location(b1, file$a, 12, 6, 347);
    			add_location(li1, file$a, 11, 5, 335);
    			add_location(b2, file$a, 15, 6, 440);
    			add_location(li2, file$a, 14, 5, 428);
    			add_location(ul, file$a, 7, 4, 253);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$a, 6, 3, 207);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$a, 19, 3, 558);
    			add_location(zoo_collapsable_list, file$a, 5, 2, 163);
    			attr(div0, "class", "list");
    			add_location(div0, file$a, 4, 1, 141);
    			add_location(pre, file$a, 25, 8, 800);
    			add_location(code, file$a, 25, 2, 794);
    			set_custom_element_data(zoo_header, "imgsrc", "logo.png");
    			set_custom_element_data(zoo_header, "imgalt", "zooplus");
    			set_custom_element_data(zoo_header, "headertext", "App name");
    			add_location(zoo_header, file$a, 28, 3, 894);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$a, 27, 2, 862);
    			attr(div2, "class", "example");
    			add_location(div2, file$a, 24, 1, 769);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$a, 3, 0, 113);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
    			append(div3, t11);
    			append(div3, div2);
    			append(div2, code);
    			append(code, pre);
    			append(pre, t12);
    			append(div2, t13);
    			append(div2, div1);
    			append(div1, zoo_header);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGVhZGVyRG9jcy5zdmVsdGUiLCJzb3VyY2VzIjpbIkhlYWRlckRvY3Muc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJkb2NzLWhlYWRlclwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIkhlYWRlciBjb21wb25lbnQgQVBJLlwiPjwvYXBwLWNvbnRleHQ+XHJcbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxyXG5cdDxkaXYgY2xhc3M9XCJsaXN0XCI+XHJcblx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtsaXN0fT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XHJcblx0XHRcdFx0PHVsPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5pbWdzcmM8L2I+IC0gcGF0aCB0byBsb2dvIG9mIHlvdXIgYXBwXHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5pbWdhbHQ8L2I+IC0gdGV4dCB0byBiZSBkaXNwbGF5ZWQgd2hlbiBsb2dvIGNhbm5vdCBiZSBmb3VuZFxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+aGVhZGVydGV4dDwvYj4gLSB0ZXh0IHRvIGJlIGRpc3BsYXllZCBuZXh0IHRvIHRoZSBsb2dvXHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdDwvdWw+XHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XHJcblx0XHRcdFx0VGhpcyBjb21wb25lbnQgYWNjZXB0cyB1bm5hbWVkIHNsb3RzLCB3aGljaCB3aWxsIGJlIHJlbmRlcmVkIHRvIHRoZSByaWdodCBhZnRlciBsb2dvIG9yIHRleHQuXHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cclxuXHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3Q+XHJcblx0PC9kaXY+XHJcblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cclxuXHRcdDxjb2RlPjxwcmU+e2V4YW1wbGV9PC9wcmU+PC9jb2RlPlxyXG5cdFx0d2lsbCBwcm9kdWNlIHRoZSBmb2xsb3dpbmc6XHJcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxyXG5cdFx0XHQ8em9vLWhlYWRlciBpbWdzcmM9XCJsb2dvLnBuZ1wiIGltZ2FsdD1cInpvb3BsdXNcIiBoZWFkZXJ0ZXh0PVwiQXBwIG5hbWVcIj5cclxuXHRcdDwvZGl2PlxyXG5cdDwvZGl2PlxyXG48L2Rpdj5cclxuXHJcbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxyXG5cclxuPHNjcmlwdD5cclxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcclxuXHRsZXQgbGlzdDtcclxuXHRsZXQgZXhhbXBsZSA9IGA8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxcbiAgPHpvby1oZWFkZXIgaW1nc3JjPVwibG9nby5wbmdcIiBpbWdhbHQ9XCJpbWdhbHRcIiBoZWFkZXJ0ZXh0PVwiQXBwIG5hbWVcIj48L3pvby1oZWFkZXI+XFxuPC9kaXY+YDtcclxuXHRvbk1vdW50KCgpID0+IHtcclxuXHRcdGxpc3QuaXRlbXMgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdBUEknXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9KTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWlDd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

    		init(this, { target: this.shadowRoot }, instance$a, create_fragment$a, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-header", HeaderDocs);

    /* src\docs\InputDocs.svelte generated by Svelte v3.9.0 */

    const file$b = "src\\docs\\InputDocs.svelte";

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
    			t36 = text("\r\n\t\twill produce the following:\r\n\t\t");
    			div1 = element("div");
    			zoo_input = element("zoo-input");
    			input = element("input");
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Input component API.");
    			add_location(app_context, file$b, 2, 0, 54);
    			add_location(b0, file$b, 9, 6, 274);
    			add_location(b1, file$b, 9, 55, 323);
    			add_location(b2, file$b, 9, 67, 335);
    			add_location(b3, file$b, 9, 91, 359);
    			add_location(li0, file$b, 8, 5, 262);
    			add_location(b4, file$b, 12, 6, 400);
    			add_location(li1, file$b, 11, 5, 388);
    			add_location(b5, file$b, 15, 6, 496);
    			add_location(li2, file$b, 14, 5, 484);
    			add_location(b6, file$b, 18, 6, 580);
    			add_location(li3, file$b, 17, 5, 568);
    			add_location(b7, file$b, 21, 6, 655);
    			add_location(b8, file$b, 21, 64, 713);
    			add_location(li4, file$b, 20, 5, 643);
    			add_location(b9, file$b, 24, 6, 762);
    			add_location(li5, file$b, 23, 5, 750);
    			add_location(b10, file$b, 27, 6, 876);
    			add_location(li6, file$b, 26, 5, 864);
    			add_location(b11, file$b, 30, 6, 961);
    			add_location(li7, file$b, 29, 5, 949);
    			add_location(ul, file$b, 7, 4, 251);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$b, 6, 3, 205);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$b, 34, 3, 1091);
    			add_location(zoo_collapsable_list, file$b, 5, 2, 161);
    			attr(div0, "class", "list");
    			add_location(div0, file$b, 4, 1, 139);
    			add_location(pre, file$b, 40, 8, 1291);
    			add_location(code, file$b, 40, 2, 1285);
    			attr(input, "slot", "inputelement");
    			attr(input, "placeholder", "input");
    			add_location(input, file$b, 49, 4, 1615);
    			set_custom_element_data(zoo_input, "labeltext", "Input label");
    			set_custom_element_data(zoo_input, "linktext", "Forgotten your password?");
    			set_custom_element_data(zoo_input, "linkhref", "https://google.com");
    			set_custom_element_data(zoo_input, "linktarget", "about:blank");
    			set_custom_element_data(zoo_input, "valid", true);
    			set_custom_element_data(zoo_input, "infotext", "Additional helpful information for our users");
    			add_location(zoo_input, file$b, 43, 3, 1385);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$b, 42, 2, 1353);
    			attr(div2, "class", "example");
    			add_location(div2, file$b, 39, 1, 1260);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$b, 3, 0, 111);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
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

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5wdXREb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiSW5wdXREb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy1pbnB1dFwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIklucHV0IGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cclxuPGRpdiBjbGFzcz1cImRvYy1lbGVtZW50XCI+XHJcblx0PGRpdiBjbGFzcz1cImxpc3RcIj5cclxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTBcIj5cclxuXHRcdFx0XHQ8dWw+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmxhYmVscG9zaXRpb248L2I+IC0gYWNjZXB0cyBmb2xsb3dpbmcgdmFsdWVzOiA8Yj50b3A8L2I+LCA8Yj5sZWZ0PC9iPi4gRGVmYXVsdCBpcyA8Yj50b3A8L2I+XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5sYWJlbHRleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgYXMgdGhlIGxhYmVsIG9mIHRoZSBpbnB1dFxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+bGlua3RleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgYXMgYSBsaW5rIHRleHRcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmxpbmtocmVmPC9iPiAtIHdoZXJlIHRoZSBsaW5rIHNob3VsZCBsZWFkXHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5saW5rdGFyZ2V0PC9iPiAtIHRhcmdldCBvZiB0aGUgYW5jaG9yIGxpbmssIGRlZmF1bHQgaXMgPGI+YWJvdXQ6Ymxhbms8L2I+XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5pbnB1dGVycm9ybXNnPC9iPiAtIGVycm9yIG1lc3NhZ2UgdG8gYmUgcHJlc2VudGVkIHdoZW4gaW5wdXQgaXMgaW4gaW52YWxpZCBzdGF0ZVxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+aW5mb3RleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgYmVsb3cgdGhlIGlucHV0XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj52YWxpZDwvYj4gLSBmbGFnIHdoaWNoIGluZGljYXRlcyB3aGV0aGVyIHRoZSBpbnB1dCBpcyB2YWxpZCBvciBub3RcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0PC91bD5cclxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTFcIj5cclxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBhY2NlcHRzIG9uZSBzbG90IHtpbnB1dFNsb3RFeGFtcGxlfS5cclxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxyXG5cdFx0PC96b28tY29sbGFwc2FibGUtbGlzdD5cclxuXHQ8L2Rpdj5cclxuXHQ8ZGl2IGNsYXNzPVwiZXhhbXBsZVwiPlxyXG5cdFx0PGNvZGU+PHByZT57ZXhhbXBsZX08L3ByZT48L2NvZGU+XHJcblx0XHR3aWxsIHByb2R1Y2UgdGhlIGZvbGxvd2luZzpcclxuXHRcdDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHg7XCI+XHJcblx0XHRcdDx6b28taW5wdXQgbGFiZWx0ZXh0PVwiSW5wdXQgbGFiZWxcIiBcclxuXHRcdFx0XHRsaW5rdGV4dD1cIkZvcmdvdHRlbiB5b3VyIHBhc3N3b3JkP1wiXHJcblx0XHRcdFx0bGlua2hyZWY9XCJodHRwczovL2dvb2dsZS5jb21cIlxyXG5cdFx0XHRcdGxpbmt0YXJnZXQ9XCJhYm91dDpibGFua1wiXHJcblx0XHRcdFx0dmFsaWQ9XCJ7dHJ1ZX1cIlxyXG5cdFx0XHRcdGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnNcIiA+XHJcblx0XHRcdFx0PGlucHV0IHNsb3Q9XCJpbnB1dGVsZW1lbnRcIiBwbGFjZWhvbGRlcj1cImlucHV0XCIvPlxyXG5cdFx0XHQ8L3pvby1pbnB1dD5cclxuXHRcdDwvZGl2PlxyXG5cdDwvZGl2PlxyXG48L2Rpdj5cclxuXHJcbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxyXG5cclxuPHNjcmlwdD5cclxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcclxuXHRsZXQgbGlzdDtcclxuXHRsZXQgaW5wdXRTbG90RXhhbXBsZSA9IGA8c2xvdCBuYW1lPVwiaW5wdXRlbGVtZW50XCI+PC9zbG90PmA7XHJcblx0bGV0IGV4YW1wbGUgPSBgPGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cXG4gIDx6b28taW5wdXQgbGFiZWx0ZXh0PVwiSW5wdXQgbGFiZWxcIlxcbiAgICBsaW5rdGV4dD1cIkZvcmdvdHRlbiB5b3VyIHBhc3N3b3JkP1wiXFxuICAgIGxpbmtocmVmPVwiaHR0cHM6Ly9nb29nbGUuY29tXCJcXG4gICAgbGlua3RhcmdldD1cImFib3V0OmJsYW5rXCJcXG4gICAgaW5mb3RleHQ9XCJBZGRpdGlvbmFsIGhlbHBmdWwgaW5mb3JtYXRpb24gZm9yIG91ciB1c2Vyc1wiID5cXG4gICAgPGlucHV0IHNsb3Q9XCJpbnB1dGVsZW1lbnRcIiBwbGFjZWhvbGRlcj1cImlucHV0XCIvPlxcbiAgPC96b28taW5wdXQ+XFxuPC9kaXY+YDtcclxuXHRvbk1vdW50KCgpID0+IHtcclxuXHRcdGxpc3QuaXRlbXMgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdBUEknXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9KTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXVEd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

    		init(this, { target: this.shadowRoot }, instance$b, create_fragment$b, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-input", InputDocs);

    /* src\docs\LinkDocs.svelte generated by Svelte v3.9.0 */

    const file$c = "src\\docs\\LinkDocs.svelte";

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
    			t31 = text("\r\n\t\twill produce the following:\r\n\t\t");
    			div1 = element("div");
    			zoo_link = element("zoo-link");
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Link component API.");
    			add_location(app_context, file$c, 2, 0, 53);
    			add_location(b0, file$c, 10, 7, 285);
    			add_location(li0, file$c, 9, 6, 272);
    			add_location(b1, file$c, 13, 7, 344);
    			add_location(li1, file$c, 12, 6, 331);
    			add_location(b2, file$c, 16, 7, 420);
    			add_location(b3, file$c, 16, 61, 474);
    			add_location(li2, file$c, 15, 6, 407);
    			add_location(b4, file$c, 19, 7, 527);
    			add_location(b5, file$c, 19, 50, 570);
    			add_location(b6, file$c, 19, 70, 590);
    			add_location(b7, file$c, 19, 94, 614);
    			add_location(li3, file$c, 18, 6, 514);
    			add_location(b8, file$c, 22, 7, 721);
    			add_location(li4, file$c, 21, 6, 708);
    			add_location(b9, file$c, 25, 7, 831);
    			add_location(b10, file$c, 25, 67, 891);
    			add_location(li5, file$c, 24, 6, 818);
    			add_location(ul0, file$c, 8, 5, 260);
    			add_location(ul1, file$c, 7, 4, 249);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$c, 6, 3, 203);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$c, 30, 3, 978);
    			add_location(zoo_collapsable_list, file$c, 5, 2, 159);
    			attr(div0, "class", "list");
    			add_location(div0, file$c, 4, 1, 137);
    			add_location(pre, file$c, 36, 8, 1164);
    			add_location(code, file$c, 36, 2, 1158);
    			set_custom_element_data(zoo_link, "href", "https://google.com");
    			set_custom_element_data(zoo_link, "text", "Link to google");
    			set_custom_element_data(zoo_link, "type", "green");
    			add_location(zoo_link, file$c, 39, 3, 1258);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$c, 38, 2, 1226);
    			attr(div2, "class", "example");
    			add_location(div2, file$c, 35, 1, 1133);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$c, 3, 0, 109);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
    			append(div3, t29);
    			append(div3, div2);
    			append(div2, code);
    			append(code, pre);
    			append(pre, t30);
    			append(div2, t31);
    			append(div2, div1);
    			append(div1, zoo_link);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGlua0RvY3Muc3ZlbHRlIiwic291cmNlcyI6WyJMaW5rRG9jcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRvY3MtbGlua1wiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIkxpbmsgY29tcG9uZW50IEFQSS5cIj48L2FwcC1jb250ZXh0PlxyXG48ZGl2IGNsYXNzPVwiZG9jLWVsZW1lbnRcIj5cclxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxyXG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XHJcblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMFwiPlxyXG5cdFx0XHRcdDx1bD5cclxuXHRcdFx0XHRcdDx1bD5cclxuXHRcdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHRcdDxiPmhyZWY8L2I+IC0gZGlyZWN0IGxpbmtcclxuXHRcdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHRcdDxiPnRleHQ8L2I+IC0gdGV4dCB0byBiZSBkaXNwbGF5ZWQgYXMgbGlua1xyXG5cdFx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdFx0PGI+dGFyZ2V0PC9iPiAtIGhvdyB0aGUgbGluayBzaG91bGQgYmVoYXZlIChkZWZhdWx0IC0gPGI+YWJvdXQ6Ymxhbms8L2I+KVxyXG5cdFx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdFx0PGI+dHlwZTwvYj4gLSBjdXJyZW50bHkgc3VwcG9ydHMgMiB2YWx1ZXM6IDxiPnN0YW5kYXJkPC9iPiBhbmQgPGI+Z3JlZW48L2I+LCBkZWZhdWx0IC0gPGI+c3RhbmRhcmQ8L2I+LiBSZXNwb25zaWJsZSBmb3IgY29sb3Jpbmcgb2YgdGhlIGxpbmtzLCBzdGFuZGFyZCBpcyB3aGl0ZVxyXG5cdFx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdFx0PGI+ZGlzYWJsZWQ8L2I+IC0gZmxhZyBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIGFuY2hvciBsaW5rIHNob3VsZCBiZSBkaXNhYmxlZFxyXG5cdFx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdFx0PGI+dGV4dGFsaWduPC9iPiAtIHN0YW5kYXJkIGNzcyBiZWhhdmlvdXIuIERlZmF1bHQgdmFsdWUgaXMgPGI+Y2VudGVyPC9iPlxyXG5cdFx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PC91bD5cclxuXHRcdFx0XHQ8L3VsPlxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMVwiPlxyXG5cdFx0XHRcdFRoaXMgY29tcG9uZW50IGRvZXMgbm90IGFjY2VwdCBzbG90cy5cclxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxyXG5cdFx0PC96b28tY29sbGFwc2FibGUtbGlzdD5cclxuXHQ8L2Rpdj5cclxuXHQ8ZGl2IGNsYXNzPVwiZXhhbXBsZVwiPlxyXG5cdFx0PGNvZGU+PHByZT57ZXhhbXBsZX08L3ByZT48L2NvZGU+XHJcblx0XHR3aWxsIHByb2R1Y2UgdGhlIGZvbGxvd2luZzpcclxuXHRcdDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHg7XCI+XHJcblx0XHRcdDx6b28tbGluayBocmVmPVwiaHR0cHM6Ly9nb29nbGUuY29tXCIgdGV4dD1cIkxpbmsgdG8gZ29vZ2xlXCIgdHlwZT1cImdyZWVuXCI+PC96b28tbGluaz5cclxuXHRcdDwvZGl2PlxyXG5cdDwvZGl2PlxyXG48L2Rpdj5cclxuXHJcbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxyXG5cclxuPHNjcmlwdD5cclxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcclxuXHRsZXQgbGlzdDtcclxuXHRsZXQgaW5wdXRTbG90RXhhbXBsZSA9IGA8c2xvdCBuYW1lPVwiaW5wdXRlbGVtZW50XCI+PC9zbG90PmA7XHJcblx0bGV0IGV4YW1wbGUgPSBgPGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cXG4gIDx6b28tbGluayBocmVmPVwiaHR0cHM6Ly9nb29nbGUuY29tXCIgdGV4dD1cIkxpbmsgdG8gZ29vZ2xlXCIgdHlwZT1cImdyZWVuXCI+PC96b28tbGluaz5cXG48L2Rpdj5gO1xyXG5cdG9uTW91bnQoKCkgPT4ge1xyXG5cdFx0bGlzdC5pdGVtcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhlYWRlcjogJ0FQSSdcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhlYWRlcjogJ1Nsb3RzJ1xyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0pO1xyXG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBNEN3QixZQUFZLEFBQUMsQ0FBQyxBQUNwQyxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUV4QixLQUFLLEFBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxHQUFHLENBQ1YsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixRQUFRLEFBQUMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

    		init(this, { target: this.shadowRoot }, instance$c, create_fragment$c, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-link", LinkDocs);

    /* src\docs\ModalDocs.svelte generated by Svelte v3.9.0 */

    const file$d = "src\\docs\\ModalDocs.svelte";

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
    			add_location(app_context, file$d, 2, 0, 54);
    			add_location(b0, file$d, 9, 6, 274);
    			add_location(li0, file$d, 8, 5, 262);
    			add_location(b1, file$d, 12, 6, 363);
    			add_location(li1, file$d, 11, 5, 351);
    			add_location(b2, file$d, 15, 6, 481);
    			add_location(li2, file$d, 14, 5, 469);
    			add_location(ul, file$d, 7, 4, 251);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$d, 6, 3, 205);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$d, 19, 3, 631);
    			add_location(zoo_collapsable_list, file$d, 5, 2, 161);
    			attr(div0, "class", "list");
    			add_location(div0, file$d, 4, 1, 139);
    			add_location(pre, file$d, 25, 8, 826);
    			add_location(code, file$d, 25, 2, 820);
    			attr(div1, "class", "example");
    			add_location(div1, file$d, 24, 1, 795);
    			attr(div2, "class", "doc-element");
    			add_location(div2, file$d, 3, 0, 111);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
    			append(div2, t11);
    			append(div2, div1);
    			append(div1, code);
    			append(code, pre);
    			append(pre, t12);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div2);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kYWxEb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiTW9kYWxEb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy1tb2RhbFwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIk1vZGFsIGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cclxuPGRpdiBjbGFzcz1cImRvYy1lbGVtZW50XCI+XHJcblx0PGRpdiBjbGFzcz1cImxpc3RcIj5cclxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTBcIj5cclxuXHRcdFx0XHQ8dWw+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmhlYWRlcnRleHQ8L2I+IC0gdGV4dCB0byBiZSBkaXNwbGF5ZWQgYXMgbW9kYWwncyBoZWFkZXJcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPm9wZW5Nb2RhbCgpPC9iPiAtIGZ1bmN0aW9uIHdoaWNoIGNhbiBiZSBjYWxsZWQgdG8gb3BlbiB0aGlzIHBhcnRpY3VsYXIgbW9kYWwgd2luZG93LlxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+Y2xvc2VNb2RhbCgpPC9iPiAtIGZ1bmN0aW9uIHdoaWNoIGNhbiBiZSBjYWxsZWQgdG8gY2xvc2UgdGhpcyBwYXJ0aWN1bGFyIG1vZGFsIHdpbmRvdy5cclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0PC91bD5cclxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTFcIj5cclxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBhY2NlcHRzIG11bHRpcGxlIHVubmFtZWQgc2xvdHMuXHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cclxuXHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3Q+XHJcblx0PC9kaXY+XHJcblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cclxuXHRcdDxjb2RlPjxwcmU+e2V4YW1wbGV9PC9wcmU+PC9jb2RlPlxyXG5cdDwvZGl2PlxyXG48L2Rpdj5cclxuXHJcbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxyXG5cclxuPHNjcmlwdD5cclxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcclxuXHRsZXQgbGlzdDtcclxuXHRsZXQgZXhhbXBsZSA9IGA8em9vLW1vZGFsIGhlYWRlcnRleHQ9XCJZb3VyIGJhc2tldCBjb250YWlucyBsaWNlbnNlZCBpdGVtc1wiPlxcbiAgPHpvby1mZWVkYmFjayB0ZXh0PVwiVGhpcyBpcyBhbiBpbmZvIG1lc3NhZ2UuXCI+PC96b28tZmVlZGJhY2s+XFxuPC96b28tbW9kYWw+YDtcclxuXHRvbk1vdW50KCgpID0+IHtcclxuXHRcdGxpc3QuaXRlbXMgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdBUEknXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9KTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQTZCd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

    		init(this, { target: this.shadowRoot }, instance$d, create_fragment$d, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-modal", ModalDocs);

    /* src\docs\NavigationDocs.svelte generated by Svelte v3.9.0 */

    const file$e = "src\\docs\\NavigationDocs.svelte";

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
    			add_location(zoo_link, file$e, 17, 6, 550);
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
    			add_location(app_context, file$e, 2, 0, 59);
    			set_custom_element_data(zoo_collapsable_list_item, "slot", "item0");
    			add_location(zoo_collapsable_list_item, file$e, 6, 3, 215);
    			add_location(zoo_collapsable_list, file$e, 5, 2, 171);
    			attr(div0, "class", "list");
    			add_location(div0, file$e, 4, 1, 149);
    			add_location(pre, file$e, 12, 8, 410);
    			add_location(code, file$e, 12, 2, 404);
    			add_location(div1, file$e, 15, 4, 506);
    			set_custom_element_data(zoo_navigation, "class", "nav");
    			add_location(zoo_navigation, file$e, 14, 3, 472);
    			set_style(div2, "width", "250px");
    			add_location(div2, file$e, 13, 2, 441);
    			attr(div3, "class", "example");
    			add_location(div3, file$e, 11, 1, 379);
    			attr(div4, "class", "doc-element");
    			add_location(div4, file$e, 3, 0, 121);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
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

    			ctx.zoo_collapsable_list_binding(null);

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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTmF2aWdhdGlvbkRvY3Muc3ZlbHRlIiwic291cmNlcyI6WyJOYXZpZ2F0aW9uRG9jcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRvY3MtbmF2aWdhdGlvblwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIk5hdmlnYXRpb24gY29tcG9uZW50IEFQSS5cIj48L2FwcC1jb250ZXh0PlxyXG48ZGl2IGNsYXNzPVwiZG9jLWVsZW1lbnRcIj5cclxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxyXG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XHJcblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMFwiPlxyXG5cdFx0XHRcdFRoaXMgY29tcG9uZW50IGFjY2VwdHMgbXVsdGlwbGUgdW5uYW1lZCBzbG90cy5cclxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxyXG5cdFx0PC96b28tY29sbGFwc2FibGUtbGlzdD5cclxuXHQ8L2Rpdj5cclxuXHQ8ZGl2IGNsYXNzPVwiZXhhbXBsZVwiPlxyXG5cdFx0PGNvZGU+PHByZT57ZXhhbXBsZX08L3ByZT48L2NvZGU+XHJcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4XCI+XHJcblx0XHRcdDx6b28tbmF2aWdhdGlvbiBjbGFzcz1cIm5hdlwiPlxyXG5cdFx0XHRcdDxkaXY+XHJcblx0XHRcdFx0XHR7I2VhY2ggbmF2bGlua3MgYXMgbGlua31cclxuXHRcdFx0XHRcdFx0PHpvby1saW5rIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDEwcHg7XCIgaHJlZj1cIntsaW5rLmhyZWZ9XCIgdGV4dD1cIntsaW5rLnRleHR9XCI+PC96b28tbGluaz5cclxuXHRcdFx0XHRcdHsvZWFjaH1cclxuXHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0PC96b28tbmF2aWdhdGlvbj5cclxuXHRcdDwvZGl2PlxyXG5cdDwvZGl2PlxyXG48L2Rpdj5cclxuXHJcbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxyXG5cclxuPHNjcmlwdD5cclxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcclxuXHRsZXQgbGlzdDtcclxuXHRsZXQgbmF2bGlua3MgPSBbXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICdodHRwczovL2dvb2dsZS5jb20nLFxyXG5cdFx0XHR0ZXh0OiAnR29vZ2xlJ1xyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aHJlZjogJ2h0dHBzOi8vc3ZlbHRlLnRlY2hub2xvZ3kvJyxcclxuXHRcdFx0dGV4dDogJ1N2ZWx0ZSdcclxuXHRcdH1cclxuXHRdO1xyXG5cdGxldCBleGFtcGxlID0gYDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHhcIj5cXG4gIDx6b28tbmF2aWdhdGlvbiBjbGFzcz1cIm5hdlwiPlxcbiAgICA8ZGl2PlxcbiAgICAgIHsjZWFjaCBuYXZsaW5rcyBhcyBsaW5rfVxcbiAgICAgICAgPHpvby1saW5rIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDEwcHg7XCIgaHJlZj1cIntsaW5rLmhyZWZ9XCIgdGV4dD1cIntsaW5rLnRleHR9XCI+PC96b28tbGluaz5cXG4gICAgICB7L2VhY2h9XFxuICAgIDwvZGl2PlxcbiAgPC96b28tbmF2aWdhdGlvbj48L2Rpdj5gO1xyXG5cdG9uTW91bnQoKCkgPT4ge1xyXG5cdFx0bGlzdC5pdGVtcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhlYWRlcjogJ1Nsb3RzJ1xyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0pO1xyXG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBeUJ3QixZQUFZLEFBQUMsQ0FBQyxBQUNwQyxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUV4QixLQUFLLEFBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxHQUFHLENBQ1YsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixRQUFRLEFBQUMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

    		init(this, { target: this.shadowRoot }, instance$e, create_fragment$e, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-navigation", NavigationDocs);

    /* src\docs\RadioDocs.svelte generated by Svelte v3.9.0 */

    const file$f = "src\\docs\\RadioDocs.svelte";

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
    			t13 = text("\r\n\t\twill produce the following:\r\n\t\t");
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
    			add_location(app_context, file$f, 2, 0, 54);
    			add_location(b0, file$f, 9, 6, 274);
    			add_location(li0, file$f, 8, 5, 262);
    			add_location(b1, file$f, 12, 6, 383);
    			add_location(li1, file$f, 11, 5, 371);
    			add_location(b2, file$f, 15, 6, 468);
    			add_location(li2, file$f, 14, 5, 456);
    			add_location(ul, file$f, 7, 4, 251);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$f, 6, 3, 205);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$f, 19, 3, 598);
    			add_location(zoo_collapsable_list, file$f, 5, 2, 161);
    			attr(div0, "class", "list");
    			add_location(div0, file$f, 4, 1, 139);
    			add_location(pre, file$f, 25, 8, 793);
    			add_location(code, file$f, 25, 2, 787);
    			attr(input0, "type", "radio");
    			attr(input0, "id", "contactChoice4");
    			attr(input0, "name", "contact");
    			input0.value = "email";
    			input0.disabled = true;
    			add_location(input0, file$f, 29, 4, 947);
    			attr(label0, "for", "contactChoice4");
    			add_location(label0, file$f, 30, 4, 1031);
    			attr(input1, "type", "radio");
    			attr(input1, "id", "contactChoice5");
    			attr(input1, "name", "contact");
    			input1.value = "phone";
    			add_location(input1, file$f, 31, 4, 1078);
    			attr(label1, "for", "contactChoice5");
    			add_location(label1, file$f, 32, 4, 1153);
    			set_custom_element_data(zoo_radio, "infotext", "infotext");
    			set_custom_element_data(zoo_radio, "labeltext", "Label text");
    			add_location(zoo_radio, file$f, 28, 3, 887);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$f, 27, 2, 855);
    			attr(div2, "class", "example");
    			add_location(div2, file$f, 24, 1, 762);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$f, 3, 0, 111);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
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

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmFkaW9Eb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiUmFkaW9Eb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy1yYWRpb1wiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIlJhZGlvIGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cclxuPGRpdiBjbGFzcz1cImRvYy1lbGVtZW50XCI+XHJcblx0PGRpdiBjbGFzcz1cImxpc3RcIj5cclxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTBcIj5cclxuXHRcdFx0XHQ8dWw+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmVycm9ybXNnPC9iPiAtIGVycm9yIG1lc3NhZ2UgdG8gYmUgcHJlc2VudGVkIHdoZW4gaW5wdXQgaXMgaW4gaW52YWxpZCBzdGF0ZVxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+aW5mb3RleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgYmVsb3cgdGhlIGlucHV0XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj52YWxpZDwvYj4gLSBmbGFnIHdoaWNoIGluZGljYXRlcyB3aGV0aGVyIHRoZSBpbnB1dCBpcyB2YWxpZCBvciBub3RcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0PC91bD5cclxuXHRcdFx0PC96b28tY29sbGFwc2FibGUtbGlzdC1pdGVtPlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTFcIj5cclxuXHRcdFx0XHRUaGlzIGNvbXBvbmVudCBhY2NlcHRzIG11bHRpcGxlIHVubmFtZWQgc2xvdHMuXHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cclxuXHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3Q+XHJcblx0PC9kaXY+XHJcblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cclxuXHRcdDxjb2RlPjxwcmU+e2V4YW1wbGV9PC9wcmU+PC9jb2RlPlxyXG5cdFx0d2lsbCBwcm9kdWNlIHRoZSBmb2xsb3dpbmc6XHJcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxyXG5cdFx0XHQ8em9vLXJhZGlvIGluZm90ZXh0PVwiaW5mb3RleHRcIiBsYWJlbHRleHQ9XCJMYWJlbCB0ZXh0XCI+XHJcblx0XHRcdFx0PGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwiY29udGFjdENob2ljZTRcIiBuYW1lPVwiY29udGFjdFwiIHZhbHVlPVwiZW1haWxcIiBkaXNhYmxlZD5cclxuXHRcdFx0XHQ8bGFiZWwgZm9yPVwiY29udGFjdENob2ljZTRcIj5FbWFpbDwvbGFiZWw+XHJcblx0XHRcdFx0PGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwiY29udGFjdENob2ljZTVcIiBuYW1lPVwiY29udGFjdFwiIHZhbHVlPVwicGhvbmVcIj5cclxuXHRcdFx0XHQ8bGFiZWwgZm9yPVwiY29udGFjdENob2ljZTVcIj5QaG9uZTwvbGFiZWw+XHJcblx0XHRcdDwvem9vLXJhZGlvPlxyXG5cdFx0PC9kaXY+XHJcblx0PC9kaXY+XHJcbjwvZGl2PlxyXG5cclxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uZG9jLWVsZW1lbnQge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogcm93OyB9XG5cbi5saXN0IHtcbiAgd2lkdGg6IDM1JTtcbiAgbWFyZ2luOiAwIDIwcHg7IH1cblxuLmV4YW1wbGUge1xuICBvdmVyZmxvdzogYXV0bzsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XHJcblxyXG48c2NyaXB0PlxyXG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xyXG5cdGxldCBsaXN0O1xyXG5cdGxldCBpbnB1dFNsb3RFeGFtcGxlID0gYDxzbG90IG5hbWU9XCJpbnB1dGVsZW1lbnRcIj48L3Nsb3Q+YDtcclxuXHRsZXQgZXhhbXBsZSA9IGA8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxcbiAgPHpvby1yYWRpbyBpbmZvdGV4dD1cImluZm90ZXh0XCI+XFxuICAgIDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2U0XCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cImVtYWlsXCIgZGlzYWJsZWQ+XFxuICAgIDxsYWJlbCBmb3I9XCJjb250YWN0Q2hvaWNlNFwiPkVtYWlsPC9sYWJlbD5cXG4gICAgPGlucHV0IHR5cGU9XCJyYWRpb1wiIGlkPVwiY29udGFjdENob2ljZTVcIiBuYW1lPVwiY29udGFjdFwiIHZhbHVlPVwicGhvbmVcIj5cXG4gICAgPGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2U1XCI+UGhvbmU8L2xhYmVsPlxcbiAgPC96b28tcmFkaW8+XFxuPC9kaXY+YDtcclxuXHRvbk1vdW50KCgpID0+IHtcclxuXHRcdGxpc3QuaXRlbXMgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdBUEknXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9KTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXNDd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

    		init(this, { target: this.shadowRoot }, instance$f, create_fragment$f, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-radio", RadioDocs);

    /* src\docs\SearchableSelectDocs.svelte generated by Svelte v3.9.0 */

    const file$g = "src\\docs\\SearchableSelectDocs.svelte";

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
    			t39 = text("\r\n\t\twill produce the following:\r\n\t\t");
    			div1 = element("div");
    			zoo_searchable_select = element("zoo-searchable-select");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "1";
    			option1 = element("option");
    			option1.textContent = "2";
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Searchable select component API.");
    			add_location(app_context, file$g, 2, 0, 66);
    			add_location(b0, file$g, 9, 6, 298);
    			add_location(b1, file$g, 9, 55, 347);
    			add_location(b2, file$g, 9, 67, 359);
    			add_location(b3, file$g, 9, 91, 383);
    			add_location(li0, file$g, 8, 5, 286);
    			add_location(b4, file$g, 12, 6, 424);
    			add_location(li1, file$g, 11, 5, 412);
    			add_location(b5, file$g, 15, 6, 520);
    			add_location(li2, file$g, 14, 5, 508);
    			add_location(b6, file$g, 18, 6, 604);
    			add_location(li3, file$g, 17, 5, 592);
    			add_location(b7, file$g, 21, 6, 679);
    			add_location(b8, file$g, 21, 64, 737);
    			add_location(li4, file$g, 20, 5, 667);
    			add_location(b9, file$g, 24, 6, 786);
    			add_location(li5, file$g, 23, 5, 774);
    			add_location(b10, file$g, 27, 6, 900);
    			add_location(li6, file$g, 26, 5, 888);
    			add_location(b11, file$g, 30, 6, 985);
    			add_location(li7, file$g, 29, 5, 973);
    			add_location(b12, file$g, 33, 6, 1085);
    			add_location(li8, file$g, 32, 5, 1073);
    			add_location(ul, file$g, 7, 4, 275);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$g, 6, 3, 229);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$g, 37, 3, 1229);
    			add_location(zoo_collapsable_list, file$g, 5, 2, 185);
    			attr(div0, "class", "list");
    			add_location(div0, file$g, 4, 1, 163);
    			add_location(pre, file$g, 43, 8, 1429);
    			add_location(code, file$g, 43, 2, 1423);
    			option0.__value = "1";
    			option0.value = option0.__value;
    			add_location(option0, file$g, 48, 5, 1653);
    			option1.__value = "2";
    			option1.value = option1.__value;
    			add_location(option1, file$g, 49, 5, 1688);
    			select.multiple = true;
    			attr(select, "slot", "selectelement");
    			add_location(select, file$g, 47, 4, 1608);
    			set_custom_element_data(zoo_searchable_select, "labeltext", "Searchable select");
    			set_custom_element_data(zoo_searchable_select, "placeholder", "Placeholder");
    			add_location(zoo_searchable_select, file$g, 46, 3, 1523);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$g, 45, 2, 1491);
    			attr(div2, "class", "example");
    			add_location(div2, file$g, 42, 1, 1398);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$g, 3, 0, 135);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
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

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VhcmNoYWJsZVNlbGVjdERvY3Muc3ZlbHRlIiwic291cmNlcyI6WyJTZWFyY2hhYmxlU2VsZWN0RG9jcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRvY3Mtc2VhcmNoYWJsZS1zZWxlY3RcIj48L3N2ZWx0ZTpvcHRpb25zPlxyXG5cclxuPGFwcC1jb250ZXh0IHRleHQ9XCJTZWFyY2hhYmxlIHNlbGVjdCBjb21wb25lbnQgQVBJLlwiPjwvYXBwLWNvbnRleHQ+XHJcbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxyXG5cdDxkaXYgY2xhc3M9XCJsaXN0XCI+XHJcblx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtsaXN0fT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XHJcblx0XHRcdFx0PHVsPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5sYWJlbHBvc2l0aW9uPC9iPiAtIGFjY2VwdHMgZm9sbG93aW5nIHZhbHVlczogPGI+dG9wPC9iPiwgPGI+bGVmdDwvYj4uIERlZmF1bHQgaXMgPGI+dG9wPC9iPlxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+bGFiZWx0ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGFzIHRoZSBsYWJlbCBvZiB0aGUgaW5wdXRcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmxpbmt0ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGFzIGEgbGluayB0ZXh0XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5saW5raHJlZjwvYj4gLSB3aGVyZSB0aGUgbGluayBzaG91bGQgbGVhZFxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+bGlua3RhcmdldDwvYj4gLSB0YXJnZXQgb2YgdGhlIGFuY2hvciBsaW5rLCBkZWZhdWx0IGlzIDxiPmFib3V0OmJsYW5rPC9iPlxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+aW5wdXRlcnJvcm1zZzwvYj4gLSBlcnJvciBtZXNzYWdlIHRvIGJlIHByZXNlbnRlZCB3aGVuIGlucHV0IGlzIGluIGludmFsaWQgc3RhdGVcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmluZm90ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGJlbG93IHRoZSBpbnB1dFxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+dmFsaWQ8L2I+IC0gZmxhZyB3aGljaCBpbmRpY2F0ZXMgd2hldGhlciB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5wbGFjZWhvbGRlcjwvYj4gLSB0ZXh0IHdoaWNoIHNob3VsZCBiZSBkaXNwbGF5ZWQgaW5zaWRlIGlucHV0IHVzZWQgZm9yIHNlYXJjaGluZ1xyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHQ8L3VsPlxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMVwiPlxyXG5cdFx0XHRcdFRoaXMgY29tcG9uZW50IGFjY2VwdHMgb25lIHNsb3Qge2lucHV0U2xvdEV4YW1wbGV9LlxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxyXG5cdDwvZGl2PlxyXG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XHJcblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cclxuXHRcdHdpbGwgcHJvZHVjZSB0aGUgZm9sbG93aW5nOlxyXG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDtcIj5cclxuXHRcdFx0PHpvby1zZWFyY2hhYmxlLXNlbGVjdCBsYWJlbHRleHQ9XCJTZWFyY2hhYmxlIHNlbGVjdFwiIHBsYWNlaG9sZGVyPVwiUGxhY2Vob2xkZXJcIj5cclxuXHRcdFx0XHQ8c2VsZWN0IG11bHRpcGxlIHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XHJcblx0XHRcdFx0XHQ8b3B0aW9uIHZhbHVlPVwiMVwiPjE8L29wdGlvbj5cclxuXHRcdFx0XHRcdDxvcHRpb24gdmFsdWU9XCIyXCI+Mjwvb3B0aW9uPlxyXG5cdFx0XHRcdDwvc2VsZWN0PlxyXG5cdFx0XHQ8L3pvby1zZWFyY2hhYmxlLXNlbGVjdD5cclxuXHRcdDwvZGl2PlxyXG5cdDwvZGl2PlxyXG48L2Rpdj5cclxuXHJcbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxyXG5cclxuPHNjcmlwdD5cclxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcclxuXHRsZXQgbGlzdDtcclxuXHRsZXQgaW5wdXRTbG90RXhhbXBsZSA9IGA8c2xvdCBuYW1lPVwic2VsZWN0ZWxlbWVudFwiPjwvc2xvdD5gO1xyXG5cdGxldCBleGFtcGxlID0gYDxkaXYgc3R5bGU9XCJ3aWR0aDogMjUwcHg7XCI+XFxuICA8em9vLXNlYXJjaGFibGUtc2VsZWN0IGxhYmVsdGV4dD1cIlNlYXJjaGFibGUgc2VsZWN0XCIgcGxhY2Vob2xkZXI9XCJQbGFjZWhvbGRlclwiPlxcbiAgICA8c2VsZWN0IG11bHRpcGxlIHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XFxuICAgICAgPG9wdGlvbiB2YWx1ZT1cIjFcIj4xPC9vcHRpb24+XFxuICAgICAgPG9wdGlvbiB2YWx1ZT1cIjJcIj4yPC9vcHRpb24+XFxuICAgIDwvc2VsZWN0PlxcbiAgPC96b28tc2VhcmNoYWJsZS1zZWxlY3Q+XFxuPC9kaXY+YDtcclxuXHRvbk1vdW50KCgpID0+IHtcclxuXHRcdGxpc3QuaXRlbXMgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdBUEknXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9KTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXdEd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

    		init(this, { target: this.shadowRoot }, instance$g, create_fragment$g, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-searchable-select", SearchableSelectDocs);

    /* src\docs\SelectDocs.svelte generated by Svelte v3.9.0 */

    const file$h = "src\\docs\\SelectDocs.svelte";

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
    			t36 = text("\r\n\t\twill produce the following:\r\n\t\t");
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
    			add_location(app_context, file$h, 2, 0, 55);
    			add_location(b0, file$h, 9, 6, 276);
    			add_location(b1, file$h, 9, 55, 325);
    			add_location(b2, file$h, 9, 67, 337);
    			add_location(b3, file$h, 9, 91, 361);
    			add_location(li0, file$h, 8, 5, 264);
    			add_location(b4, file$h, 12, 6, 402);
    			add_location(li1, file$h, 11, 5, 390);
    			add_location(b5, file$h, 15, 6, 498);
    			add_location(li2, file$h, 14, 5, 486);
    			add_location(b6, file$h, 18, 6, 582);
    			add_location(li3, file$h, 17, 5, 570);
    			add_location(b7, file$h, 21, 6, 657);
    			add_location(b8, file$h, 21, 64, 715);
    			add_location(li4, file$h, 20, 5, 645);
    			add_location(b9, file$h, 24, 6, 764);
    			add_location(li5, file$h, 23, 5, 752);
    			add_location(b10, file$h, 27, 6, 878);
    			add_location(li6, file$h, 26, 5, 866);
    			add_location(b11, file$h, 30, 6, 963);
    			add_location(li7, file$h, 29, 5, 951);
    			add_location(ul, file$h, 7, 4, 253);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$h, 6, 3, 207);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$h, 34, 3, 1093);
    			add_location(zoo_collapsable_list, file$h, 5, 2, 163);
    			attr(div0, "class", "list");
    			add_location(div0, file$h, 4, 1, 141);
    			add_location(pre, file$h, 40, 8, 1293);
    			add_location(code, file$h, 40, 2, 1287);
    			attr(option0, "class", "placeholder");
    			option0.__value = "";
    			option0.value = option0.__value;
    			option0.disabled = true;
    			option0.selected = true;
    			add_location(option0, file$h, 45, 5, 1522);
    			option1.__value = "1";
    			option1.value = option1.__value;
    			add_location(option1, file$h, 46, 5, 1604);
    			option2.__value = "2";
    			option2.value = option2.__value;
    			add_location(option2, file$h, 47, 5, 1629);
    			option3.__value = "3";
    			option3.value = option3.__value;
    			add_location(option3, file$h, 48, 5, 1654);
    			attr(select, "slot", "selectelement");
    			add_location(select, file$h, 44, 4, 1486);
    			set_custom_element_data(zoo_select, "labeltext", "Select label");
    			set_custom_element_data(zoo_select, "infotext", "Additional helpful information for our users");
    			add_location(zoo_select, file$h, 43, 3, 1387);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$h, 42, 2, 1355);
    			attr(div2, "class", "example");
    			add_location(div2, file$h, 39, 1, 1262);
    			attr(div3, "class", "doc-element");
    			add_location(div3, file$h, 3, 0, 113);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
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

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div3);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VsZWN0RG9jcy5zdmVsdGUiLCJzb3VyY2VzIjpbIlNlbGVjdERvY3Muc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzdmVsdGU6b3B0aW9ucyB0YWc9XCJkb2NzLXNlbGVjdFwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIlNlbGVjdCBjb21wb25lbnQgQVBJLlwiPjwvYXBwLWNvbnRleHQ+XHJcbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxyXG5cdDxkaXYgY2xhc3M9XCJsaXN0XCI+XHJcblx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtsaXN0fT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XHJcblx0XHRcdFx0PHVsPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5sYWJlbHBvc2l0aW9uPC9iPiAtIGFjY2VwdHMgZm9sbG93aW5nIHZhbHVlczogPGI+dG9wPC9iPiwgPGI+bGVmdDwvYj4uIERlZmF1bHQgaXMgPGI+dG9wPC9iPlxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+bGFiZWx0ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGFzIHRoZSBsYWJlbCBvZiB0aGUgaW5wdXRcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmxpbmt0ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGFzIGEgbGluayB0ZXh0XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5saW5raHJlZjwvYj4gLSB3aGVyZSB0aGUgbGluayBzaG91bGQgbGVhZFxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+bGlua3RhcmdldDwvYj4gLSB0YXJnZXQgb2YgdGhlIGFuY2hvciBsaW5rLCBkZWZhdWx0IGlzIDxiPmFib3V0OmJsYW5rPC9iPlxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+aW5wdXRlcnJvcm1zZzwvYj4gLSBlcnJvciBtZXNzYWdlIHRvIGJlIHByZXNlbnRlZCB3aGVuIGlucHV0IGlzIGluIGludmFsaWQgc3RhdGVcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPmluZm90ZXh0PC9iPiAtIHRleHQgdG8gYmUgcHJlc2VudGVkIGJlbG93IHRoZSBpbnB1dFxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+dmFsaWQ8L2I+IC0gZmxhZyB3aGljaCBpbmRpY2F0ZXMgd2hldGhlciB0aGUgaW5wdXQgaXMgdmFsaWQgb3Igbm90XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdDwvdWw+XHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XHJcblx0XHRcdFx0VGhpcyBjb21wb25lbnQgYWNjZXB0cyBvbmUgc2xvdCB7aW5wdXRTbG90RXhhbXBsZX0uXHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cclxuXHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3Q+XHJcblx0PC9kaXY+XHJcblx0PGRpdiBjbGFzcz1cImV4YW1wbGVcIj5cclxuXHRcdDxjb2RlPjxwcmU+e2V4YW1wbGV9PC9wcmU+PC9jb2RlPlxyXG5cdFx0d2lsbCBwcm9kdWNlIHRoZSBmb2xsb3dpbmc6XHJcblx0XHQ8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxyXG5cdFx0XHQ8em9vLXNlbGVjdCBsYWJlbHRleHQ9XCJTZWxlY3QgbGFiZWxcIiBpbmZvdGV4dD1cIkFkZGl0aW9uYWwgaGVscGZ1bCBpbmZvcm1hdGlvbiBmb3Igb3VyIHVzZXJzXCI+XHJcblx0XHRcdFx0PHNlbGVjdCBzbG90PVwic2VsZWN0ZWxlbWVudFwiPlxyXG5cdFx0XHRcdFx0PG9wdGlvbiBjbGFzcz1cInBsYWNlaG9sZGVyXCIgdmFsdWU9XCJcIiBkaXNhYmxlZCBzZWxlY3RlZD5QbGFjZWhvbGRlcjwvb3B0aW9uPlxyXG5cdFx0XHRcdFx0PG9wdGlvbj4xPC9vcHRpb24+XHJcblx0XHRcdFx0XHQ8b3B0aW9uPjI8L29wdGlvbj5cclxuXHRcdFx0XHRcdDxvcHRpb24+Mzwvb3B0aW9uPlxyXG5cdFx0XHRcdDwvc2VsZWN0PlxyXG5cdFx0XHQ8L3pvby1zZWxlY3Q+XHJcblx0XHQ8L2Rpdj5cclxuXHQ8L2Rpdj5cclxuPC9kaXY+XHJcblxyXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5kb2MtZWxlbWVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7IH1cblxuLmxpc3Qge1xuICB3aWR0aDogMzUlO1xuICBtYXJnaW46IDAgMjBweDsgfVxuXG4uZXhhbXBsZSB7XG4gIG92ZXJmbG93OiBhdXRvOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cclxuXHJcbjxzY3JpcHQ+XHJcblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XHJcblx0bGV0IGxpc3Q7XHJcblx0bGV0IGlucHV0U2xvdEV4YW1wbGUgPSBgPHNsb3QgbmFtZT1cInNlbGVjdGVsZW1lbnRcIj48L3Nsb3Q+YDtcclxuXHRsZXQgZXhhbXBsZSA9IGA8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxcbiAgPHpvby1zZWxlY3QgbGFiZWx0ZXh0PVwiU2VsZWN0IGxhYmVsXCIgaW5mb3RleHQ9XCJBZGRpdGlvbmFsIGhlbHBmdWwgaW5mb3JtYXRpb24gZm9yIG91ciB1c2Vyc1wiPlxcbiAgICA8c2VsZWN0IHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XFxuICAgICAgPG9wdGlvbiBjbGFzcz1cInBsYWNlaG9sZGVyXCIgdmFsdWU9XCJcIiBkaXNhYmxlZCBzZWxlY3RlZD5QbGFjZWhvbGRlcjwvb3B0aW9uPlxcbiAgICAgIDxvcHRpb24+MTwvb3B0aW9uPlxcbiAgICAgIDxvcHRpb24+Mjwvb3B0aW9uPlxcbiAgICAgIDxvcHRpb24+Mzwvb3B0aW9uPlxcbiAgICA8L3NlbGVjdD5cXG4gIDwvem9vLXNlbGVjdD5cXG48L2Rpdj5gO1xyXG5cdG9uTW91bnQoKCkgPT4ge1xyXG5cdFx0bGlzdC5pdGVtcyA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhlYWRlcjogJ0FQSSdcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGhlYWRlcjogJ1Nsb3RzJ1xyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0pO1xyXG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBdUR3QixZQUFZLEFBQUMsQ0FBQyxBQUNwQyxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLEFBQUUsQ0FBQyxBQUV4QixLQUFLLEFBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxHQUFHLENBQ1YsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixRQUFRLEFBQUMsQ0FBQyxBQUNSLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyJ9 */</style>`;

    		init(this, { target: this.shadowRoot }, instance$h, create_fragment$h, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-select", SelectDocs);

    /* src\docs\ToastDocs.svelte generated by Svelte v3.9.0 */

    const file$i = "src\\docs\\ToastDocs.svelte";

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
    			add_location(app_context, file$i, 2, 0, 54);
    			add_location(b0, file$i, 9, 6, 274);
    			add_location(li0, file$i, 8, 5, 262);
    			add_location(b1, file$i, 12, 6, 356);
    			add_location(b2, file$i, 12, 60, 410);
    			add_location(b3, file$i, 12, 74, 424);
    			add_location(b4, file$i, 12, 87, 437);
    			add_location(b5, file$i, 12, 114, 464);
    			add_location(li1, file$i, 11, 5, 344);
    			add_location(b6, file$i, 15, 6, 506);
    			add_location(li2, file$i, 14, 5, 494);
    			add_location(b7, file$i, 18, 6, 607);
    			add_location(b8, file$i, 18, 22, 623);
    			add_location(li3, file$i, 17, 5, 595);
    			add_location(b9, file$i, 21, 6, 763);
    			add_location(b10, file$i, 21, 22, 779);
    			add_location(li4, file$i, 20, 5, 751);
    			add_location(ul, file$i, 7, 4, 251);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$i, 6, 3, 205);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$i, 25, 3, 948);
    			add_location(zoo_collapsable_list, file$i, 5, 2, 161);
    			attr(div0, "class", "list");
    			add_location(div0, file$i, 4, 1, 139);
    			add_location(pre, file$i, 31, 8, 1134);
    			add_location(code, file$i, 31, 2, 1128);
    			attr(div1, "class", "example");
    			add_location(div1, file$i, 30, 1, 1103);
    			attr(div2, "class", "doc-element");
    			add_location(div2, file$i, 3, 0, 111);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
    			append(div2, t28);
    			append(div2, div1);
    			append(div1, code);
    			append(code, pre);
    			append(pre, t29);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div2);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9hc3REb2NzLnN2ZWx0ZSIsInNvdXJjZXMiOlsiVG9hc3REb2NzLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgdGFnPVwiZG9jcy10b2FzdFwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIlRvYXN0IGNvbXBvbmVudCBBUEkuXCI+PC9hcHAtY29udGV4dD5cclxuPGRpdiBjbGFzcz1cImRvYy1lbGVtZW50XCI+XHJcblx0PGRpdiBjbGFzcz1cImxpc3RcIj5cclxuXHRcdDx6b28tY29sbGFwc2FibGUtbGlzdCBiaW5kOnRoaXM9e2xpc3R9PlxyXG5cdFx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbSBzbG90PVwiaXRlbTBcIj5cclxuXHRcdFx0XHQ8dWw+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPnRleHQ8L2I+IC0gdGV4dCB0byBiZSBwcmVzZW50ZWQgaW4gdGhlIHRvYXN0IGJveFxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+dHlwZTwvYj4gLSB0eXBlIG9mIHRoZSB0b2FzdC4gUG9zc2libGUgdmFsdWVzIGFyZTogPGI+ZXJyb3I8L2I+LCA8Yj5pbmZvPC9iPiwgPGI+c3VjY2VzczwvYj4uIERlZmF1bHQgaXMgPGI+aW5mbzwvYj5cclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPnRpbWVvdXQ8L2I+IC0gaG93IGxvbmcgdGhlIHRvYXN0IHNob3VsZCBiZSB2aXNpYmxlIGZvciAoaW4gc2Vjb25kcylcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPnNob3coKTwvYj4gLSA8Yj5mdW5jdGlvbjwvYj4gdG8gc2hvdyB0aGUgdG9hc3QuIE11bHRpcGxlIGNhbGxzIHRvIHRoaXMgZnVuY3Rpb25zIHVudGlsIHRoZSB0b2FzdCBpcyBoaWRkZW4gd2lsbCBiZSBpZ25vcmVkXHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5oaWRlKCk8L2I+IC0gPGI+ZnVuY3Rpb248L2I+IHRvIGhpZGUgdGhlIHRvYXN0LiBNdWx0aXBsZSBjYWxscyB0byB0aGlzIGZ1bmN0aW9ucyB1bnRpbCB0aGUgdG9hc3QgaXMgc2hvd24gd2lsbCBiZSBpZ25vcmVkXHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdDwvdWw+XHJcblx0XHRcdDwvem9vLWNvbGxhcHNhYmxlLWxpc3QtaXRlbT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0xXCI+XHJcblx0XHRcdFx0VGhpcyBjb21wb25lbnQgZG9lcyBub3QgYWNjZXB0IHNsb3RzLlxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxyXG5cdDwvZGl2PlxyXG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XHJcblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cclxuXHQ8L2Rpdj5cclxuPC9kaXY+XHJcblxyXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5kb2MtZWxlbWVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7IH1cblxuLmxpc3Qge1xuICB3aWR0aDogMzUlO1xuICBtYXJnaW46IDAgMjBweDsgfVxuXG4uZXhhbXBsZSB7XG4gIG92ZXJmbG93OiBhdXRvOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cclxuXHJcbjxzY3JpcHQ+XHJcblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XHJcblx0bGV0IGxpc3Q7XHJcblx0bGV0IGlucHV0U2xvdEV4YW1wbGUgPSBgPHNsb3QgbmFtZT1cImlucHV0ZWxlbWVudFwiPjwvc2xvdD5gO1xyXG5cdGxldCBleGFtcGxlID0gYDx6b28tdG9hc3QgdHlwZT1cImluZm9cIiB0ZXh0PVwiVGhpcyBpcyBhbiBpbmZvIG1lc3NhZ2UuXCI+PC96b28tdG9hc3Q+YDtcclxuXHRvbk1vdW50KCgpID0+IHtcclxuXHRcdGxpc3QuaXRlbXMgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdBUEknXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9KTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQW1Dd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

    		init(this, { target: this.shadowRoot }, instance$i, create_fragment$i, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-toast", ToastDocs);

    /* src\docs\TooltipDocs.svelte generated by Svelte v3.9.0 */

    const file$j = "src\\docs\\TooltipDocs.svelte";

    function create_fragment$j(ctx) {
    	var app_context, t0, div4, div0, zoo_collapsable_list, zoo_collapsable_list_item0, ul, li0, b0, t2, t3, li1, b1, t5, b2, t7, b3, t9, b4, t11, b5, t13, b6, t15, li2, b7, t17, code0, pre0, t18, t19, li3, b8, t21, code1, pre1, t22, t23, zoo_collapsable_list_item1, t25, div3, code2, pre2, t26, t27, div2, zoo_button, div1, t28, zoo_tooltip;

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
    			li2 = element("li");
    			b7 = element("b");
    			b7.textContent = "Showing the tooltip";
    			t17 = text(" - to show the tooltip use the following snippet: ");
    			code0 = element("code");
    			pre0 = element("pre");
    			t18 = text(ctx.snippet);
    			t19 = space();
    			li3 = element("li");
    			b8 = element("b");
    			b8.textContent = "CSS keyframes";
    			t21 = text(" - to enable animation use the following snippet: ");
    			code1 = element("code");
    			pre1 = element("pre");
    			t22 = text(ctx.keyframesSnippet);
    			t23 = space();
    			zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
    			zoo_collapsable_list_item1.textContent = "This component either renders a unnamed slot or presents text supplied as an attribute.";
    			t25 = space();
    			div3 = element("div");
    			code2 = element("code");
    			pre2 = element("pre");
    			t26 = text(ctx.example);
    			t27 = text("\r\n\t\twill produce the following:\r\n\t\t");
    			div2 = element("div");
    			zoo_button = element("zoo-button");
    			div1 = element("div");
    			t28 = text("Button\r\n\t\t\t\t\t");
    			zoo_tooltip = element("zoo-tooltip");
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Tooltip component API.");
    			add_location(app_context, file$j, 2, 0, 56);
    			add_location(b0, file$j, 9, 6, 278);
    			add_location(li0, file$j, 8, 5, 266);
    			add_location(b1, file$j, 12, 6, 360);
    			add_location(b2, file$j, 12, 45, 399);
    			add_location(b3, file$j, 12, 57, 411);
    			add_location(b4, file$j, 12, 71, 425);
    			add_location(b5, file$j, 12, 88, 442);
    			add_location(b6, file$j, 12, 112, 466);
    			add_location(li1, file$j, 11, 5, 348);
    			add_location(b7, file$j, 15, 6, 507);
    			add_location(pre0, file$j, 15, 88, 589);
    			add_location(code0, file$j, 15, 82, 583);
    			add_location(li2, file$j, 14, 5, 495);
    			add_location(b8, file$j, 18, 6, 647);
    			add_location(pre1, file$j, 18, 82, 723);
    			add_location(code1, file$j, 18, 76, 717);
    			add_location(li3, file$j, 17, 5, 635);
    			add_location(ul, file$j, 7, 4, 255);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$j, 6, 3, 209);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$j, 22, 3, 820);
    			add_location(zoo_collapsable_list, file$j, 5, 2, 165);
    			attr(div0, "class", "list");
    			add_location(div0, file$j, 4, 1, 143);
    			add_location(pre2, file$j, 28, 8, 1056);
    			add_location(code2, file$j, 28, 2, 1050);
    			set_custom_element_data(zoo_tooltip, "text", "Tooltip text");
    			add_location(zoo_tooltip, file$j, 34, 5, 1254);
    			attr(div1, "slot", "buttoncontent");
    			add_location(div1, file$j, 32, 4, 1208);
    			set_custom_element_data(zoo_button, "class", "top-tooltip");
    			add_location(zoo_button, file$j, 31, 3, 1170);
    			set_style(div2, "width", "250px");
    			set_style(div2, "margin-bottom", "2px");
    			add_location(div2, file$j, 30, 2, 1118);
    			attr(div3, "class", "example");
    			add_location(div3, file$j, 27, 1, 1025);
    			attr(div4, "class", "doc-element");
    			add_location(div4, file$j, 3, 0, 115);
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
    			append(ul, t15);
    			append(ul, li2);
    			append(li2, b7);
    			append(li2, t17);
    			append(li2, code0);
    			append(code0, pre0);
    			append(pre0, t18);
    			append(ul, t19);
    			append(ul, li3);
    			append(li3, b8);
    			append(li3, t21);
    			append(li3, code1);
    			append(code1, pre1);
    			append(pre1, t22);
    			append(zoo_collapsable_list, t23);
    			append(zoo_collapsable_list, zoo_collapsable_list_item1);
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
    			append(div4, t25);
    			append(div4, div3);
    			append(div3, code2);
    			append(code2, pre2);
    			append(pre2, t26);
    			append(div3, t27);
    			append(div3, div2);
    			append(div2, zoo_button);
    			append(zoo_button, div1);
    			append(div1, t28);
    			append(div1, zoo_tooltip);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div4);
    			}

    			ctx.zoo_collapsable_list_binding(null);
    		}
    	};
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let list;
    	let example = `<div style="width: 250px;">\n  <zoo-button>\n    <div slot="buttoncontent">\n      Button\n      <zoo-tooltip text="Tooltip text"></zoo-tooltip>\n    </div>\n  </zoo-button>\n</div>`;
    	let keyframesSnippet = `.class-name:hover {\n  zoo-tooltip {\n    display: block;\n    animation: fadeTooltipIn 0.2s;\n  }\n}`;
    	let snippet = `.class-name:hover {\n  zoo-tooltip {\n    display: block;\n  }\n}`;
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
    	}

    	return {
    		list,
    		example,
    		keyframesSnippet,
    		snippet,
    		zoo_collapsable_list_binding
    	};
    }

    class TooltipDocs extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}zoo-tooltip{display:none}.top-tooltip:hover zoo-tooltip{display:block;animation:fadeTooltipIn 0.2s}
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHRpcERvY3Muc3ZlbHRlIiwic291cmNlcyI6WyJUb29sdGlwRG9jcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRvY3MtdG9vbHRpcFwiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIlRvb2x0aXAgY29tcG9uZW50IEFQSS5cIj48L2FwcC1jb250ZXh0PlxyXG48ZGl2IGNsYXNzPVwiZG9jLWVsZW1lbnRcIj5cclxuXHQ8ZGl2IGNsYXNzPVwibGlzdFwiPlxyXG5cdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0IGJpbmQ6dGhpcz17bGlzdH0+XHJcblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMFwiPlxyXG5cdFx0XHRcdDx1bD5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+dGV4dDwvYj4gLSB0ZXh0IHRvIGJlIHByZXNlbnRlZCBpbiB0aGUgdG9hc3QgYm94XHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj5wb3NpdGlvbjwvYj4gLSBQb3NzaWJsZSB2YWx1ZXMgYXJlOiA8Yj50b3A8L2I+LCA8Yj5yaWdodDwvYj4sIDxiPmJvdHRvbTwvYj4gb3IgPGI+bGVmdDwvYj4uIERlZmF1bHQgaXMgPGI+dG9wPC9iPlxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+U2hvd2luZyB0aGUgdG9vbHRpcDwvYj4gLSB0byBzaG93IHRoZSB0b29sdGlwIHVzZSB0aGUgZm9sbG93aW5nIHNuaXBwZXQ6IDxjb2RlPjxwcmU+e3NuaXBwZXR9PC9wcmU+PC9jb2RlPlxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+Q1NTIGtleWZyYW1lczwvYj4gLSB0byBlbmFibGUgYW5pbWF0aW9uIHVzZSB0aGUgZm9sbG93aW5nIHNuaXBwZXQ6IDxjb2RlPjxwcmU+e2tleWZyYW1lc1NuaXBwZXR9PC9wcmU+PC9jb2RlPlxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHQ8L3VsPlxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHRcdDx6b28tY29sbGFwc2FibGUtbGlzdC1pdGVtIHNsb3Q9XCJpdGVtMVwiPlxyXG5cdFx0XHRcdFRoaXMgY29tcG9uZW50IGVpdGhlciByZW5kZXJzIGEgdW5uYW1lZCBzbG90IG9yIHByZXNlbnRzIHRleHQgc3VwcGxpZWQgYXMgYW4gYXR0cmlidXRlLlxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxyXG5cdDwvZGl2PlxyXG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XHJcblx0XHQ8Y29kZT48cHJlPntleGFtcGxlfTwvcHJlPjwvY29kZT5cclxuXHRcdHdpbGwgcHJvZHVjZSB0aGUgZm9sbG93aW5nOlxyXG5cdFx0PGRpdiBzdHlsZT1cIndpZHRoOiAyNTBweDsgbWFyZ2luLWJvdHRvbTogMnB4O1wiPlxyXG5cdFx0XHQ8em9vLWJ1dHRvbiBjbGFzcz1cInRvcC10b29sdGlwXCI+XHJcblx0XHRcdFx0PGRpdiBzbG90PVwiYnV0dG9uY29udGVudFwiPlxyXG5cdFx0XHRcdFx0QnV0dG9uXHJcblx0XHRcdFx0XHQ8em9vLXRvb2x0aXAgdGV4dD1cIlRvb2x0aXAgdGV4dFwiPjwvem9vLXRvb2x0aXA+XHJcblx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdDwvem9vLWJ1dHRvbj5cclxuXHRcdDwvZGl2PlxyXG5cdDwvZGl2PlxyXG48L2Rpdj5cclxuXHJcbjxzdHlsZSB0eXBlPVwidGV4dC9zY3NzXCI+LmRvYy1lbGVtZW50IHtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdzsgfVxuXG4ubGlzdCB7XG4gIHdpZHRoOiAzNSU7XG4gIG1hcmdpbjogMCAyMHB4OyB9XG5cbi5leGFtcGxlIHtcbiAgb3ZlcmZsb3c6IGF1dG87IH1cblxuem9vLXRvb2x0aXAge1xuICBkaXNwbGF5OiBub25lOyB9XG5cbi50b3AtdG9vbHRpcDpob3ZlciB6b28tdG9vbHRpcCB7XG4gIGRpc3BsYXk6IGJsb2NrO1xuICBhbmltYXRpb246IGZhZGVUb29sdGlwSW4gMC4yczsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XHJcblxyXG48c2NyaXB0PlxyXG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xyXG5cdGxldCBsaXN0O1xyXG5cdGxldCBpbnB1dFNsb3RFeGFtcGxlID0gYDxzbG90IG5hbWU9XCJpbnB1dGVsZW1lbnRcIj48L3Nsb3Q+YDtcclxuXHRsZXQgZXhhbXBsZSA9IGA8ZGl2IHN0eWxlPVwid2lkdGg6IDI1MHB4O1wiPlxcbiAgPHpvby1idXR0b24+XFxuICAgIDxkaXYgc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj5cXG4gICAgICBCdXR0b25cXG4gICAgICA8em9vLXRvb2x0aXAgdGV4dD1cIlRvb2x0aXAgdGV4dFwiPjwvem9vLXRvb2x0aXA+XFxuICAgIDwvZGl2PlxcbiAgPC96b28tYnV0dG9uPlxcbjwvZGl2PmA7XHJcblx0bGV0IGtleWZyYW1lc1NuaXBwZXQgPSBgLmNsYXNzLW5hbWU6aG92ZXIge1xcbiAgem9vLXRvb2x0aXAge1xcbiAgICBkaXNwbGF5OiBibG9jaztcXG4gICAgYW5pbWF0aW9uOiBmYWRlVG9vbHRpcEluIDAuMnM7XFxuICB9XFxufWA7XHJcblx0bGV0IHNuaXBwZXQgPSBgLmNsYXNzLW5hbWU6aG92ZXIge1xcbiAgem9vLXRvb2x0aXAge1xcbiAgICBkaXNwbGF5OiBibG9jaztcXG4gIH1cXG59YDtcclxuXHRvbk1vdW50KCgpID0+IHtcclxuXHRcdGxpc3QuaXRlbXMgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdBUEknXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRoZWFkZXI6ICdTbG90cydcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9KTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXlDd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFbkIsV0FBVyxBQUFDLENBQUMsQUFDWCxPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFbEIsWUFBWSxNQUFNLENBQUMsV0FBVyxBQUFDLENBQUMsQUFDOUIsT0FBTyxDQUFFLEtBQUssQ0FDZCxTQUFTLENBQUUsYUFBYSxDQUFDLElBQUksQUFBRSxDQUFDIn0= */</style>`;

    		init(this, { target: this.shadowRoot }, instance$j, create_fragment$j, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-tooltip", TooltipDocs);

    /* src\docs\ThemingDocs.svelte generated by Svelte v3.9.0 */

    const file$k = "src\\docs\\ThemingDocs.svelte";

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
    			t3 = text(".\r\n\t\tAPI describes possible variables which are understood by the library.\r\n\t\t");
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
    			t22 = text("Example with a preprocessor:\r\n\t\t");
    			code0 = element("code");
    			pre0 = element("pre");
    			t23 = text(ctx.exampleScss);
    			t24 = text("\r\n\t\tExample with pure css:\r\n\t\t");
    			code1 = element("code");
    			pre1 = element("pre");
    			t25 = text(ctx.exampleCss);
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Theming API.");
    			add_location(app_context, file$k, 2, 0, 56);
    			attr(a, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/--*");
    			attr(a, "target", "about:blank");
    			add_location(a, file$k, 5, 57, 210);
    			add_location(b0, file$k, 11, 6, 493);
    			add_location(li0, file$k, 10, 5, 481);
    			add_location(b1, file$k, 14, 6, 546);
    			add_location(li1, file$k, 13, 5, 534);
    			add_location(b2, file$k, 17, 6, 605);
    			add_location(li2, file$k, 16, 5, 593);
    			add_location(b3, file$k, 20, 6, 663);
    			add_location(li3, file$k, 19, 5, 651);
    			add_location(b4, file$k, 23, 6, 721);
    			add_location(li4, file$k, 22, 5, 709);
    			add_location(b5, file$k, 26, 6, 785);
    			add_location(li5, file$k, 25, 5, 773);
    			add_location(ul, file$k, 9, 4, 470);
    			set_custom_element_data(zoo_collapsable_list_item, "slot", "item0");
    			add_location(zoo_collapsable_list_item, file$k, 8, 3, 424);
    			add_location(zoo_collapsable_list, file$k, 7, 2, 380);
    			attr(div0, "class", "list");
    			add_location(div0, file$k, 4, 1, 133);
    			add_location(pre0, file$k, 34, 8, 975);
    			add_location(code0, file$k, 34, 2, 969);
    			add_location(pre1, file$k, 36, 8, 1042);
    			add_location(code1, file$k, 36, 2, 1036);
    			attr(div1, "class", "example");
    			add_location(div1, file$k, 32, 1, 912);
    			attr(div2, "class", "doc-element");
    			add_location(div2, file$k, 3, 0, 105);
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
    			ctx.zoo_collapsable_list_binding(zoo_collapsable_list);
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

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(app_context);
    				detach(t0);
    				detach(div2);
    			}

    			ctx.zoo_collapsable_list_binding(null);
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

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('list', list = $$value);
    		});
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
		/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGhlbWluZ0RvY3Muc3ZlbHRlIiwic291cmNlcyI6WyJUaGVtaW5nRG9jcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHN2ZWx0ZTpvcHRpb25zIHRhZz1cImRvY3MtdGhlbWluZ1wiPjwvc3ZlbHRlOm9wdGlvbnM+XHJcblxyXG48YXBwLWNvbnRleHQgdGV4dD1cIlRoZW1pbmcgQVBJLlwiPjwvYXBwLWNvbnRleHQ+XHJcbjxkaXYgY2xhc3M9XCJkb2MtZWxlbWVudFwiPlxyXG5cdDxkaXYgY2xhc3M9XCJsaXN0XCI+XHJcblx0XHRUaGVtaW5nIGNhbiBiZSBhY2hpZXZlZCBieSB1c2luZyBDU1MgQ3VzdG9tIFByb3BlcnRpZXMgPGEgaHJlZj1cImh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0NTUy8tLSpcIiB0YXJnZXQ9XCJhYm91dDpibGFua1wiPmRvY3M8L2E+LlxyXG5cdFx0QVBJIGRlc2NyaWJlcyBwb3NzaWJsZSB2YXJpYWJsZXMgd2hpY2ggYXJlIHVuZGVyc3Rvb2QgYnkgdGhlIGxpYnJhcnkuXHJcblx0XHQ8em9vLWNvbGxhcHNhYmxlLWxpc3QgYmluZDp0aGlzPXtsaXN0fT5cclxuXHRcdFx0PHpvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0gc2xvdD1cIml0ZW0wXCI+XHJcblx0XHRcdFx0PHVsPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj4tLW1haW4tY29sb3I8L2I+IC0gXHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj4tLW1haW4tY29sb3ItbGlnaHQ8L2I+IC0gXHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj4tLW1haW4tY29sb3ItZGFyazwvYj4gLSBcclxuXHRcdFx0XHRcdDwvbGk+XHJcblx0XHRcdFx0XHQ8bGk+XHJcblx0XHRcdFx0XHRcdDxiPi0tc2Vjb25kYXJ5LWNvbG9yPC9iPiAtIFxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHRcdDxsaT5cclxuXHRcdFx0XHRcdFx0PGI+LS1zZWNvbmRhcnktY29sb3ItbGlnaHQ8L2I+IC0gXHJcblx0XHRcdFx0XHQ8L2xpPlxyXG5cdFx0XHRcdFx0PGxpPlxyXG5cdFx0XHRcdFx0XHQ8Yj4tLXNlY29uZGFyeS1jb2xvci1kYXJrPC9iPiAtIFxyXG5cdFx0XHRcdFx0PC9saT5cclxuXHRcdFx0XHQ8L3VsPlxyXG5cdFx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0LWl0ZW0+XHJcblx0XHQ8L3pvby1jb2xsYXBzYWJsZS1saXN0PlxyXG5cdDwvZGl2PlxyXG5cdDxkaXYgY2xhc3M9XCJleGFtcGxlXCI+XHJcblx0XHRFeGFtcGxlIHdpdGggYSBwcmVwcm9jZXNzb3I6XHJcblx0XHQ8Y29kZT48cHJlPntleGFtcGxlU2Nzc308L3ByZT48L2NvZGU+XHJcblx0XHRFeGFtcGxlIHdpdGggcHVyZSBjc3M6XHJcblx0XHQ8Y29kZT48cHJlPntleGFtcGxlQ3NzfTwvcHJlPjwvY29kZT5cclxuXHQ8L2Rpdj5cclxuPC9kaXY+XHJcblxyXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5kb2MtZWxlbWVudCB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7IH1cblxuLmxpc3Qge1xuICB3aWR0aDogMzUlO1xuICBtYXJnaW46IDAgMjBweDsgfVxuXG4uZXhhbXBsZSB7XG4gIG92ZXJmbG93OiBhdXRvOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cclxuXHJcbjxzY3JpcHQ+XHJcbmltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xyXG5cdGxldCBsaXN0O1xyXG5cdGxldCBleGFtcGxlU2NzcyA9IGBAaW1wb3J0IFwidmFyaWFibGVzXCI7XFxuOnJvb3Qge1xcbiAgLS1tYWluLWNvbG9yOiAjeyRtYWluLWNvbG9yfTtcXG4gIC0tbWFpbi1jb2xvci1saWdodDogI3skbWFpbi1jb2xvci1saWdodH07XFxuICAtLW1haW4tY29sb3ItZGFyazogI3skbWFpbi1jb2xvci1kYXJrfTtcXG4gIC0tc2Vjb25kYXJ5LWNvbG9yOiAjeyRzZWNvbmRhcnktY29sb3J9O1xcbiAgLS1zZWNvbmRhcnktY29sb3ItbGlnaHQ6ICN7JHNlY29uZGFyeS1jb2xvci1saWdodH07XFxuICAtLXNlY29uZGFyeS1jb2xvci1kYXJrOiAjeyRzZWNvbmRhcnktY29sb3ItZGFya307XFxufWA7XHJcblx0bGV0IGV4YW1wbGVDc3MgPSBgOnJvb3Qge1xcbiAgLS1tYWluLWNvbG9yOiAjMDQwQzQwO1xcbiAgLS1tYWluLWNvbG9yLWxpZ2h0OiAjMDQwQzQwO1xcbiAgLS1tYWluLWNvbG9yLWRhcms6ICMwMjA3Mjk7XFxuICAtLXNlY29uZGFyeS1jb2xvcjogIzVENDIwMDtcXG4gIC0tc2Vjb25kYXJ5LWNvbG9yLWxpZ2h0OiAjNzQ1MzAwO1xcbiAgLS1zZWNvbmRhcnktY29sb3ItZGFyazogIzNCMkIwMDtcXG59YDtcclxuXHRvbk1vdW50KCgpID0+IHtcclxuXHRcdGxpc3QuaXRlbXMgPSBbe2hlYWRlcjogJ0FQSSd9XTtcclxuXHR9KTtcclxuPC9zY3JpcHQ+Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXdDd0IsWUFBWSxBQUFDLENBQUMsQUFDcEMsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFeEIsS0FBSyxBQUFDLENBQUMsQUFDTCxLQUFLLENBQUUsR0FBRyxDQUNWLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSxBQUFDLENBQUMsQUFDUixRQUFRLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */</style>`;

    		init(this, { target: this.shadowRoot }, instance$k, create_fragment$k, safe_not_equal, []);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-theming", ThemingDocs);

}());
//# sourceMappingURL=bundle-docs.js.map
