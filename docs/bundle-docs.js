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
        else if (node.getAttribute(attribute) !== value)
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
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
        fragment && fragment.m(target, anchor);
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
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
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
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }

    /* src/common/Context.svelte generated by Svelte v3.22.2 */

    const file = "src/common/Context.svelte";

    // (4:1) {#if backbtn}
    function create_if_block(ctx) {
    	let div;
    	let zoo_button;
    	let span;
    	let a;

    	const block = {
    		c: function create() {
    			div = element("div");
    			zoo_button = element("zoo-button");
    			span = element("span");
    			a = element("a");
    			a.textContent = "Go to top";
    			attr_dev(a, "href", "#");
    			add_location(a, file, 6, 31, 178);
    			attr_dev(span, "slot", "buttoncontent");
    			add_location(span, file, 6, 4, 151);
    			add_location(zoo_button, file, 5, 3, 134);
    			attr_dev(div, "class", "back-btn");
    			add_location(div, file, 4, 2, 108);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, zoo_button);
    			append_dev(zoo_button, span);
    			append_dev(span, a);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(4:1) {#if backbtn}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let h2;
    	let t0;
    	let t1;
    	let if_block = /*backbtn*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text(/*text*/ ctx[0]);
    			t1 = space();
    			if (if_block) if_block.c();
    			this.c = noop;
    			add_location(h2, file, 2, 1, 75);
    			attr_dev(div, "class", "context");
    			add_location(div, file, 1, 0, 52);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(h2, t0);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 1) set_data_dev(t0, /*text*/ ctx[0]);

    			if (/*backbtn*/ ctx[1]) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
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
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { text = "" } = $$props;
    	let { backbtn = false } = $$props;
    	const writable_props = ["text", "backbtn"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<app-context> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("app-context", $$slots, []);

    	$$self.$set = $$props => {
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    		if ("backbtn" in $$props) $$invalidate(1, backbtn = $$props.backbtn);
    	};

    	$$self.$capture_state = () => ({ text, backbtn });

    	$$self.$inject_state = $$props => {
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    		if ("backbtn" in $$props) $$invalidate(1, backbtn = $$props.backbtn);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text, backbtn];
    }

    class Context extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.context{min-height:80px;display:flex;align-items:center;margin-left:20px;background:white}.back-btn{margin-left:5px}.back-btn a{text-decoration:none;color:white}h2{color:var(--primary-mid, #3C9700);font-size:23px}</style>`;
    		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, { text: 0, backbtn: 1 });

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["text", "backbtn"];
    	}

    	get text() {
    		return this.$$.ctx[0];
    	}

    	set text(text) {
    		this.$set({ text });
    		flush();
    	}

    	get backbtn() {
    		return this.$$.ctx[1];
    	}

    	set backbtn(backbtn) {
    		this.$set({ backbtn });
    		flush();
    	}
    }

    customElements.define("app-context", Context);

    /* src/sections/Header.svelte generated by Svelte v3.22.2 */

    const file$1 = "src/sections/Header.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (24:3) {#each navlinks as link}
    function create_each_block(ctx) {
    	let div;
    	let a;
    	let t0_value = /*link*/ ctx[12].text + "";
    	let t0;
    	let a_href_value;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(a, "href", a_href_value = /*link*/ ctx[12].href);
    			add_location(a, file$1, 25, 5, 1008);
    			attr_dev(div, "class", "nav-link");
    			add_location(div, file$1, 24, 4, 980);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, t0);
    			append_dev(div, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(24:3) {#each navlinks as link}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let header;
    	let zoo_header;
    	let div3;
    	let div0;
    	let zoo_button0;
    	let span0;
    	let zoo_button0_type_value;
    	let t1;
    	let div1;
    	let zoo_button1;
    	let span1;
    	let zoo_button1_type_value;
    	let t3;
    	let div2;
    	let zoo_button2;
    	let span2;
    	let zoo_button2_type_value;
    	let t5;
    	let zoo_navigation;
    	let div4;
    	let dispose;
    	let each_value = /*navlinks*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
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

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.c = noop;
    			attr_dev(span0, "slot", "buttoncontent");
    			attr_dev(span0, "class", "slotted-span");
    			add_location(span0, file$1, 6, 5, 304);
    			set_custom_element_data(zoo_button0, "type", zoo_button0_type_value = /*theme*/ ctx[0] === "zoo" ? "hot" : "cold");
    			set_custom_element_data(zoo_button0, "size", "medium");
    			add_location(zoo_button0, file$1, 5, 4, 194);
    			attr_dev(div0, "class", "header-button");
    			add_location(div0, file$1, 4, 3, 162);
    			attr_dev(span1, "slot", "buttoncontent");
    			attr_dev(span1, "class", "slotted-span");
    			add_location(span1, file$1, 11, 5, 545);
    			set_custom_element_data(zoo_button1, "type", zoo_button1_type_value = /*theme*/ ctx[0] === "grey" ? "hot" : "cold");
    			set_custom_element_data(zoo_button1, "size", "medium");
    			add_location(zoo_button1, file$1, 10, 4, 433);
    			attr_dev(div1, "class", "header-button");
    			add_location(div1, file$1, 9, 3, 401);
    			attr_dev(span2, "slot", "buttoncontent");
    			attr_dev(span2, "class", "slotted-span");
    			add_location(span2, file$1, 16, 5, 790);
    			set_custom_element_data(zoo_button2, "type", zoo_button2_type_value = /*theme*/ ctx[0] === "random" ? "hot" : "cold");
    			set_custom_element_data(zoo_button2, "size", "medium");
    			add_location(zoo_button2, file$1, 15, 4, 674);
    			attr_dev(div2, "class", "header-button");
    			add_location(div2, file$1, 14, 3, 642);
    			attr_dev(div3, "class", "buttons-holder");
    			add_location(div3, file$1, 3, 2, 130);
    			set_custom_element_data(zoo_header, "imgsrc", "logo.png");
    			set_custom_element_data(zoo_header, "headertext", "Zooplus web components");
    			add_location(zoo_header, file$1, 2, 1, 61);
    			add_location(div4, file$1, 22, 2, 942);
    			set_custom_element_data(zoo_navigation, "class", "nav");
    			add_location(zoo_navigation, file$1, 21, 1, 911);
    			add_location(header, file$1, 1, 0, 51);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, header, anchor);
    			append_dev(header, zoo_header);
    			append_dev(zoo_header, div3);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_button0);
    			append_dev(zoo_button0, span0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div1, zoo_button1);
    			append_dev(zoo_button1, span1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, zoo_button2);
    			append_dev(zoo_button2, span2);
    			append_dev(header, t5);
    			append_dev(header, zoo_navigation);
    			append_dev(zoo_navigation, div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(zoo_button0, "click", /*click_handler*/ ctx[9], false, false, false),
    				listen_dev(zoo_button1, "click", /*click_handler_1*/ ctx[10], false, false, false),
    				listen_dev(zoo_button2, "click", /*click_handler_2*/ ctx[11], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*theme*/ 1 && zoo_button0_type_value !== (zoo_button0_type_value = /*theme*/ ctx[0] === "zoo" ? "hot" : "cold")) {
    				set_custom_element_data(zoo_button0, "type", zoo_button0_type_value);
    			}

    			if (dirty & /*theme*/ 1 && zoo_button1_type_value !== (zoo_button1_type_value = /*theme*/ ctx[0] === "grey" ? "hot" : "cold")) {
    				set_custom_element_data(zoo_button1, "type", zoo_button1_type_value);
    			}

    			if (dirty & /*theme*/ 1 && zoo_button2_type_value !== (zoo_button2_type_value = /*theme*/ ctx[0] === "random" ? "hot" : "cold")) {
    				set_custom_element_data(zoo_button2, "type", zoo_button2_type_value);
    			}

    			if (dirty & /*navlinks*/ 2) {
    				each_value = /*navlinks*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
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
    			if (detaching) detach_dev(header);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let theme = "zoo";

    	let navlinks = [
    		{
    			href: "#what",
    			text: "What is this project?"
    		},
    		{
    			href: "#when",
    			text: "When can I use it?"
    		},
    		{ href: "#how", text: "How can I use it?" }
    	];

    	const changeTheme = pallete => {
    		$$invalidate(0, theme = pallete);

    		switch (pallete) {
    			case "zoo":
    				setColorVar("--primary-mid", "#3C9700");
    				setColorVar("--primary-light", "#66B100");
    				setColorVar("--primary-dark", "#286400");
    				setColorVar("--primary-ultralight", "#EBF4E5");
    				setColorVar("--secondary-mid", "#FF6200");
    				setColorVar("--secondary-light", "#FF8800");
    				setColorVar("--secondary-dark", "#CC4E00");
    				break;
    			case "grey":
    				setColorVar("--primary-mid", "#676778");
    				setColorVar("--primary-light", "#838399");
    				setColorVar("--primary-dark", "#565664");
    				setColorVar("--primary-ultralight", "#838399");
    				setColorVar("--secondary-mid", "#ff3e00");
    				setColorVar("--secondary-light", "#ff794d");
    				setColorVar("--secondary-dark", "#c53100");
    				break;
    		}
    	};

    	const setColorVar = (name, value) => {
    		document.documentElement.style.setProperty(name, value);
    	};

    	const generateRandomTheme = () => {
    		$$invalidate(0, theme = "random");
    		const main = randomRgbaString();
    		const mainHex = rgbToHex(main.r, main.g, main.b);
    		setColorVar("--primary-mid", mainHex);
    		setColorVar("--primary-light", lightenDarkenColor(mainHex, 30));
    		setColorVar("--primary-dark", lightenDarkenColor(mainHex, -30));
    		setColorVar("--primary-ultralight", lightenDarkenColor(mainHex, 60));
    		const second = randomRgbaString();
    		const secondHex = rgbToHex(second.r, second.g, second.b);
    		setColorVar("--secondary-mid", rgbToHex(second.r, second.g, second.b));
    		setColorVar("--secondary-light", lightenDarkenColor(secondHex, 30));
    		setColorVar("--secondary-dark", lightenDarkenColor(secondHex, -30));
    	};

    	const randomRgbaString = () => {
    		let r = Math.floor(Math.random() * 255);
    		let g = Math.floor(Math.random() * 255);
    		let b = Math.floor(Math.random() * 255);
    		return { r, g, b };
    	};

    	const rgbToHex = (r, g, b) => {
    		return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    	};

    	const componentToHex = c => {
    		let hex = c.toString(16);
    		return hex.length == 1 ? "0" + hex : hex;
    	};

    	const lightenDarkenColor = (col, amt) => {
    		var usePound = false;

    		if (col[0] == "#") {
    			col = col.slice(1);
    			usePound = true;
    		}

    		var num = parseInt(col, 16);
    		var r = (num >> 16) + amt;
    		if (r > 255) r = 255; else if (r < 0) r = 0;
    		var b = (num >> 8 & 255) + amt;
    		if (b > 255) b = 255; else if (b < 0) b = 0;
    		var g = (num & 255) + amt;
    		if (g > 255) g = 255; else if (g < 0) g = 0;
    		return (usePound ? "#" : "") + (g | b << 8 | r << 16).toString(16);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<app-header> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("app-header", $$slots, []);
    	const click_handler = () => changeTheme("zoo");
    	const click_handler_1 = () => changeTheme("grey");
    	const click_handler_2 = () => generateRandomTheme();

    	$$self.$capture_state = () => ({
    		theme,
    		navlinks,
    		changeTheme,
    		setColorVar,
    		generateRandomTheme,
    		randomRgbaString,
    		rgbToHex,
    		componentToHex,
    		lightenDarkenColor
    	});

    	$$self.$inject_state = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("navlinks" in $$props) $$invalidate(1, navlinks = $$props.navlinks);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		theme,
    		navlinks,
    		changeTheme,
    		generateRandomTheme,
    		setColorVar,
    		randomRgbaString,
    		rgbToHex,
    		componentToHex,
    		lightenDarkenColor,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Header extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>header{position:relative}.buttons-holder{display:flex;justify-content:flex-end;flex-direction:row;flex-grow:1;padding:0 25px 0 0}.header-button{display:flex;max-width:250px;min-width:140px;margin-left:15px}.header-button zoo-button{align-self:center}@media only screen and (max-width: 544px){.header-button .slotted-span{display:none}}.nav{position:sticky;top:0;color:white;font-size:14px;font-weight:bold;line-height:20px;cursor:pointer}.nav .nav-link{cursor:pointer;display:flex;align-items:center}.nav .nav-link:hover{background:rgba(255, 255, 255, 0.3)}.nav .nav-link a{color:white;text-decoration:none;padding:0 15px}</style>`;
    		init(this, { target: this.shadowRoot }, instance$1, create_fragment$1, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("app-header", Header);

    /* src/sections/Form.svelte generated by Svelte v3.22.2 */

    const file$2 = "src/sections/Form.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (43:3) {#each options as option}
    function create_each_block_1(ctx) {
    	let option;
    	let t0_value = /*option*/ ctx[3].text + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = /*option*/ ctx[3].value;
    			option.value = option.__value;
    			add_location(option, file$2, 43, 4, 2544);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(43:3) {#each options as option}",
    		ctx
    	});

    	return block;
    }

    // (52:3) {#each options as option}
    function create_each_block$1(ctx) {
    	let option;
    	let t0_value = /*option*/ ctx[3].text + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = /*option*/ ctx[3].value;
    			option.value = option.__value;
    			add_location(option, file$2, 52, 4, 2861);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(52:3) {#each options as option}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let app_context;
    	let t0;
    	let form;
    	let zoo_input0;
    	let input0;
    	let t1;
    	let zoo_input1;
    	let input1;
    	let t2;
    	let zoo_input2;
    	let input2;
    	let t3;
    	let zoo_input3;
    	let input3;
    	let t4;
    	let zoo_input4;
    	let input4;
    	let t5;
    	let zoo_input5;
    	let textarea;
    	let t6;
    	let zoo_select0;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let t11;
    	let zoo_select1;
    	let select1;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let t16;
    	let zoo_searchable_select0;
    	let select2;
    	let t17;
    	let zoo_searchable_select1;
    	let select3;
    	let t18;
    	let zoo_select2;
    	let select4;
    	let option8;
    	let option9;
    	let option10;
    	let option11;
    	let t23;
    	let zoo_checkbox;
    	let input5;
    	let zoo_checkbox_highlighted_value;
    	let t24;
    	let zoo_radio0;
    	let template;
    	let input6;
    	let t25;
    	let label0;
    	let t27;
    	let input7;
    	let t28;
    	let label1;
    	let t30;
    	let input8;
    	let t31;
    	let label2;
    	let t33;
    	let zoo_radio1;
    	let input9;
    	let t34;
    	let label3;
    	let t36;
    	let input10;
    	let t37;
    	let label4;
    	let t39;
    	let div;
    	let zoo_button;
    	let span;
    	let dispose;
    	let each_value_1 = /*options*/ ctx[1];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*options*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
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
    			input4 = element("input");
    			t5 = space();
    			zoo_input5 = element("zoo-input");
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

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t17 = space();
    			zoo_searchable_select1 = element("zoo-searchable-select");
    			select3 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t18 = space();
    			zoo_select2 = element("zoo-select");
    			select4 = element("select");
    			option8 = element("option");
    			option8.textContent = "Placeholder";
    			option9 = element("option");
    			option9.textContent = "1";
    			option10 = element("option");
    			option10.textContent = "2";
    			option11 = element("option");
    			option11.textContent = "3";
    			t23 = space();
    			zoo_checkbox = element("zoo-checkbox");
    			input5 = element("input");
    			t24 = space();
    			zoo_radio0 = element("zoo-radio");
    			template = element("template");
    			input6 = element("input");
    			t25 = space();
    			label0 = element("label");
    			label0.textContent = "Email";
    			t27 = space();
    			input7 = element("input");
    			t28 = space();
    			label1 = element("label");
    			label1.textContent = "Phone";
    			t30 = space();
    			input8 = element("input");
    			t31 = space();
    			label2 = element("label");
    			label2.textContent = "Mail";
    			t33 = space();
    			zoo_radio1 = element("zoo-radio");
    			input9 = element("input");
    			t34 = space();
    			label3 = element("label");
    			label3.textContent = "Email";
    			t36 = space();
    			input10 = element("input");
    			t37 = space();
    			label4 = element("label");
    			label4.textContent = "Phone";
    			t39 = space();
    			div = element("div");
    			zoo_button = element("zoo-button");
    			span = element("span");
    			span.textContent = "Trigger invalid state!";
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "First section is a showcase of different form elements like `input`, `textarea`, `select`.");
    			add_location(app_context, file$2, 1, 0, 49);
    			attr_dev(input0, "slot", "inputelement");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "input");
    			add_location(input0, file$2, 5, 2, 436);
    			set_custom_element_data(zoo_input0, "labeltext", "Input type text");
    			set_custom_element_data(zoo_input0, "linktext", "Forgotten your password?");
    			set_custom_element_data(zoo_input0, "linkhref", "https://google.com");
    			set_custom_element_data(zoo_input0, "linktarget", "about:blank");
    			set_custom_element_data(zoo_input0, "valid", /*inputState*/ ctx[0]);
    			set_custom_element_data(zoo_input0, "inputerrormsg", "invalid");
    			set_custom_element_data(zoo_input0, "infotext", "Additional helpful information for our users");
    			add_location(zoo_input0, file$2, 3, 1, 196);
    			attr_dev(input1, "slot", "inputelement");
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "placeholder", "input");
    			add_location(input1, file$2, 9, 2, 674);
    			set_custom_element_data(zoo_input1, "labeltext", "Input type number");
    			set_custom_element_data(zoo_input1, "linkhref", "https://google.com");
    			set_custom_element_data(zoo_input1, "linktarget", "about:blank");
    			set_custom_element_data(zoo_input1, "infotext", "Additional helpful information for our users");
    			add_location(zoo_input1, file$2, 7, 1, 513);
    			attr_dev(input2, "slot", "inputelement");
    			attr_dev(input2, "type", "date");
    			attr_dev(input2, "placeholder", "Enter date");
    			add_location(input2, file$2, 13, 2, 1003);
    			set_custom_element_data(zoo_input2, "labeltext", "This input has type date");
    			set_custom_element_data(zoo_input2, "linktext", "Native date picker -> click me");
    			set_custom_element_data(zoo_input2, "linkhref", "https://github.com/jcgertig/date-input-polyfill");
    			set_custom_element_data(zoo_input2, "linktarget", "about:blank");
    			set_custom_element_data(zoo_input2, "infotext", "Click on input to show context menu with date selection");
    			add_location(zoo_input2, file$2, 11, 1, 753);
    			attr_dev(input3, "slot", "inputelement");
    			attr_dev(input3, "type", "time");
    			attr_dev(input3, "placeholder", "Enter time");
    			add_location(input3, file$2, 16, 2, 1159);
    			set_custom_element_data(zoo_input3, "labeltext", "This input has type time");
    			set_custom_element_data(zoo_input3, "infotext", "Select time");
    			add_location(zoo_input3, file$2, 15, 1, 1085);
    			input4.disabled = true;
    			attr_dev(input4, "slot", "inputelement");
    			attr_dev(input4, "type", "text");
    			add_location(input4, file$2, 19, 2, 1290);
    			set_custom_element_data(zoo_input4, "labeltext", "This input is disabled");
    			add_location(zoo_input4, file$2, 18, 1, 1241);
    			attr_dev(textarea, "slot", "inputelement");
    			attr_dev(textarea, "placeholder", "Textarea");
    			add_location(textarea, file$2, 22, 2, 1419);
    			set_custom_element_data(zoo_input5, "labeltext", "Textarea example");
    			set_custom_element_data(zoo_input5, "valid", /*inputState*/ ctx[0]);
    			add_location(zoo_input5, file$2, 21, 1, 1355);
    			attr_dev(option0, "class", "placeholder");
    			option0.__value = "";
    			option0.value = option0.__value;
    			option0.disabled = true;
    			option0.selected = true;
    			add_location(option0, file$2, 26, 3, 1776);
    			option1.__value = "1";
    			option1.value = option1.__value;
    			add_location(option1, file$2, 27, 3, 1855);
    			option2.__value = "2";
    			option2.value = option2.__value;
    			add_location(option2, file$2, 28, 3, 1877);
    			option3.__value = "3";
    			option3.value = option3.__value;
    			add_location(option3, file$2, 29, 3, 1899);
    			attr_dev(select0, "slot", "selectelement");
    			select0.multiple = true;
    			add_location(select0, file$2, 25, 2, 1734);
    			set_custom_element_data(zoo_select0, "labeltext", "Multiselect");
    			set_custom_element_data(zoo_select0, "linktext", "Documentation link");
    			set_custom_element_data(zoo_select0, "linkhref", "https://google.com");
    			set_custom_element_data(zoo_select0, "linktarget", "about:blank");
    			set_custom_element_data(zoo_select0, "valid", /*inputState*/ ctx[0]);
    			set_custom_element_data(zoo_select0, "inputerrormsg", "Value is required");
    			set_custom_element_data(zoo_select0, "infotext", "Additional helpful information for our users");
    			add_location(zoo_select0, file$2, 24, 1, 1499);
    			attr_dev(option4, "class", "placeholder");
    			option4.__value = "";
    			option4.value = option4.__value;
    			option4.disabled = true;
    			option4.selected = true;
    			add_location(option4, file$2, 34, 3, 2133);
    			option5.__value = "1";
    			option5.value = option5.__value;
    			add_location(option5, file$2, 35, 3, 2212);
    			option6.__value = "2";
    			option6.value = option6.__value;
    			add_location(option6, file$2, 36, 3, 2234);
    			option7.__value = "3";
    			option7.value = option7.__value;
    			add_location(option7, file$2, 37, 3, 2256);
    			attr_dev(select1, "slot", "selectelement");
    			add_location(select1, file$2, 33, 2, 2100);
    			set_custom_element_data(zoo_select1, "labeltext", "Standard select");
    			set_custom_element_data(zoo_select1, "valid", /*inputState*/ ctx[0]);
    			set_custom_element_data(zoo_select1, "inputerrormsg", "Value is required");
    			set_custom_element_data(zoo_select1, "infotext", "Additional helpful information for our users");
    			add_location(zoo_select1, file$2, 32, 1, 1946);
    			select2.multiple = true;
    			attr_dev(select2, "slot", "selectelement");
    			add_location(select2, file$2, 41, 2, 2472);
    			set_custom_element_data(zoo_searchable_select0, "labeltext", "Searchable multiple select");
    			set_custom_element_data(zoo_searchable_select0, "placeholder", "Placeholder");
    			set_custom_element_data(zoo_searchable_select0, "infotext", "Additional helpful information for our users which is a long text.");
    			add_location(zoo_searchable_select0, file$2, 40, 1, 2303);
    			attr_dev(select3, "slot", "selectelement");
    			add_location(select3, file$2, 50, 2, 2798);
    			set_custom_element_data(zoo_searchable_select1, "labeltext", "Searchable select");
    			set_custom_element_data(zoo_searchable_select1, "placeholder", "Placeholder");
    			set_custom_element_data(zoo_searchable_select1, "infotext", "Additional helpful information for our users.");
    			add_location(zoo_searchable_select1, file$2, 49, 1, 2659);
    			attr_dev(option8, "class", "placeholder");
    			option8.__value = "";
    			option8.value = option8.__value;
    			option8.disabled = true;
    			option8.selected = true;
    			add_location(option8, file$2, 60, 3, 3061);
    			option9.__value = "1";
    			option9.value = option9.__value;
    			add_location(option9, file$2, 61, 3, 3140);
    			option10.__value = "2";
    			option10.value = option10.__value;
    			add_location(option10, file$2, 62, 3, 3162);
    			option11.__value = "3";
    			option11.value = option11.__value;
    			add_location(option11, file$2, 63, 3, 3184);
    			select4.disabled = true;
    			attr_dev(select4, "slot", "selectelement");
    			add_location(select4, file$2, 59, 2, 3019);
    			set_custom_element_data(zoo_select2, "labeltext", "Disabled select");
    			add_location(zoo_select2, file$2, 58, 1, 2976);
    			attr_dev(input5, "slot", "checkboxelement");
    			attr_dev(input5, "type", "checkbox");
    			add_location(input5, file$2, 67, 2, 3375);
    			set_custom_element_data(zoo_checkbox, "highlighted", zoo_checkbox_highlighted_value = true);
    			set_custom_element_data(zoo_checkbox, "valid", /*inputState*/ ctx[0]);
    			set_custom_element_data(zoo_checkbox, "labeltext", "An example checkbox with some additional event handling of clicks inside");
    			add_location(zoo_checkbox, file$2, 66, 1, 3231);
    			attr_dev(input6, "type", "radio");
    			attr_dev(input6, "id", "contactChoice1");
    			attr_dev(input6, "name", "contact");
    			input6.value = "email";
    			input6.disabled = true;
    			add_location(input6, file$2, 71, 3, 3553);
    			attr_dev(label0, "for", "contactChoice1");
    			add_location(label0, file$2, 72, 3, 3635);
    			attr_dev(input7, "type", "radio");
    			attr_dev(input7, "id", "contactChoice2");
    			attr_dev(input7, "name", "contact");
    			input7.value = "phone";
    			add_location(input7, file$2, 73, 3, 3680);
    			attr_dev(label1, "for", "contactChoice2");
    			add_location(label1, file$2, 74, 3, 3753);
    			attr_dev(input8, "type", "radio");
    			attr_dev(input8, "id", "contactChoice3");
    			attr_dev(input8, "name", "contact");
    			input8.value = "mail";
    			add_location(input8, file$2, 75, 3, 3798);
    			attr_dev(label2, "for", "contactChoice3");
    			add_location(label2, file$2, 76, 3, 3870);
    			add_location(template, file$2, 70, 2, 3539);
    			set_custom_element_data(zoo_radio0, "valid", /*inputState*/ ctx[0]);
    			set_custom_element_data(zoo_radio0, "errormsg", "errormsg");
    			set_custom_element_data(zoo_radio0, "infotext", "infotext");
    			set_custom_element_data(zoo_radio0, "labeltext", "Label text");
    			add_location(zoo_radio0, file$2, 69, 1, 3441);
    			attr_dev(input9, "type", "radio");
    			attr_dev(input9, "id", "contactChoice4");
    			attr_dev(input9, "name", "contact");
    			input9.value = "email";
    			input9.disabled = true;
    			add_location(input9, file$2, 81, 2, 4016);
    			attr_dev(label3, "for", "contactChoice4");
    			add_location(label3, file$2, 82, 2, 4097);
    			attr_dev(input10, "type", "radio");
    			attr_dev(input10, "id", "contactChoice5");
    			attr_dev(input10, "name", "contact");
    			input10.value = "phone";
    			add_location(input10, file$2, 83, 2, 4141);
    			attr_dev(label4, "for", "contactChoice5");
    			add_location(label4, file$2, 84, 2, 4213);
    			set_custom_element_data(zoo_radio1, "valid", /*inputState*/ ctx[0]);
    			set_custom_element_data(zoo_radio1, "errormsg", "errormsg");
    			set_custom_element_data(zoo_radio1, "infotext", "infotext");
    			add_location(zoo_radio1, file$2, 80, 1, 3941);
    			attr_dev(form, "class", "form");
    			add_location(form, file$2, 2, 0, 175);
    			attr_dev(span, "slot", "buttoncontent");
    			attr_dev(span, "class", "slotted-span");
    			add_location(span, file$2, 89, 2, 4364);
    			set_custom_element_data(zoo_button, "type", "hot");
    			set_custom_element_data(zoo_button, "size", "medium");
    			add_location(zoo_button, file$2, 88, 1, 4299);
    			attr_dev(div, "class", "submit");
    			add_location(div, file$2, 87, 0, 4277);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, zoo_input0);
    			append_dev(zoo_input0, input0);
    			append_dev(form, t1);
    			append_dev(form, zoo_input1);
    			append_dev(zoo_input1, input1);
    			append_dev(form, t2);
    			append_dev(form, zoo_input2);
    			append_dev(zoo_input2, input2);
    			append_dev(form, t3);
    			append_dev(form, zoo_input3);
    			append_dev(zoo_input3, input3);
    			append_dev(form, t4);
    			append_dev(form, zoo_input4);
    			append_dev(zoo_input4, input4);
    			append_dev(form, t5);
    			append_dev(form, zoo_input5);
    			append_dev(zoo_input5, textarea);
    			append_dev(form, t6);
    			append_dev(form, zoo_select0);
    			append_dev(zoo_select0, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			append_dev(select0, option3);
    			append_dev(form, t11);
    			append_dev(form, zoo_select1);
    			append_dev(zoo_select1, select1);
    			append_dev(select1, option4);
    			append_dev(select1, option5);
    			append_dev(select1, option6);
    			append_dev(select1, option7);
    			append_dev(form, t16);
    			append_dev(form, zoo_searchable_select0);
    			append_dev(zoo_searchable_select0, select2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select2, null);
    			}

    			append_dev(form, t17);
    			append_dev(form, zoo_searchable_select1);
    			append_dev(zoo_searchable_select1, select3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select3, null);
    			}

    			append_dev(form, t18);
    			append_dev(form, zoo_select2);
    			append_dev(zoo_select2, select4);
    			append_dev(select4, option8);
    			append_dev(select4, option9);
    			append_dev(select4, option10);
    			append_dev(select4, option11);
    			append_dev(form, t23);
    			append_dev(form, zoo_checkbox);
    			append_dev(zoo_checkbox, input5);
    			append_dev(form, t24);
    			append_dev(form, zoo_radio0);
    			append_dev(zoo_radio0, template);
    			append_dev(template.content, input6);
    			append_dev(template.content, t25);
    			append_dev(template.content, label0);
    			append_dev(template.content, t27);
    			append_dev(template.content, input7);
    			append_dev(template.content, t28);
    			append_dev(template.content, label1);
    			append_dev(template.content, t30);
    			append_dev(template.content, input8);
    			append_dev(template.content, t31);
    			append_dev(template.content, label2);
    			append_dev(form, t33);
    			append_dev(form, zoo_radio1);
    			append_dev(zoo_radio1, input9);
    			append_dev(zoo_radio1, t34);
    			append_dev(zoo_radio1, label3);
    			append_dev(zoo_radio1, t36);
    			append_dev(zoo_radio1, input10);
    			append_dev(zoo_radio1, t37);
    			append_dev(zoo_radio1, label4);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, zoo_button);
    			append_dev(zoo_button, span);
    			if (remount) dispose();
    			dispose = listen_dev(zoo_button, "click", /*changeState*/ ctx[2], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*inputState*/ 1) {
    				set_custom_element_data(zoo_input0, "valid", /*inputState*/ ctx[0]);
    			}

    			if (dirty & /*inputState*/ 1) {
    				set_custom_element_data(zoo_input5, "valid", /*inputState*/ ctx[0]);
    			}

    			if (dirty & /*inputState*/ 1) {
    				set_custom_element_data(zoo_select0, "valid", /*inputState*/ ctx[0]);
    			}

    			if (dirty & /*inputState*/ 1) {
    				set_custom_element_data(zoo_select1, "valid", /*inputState*/ ctx[0]);
    			}

    			if (dirty & /*options*/ 2) {
    				each_value_1 = /*options*/ ctx[1];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
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

    			if (dirty & /*options*/ 2) {
    				each_value = /*options*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
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

    			if (dirty & /*inputState*/ 1) {
    				set_custom_element_data(zoo_checkbox, "valid", /*inputState*/ ctx[0]);
    			}

    			if (dirty & /*inputState*/ 1) {
    				set_custom_element_data(zoo_radio0, "valid", /*inputState*/ ctx[0]);
    			}

    			if (dirty & /*inputState*/ 1) {
    				set_custom_element_data(zoo_radio1, "valid", /*inputState*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(form);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t39);
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let options = [
    		{ text: "text", value: "value" },
    		{ text: "raNdOm", value: "random" },
    		{ text: "random1", value: "random1" },
    		{ text: "random2", value: "random2" }
    	];

    	let inputState = true;

    	const changeState = () => {
    		$$invalidate(0, inputState = !inputState);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<app-form> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("app-form", $$slots, []);
    	$$self.$capture_state = () => ({ options, inputState, changeState });

    	$$self.$inject_state = $$props => {
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    		if ("inputState" in $$props) $$invalidate(0, inputState = $$props.inputState);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [inputState, options, changeState];
    }

    class Form extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.form{flex:1 0 auto;margin:20px auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));grid-template-rows:120px 150px 150px 100px 80px;grid-gap:20px}@media only screen and (max-width: 544px){.form{width:300px;grid-template-columns:auto}}@media only screen and (max-width: 812px){.form{grid-template-rows:120px 150px 120px 120px}}.submit{display:flex;justify-content:center}</style>`;
    		init(this, { target: this.shadowRoot }, instance$2, create_fragment$2, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("app-form", Form);

    /* src/sections/Buttons.svelte generated by Svelte v3.22.2 */

    const file$3 = "src/sections/Buttons.svelte";

    function create_fragment$3(ctx) {
    	let zoo_toast0;
    	let t0;
    	let zoo_toast1;
    	let t1;
    	let app_context;
    	let t2;
    	let div1;
    	let zoo_button0;
    	let span0;
    	let t4;
    	let zoo_button1;
    	let div0;
    	let t5;
    	let zoo_tooltip;
    	let zoo_button1_disabled_value;
    	let t6;
    	let zoo_button2;
    	let span1;
    	let t8;
    	let zoo_button3;
    	let span2;
    	let t10;
    	let zoo_modal;
    	let div2;
    	let zoo_feedback;
    	let t11;
    	let br0;
    	let t12;
    	let zoo_select;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let zoo_select_valid_value;
    	let t17;
    	let br1;
    	let t18;
    	let zoo_checkbox;
    	let input;
    	let t19;
    	let br2;
    	let t20;
    	let zoo_button4;
    	let span3;
    	let dispose;

    	const block = {
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
    			span0.textContent = "Summon toast!";
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
    			zoo_button3 = element("zoo-button");
    			span2 = element("span");
    			span2.textContent = "Dummy button that does nothing";
    			t10 = space();
    			zoo_modal = element("zoo-modal");
    			div2 = element("div");
    			zoo_feedback = element("zoo-feedback");
    			t11 = space();
    			br0 = element("br");
    			t12 = space();
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
    			t17 = space();
    			br1 = element("br");
    			t18 = space();
    			zoo_checkbox = element("zoo-checkbox");
    			input = element("input");
    			t19 = space();
    			br2 = element("br");
    			t20 = space();
    			zoo_button4 = element("zoo-button");
    			span3 = element("span");
    			span3.textContent = "Add to cart";
    			this.c = noop;
    			set_custom_element_data(zoo_toast0, "text", "Search for more than 8.000 products.");
    			add_location(zoo_toast0, file$3, 1, 0, 52);
    			set_custom_element_data(zoo_toast1, "text", "Added to cart!");
    			add_location(zoo_toast1, file$3, 2, 0, 138);
    			set_custom_element_data(app_context, "text", "Second section is a showcase of buttons and modals");
    			add_location(app_context, file$3, 3, 0, 207);
    			attr_dev(span0, "slot", "buttoncontent");
    			attr_dev(span0, "class", "slotted-span");
    			add_location(span0, file$3, 6, 2, 376);
    			set_custom_element_data(zoo_button0, "size", "small");
    			add_location(zoo_button0, file$3, 5, 1, 316);
    			set_custom_element_data(zoo_tooltip, "position", "bottom");
    			set_custom_element_data(zoo_tooltip, "text", "Just set disabled attribute on `zoo-button`");
    			add_location(zoo_tooltip, file$3, 11, 3, 572);
    			attr_dev(div0, "slot", "buttoncontent");
    			add_location(div0, file$3, 9, 2, 527);
    			set_custom_element_data(zoo_button1, "size", "small");
    			set_custom_element_data(zoo_button1, "disabled", zoo_button1_disabled_value = true);
    			set_custom_element_data(zoo_button1, "class", "top-tooltip");
    			add_location(zoo_button1, file$3, 8, 1, 461);
    			attr_dev(span1, "slot", "buttoncontent");
    			attr_dev(span1, "class", "slotted-span");
    			add_location(span1, file$3, 15, 2, 770);
    			set_custom_element_data(zoo_button2, "type", "hot");
    			set_custom_element_data(zoo_button2, "size", "small");
    			add_location(zoo_button2, file$3, 14, 1, 694);
    			attr_dev(span2, "slot", "buttoncontent");
    			attr_dev(span2, "class", "slotted-span");
    			add_location(span2, file$3, 18, 2, 894);
    			set_custom_element_data(zoo_button3, "type", "hollow");
    			set_custom_element_data(zoo_button3, "size", "small");
    			add_location(zoo_button3, file$3, 17, 1, 852);
    			attr_dev(div1, "class", "buttons");
    			add_location(div1, file$3, 4, 0, 293);
    			set_custom_element_data(zoo_feedback, "type", "info");
    			set_custom_element_data(zoo_feedback, "text", "This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered.");
    			add_location(zoo_feedback, file$3, 23, 2, 1113);
    			add_location(br0, file$3, 27, 2, 1295);
    			attr_dev(option0, "class", "placeholder");
    			option0.__value = "";
    			option0.value = option0.__value;
    			option0.disabled = true;
    			option0.selected = true;
    			add_location(option0, file$3, 31, 4, 1403);
    			option1.__value = "Doge";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 32, 4, 1476);
    			option2.__value = "Catz";
    			option2.value = option2.__value;
    			add_location(option2, file$3, 33, 4, 1502);
    			option3.__value = "Snek";
    			option3.value = option3.__value;
    			add_location(option3, file$3, 34, 4, 1528);
    			attr_dev(select, "slot", "selectelement");
    			add_location(select, file$3, 30, 3, 1369);
    			set_custom_element_data(zoo_select, "labeltext", "This product is for");
    			set_custom_element_data(zoo_select, "valid", zoo_select_valid_value = true);
    			add_location(zoo_select, file$3, 28, 2, 1302);
    			add_location(br1, file$3, 37, 2, 1581);
    			attr_dev(input, "slot", "checkboxelement");
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file$3, 40, 3, 1700);
    			set_custom_element_data(zoo_checkbox, "highlighted", "");
    			set_custom_element_data(zoo_checkbox, "labeltext", "I understand and confirm that ALL of the above statements are true");
    			add_location(zoo_checkbox, file$3, 38, 2, 1588);
    			add_location(br2, file$3, 42, 2, 1768);
    			attr_dev(span3, "slot", "buttoncontent");
    			add_location(span3, file$3, 44, 3, 1871);
    			set_style(zoo_button4, "margin", "0 auto");
    			set_custom_element_data(zoo_button4, "type", "hot");
    			set_custom_element_data(zoo_button4, "size", "medium");
    			add_location(zoo_button4, file$3, 43, 2, 1775);
    			add_location(div2, file$3, 22, 1, 1105);
    			set_style(zoo_modal, "display", "none");
    			set_custom_element_data(zoo_modal, "headertext", "Your basket contains licensed items");
    			add_location(zoo_modal, file$3, 21, 0, 1003);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, zoo_toast0, anchor);
    			/*zoo_toast0_binding*/ ctx[5](zoo_toast0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, zoo_toast1, anchor);
    			/*zoo_toast1_binding*/ ctx[6](zoo_toast1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, zoo_button0);
    			append_dev(zoo_button0, span0);
    			append_dev(div1, t4);
    			append_dev(div1, zoo_button1);
    			append_dev(zoo_button1, div0);
    			append_dev(div0, t5);
    			append_dev(div0, zoo_tooltip);
    			append_dev(div1, t6);
    			append_dev(div1, zoo_button2);
    			append_dev(zoo_button2, span1);
    			append_dev(div1, t8);
    			append_dev(div1, zoo_button3);
    			append_dev(zoo_button3, span2);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, zoo_modal, anchor);
    			append_dev(zoo_modal, div2);
    			append_dev(div2, zoo_feedback);
    			append_dev(div2, t11);
    			append_dev(div2, br0);
    			append_dev(div2, t12);
    			append_dev(div2, zoo_select);
    			append_dev(zoo_select, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(div2, t17);
    			append_dev(div2, br1);
    			append_dev(div2, t18);
    			append_dev(div2, zoo_checkbox);
    			append_dev(zoo_checkbox, input);
    			append_dev(div2, t19);
    			append_dev(div2, br2);
    			append_dev(div2, t20);
    			append_dev(div2, zoo_button4);
    			append_dev(zoo_button4, span3);
    			/*zoo_modal_binding*/ ctx[10](zoo_modal);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(zoo_button0, "click", /*click_handler*/ ctx[7], false, false, false),
    				listen_dev(zoo_button2, "click", /*click_handler_1*/ ctx[8], false, false, false),
    				listen_dev(zoo_button4, "click", /*click_handler_2*/ ctx[9], false, false, false)
    			];
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(zoo_toast0);
    			/*zoo_toast0_binding*/ ctx[5](null);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(zoo_toast1);
    			/*zoo_toast1_binding*/ ctx[6](null);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(zoo_modal);
    			/*zoo_modal_binding*/ ctx[10](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let toast;
    	let modal;
    	let modalToast;

    	const showModal = () => {
    		$$invalidate(1, modal.style.display = "block", modal);
    	};

    	const closeModal = () => {
    		modal.closeModal();
    		modalToast.show();
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<app-buttons> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("app-buttons", $$slots, []);

    	function zoo_toast0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, toast = $$value);
    		});
    	}

    	function zoo_toast1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, modalToast = $$value);
    		});
    	}

    	const click_handler = () => toast.show();
    	const click_handler_1 = () => modal.openModal();
    	const click_handler_2 = () => closeModal();

    	function zoo_modal_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, modal = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({
    		toast,
    		modal,
    		modalToast,
    		showModal,
    		closeModal
    	});

    	$$self.$inject_state = $$props => {
    		if ("toast" in $$props) $$invalidate(0, toast = $$props.toast);
    		if ("modal" in $$props) $$invalidate(1, modal = $$props.modal);
    		if ("modalToast" in $$props) $$invalidate(2, modalToast = $$props.modalToast);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		toast,
    		modal,
    		modalToast,
    		closeModal,
    		showModal,
    		zoo_toast0_binding,
    		zoo_toast1_binding,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		zoo_modal_binding
    	];
    }

    class Buttons extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.buttons{max-width:1280px;margin:20px auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));grid-gap:15px;width:90%}@media only screen and (max-width: 850px){.buttons{grid-template-columns:auto}}zoo-tooltip{display:none}.top-tooltip{position:relative;display:inline-block}.top-tooltip:hover zoo-tooltip{display:block;animation:fadeTooltipIn 0.2s}</style>`;
    		init(this, { target: this.shadowRoot }, instance$3, create_fragment$3, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("app-buttons", Buttons);

    /* src/sections/TooltipAndFeedback.svelte generated by Svelte v3.22.2 */

    const file$4 = "src/sections/TooltipAndFeedback.svelte";

    function create_fragment$4(ctx) {
    	let app_context;
    	let t0;
    	let div4;
    	let div0;
    	let zoo_feedback0;
    	let t1;
    	let zoo_tooltip0;
    	let t2;
    	let div1;
    	let zoo_feedback1;
    	let t3;
    	let zoo_tooltip1;
    	let t4;
    	let div2;
    	let zoo_feedback2;
    	let t5;
    	let zoo_tooltip2;
    	let t6;
    	let div3;
    	let zoo_button;
    	let span;
    	let t8;
    	let zoo_tooltip4;
    	let zoo_input;
    	let input;
    	let t9;
    	let zoo_tooltip3;
    	let dispose;

    	const block = {
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
    			attr_dev(div0, "class", "feedback-tooltip");
    			add_location(div0, file$4, 3, 1, 189);
    			set_custom_element_data(zoo_feedback1, "type", "error");
    			set_custom_element_data(zoo_feedback1, "text", "This is an error message. This element will show tooltip on the left side on hover.");
    			add_location(zoo_feedback1, file$4, 8, 2, 474);
    			set_custom_element_data(zoo_tooltip1, "position", "left");
    			set_custom_element_data(zoo_tooltip1, "text", "Hello from left side.");
    			add_location(zoo_tooltip1, file$4, 9, 2, 610);
    			attr_dev(div1, "class", "feedback-tooltip");
    			add_location(div1, file$4, 7, 1, 441);
    			set_custom_element_data(zoo_feedback2, "type", "success");
    			set_custom_element_data(zoo_feedback2, "text", "This is a success message. This element will show tooltip on the bottom side on hover.");
    			add_location(zoo_feedback2, file$4, 12, 2, 725);
    			set_custom_element_data(zoo_tooltip2, "position", "bottom");
    			set_custom_element_data(zoo_tooltip2, "text", "Hello from below");
    			add_location(zoo_tooltip2, file$4, 13, 2, 866);
    			attr_dev(div2, "class", "feedback-tooltip");
    			add_location(div2, file$4, 11, 1, 692);
    			attr_dev(span, "class", "slotted-span");
    			attr_dev(span, "slot", "buttoncontent");
    			add_location(span, file$4, 17, 3, 1026);
    			add_location(zoo_button, file$4, 16, 2, 978);
    			attr_dev(input, "slot", "inputelement");
    			attr_dev(input, "placeholder", "Search for more than 8.000 products");
    			add_location(input, file$4, 21, 4, 1274);
    			set_custom_element_data(zoo_input, "class", "input-in-tooltip");
    			add_location(zoo_input, file$4, 20, 3, 1233);
    			set_custom_element_data(zoo_tooltip3, "class", "nested-tooltip");
    			set_custom_element_data(zoo_tooltip3, "position", "right");
    			set_custom_element_data(zoo_tooltip3, "text", "Hello from nested tooltip.");
    			add_location(zoo_tooltip3, file$4, 23, 3, 1372);
    			set_custom_element_data(zoo_tooltip4, "text", "Hello from up above");
    			add_location(zoo_tooltip4, file$4, 19, 2, 1162);
    			attr_dev(div3, "class", "special-tooltip");
    			add_location(div3, file$4, 15, 1, 945);
    			attr_dev(div4, "class", "inner-content");
    			add_location(div4, file$4, 2, 0, 160);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, zoo_feedback0);
    			append_dev(div0, t1);
    			append_dev(div0, zoo_tooltip0);
    			append_dev(div4, t2);
    			append_dev(div4, div1);
    			append_dev(div1, zoo_feedback1);
    			append_dev(div1, t3);
    			append_dev(div1, zoo_tooltip1);
    			append_dev(div4, t4);
    			append_dev(div4, div2);
    			append_dev(div2, zoo_feedback2);
    			append_dev(div2, t5);
    			append_dev(div2, zoo_tooltip2);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			append_dev(div3, zoo_button);
    			append_dev(zoo_button, span);
    			append_dev(div3, t8);
    			append_dev(div3, zoo_tooltip4);
    			append_dev(zoo_tooltip4, zoo_input);
    			append_dev(zoo_input, input);
    			append_dev(zoo_tooltip4, t9);
    			append_dev(zoo_tooltip4, zoo_tooltip3);
    			/*zoo_tooltip4_binding*/ ctx[2](zoo_tooltip4);
    			if (remount) dispose();
    			dispose = listen_dev(zoo_button, "click", /*showSpecialTooltip*/ ctx[1], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			/*zoo_tooltip4_binding*/ ctx[2](null);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let specialTooltip;

    	const showSpecialTooltip = () => {
    		const elStyle = specialTooltip.style;

    		const display = !elStyle.display || elStyle.display === "none"
    		? "block"
    		: "none";

    		elStyle.display = display;
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<app-tooltip-and-feedback> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("app-tooltip-and-feedback", $$slots, []);

    	function zoo_tooltip4_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, specialTooltip = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ specialTooltip, showSpecialTooltip });

    	$$self.$inject_state = $$props => {
    		if ("specialTooltip" in $$props) $$invalidate(0, specialTooltip = $$props.specialTooltip);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [specialTooltip, showSpecialTooltip, zoo_tooltip4_binding];
    }

    class TooltipAndFeedback extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.inner-content{flex:1 0 auto;width:70%;margin:0 auto}.inner-content .feedback-tooltip{height:60px;margin-bottom:15px;position:relative}.inner-content .feedback-tooltip:hover zoo-tooltip{display:block;animation:fadeTooltipIn 0.2s}.special-tooltip{max-width:250px;position:relative;margin:0 auto;cursor:pointer}.special-tooltip .slotted-span{line-height:25px}zoo-tooltip{display:none}.input-in-tooltip:hover~.nested-tooltip{display:block;animation:fadeTooltipIn 0.2s}</style>`;
    		init(this, { target: this.shadowRoot }, instance$4, create_fragment$4, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("app-tooltip-and-feedback", TooltipAndFeedback);

    /* src/docs/ButtonDocs.svelte generated by Svelte v3.22.2 */
    const file$5 = "src/docs/ButtonDocs.svelte";

    function create_fragment$5(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let b1;
    	let t4;
    	let b2;
    	let t6;
    	let b3;
    	let t8;
    	let b4;
    	let t10;
    	let t11;
    	let li1;
    	let b5;
    	let t13;
    	let b6;
    	let t15;
    	let b7;
    	let t17;
    	let b8;
    	let t19;
    	let b9;
    	let t21;
    	let t22;
    	let li2;
    	let b10;
    	let t24;
    	let t25;
    	let zoo_collapsable_list_item1;
    	let t26;
    	let b11;
    	let t28;
    	let b12;
    	let t30;
    	let t31;
    	let div2;
    	let code;
    	let pre;
    	let t33;
    	let div1;
    	let zoo_button;
    	let span;

    	const block = {
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
    			t6 = text(", ");
    			b3 = element("b");
    			b3.textContent = "hollow";
    			t8 = text(". Default is ");
    			b4 = element("b");
    			b4.textContent = "cold";
    			t10 = text(";");
    			t11 = space();
    			li1 = element("li");
    			b5 = element("b");
    			b5.textContent = "size";
    			t13 = text(" - accepts following values: ");
    			b6 = element("b");
    			b6.textContent = "small";
    			t15 = text(", ");
    			b7 = element("b");
    			b7.textContent = "medium";
    			t17 = text(", ");
    			b8 = element("b");
    			b8.textContent = "big";
    			t19 = text(". Default is ");
    			b9 = element("b");
    			b9.textContent = "small";
    			t21 = text(";");
    			t22 = space();
    			li2 = element("li");
    			b10 = element("b");
    			b10.textContent = "disabled";
    			t24 = text(" - whether the button should be disabled or not.");
    			t25 = space();
    			zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
    			t26 = text("This component accept one ");
    			b11 = element("b");
    			b11.textContent = `${/*buttonSlotText*/ ctx[1]}`;
    			t28 = text(" which is replaced with provided ");
    			b12 = element("b");
    			b12.textContent = "element";
    			t30 = text(" so that you can catch events/provide your css/attach framework specific directives from/to this element.");
    			t31 = space();
    			div2 = element("div");
    			code = element("code");
    			pre = element("pre");
    			pre.textContent = `${/*example*/ ctx[2]}`;
    			t33 = text("\n\t\twill produce the following:\n\t\t");
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
    			add_location(b3, file$5, 9, 71, 332);
    			add_location(b4, file$5, 9, 97, 358);
    			add_location(li0, file$5, 8, 5, 256);
    			add_location(b5, file$5, 12, 6, 398);
    			add_location(b6, file$5, 12, 46, 438);
    			add_location(b7, file$5, 12, 60, 452);
    			add_location(b8, file$5, 12, 75, 467);
    			add_location(b9, file$5, 12, 98, 490);
    			add_location(li1, file$5, 11, 5, 387);
    			add_location(b10, file$5, 15, 6, 531);
    			add_location(li2, file$5, 14, 5, 520);
    			add_location(ul, file$5, 7, 4, 246);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$5, 6, 3, 201);
    			add_location(b11, file$5, 20, 30, 722);
    			add_location(b12, file$5, 20, 86, 778);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$5, 19, 3, 651);
    			add_location(zoo_collapsable_list, file$5, 5, 2, 158);
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$5, 4, 1, 137);
    			add_location(pre, file$5, 25, 8, 1000);
    			add_location(code, file$5, 25, 2, 994);
    			attr_dev(span, "slot", "buttoncontent");
    			add_location(span, file$5, 29, 4, 1133);
    			set_custom_element_data(zoo_button, "type", "hot");
    			set_custom_element_data(zoo_button, "size", "medium");
    			add_location(zoo_button, file$5, 28, 3, 1091);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$5, 27, 2, 1060);
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$5, 24, 1, 970);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$5, 3, 0, 110);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(li0, b1);
    			append_dev(li0, t4);
    			append_dev(li0, b2);
    			append_dev(li0, t6);
    			append_dev(li0, b3);
    			append_dev(li0, t8);
    			append_dev(li0, b4);
    			append_dev(li0, t10);
    			append_dev(ul, t11);
    			append_dev(ul, li1);
    			append_dev(li1, b5);
    			append_dev(li1, t13);
    			append_dev(li1, b6);
    			append_dev(li1, t15);
    			append_dev(li1, b7);
    			append_dev(li1, t17);
    			append_dev(li1, b8);
    			append_dev(li1, t19);
    			append_dev(li1, b9);
    			append_dev(li1, t21);
    			append_dev(ul, t22);
    			append_dev(ul, li2);
    			append_dev(li2, b10);
    			append_dev(li2, t24);
    			append_dev(zoo_collapsable_list, t25);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			append_dev(zoo_collapsable_list_item1, t26);
    			append_dev(zoo_collapsable_list_item1, b11);
    			append_dev(zoo_collapsable_list_item1, t28);
    			append_dev(zoo_collapsable_list_item1, b12);
    			append_dev(zoo_collapsable_list_item1, t30);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div3, t31);
    			append_dev(div3, div2);
    			append_dev(div2, code);
    			append_dev(code, pre);
    			append_dev(div2, t33);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_button);
    			append_dev(zoo_button, span);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let list;
    	let buttonSlotText = `<slot name="buttoncontent"></slot>`;
    	let example = `<div style="width: 250px;">\n  <zoo-button type="hot" size="medium">\n    <span slot="buttoncontent">Shopping Cart</span>\n  </zoo-button>\n</div>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-button", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, buttonSlotText, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("buttonSlotText" in $$props) $$invalidate(1, buttonSlotText = $$props.buttonSlotText);
    		if ("example" in $$props) $$invalidate(2, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, buttonSlotText, example, zoo_collapsable_list_binding];
    }

    class ButtonDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$5, create_fragment$5, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-button", ButtonDocs);

    /* src/docs/CheckboxDocs.svelte generated by Svelte v3.22.2 */
    const file$6 = "src/docs/CheckboxDocs.svelte";

    function create_fragment$6(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let t3;
    	let li1;
    	let b1;
    	let t5;
    	let t6;
    	let li2;
    	let b2;
    	let t8;
    	let t9;
    	let li3;
    	let b3;
    	let t11;
    	let t12;
    	let zoo_collapsable_list_item1;
    	let t13;
    	let b4;
    	let t15;
    	let b5;
    	let t17;
    	let t18;
    	let div2;
    	let code;
    	let pre;
    	let t20;
    	let div1;
    	let zoo_checkbox;
    	let input;

    	const block = {
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
    			b4.textContent = `${/*inputSlotText*/ ctx[1]}`;
    			t15 = text(" which is replaced with provided ");
    			b5 = element("b");
    			b5.textContent = "element";
    			t17 = text(" so that you can catch events/provide your css/attach framework specific directives from/to this element.");
    			t18 = space();
    			div2 = element("div");
    			code = element("code");
    			pre = element("pre");
    			pre.textContent = `${/*example*/ ctx[2]}`;
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
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$6, 3, 1, 140);
    			add_location(pre, file$6, 27, 8, 1068);
    			add_location(code, file$6, 27, 2, 1062);
    			attr_dev(input, "slot", "checkboxelement");
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file$6, 31, 4, 1249);
    			set_custom_element_data(zoo_checkbox, "highlighted", "1");
    			set_custom_element_data(zoo_checkbox, "labeltext", "Example label for this particular checkbox");
    			add_location(zoo_checkbox, file$6, 30, 3, 1159);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$6, 29, 2, 1128);
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$6, 26, 1, 1038);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$6, 2, 0, 113);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(li1, b1);
    			append_dev(li1, t5);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, b2);
    			append_dev(li2, t8);
    			append_dev(ul, t9);
    			append_dev(ul, li3);
    			append_dev(li3, b3);
    			append_dev(li3, t11);
    			append_dev(zoo_collapsable_list, t12);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			append_dev(zoo_collapsable_list_item1, t13);
    			append_dev(zoo_collapsable_list_item1, b4);
    			append_dev(zoo_collapsable_list_item1, t15);
    			append_dev(zoo_collapsable_list_item1, b5);
    			append_dev(zoo_collapsable_list_item1, t17);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div3, t18);
    			append_dev(div3, div2);
    			append_dev(div2, code);
    			append_dev(code, pre);
    			append_dev(div2, t20);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_checkbox);
    			append_dev(zoo_checkbox, input);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let list;
    	let inputSlotText = `<slot name="checkboxelement"></slot>`;
    	let example = `<div style="width: 250px;">\n  <zoo-checkbox highlighted="1" labeltext="Example label for this particular checkbox">\n    <input slot="checkboxelement" type="checkbox"/>\n  </zoo-checkbox>\n</div>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-checkbox> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-checkbox", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, inputSlotText, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("inputSlotText" in $$props) $$invalidate(1, inputSlotText = $$props.inputSlotText);
    		if ("example" in $$props) $$invalidate(2, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, inputSlotText, example, zoo_collapsable_list_binding];
    }

    class CheckboxDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$6, create_fragment$6, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-checkbox", CheckboxDocs);

    /* src/docs/CollapsableListDocs.svelte generated by Svelte v3.22.2 */
    const file$7 = "src/docs/CollapsableListDocs.svelte";

    function create_fragment$7(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list0;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let code0;
    	let t4;
    	let li1;
    	let b1;
    	let t6;
    	let t7;
    	let zoo_collapsable_list_item1;
    	let t8;
    	let b2;
    	let t10;
    	let b3;
    	let t12;
    	let t13;
    	let div2;
    	let code1;
    	let pre;
    	let t16;
    	let div1;
    	let zoo_collapsable_list1;
    	let zoo_collapsable_list_item2;
    	let span0;
    	let t18;
    	let zoo_collapsable_list_item3;
    	let span1;

    	const block = {
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
    			b2.textContent = `${/*listSlotText*/ ctx[2]}`;
    			t10 = text(" which are replaced with provided ");
    			b3 = element("b");
    			b3.textContent = "elements";
    			t12 = text(".");
    			t13 = space();
    			div2 = element("div");
    			code1 = element("code");
    			pre = element("pre");
    			pre.textContent = `${/*example*/ ctx[3]}${/*scriptExample*/ ctx[4]}`;
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
    			attr_dev(div0, "class", "list");
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
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$7, 20, 1, 764);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$7, 2, 0, 129);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list0);
    			append_dev(zoo_collapsable_list0, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(li0, code0);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, b1);
    			append_dev(li1, t6);
    			append_dev(zoo_collapsable_list0, t7);
    			append_dev(zoo_collapsable_list0, zoo_collapsable_list_item1);
    			append_dev(zoo_collapsable_list_item1, t8);
    			append_dev(zoo_collapsable_list_item1, b2);
    			append_dev(zoo_collapsable_list_item1, t10);
    			append_dev(zoo_collapsable_list_item1, b3);
    			append_dev(zoo_collapsable_list_item1, t12);
    			/*zoo_collapsable_list0_binding*/ ctx[5](zoo_collapsable_list0);
    			append_dev(div3, t13);
    			append_dev(div3, div2);
    			append_dev(div2, code1);
    			append_dev(code1, pre);
    			append_dev(div2, t16);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_collapsable_list1);
    			append_dev(zoo_collapsable_list1, zoo_collapsable_list_item2);
    			append_dev(zoo_collapsable_list_item2, span0);
    			append_dev(zoo_collapsable_list1, t18);
    			append_dev(zoo_collapsable_list1, zoo_collapsable_list_item3);
    			append_dev(zoo_collapsable_list_item3, span1);
    			/*zoo_collapsable_list1_binding*/ ctx[6](zoo_collapsable_list1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list0_binding*/ ctx[5](null);
    			/*zoo_collapsable_list1_binding*/ ctx[6](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let list;
    	let listSlotText = `<slot name="item{idx}"></slot>`;
    	let example = `<div style="width: 250px;">\n  <zoo-collapsable-list id="list">\n    <zoo-collapsable-list-item slot="item0">\n      <span>inner item0</span>\n    </zoo-collapsable-list-item>\n    <zoo-collapsable-list-item slot="item1">\n      <span>inner item1</span>\n    </zoo-collapsable-list-item>\n  </zoo-collapsable-list>\n</div>`;
    	let scriptExample = `\n<script>\n  document.getElementById('list').items=[{header: item0}, {header: item1}];\n<\/script>`;
    	let exampleList;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    		$$invalidate(1, exampleList.items = [{ header: "item0" }, { header: "item1" }], exampleList);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-collapsable-list> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-collapsable-list", $$slots, []);

    	function zoo_collapsable_list0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	function zoo_collapsable_list1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, exampleList = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		list,
    		listSlotText,
    		example,
    		scriptExample,
    		exampleList
    	});

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("listSlotText" in $$props) $$invalidate(2, listSlotText = $$props.listSlotText);
    		if ("example" in $$props) $$invalidate(3, example = $$props.example);
    		if ("scriptExample" in $$props) $$invalidate(4, scriptExample = $$props.scriptExample);
    		if ("exampleList" in $$props) $$invalidate(1, exampleList = $$props.exampleList);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		list,
    		exampleList,
    		listSlotText,
    		example,
    		scriptExample,
    		zoo_collapsable_list0_binding,
    		zoo_collapsable_list1_binding
    	];
    }

    class CollapsableListDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$7, create_fragment$7, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-collapsable-list", CollapsableListDocs);

    /* src/docs/FeedbackDocs.svelte generated by Svelte v3.22.2 */
    const file$8 = "src/docs/FeedbackDocs.svelte";

    function create_fragment$8(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let t3;
    	let li1;
    	let b1;
    	let t5;
    	let b2;
    	let t7;
    	let b3;
    	let t9;
    	let b4;
    	let t11;
    	let b5;
    	let t13;
    	let t14;
    	let zoo_collapsable_list_item1;
    	let t16;
    	let div2;
    	let code;
    	let pre;
    	let t18;
    	let div1;
    	let zoo_feedback;

    	const block = {
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
    			pre.textContent = `${/*example*/ ctx[1]}`;
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
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$8, 3, 1, 140);
    			add_location(pre, file$8, 21, 8, 716);
    			add_location(code, file$8, 21, 2, 710);
    			set_custom_element_data(zoo_feedback, "text", "This is an info message.");
    			add_location(zoo_feedback, file$8, 24, 3, 807);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$8, 23, 2, 776);
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$8, 20, 1, 686);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$8, 2, 0, 113);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(li1, b1);
    			append_dev(li1, t5);
    			append_dev(li1, b2);
    			append_dev(li1, t7);
    			append_dev(li1, b3);
    			append_dev(li1, t9);
    			append_dev(li1, b4);
    			append_dev(li1, t11);
    			append_dev(li1, b5);
    			append_dev(li1, t13);
    			append_dev(zoo_collapsable_list, t14);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div3, t16);
    			append_dev(div3, div2);
    			append_dev(div2, code);
    			append_dev(code, pre);
    			append_dev(div2, t18);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_feedback);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let list;
    	let inputSlotText = `<slot name="checkboxelement"></slot>`;
    	let example = `<div style="width: 250px;">\n  <zoo-feedback text="This is an info message."></zoo-feedback>\n</div>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-feedback> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-feedback", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, inputSlotText, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("inputSlotText" in $$props) inputSlotText = $$props.inputSlotText;
    		if ("example" in $$props) $$invalidate(1, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, example, inputSlotText, zoo_collapsable_list_binding];
    }

    class FeedbackDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$8, create_fragment$8, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-feedback", FeedbackDocs);

    /* src/docs/FooterDocs.svelte generated by Svelte v3.22.2 */
    const file$9 = "src/docs/FooterDocs.svelte";

    function create_fragment$9(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul1;
    	let li6;
    	let b0;
    	let t2;
    	let b1;
    	let t4;
    	let ul0;
    	let li0;
    	let b2;
    	let t6;
    	let t7;
    	let li1;
    	let b3;
    	let t9;
    	let t10;
    	let li2;
    	let b4;
    	let t12;
    	let b5;
    	let t14;
    	let t15;
    	let li3;
    	let b6;
    	let t17;
    	let b7;
    	let t19;
    	let b8;
    	let t21;
    	let b9;
    	let t23;
    	let t24;
    	let li4;
    	let b10;
    	let t26;
    	let t27;
    	let li5;
    	let b11;
    	let t29;
    	let t30;
    	let zoo_collapsable_list_item1;
    	let t32;
    	let div2;
    	let code;
    	let pre;
    	let t35;
    	let div1;
    	let zoo_footer;

    	const block = {
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
    			pre.textContent = `${/*example*/ ctx[2]}${/*scriptExample*/ ctx[3]}`;
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
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$9, 4, 1, 137);
    			add_location(pre, file$9, 39, 8, 1294);
    			add_location(code, file$9, 39, 2, 1288);
    			add_location(zoo_footer, file$9, 42, 3, 1400);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$9, 41, 2, 1369);
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$9, 38, 1, 1264);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$9, 3, 0, 110);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul1);
    			append_dev(ul1, li6);
    			append_dev(li6, b0);
    			append_dev(li6, t2);
    			append_dev(li6, b1);
    			append_dev(li6, t4);
    			append_dev(li6, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, b2);
    			append_dev(li0, t6);
    			append_dev(ul0, t7);
    			append_dev(ul0, li1);
    			append_dev(li1, b3);
    			append_dev(li1, t9);
    			append_dev(ul0, t10);
    			append_dev(ul0, li2);
    			append_dev(li2, b4);
    			append_dev(li2, t12);
    			append_dev(li2, b5);
    			append_dev(li2, t14);
    			append_dev(ul0, t15);
    			append_dev(ul0, li3);
    			append_dev(li3, b6);
    			append_dev(li3, t17);
    			append_dev(li3, b7);
    			append_dev(li3, t19);
    			append_dev(li3, b8);
    			append_dev(li3, t21);
    			append_dev(li3, b9);
    			append_dev(li3, t23);
    			append_dev(ul0, t24);
    			append_dev(ul0, li4);
    			append_dev(li4, b10);
    			append_dev(li4, t26);
    			append_dev(ul0, t27);
    			append_dev(ul0, li5);
    			append_dev(li5, b11);
    			append_dev(li5, t29);
    			append_dev(zoo_collapsable_list, t30);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[4](zoo_collapsable_list);
    			append_dev(div3, t32);
    			append_dev(div3, div2);
    			append_dev(div2, code);
    			append_dev(code, pre);
    			append_dev(div2, t35);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_footer);
    			/*zoo_footer_binding*/ ctx[5](zoo_footer);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list_binding*/ ctx[4](null);
    			/*zoo_footer_binding*/ ctx[5](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let list;
    	let exampleFooter;
    	let example = `<div style="width: 250px;">\n  <zoo-footer id="footer"></zoo-footer>\n</div>`;
    	let scriptExample = `\n<script>\n  document.getElementById('footer').footerlinks=[{\n    href: 'https://github.com/zooplus/zoo-web-components',\n    text: 'Github',\n    type: 'standard'\n  },\n  {\n    href: 'https://www.npmjs.com/package/@zooplus/zoo-web-components',\n    text: 'NPM',\n    type: 'standard'\n  }];\n<\/script>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);

    		$$invalidate(
    			1,
    			exampleFooter.footerlinks = [
    				{
    					href: "https://github.com/zooplus/zoo-web-components",
    					text: "Github",
    					type: "standard"
    				},
    				{
    					href: "https://www.npmjs.com/package/@zooplus/zoo-web-components",
    					text: "NPM",
    					type: "standard"
    				}
    			],
    			exampleFooter
    		);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-footer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-footer", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	function zoo_footer_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, exampleFooter = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		list,
    		exampleFooter,
    		example,
    		scriptExample
    	});

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("exampleFooter" in $$props) $$invalidate(1, exampleFooter = $$props.exampleFooter);
    		if ("example" in $$props) $$invalidate(2, example = $$props.example);
    		if ("scriptExample" in $$props) $$invalidate(3, scriptExample = $$props.scriptExample);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		list,
    		exampleFooter,
    		example,
    		scriptExample,
    		zoo_collapsable_list_binding,
    		zoo_footer_binding
    	];
    }

    class FooterDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$9, create_fragment$9, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-footer", FooterDocs);

    /* src/docs/HeaderDocs.svelte generated by Svelte v3.22.2 */
    const file$a = "src/docs/HeaderDocs.svelte";

    function create_fragment$a(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let t3;
    	let li1;
    	let b1;
    	let t5;
    	let t6;
    	let li2;
    	let b2;
    	let t8;
    	let t9;
    	let zoo_collapsable_list_item1;
    	let t11;
    	let div2;
    	let code;
    	let pre;
    	let t13;
    	let div1;
    	let zoo_header;

    	const block = {
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
    			pre.textContent = `${/*example*/ ctx[1]}`;
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
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$a, 4, 1, 137);
    			add_location(pre, file$a, 25, 8, 775);
    			add_location(code, file$a, 25, 2, 769);
    			set_custom_element_data(zoo_header, "imgsrc", "logo.png");
    			set_custom_element_data(zoo_header, "imgalt", "zooplus");
    			set_custom_element_data(zoo_header, "headertext", "App name");
    			add_location(zoo_header, file$a, 28, 3, 866);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$a, 27, 2, 835);
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$a, 24, 1, 745);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$a, 3, 0, 110);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(li1, b1);
    			append_dev(li1, t5);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, b2);
    			append_dev(li2, t8);
    			append_dev(zoo_collapsable_list, t9);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[2](zoo_collapsable_list);
    			append_dev(div3, t11);
    			append_dev(div3, div2);
    			append_dev(div2, code);
    			append_dev(code, pre);
    			append_dev(div2, t13);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_header);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list_binding*/ ctx[2](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let list;
    	let example = `<div style="width: 250px;">\n  <zoo-header imgsrc="logo.png" imgalt="imgalt" headertext="App name"></zoo-header>\n</div>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-header> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-header", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("example" in $$props) $$invalidate(1, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, example, zoo_collapsable_list_binding];
    }

    class HeaderDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$a, create_fragment$a, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-header", HeaderDocs);

    /* src/docs/InputDocs.svelte generated by Svelte v3.22.2 */
    const file$b = "src/docs/InputDocs.svelte";

    function create_fragment$b(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let b1;
    	let t4;
    	let b2;
    	let t6;
    	let b3;
    	let t8;
    	let li1;
    	let b4;
    	let t10;
    	let t11;
    	let li2;
    	let b5;
    	let t13;
    	let t14;
    	let li3;
    	let b6;
    	let t16;
    	let t17;
    	let li4;
    	let b7;
    	let t19;
    	let b8;
    	let t21;
    	let li5;
    	let b9;
    	let t23;
    	let t24;
    	let li6;
    	let b10;
    	let t26;
    	let t27;
    	let li7;
    	let b11;
    	let t29;
    	let t30;
    	let zoo_collapsable_list_item1;
    	let t34;
    	let div2;
    	let code;
    	let pre;
    	let t36;
    	let div1;
    	let zoo_input;
    	let input;
    	let zoo_input_valid_value;

    	const block = {
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

    			zoo_collapsable_list_item1.textContent = `
				This component accepts one slot ${/*inputSlotExample*/ ctx[1]}.
			`;

    			t34 = space();
    			div2 = element("div");
    			code = element("code");
    			pre = element("pre");
    			pre.textContent = `${/*example*/ ctx[2]}`;
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
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$b, 4, 1, 135);
    			add_location(pre, file$b, 40, 8, 1251);
    			add_location(code, file$b, 40, 2, 1245);
    			attr_dev(input, "slot", "inputelement");
    			attr_dev(input, "placeholder", "input");
    			add_location(input, file$b, 49, 4, 1566);
    			set_custom_element_data(zoo_input, "labeltext", "Input label");
    			set_custom_element_data(zoo_input, "linktext", "Forgotten your password?");
    			set_custom_element_data(zoo_input, "linkhref", "https://google.com");
    			set_custom_element_data(zoo_input, "linktarget", "about:blank");
    			set_custom_element_data(zoo_input, "valid", zoo_input_valid_value = true);
    			set_custom_element_data(zoo_input, "infotext", "Additional helpful information for our users");
    			add_location(zoo_input, file$b, 43, 3, 1342);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$b, 42, 2, 1311);
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$b, 39, 1, 1221);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$b, 3, 0, 108);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(li0, b1);
    			append_dev(li0, t4);
    			append_dev(li0, b2);
    			append_dev(li0, t6);
    			append_dev(li0, b3);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, b4);
    			append_dev(li1, t10);
    			append_dev(ul, t11);
    			append_dev(ul, li2);
    			append_dev(li2, b5);
    			append_dev(li2, t13);
    			append_dev(ul, t14);
    			append_dev(ul, li3);
    			append_dev(li3, b6);
    			append_dev(li3, t16);
    			append_dev(ul, t17);
    			append_dev(ul, li4);
    			append_dev(li4, b7);
    			append_dev(li4, t19);
    			append_dev(li4, b8);
    			append_dev(ul, t21);
    			append_dev(ul, li5);
    			append_dev(li5, b9);
    			append_dev(li5, t23);
    			append_dev(ul, t24);
    			append_dev(ul, li6);
    			append_dev(li6, b10);
    			append_dev(li6, t26);
    			append_dev(ul, t27);
    			append_dev(ul, li7);
    			append_dev(li7, b11);
    			append_dev(li7, t29);
    			append_dev(zoo_collapsable_list, t30);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div3, t34);
    			append_dev(div3, div2);
    			append_dev(div2, code);
    			append_dev(code, pre);
    			append_dev(div2, t36);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_input);
    			append_dev(zoo_input, input);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let list;
    	let inputSlotExample = `<slot name="inputelement"></slot>`;
    	let example = `<div style="width: 250px;">\n  <zoo-input labeltext="Input label"\n    linktext="Forgotten your password?"\n    linkhref="https://google.com"\n    linktarget="about:blank"\n    infotext="Additional helpful information for our users" >\n    <input slot="inputelement" placeholder="input"/>\n  </zoo-input>\n</div>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-input> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-input", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, inputSlotExample, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("inputSlotExample" in $$props) $$invalidate(1, inputSlotExample = $$props.inputSlotExample);
    		if ("example" in $$props) $$invalidate(2, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, inputSlotExample, example, zoo_collapsable_list_binding];
    }

    class InputDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$b, create_fragment$b, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-input", InputDocs);

    /* src/docs/LinkDocs.svelte generated by Svelte v3.22.2 */
    const file$c = "src/docs/LinkDocs.svelte";

    function create_fragment$c(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul1;
    	let ul0;
    	let li0;
    	let b0;
    	let t2;
    	let t3;
    	let li1;
    	let b1;
    	let t5;
    	let t6;
    	let li2;
    	let b2;
    	let t8;
    	let b3;
    	let t10;
    	let t11;
    	let li3;
    	let b4;
    	let t13;
    	let b5;
    	let t15;
    	let b6;
    	let t17;
    	let b7;
    	let t19;
    	let t20;
    	let li4;
    	let b8;
    	let t22;
    	let t23;
    	let li5;
    	let b9;
    	let t25;
    	let b10;
    	let t27;
    	let zoo_collapsable_list_item1;
    	let t29;
    	let div2;
    	let code;
    	let pre;
    	let t31;
    	let div1;
    	let zoo_link;

    	const block = {
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
    			pre.textContent = `${/*example*/ ctx[1]}`;
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
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$c, 4, 1, 133);
    			add_location(pre, file$c, 36, 8, 1128);
    			add_location(code, file$c, 36, 2, 1122);
    			set_custom_element_data(zoo_link, "href", "https://google.com");
    			set_custom_element_data(zoo_link, "text", "Link to google");
    			set_custom_element_data(zoo_link, "type", "green");
    			add_location(zoo_link, file$c, 39, 3, 1219);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$c, 38, 2, 1188);
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$c, 35, 1, 1098);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$c, 3, 0, 106);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul1);
    			append_dev(ul1, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(ul0, t3);
    			append_dev(ul0, li1);
    			append_dev(li1, b1);
    			append_dev(li1, t5);
    			append_dev(ul0, t6);
    			append_dev(ul0, li2);
    			append_dev(li2, b2);
    			append_dev(li2, t8);
    			append_dev(li2, b3);
    			append_dev(li2, t10);
    			append_dev(ul0, t11);
    			append_dev(ul0, li3);
    			append_dev(li3, b4);
    			append_dev(li3, t13);
    			append_dev(li3, b5);
    			append_dev(li3, t15);
    			append_dev(li3, b6);
    			append_dev(li3, t17);
    			append_dev(li3, b7);
    			append_dev(li3, t19);
    			append_dev(ul0, t20);
    			append_dev(ul0, li4);
    			append_dev(li4, b8);
    			append_dev(li4, t22);
    			append_dev(ul0, t23);
    			append_dev(ul0, li5);
    			append_dev(li5, b9);
    			append_dev(li5, t25);
    			append_dev(li5, b10);
    			append_dev(zoo_collapsable_list, t27);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div3, t29);
    			append_dev(div3, div2);
    			append_dev(div2, code);
    			append_dev(code, pre);
    			append_dev(div2, t31);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_link);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let list;
    	let inputSlotExample = `<slot name="inputelement"></slot>`;
    	let example = `<div style="width: 250px;">\n  <zoo-link href="https://google.com" text="Link to google" type="green"></zoo-link>\n</div>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-link", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, inputSlotExample, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("inputSlotExample" in $$props) inputSlotExample = $$props.inputSlotExample;
    		if ("example" in $$props) $$invalidate(1, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, example, inputSlotExample, zoo_collapsable_list_binding];
    }

    class LinkDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$c, create_fragment$c, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-link", LinkDocs);

    /* src/docs/ModalDocs.svelte generated by Svelte v3.22.2 */
    const file$d = "src/docs/ModalDocs.svelte";

    function create_fragment$d(ctx) {
    	let app_context;
    	let t0;
    	let div2;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let t3;
    	let li1;
    	let b1;
    	let t5;
    	let t6;
    	let li2;
    	let b2;
    	let t8;
    	let t9;
    	let zoo_collapsable_list_item1;
    	let t11;
    	let div1;
    	let code;
    	let pre;

    	const block = {
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
    			pre.textContent = `${/*example*/ ctx[1]}`;
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
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$d, 4, 1, 135);
    			add_location(pre, file$d, 25, 8, 801);
    			add_location(code, file$d, 25, 2, 795);
    			attr_dev(div1, "class", "example");
    			add_location(div1, file$d, 24, 1, 771);
    			attr_dev(div2, "class", "doc-element");
    			add_location(div2, file$d, 3, 0, 108);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(li1, b1);
    			append_dev(li1, t5);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, b2);
    			append_dev(li2, t8);
    			append_dev(zoo_collapsable_list, t9);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[2](zoo_collapsable_list);
    			append_dev(div2, t11);
    			append_dev(div2, div1);
    			append_dev(div1, code);
    			append_dev(code, pre);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			/*zoo_collapsable_list_binding*/ ctx[2](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let list;
    	let example = `<zoo-modal headertext="Your basket contains licensed items">\n  <zoo-feedback text="This is an info message."></zoo-feedback>\n</zoo-modal>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-modal", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("example" in $$props) $$invalidate(1, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, example, zoo_collapsable_list_binding];
    }

    class ModalDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$d, create_fragment$d, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-modal", ModalDocs);

    /* src/docs/NavigationDocs.svelte generated by Svelte v3.22.2 */
    const file$e = "src/docs/NavigationDocs.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (17:5) {#each navlinks as link}
    function create_each_block$2(ctx) {
    	let zoo_link;
    	let zoo_link_href_value;
    	let zoo_link_text_value;

    	const block = {
    		c: function create() {
    			zoo_link = element("zoo-link");
    			set_style(zoo_link, "margin-left", "10px");
    			set_custom_element_data(zoo_link, "href", zoo_link_href_value = /*link*/ ctx[4].href);
    			set_custom_element_data(zoo_link, "text", zoo_link_text_value = /*link*/ ctx[4].text);
    			add_location(zoo_link, file$e, 17, 6, 533);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, zoo_link, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(zoo_link);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(17:5) {#each navlinks as link}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let app_context;
    	let t0;
    	let div4;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item;
    	let t2;
    	let div3;
    	let code;
    	let pre;
    	let t4;
    	let div2;
    	let zoo_navigation;
    	let div1;
    	let each_value = /*navlinks*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
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
    			pre.textContent = `${/*example*/ ctx[2]}`;
    			t4 = space();
    			div2 = element("div");
    			zoo_navigation = element("zoo-navigation");
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Navigation component API.");
    			add_location(app_context, file$e, 2, 0, 57);
    			set_custom_element_data(zoo_collapsable_list_item, "slot", "item0");
    			add_location(zoo_collapsable_list_item, file$e, 6, 3, 209);
    			add_location(zoo_collapsable_list, file$e, 5, 2, 166);
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$e, 4, 1, 145);
    			add_location(pre, file$e, 12, 8, 398);
    			add_location(code, file$e, 12, 2, 392);
    			add_location(div1, file$e, 15, 4, 491);
    			set_custom_element_data(zoo_navigation, "class", "nav");
    			add_location(zoo_navigation, file$e, 14, 3, 458);
    			set_style(div2, "width", "250px");
    			add_location(div2, file$e, 13, 2, 428);
    			attr_dev(div3, "class", "example");
    			add_location(div3, file$e, 11, 1, 368);
    			attr_dev(div4, "class", "doc-element");
    			add_location(div4, file$e, 3, 0, 118);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, code);
    			append_dev(code, pre);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, zoo_navigation);
    			append_dev(zoo_navigation, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*navlinks*/ 2) {
    				each_value = /*navlinks*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
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
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let list;

    	let navlinks = [
    		{
    			href: "https://google.com",
    			text: "Google"
    		},
    		{
    			href: "https://svelte.technology/",
    			text: "Svelte"
    		}
    	];

    	let example = `<div style="width: 250px">\n  <zoo-navigation class="nav">\n    <div>\n      {#each navlinks as link}\n        <zoo-link style="margin-left: 10px;" href="{link.href}" text="{link.text}"></zoo-link>\n      {/each}\n    </div>\n  </zoo-navigation></div>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-navigation> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-navigation", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, navlinks, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("navlinks" in $$props) $$invalidate(1, navlinks = $$props.navlinks);
    		if ("example" in $$props) $$invalidate(2, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, navlinks, example, zoo_collapsable_list_binding];
    }

    class NavigationDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$e, create_fragment$e, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-navigation", NavigationDocs);

    /* src/docs/RadioDocs.svelte generated by Svelte v3.22.2 */
    const file$f = "src/docs/RadioDocs.svelte";

    function create_fragment$f(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let t3;
    	let li1;
    	let b1;
    	let t5;
    	let t6;
    	let li2;
    	let b2;
    	let t8;
    	let t9;
    	let zoo_collapsable_list_item1;
    	let t11;
    	let div2;
    	let code;
    	let pre;
    	let t13;
    	let div1;
    	let zoo_radio;
    	let input0;
    	let t14;
    	let label0;
    	let t16;
    	let input1;
    	let t17;
    	let label1;

    	const block = {
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
    			pre.textContent = `${/*example*/ ctx[1]}`;
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
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$f, 4, 1, 135);
    			add_location(pre, file$f, 25, 8, 768);
    			add_location(code, file$f, 25, 2, 762);
    			attr_dev(input0, "type", "radio");
    			attr_dev(input0, "id", "contactChoice4");
    			attr_dev(input0, "name", "contact");
    			input0.value = "email";
    			input0.disabled = true;
    			add_location(input0, file$f, 29, 4, 918);
    			attr_dev(label0, "for", "contactChoice4");
    			add_location(label0, file$f, 30, 4, 1001);
    			attr_dev(input1, "type", "radio");
    			attr_dev(input1, "id", "contactChoice5");
    			attr_dev(input1, "name", "contact");
    			input1.value = "phone";
    			add_location(input1, file$f, 31, 4, 1047);
    			attr_dev(label1, "for", "contactChoice5");
    			add_location(label1, file$f, 32, 4, 1121);
    			set_custom_element_data(zoo_radio, "infotext", "infotext");
    			set_custom_element_data(zoo_radio, "labeltext", "Label text");
    			add_location(zoo_radio, file$f, 28, 3, 859);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$f, 27, 2, 828);
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$f, 24, 1, 738);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$f, 3, 0, 108);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(li1, b1);
    			append_dev(li1, t5);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, b2);
    			append_dev(li2, t8);
    			append_dev(zoo_collapsable_list, t9);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div3, t11);
    			append_dev(div3, div2);
    			append_dev(div2, code);
    			append_dev(code, pre);
    			append_dev(div2, t13);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_radio);
    			append_dev(zoo_radio, input0);
    			append_dev(zoo_radio, t14);
    			append_dev(zoo_radio, label0);
    			append_dev(zoo_radio, t16);
    			append_dev(zoo_radio, input1);
    			append_dev(zoo_radio, t17);
    			append_dev(zoo_radio, label1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let list;
    	let inputSlotExample = `<slot name="inputelement"></slot>`;
    	let example = `<div style="width: 250px;">\n  <zoo-radio infotext="infotext">\n    <input type="radio" id="contactChoice4" name="contact" value="email" disabled>\n    <label for="contactChoice4">Email</label>\n    <input type="radio" id="contactChoice5" name="contact" value="phone">\n    <label for="contactChoice5">Phone</label>\n  </zoo-radio>\n</div>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-radio> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-radio", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, inputSlotExample, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("inputSlotExample" in $$props) inputSlotExample = $$props.inputSlotExample;
    		if ("example" in $$props) $$invalidate(1, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, example, inputSlotExample, zoo_collapsable_list_binding];
    }

    class RadioDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$f, create_fragment$f, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-radio", RadioDocs);

    /* src/docs/SearchableSelectDocs.svelte generated by Svelte v3.22.2 */
    const file$g = "src/docs/SearchableSelectDocs.svelte";

    function create_fragment$g(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let b1;
    	let t4;
    	let b2;
    	let t6;
    	let b3;
    	let t8;
    	let li1;
    	let b4;
    	let t10;
    	let t11;
    	let li2;
    	let b5;
    	let t13;
    	let t14;
    	let li3;
    	let b6;
    	let t16;
    	let t17;
    	let li4;
    	let b7;
    	let t19;
    	let b8;
    	let t21;
    	let li5;
    	let b9;
    	let t23;
    	let t24;
    	let li6;
    	let b10;
    	let t26;
    	let t27;
    	let li7;
    	let b11;
    	let t29;
    	let t30;
    	let li8;
    	let b12;
    	let t32;
    	let t33;
    	let zoo_collapsable_list_item1;
    	let t37;
    	let div2;
    	let code;
    	let pre;
    	let t39;
    	let div1;
    	let zoo_searchable_select;
    	let select;
    	let option0;
    	let option1;

    	const block = {
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

    			zoo_collapsable_list_item1.textContent = `
				This component accepts one slot ${/*inputSlotExample*/ ctx[1]}.
			`;

    			t37 = space();
    			div2 = element("div");
    			code = element("code");
    			pre = element("pre");
    			pre.textContent = `${/*example*/ ctx[2]}`;
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
    			attr_dev(div0, "class", "list");
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
    			attr_dev(select, "slot", "selectelement");
    			add_location(select, file$g, 47, 4, 1561);
    			set_custom_element_data(zoo_searchable_select, "labeltext", "Searchable select");
    			set_custom_element_data(zoo_searchable_select, "placeholder", "Placeholder");
    			add_location(zoo_searchable_select, file$g, 46, 3, 1477);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$g, 45, 2, 1446);
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$g, 42, 1, 1356);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$g, 3, 0, 132);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(li0, b1);
    			append_dev(li0, t4);
    			append_dev(li0, b2);
    			append_dev(li0, t6);
    			append_dev(li0, b3);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, b4);
    			append_dev(li1, t10);
    			append_dev(ul, t11);
    			append_dev(ul, li2);
    			append_dev(li2, b5);
    			append_dev(li2, t13);
    			append_dev(ul, t14);
    			append_dev(ul, li3);
    			append_dev(li3, b6);
    			append_dev(li3, t16);
    			append_dev(ul, t17);
    			append_dev(ul, li4);
    			append_dev(li4, b7);
    			append_dev(li4, t19);
    			append_dev(li4, b8);
    			append_dev(ul, t21);
    			append_dev(ul, li5);
    			append_dev(li5, b9);
    			append_dev(li5, t23);
    			append_dev(ul, t24);
    			append_dev(ul, li6);
    			append_dev(li6, b10);
    			append_dev(li6, t26);
    			append_dev(ul, t27);
    			append_dev(ul, li7);
    			append_dev(li7, b11);
    			append_dev(li7, t29);
    			append_dev(ul, t30);
    			append_dev(ul, li8);
    			append_dev(li8, b12);
    			append_dev(li8, t32);
    			append_dev(zoo_collapsable_list, t33);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div3, t37);
    			append_dev(div3, div2);
    			append_dev(div2, code);
    			append_dev(code, pre);
    			append_dev(div2, t39);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_searchable_select);
    			append_dev(zoo_searchable_select, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let list;
    	let inputSlotExample = `<slot name="selectelement"></slot>`;
    	let example = `<div style="width: 250px;">\n  <zoo-searchable-select labeltext="Searchable select" placeholder="Placeholder">\n    <select multiple slot="selectelement">\n      <option value="1">1</option>\n      <option value="2">2</option>\n    </select>\n  </zoo-searchable-select>\n</div>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-searchable-select> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-searchable-select", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, inputSlotExample, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("inputSlotExample" in $$props) $$invalidate(1, inputSlotExample = $$props.inputSlotExample);
    		if ("example" in $$props) $$invalidate(2, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, inputSlotExample, example, zoo_collapsable_list_binding];
    }

    class SearchableSelectDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$g, create_fragment$g, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-searchable-select", SearchableSelectDocs);

    /* src/docs/SelectDocs.svelte generated by Svelte v3.22.2 */
    const file$h = "src/docs/SelectDocs.svelte";

    function create_fragment$h(ctx) {
    	let app_context;
    	let t0;
    	let div3;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let b1;
    	let t4;
    	let b2;
    	let t6;
    	let b3;
    	let t8;
    	let li1;
    	let b4;
    	let t10;
    	let t11;
    	let li2;
    	let b5;
    	let t13;
    	let t14;
    	let li3;
    	let b6;
    	let t16;
    	let t17;
    	let li4;
    	let b7;
    	let t19;
    	let b8;
    	let t21;
    	let li5;
    	let b9;
    	let t23;
    	let t24;
    	let li6;
    	let b10;
    	let t26;
    	let t27;
    	let li7;
    	let b11;
    	let t29;
    	let t30;
    	let zoo_collapsable_list_item1;
    	let t34;
    	let div2;
    	let code;
    	let pre;
    	let t36;
    	let div1;
    	let zoo_select;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;

    	const block = {
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

    			zoo_collapsable_list_item1.textContent = `
				This component accepts one slot ${/*inputSlotExample*/ ctx[1]}.
			`;

    			t34 = space();
    			div2 = element("div");
    			code = element("code");
    			pre = element("pre");
    			pre.textContent = `${/*example*/ ctx[2]}`;
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
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$h, 4, 1, 137);
    			add_location(pre, file$h, 40, 8, 1253);
    			add_location(code, file$h, 40, 2, 1247);
    			attr_dev(option0, "class", "placeholder");
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
    			attr_dev(select, "slot", "selectelement");
    			add_location(select, file$h, 44, 4, 1442);
    			set_custom_element_data(zoo_select, "labeltext", "Select label");
    			set_custom_element_data(zoo_select, "infotext", "Additional helpful information for our users");
    			add_location(zoo_select, file$h, 43, 3, 1344);
    			set_style(div1, "width", "250px");
    			add_location(div1, file$h, 42, 2, 1313);
    			attr_dev(div2, "class", "example");
    			add_location(div2, file$h, 39, 1, 1223);
    			attr_dev(div3, "class", "doc-element");
    			add_location(div3, file$h, 3, 0, 110);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(li0, b1);
    			append_dev(li0, t4);
    			append_dev(li0, b2);
    			append_dev(li0, t6);
    			append_dev(li0, b3);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(li1, b4);
    			append_dev(li1, t10);
    			append_dev(ul, t11);
    			append_dev(ul, li2);
    			append_dev(li2, b5);
    			append_dev(li2, t13);
    			append_dev(ul, t14);
    			append_dev(ul, li3);
    			append_dev(li3, b6);
    			append_dev(li3, t16);
    			append_dev(ul, t17);
    			append_dev(ul, li4);
    			append_dev(li4, b7);
    			append_dev(li4, t19);
    			append_dev(li4, b8);
    			append_dev(ul, t21);
    			append_dev(ul, li5);
    			append_dev(li5, b9);
    			append_dev(li5, t23);
    			append_dev(ul, t24);
    			append_dev(ul, li6);
    			append_dev(li6, b10);
    			append_dev(li6, t26);
    			append_dev(ul, t27);
    			append_dev(ul, li7);
    			append_dev(li7, b11);
    			append_dev(li7, t29);
    			append_dev(zoo_collapsable_list, t30);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div3, t34);
    			append_dev(div3, div2);
    			append_dev(div2, code);
    			append_dev(code, pre);
    			append_dev(div2, t36);
    			append_dev(div2, div1);
    			append_dev(div1, zoo_select);
    			append_dev(zoo_select, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let list;
    	let inputSlotExample = `<slot name="selectelement"></slot>`;
    	let example = `<div style="width: 250px;">\n  <zoo-select labeltext="Select label" infotext="Additional helpful information for our users">\n    <select slot="selectelement">\n      <option class="placeholder" value="" disabled selected>Placeholder</option>\n      <option>1</option>\n      <option>2</option>\n      <option>3</option>\n    </select>\n  </zoo-select>\n</div>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-select> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-select", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, inputSlotExample, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("inputSlotExample" in $$props) $$invalidate(1, inputSlotExample = $$props.inputSlotExample);
    		if ("example" in $$props) $$invalidate(2, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, inputSlotExample, example, zoo_collapsable_list_binding];
    }

    class SelectDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$h, create_fragment$h, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-select", SelectDocs);

    /* src/docs/ToastDocs.svelte generated by Svelte v3.22.2 */
    const file$i = "src/docs/ToastDocs.svelte";

    function create_fragment$i(ctx) {
    	let app_context;
    	let t0;
    	let div2;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let t3;
    	let li1;
    	let b1;
    	let t5;
    	let b2;
    	let t7;
    	let b3;
    	let t9;
    	let b4;
    	let t11;
    	let b5;
    	let t13;
    	let li2;
    	let b6;
    	let t15;
    	let t16;
    	let li3;
    	let b7;
    	let t18;
    	let b8;
    	let t20;
    	let t21;
    	let li4;
    	let b9;
    	let t23;
    	let b10;
    	let t25;
    	let t26;
    	let zoo_collapsable_list_item1;
    	let t28;
    	let div1;
    	let code;
    	let pre;

    	const block = {
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
    			pre.textContent = `${/*example*/ ctx[1]}`;
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
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$i, 4, 1, 135);
    			add_location(pre, file$i, 31, 8, 1103);
    			add_location(code, file$i, 31, 2, 1097);
    			attr_dev(div1, "class", "example");
    			add_location(div1, file$i, 30, 1, 1073);
    			attr_dev(div2, "class", "doc-element");
    			add_location(div2, file$i, 3, 0, 108);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(li1, b1);
    			append_dev(li1, t5);
    			append_dev(li1, b2);
    			append_dev(li1, t7);
    			append_dev(li1, b3);
    			append_dev(li1, t9);
    			append_dev(li1, b4);
    			append_dev(li1, t11);
    			append_dev(li1, b5);
    			append_dev(ul, t13);
    			append_dev(ul, li2);
    			append_dev(li2, b6);
    			append_dev(li2, t15);
    			append_dev(ul, t16);
    			append_dev(ul, li3);
    			append_dev(li3, b7);
    			append_dev(li3, t18);
    			append_dev(li3, b8);
    			append_dev(li3, t20);
    			append_dev(ul, t21);
    			append_dev(ul, li4);
    			append_dev(li4, b9);
    			append_dev(li4, t23);
    			append_dev(li4, b10);
    			append_dev(li4, t25);
    			append_dev(zoo_collapsable_list, t26);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div2, t28);
    			append_dev(div2, div1);
    			append_dev(div1, code);
    			append_dev(code, pre);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let list;
    	let inputSlotExample = `<slot name="inputelement"></slot>`;
    	let example = `<zoo-toast type="info" text="This is an info message."></zoo-toast>`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-toast> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-toast", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, inputSlotExample, example });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("inputSlotExample" in $$props) inputSlotExample = $$props.inputSlotExample;
    		if ("example" in $$props) $$invalidate(1, example = $$props.example);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, example, inputSlotExample, zoo_collapsable_list_binding];
    }

    class ToastDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$i, create_fragment$i, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-toast", ToastDocs);

    /* src/docs/TooltipDocs.svelte generated by Svelte v3.22.2 */
    const file$j = "src/docs/TooltipDocs.svelte";

    function create_fragment$j(ctx) {
    	let app_context;
    	let t0;
    	let div4;
    	let div0;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item0;
    	let ul;
    	let li0;
    	let b0;
    	let t2;
    	let t3;
    	let li1;
    	let b1;
    	let t5;
    	let b2;
    	let t7;
    	let b3;
    	let t9;
    	let b4;
    	let t11;
    	let b5;
    	let t13;
    	let b6;
    	let t15;
    	let li2;
    	let b7;
    	let t17;
    	let code0;
    	let pre0;
    	let t19;
    	let li3;
    	let b8;
    	let t21;
    	let code1;
    	let pre1;
    	let t23;
    	let zoo_collapsable_list_item1;
    	let t25;
    	let div3;
    	let code2;
    	let pre2;
    	let t27;
    	let div2;
    	let zoo_button;
    	let div1;
    	let t28;
    	let zoo_tooltip;

    	const block = {
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
    			pre0.textContent = `${/*snippet*/ ctx[3]}`;
    			t19 = space();
    			li3 = element("li");
    			b8 = element("b");
    			b8.textContent = "CSS keyframes";
    			t21 = text(" - to enable animation use the following snippet: ");
    			code1 = element("code");
    			pre1 = element("pre");
    			pre1.textContent = `${/*keyframesSnippet*/ ctx[2]}`;
    			t23 = space();
    			zoo_collapsable_list_item1 = element("zoo-collapsable-list-item");
    			zoo_collapsable_list_item1.textContent = "This component either renders a unnamed slot or presents text supplied as an attribute.";
    			t25 = space();
    			div3 = element("div");
    			code2 = element("code");
    			pre2 = element("pre");
    			pre2.textContent = `${/*example*/ ctx[1]}`;
    			t27 = text("\n\t\twill produce the following:\n\t\t");
    			div2 = element("div");
    			zoo_button = element("zoo-button");
    			div1 = element("div");
    			t28 = text("Button\n\t\t\t\t\t");
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
    			add_location(b7, file$j, 15, 6, 492);
    			add_location(pre0, file$j, 15, 88, 574);
    			add_location(code0, file$j, 15, 82, 568);
    			add_location(li2, file$j, 14, 5, 481);
    			add_location(b8, file$j, 18, 6, 629);
    			add_location(pre1, file$j, 18, 82, 705);
    			add_location(code1, file$j, 18, 76, 699);
    			add_location(li3, file$j, 17, 5, 618);
    			add_location(ul, file$j, 7, 4, 248);
    			set_custom_element_data(zoo_collapsable_list_item0, "slot", "item0");
    			add_location(zoo_collapsable_list_item0, file$j, 6, 3, 203);
    			set_custom_element_data(zoo_collapsable_list_item1, "slot", "item1");
    			add_location(zoo_collapsable_list_item1, file$j, 22, 3, 798);
    			add_location(zoo_collapsable_list, file$j, 5, 2, 160);
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$j, 4, 1, 139);
    			add_location(pre2, file$j, 28, 8, 1028);
    			add_location(code2, file$j, 28, 2, 1022);
    			set_custom_element_data(zoo_tooltip, "text", "Tooltip text");
    			add_location(zoo_tooltip, file$j, 34, 5, 1220);
    			attr_dev(div1, "slot", "buttoncontent");
    			add_location(div1, file$j, 32, 4, 1176);
    			set_custom_element_data(zoo_button, "class", "top-tooltip");
    			add_location(zoo_button, file$j, 31, 3, 1139);
    			set_style(div2, "width", "250px");
    			set_style(div2, "margin-bottom", "2px");
    			add_location(div2, file$j, 30, 2, 1088);
    			attr_dev(div3, "class", "example");
    			add_location(div3, file$j, 27, 1, 998);
    			attr_dev(div4, "class", "doc-element");
    			add_location(div4, file$j, 3, 0, 112);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item0);
    			append_dev(zoo_collapsable_list_item0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t2);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(li1, b1);
    			append_dev(li1, t5);
    			append_dev(li1, b2);
    			append_dev(li1, t7);
    			append_dev(li1, b3);
    			append_dev(li1, t9);
    			append_dev(li1, b4);
    			append_dev(li1, t11);
    			append_dev(li1, b5);
    			append_dev(li1, t13);
    			append_dev(li1, b6);
    			append_dev(ul, t15);
    			append_dev(ul, li2);
    			append_dev(li2, b7);
    			append_dev(li2, t17);
    			append_dev(li2, code0);
    			append_dev(code0, pre0);
    			append_dev(ul, t19);
    			append_dev(ul, li3);
    			append_dev(li3, b8);
    			append_dev(li3, t21);
    			append_dev(li3, code1);
    			append_dev(code1, pre1);
    			append_dev(zoo_collapsable_list, t23);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item1);
    			/*zoo_collapsable_list_binding*/ ctx[5](zoo_collapsable_list);
    			append_dev(div4, t25);
    			append_dev(div4, div3);
    			append_dev(div3, code2);
    			append_dev(code2, pre2);
    			append_dev(div3, t27);
    			append_dev(div3, div2);
    			append_dev(div2, zoo_button);
    			append_dev(zoo_button, div1);
    			append_dev(div1, t28);
    			append_dev(div1, zoo_tooltip);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			/*zoo_collapsable_list_binding*/ ctx[5](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let list;
    	let inputSlotExample = `<slot name="inputelement"></slot>`;
    	let example = `<div style="width: 250px;">\n  <zoo-button>\n    <div slot="buttoncontent">\n      Button\n      <zoo-tooltip text="Tooltip text"></zoo-tooltip>\n    </div>\n  </zoo-button>\n</div>`;
    	let keyframesSnippet = `.class-name:hover {\n  zoo-tooltip {\n    display: block;\n    animation: fadeTooltipIn 0.2s;\n  }\n}`;
    	let snippet = `.class-name:hover {\n  zoo-tooltip {\n    display: block;\n  }\n}`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }, { header: "Slots" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-tooltip> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-tooltip", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		list,
    		inputSlotExample,
    		example,
    		keyframesSnippet,
    		snippet
    	});

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("inputSlotExample" in $$props) inputSlotExample = $$props.inputSlotExample;
    		if ("example" in $$props) $$invalidate(1, example = $$props.example);
    		if ("keyframesSnippet" in $$props) $$invalidate(2, keyframesSnippet = $$props.keyframesSnippet);
    		if ("snippet" in $$props) $$invalidate(3, snippet = $$props.snippet);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		list,
    		example,
    		keyframesSnippet,
    		snippet,
    		inputSlotExample,
    		zoo_collapsable_list_binding
    	];
    }

    class TooltipDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}zoo-tooltip{display:none}.top-tooltip:hover zoo-tooltip{display:block;animation:fadeTooltipIn 0.2s}</style>`;
    		init(this, { target: this.shadowRoot }, instance$j, create_fragment$j, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-tooltip", TooltipDocs);

    /* src/docs/ThemingDocs.svelte generated by Svelte v3.22.2 */
    const file$k = "src/docs/ThemingDocs.svelte";

    function create_fragment$k(ctx) {
    	let app_context;
    	let t0;
    	let div2;
    	let div0;
    	let t1;
    	let a;
    	let t3;
    	let zoo_collapsable_list;
    	let zoo_collapsable_list_item;
    	let ul;
    	let li0;
    	let b0;
    	let t5;
    	let t6;
    	let li1;
    	let b1;
    	let t8;
    	let t9;
    	let li2;
    	let b2;
    	let t11;
    	let t12;
    	let li3;
    	let b3;
    	let t14;
    	let t15;
    	let li4;
    	let b4;
    	let t17;
    	let t18;
    	let li5;
    	let b5;
    	let t20;
    	let t21;
    	let div1;
    	let t22;
    	let code0;
    	let pre0;
    	let t24;
    	let code1;
    	let pre1;

    	const block = {
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
    			b0.textContent = "--primary-mid";
    			t5 = text(" -");
    			t6 = space();
    			li1 = element("li");
    			b1 = element("b");
    			b1.textContent = "--primary-light";
    			t8 = text(" -");
    			t9 = space();
    			li2 = element("li");
    			b2 = element("b");
    			b2.textContent = "--primary-dark";
    			t11 = text(" -");
    			t12 = space();
    			li3 = element("li");
    			b3 = element("b");
    			b3.textContent = "--secondary-mid";
    			t14 = text(" -");
    			t15 = space();
    			li4 = element("li");
    			b4 = element("b");
    			b4.textContent = "--secondary-light";
    			t17 = text(" -");
    			t18 = space();
    			li5 = element("li");
    			b5 = element("b");
    			b5.textContent = "--secondary-dark";
    			t20 = text(" -");
    			t21 = space();
    			div1 = element("div");
    			t22 = text("Example with a preprocessor:\n\t\t");
    			code0 = element("code");
    			pre0 = element("pre");
    			pre0.textContent = `${/*exampleScss*/ ctx[1]}`;
    			t24 = text("\n\t\tExample with pure css:\n\t\t");
    			code1 = element("code");
    			pre1 = element("pre");
    			pre1.textContent = `${/*exampleCss*/ ctx[2]}`;
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Theming API.");
    			add_location(app_context, file$k, 2, 0, 54);
    			attr_dev(a, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/--*");
    			attr_dev(a, "target", "about:blank");
    			add_location(a, file$k, 5, 57, 205);
    			add_location(b0, file$k, 11, 6, 482);
    			add_location(li0, file$k, 10, 5, 471);
    			add_location(b1, file$k, 14, 6, 533);
    			add_location(li1, file$k, 13, 5, 522);
    			add_location(b2, file$k, 17, 6, 586);
    			add_location(li2, file$k, 16, 5, 575);
    			add_location(b3, file$k, 20, 6, 638);
    			add_location(li3, file$k, 19, 5, 627);
    			add_location(b4, file$k, 23, 6, 691);
    			add_location(li4, file$k, 22, 5, 680);
    			add_location(b5, file$k, 26, 6, 746);
    			add_location(li5, file$k, 25, 5, 735);
    			add_location(ul, file$k, 9, 4, 461);
    			set_custom_element_data(zoo_collapsable_list_item, "slot", "item0");
    			add_location(zoo_collapsable_list_item, file$k, 8, 3, 416);
    			add_location(zoo_collapsable_list, file$k, 7, 2, 373);
    			attr_dev(div0, "class", "list");
    			add_location(div0, file$k, 4, 1, 129);
    			add_location(pre0, file$k, 34, 8, 922);
    			add_location(code0, file$k, 34, 2, 916);
    			add_location(pre1, file$k, 36, 8, 987);
    			add_location(code1, file$k, 36, 2, 981);
    			attr_dev(div1, "class", "example");
    			add_location(div1, file$k, 32, 1, 861);
    			attr_dev(div2, "class", "doc-element");
    			add_location(div2, file$k, 3, 0, 102);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, app_context, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t1);
    			append_dev(div0, a);
    			append_dev(div0, t3);
    			append_dev(div0, zoo_collapsable_list);
    			append_dev(zoo_collapsable_list, zoo_collapsable_list_item);
    			append_dev(zoo_collapsable_list_item, ul);
    			append_dev(ul, li0);
    			append_dev(li0, b0);
    			append_dev(li0, t5);
    			append_dev(ul, t6);
    			append_dev(ul, li1);
    			append_dev(li1, b1);
    			append_dev(li1, t8);
    			append_dev(ul, t9);
    			append_dev(ul, li2);
    			append_dev(li2, b2);
    			append_dev(li2, t11);
    			append_dev(ul, t12);
    			append_dev(ul, li3);
    			append_dev(li3, b3);
    			append_dev(li3, t14);
    			append_dev(ul, t15);
    			append_dev(ul, li4);
    			append_dev(li4, b4);
    			append_dev(li4, t17);
    			append_dev(ul, t18);
    			append_dev(ul, li5);
    			append_dev(li5, b5);
    			append_dev(li5, t20);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div2, t21);
    			append_dev(div2, div1);
    			append_dev(div1, t22);
    			append_dev(div1, code0);
    			append_dev(code0, pre0);
    			append_dev(div1, t24);
    			append_dev(div1, code1);
    			append_dev(code1, pre1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(app_context);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			/*zoo_collapsable_list_binding*/ ctx[3](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let list;
    	let exampleScss = `@import "variables";\n:root {\n  --primary-mid: #{$primary-mid};\n  --primary-light: #{$primary-light};\n  --primary-dark: #{$primary-dark};\n  --secondary-mic: #{$secondary-mic};\n  --secondary-light: #{$secondary-light};\n  --secondary-dark: #{$secondary-dark};\n}`;
    	let exampleCss = `:root {\n  --primary-mid: #040C40;\n  --primary-light: #040C40;\n  --primary-dark: #020729;\n  --secondary-mid: #5D4200;\n  --secondary-light: #745300;\n  --secondary-dark: #3B2B00;\n}`;

    	onMount(() => {
    		$$invalidate(0, list.items = [{ header: "API" }], list);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<docs-theming> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("docs-theming", $$slots, []);

    	function zoo_collapsable_list_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, list = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, list, exampleScss, exampleCss });

    	$$self.$inject_state = $$props => {
    		if ("list" in $$props) $$invalidate(0, list = $$props.list);
    		if ("exampleScss" in $$props) $$invalidate(1, exampleScss = $$props.exampleScss);
    		if ("exampleCss" in $$props) $$invalidate(2, exampleCss = $$props.exampleCss);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [list, exampleScss, exampleCss, zoo_collapsable_list_binding];
    }

    class ThemingDocs extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.doc-element{display:flex;flex-direction:row}.list{width:35%;margin:0 20px}.example{overflow:auto}</style>`;
    		init(this, { target: this.shadowRoot }, instance$k, create_fragment$k, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-theming", ThemingDocs);

}());
