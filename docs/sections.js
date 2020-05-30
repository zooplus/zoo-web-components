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
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
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

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
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
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.0' }, detail)));
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

/* src/sections/Context.svelte generated by Svelte v3.23.0 */

const file = "src/sections/Context.svelte";

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
			add_location(a, file, 7, 31, 216);
			attr_dev(span, "slot", "buttoncontent");
			add_location(span, file, 7, 4, 189);
			add_location(zoo_button, file, 5, 3, 122);
			attr_dev(div, "class", "back-btn");
			add_location(div, file, 4, 2, 96);
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
	let section;
	let h2;
	let t0;
	let t1;
	let if_block = /*backbtn*/ ctx[1] && create_if_block(ctx);

	const block = {
		c: function create() {
			section = element("section");
			h2 = element("h2");
			t0 = text(/*text*/ ctx[0]);
			t1 = space();
			if (if_block) if_block.c();
			this.c = noop;
			add_location(h2, file, 2, 1, 63);
			add_location(section, file, 1, 0, 52);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, section, anchor);
			append_dev(section, h2);
			append_dev(h2, t0);
			append_dev(section, t1);
			if (if_block) if_block.m(section, null);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*text*/ 1) set_data_dev(t0, /*text*/ ctx[0]);

			if (/*backbtn*/ ctx[1]) {
				if (if_block) ; else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(section, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(section);
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
		this.shadowRoot.innerHTML = `<style>section{min-height:80px;display:flex;align-items:center;margin-left:20px;background:white}.back-btn{margin-left:5px}.back-btn a{text-decoration:none;color:white}h2{color:var(--primary-mid, #3C9700);font-size:23px}</style>`;
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

/* src/sections/Header.svelte generated by Svelte v3.23.0 */

const file$1 = "src/sections/Header.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[12] = list[i];
	return child_ctx;
}

// (25:3) {#each navlinks as link}
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
			add_location(a, file$1, 26, 5, 1071);
			attr_dev(div, "class", "nav-link");
			add_location(div, file$1, 25, 4, 1043);
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
		source: "(25:3) {#each navlinks as link}",
		ctx
	});

	return block;
}

function create_fragment$1(ctx) {
	let header;
	let zoo_header;
	let img;
	let img_src_value;
	let t0;
	let div3;
	let div0;
	let zoo_button0;
	let span0;
	let zoo_button0_type_value;
	let t2;
	let div1;
	let zoo_button1;
	let span1;
	let zoo_button1_type_value;
	let t4;
	let div2;
	let zoo_button2;
	let span2;
	let zoo_button2_type_value;
	let t6;
	let zoo_navigation;
	let div4;
	let mounted;
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
			img = element("img");
			t0 = space();
			div3 = element("div");
			div0 = element("div");
			zoo_button0 = element("zoo-button");
			span0 = element("span");
			span0.textContent = "Zoo+ theme";
			t2 = space();
			div1 = element("div");
			zoo_button1 = element("zoo-button");
			span1 = element("span");
			span1.textContent = "Grey theme";
			t4 = space();
			div2 = element("div");
			zoo_button2 = element("zoo-button");
			span2 = element("span");
			span2.textContent = "Random theme";
			t6 = space();
			zoo_navigation = element("zoo-navigation");
			div4 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			this.c = noop;
			attr_dev(img, "slot", "img");
			attr_dev(img, "alt", "Zooplus logo");
			if (img.src !== (img_src_value = "logo.png")) attr_dev(img, "src", img_src_value);
			add_location(img, file$1, 3, 2, 112);
			attr_dev(span0, "slot", "buttoncontent");
			attr_dev(span0, "class", "slotted-span");
			add_location(span0, file$1, 7, 5, 349);
			set_custom_element_data(zoo_button0, "type", zoo_button0_type_value = /*theme*/ ctx[0] === "zoo" ? "secondary" : "primary");
			set_custom_element_data(zoo_button0, "size", "medium");
			add_location(zoo_button0, file$1, 6, 4, 230);
			attr_dev(div0, "class", "header-button");
			add_location(div0, file$1, 5, 3, 198);
			attr_dev(span1, "slot", "buttoncontent");
			attr_dev(span1, "class", "slotted-span");
			add_location(span1, file$1, 12, 5, 599);
			set_custom_element_data(zoo_button1, "type", zoo_button1_type_value = /*theme*/ ctx[0] === "grey" ? "secondary" : "primary");
			set_custom_element_data(zoo_button1, "size", "medium");
			add_location(zoo_button1, file$1, 11, 4, 478);
			attr_dev(div1, "class", "header-button");
			add_location(div1, file$1, 10, 3, 446);
			attr_dev(span2, "slot", "buttoncontent");
			attr_dev(span2, "class", "slotted-span");
			add_location(span2, file$1, 17, 5, 853);
			set_custom_element_data(zoo_button2, "type", zoo_button2_type_value = /*theme*/ ctx[0] === "random" ? "secondary" : "primary");
			set_custom_element_data(zoo_button2, "size", "medium");
			add_location(zoo_button2, file$1, 16, 4, 728);
			attr_dev(div2, "class", "header-button");
			add_location(div2, file$1, 15, 3, 696);
			attr_dev(div3, "class", "buttons-holder");
			add_location(div3, file$1, 4, 2, 166);
			set_custom_element_data(zoo_header, "headertext", "Zooplus web components");
			add_location(zoo_header, file$1, 2, 1, 61);
			add_location(div4, file$1, 23, 2, 1005);
			set_custom_element_data(zoo_navigation, "class", "nav");
			add_location(zoo_navigation, file$1, 22, 1, 974);
			add_location(header, file$1, 1, 0, 51);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, header, anchor);
			append_dev(header, zoo_header);
			append_dev(zoo_header, img);
			append_dev(zoo_header, t0);
			append_dev(zoo_header, div3);
			append_dev(div3, div0);
			append_dev(div0, zoo_button0);
			append_dev(zoo_button0, span0);
			append_dev(div3, t2);
			append_dev(div3, div1);
			append_dev(div1, zoo_button1);
			append_dev(zoo_button1, span1);
			append_dev(div3, t4);
			append_dev(div3, div2);
			append_dev(div2, zoo_button2);
			append_dev(zoo_button2, span2);
			append_dev(header, t6);
			append_dev(header, zoo_navigation);
			append_dev(zoo_navigation, div4);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div4, null);
			}

			if (!mounted) {
				dispose = [
					listen_dev(zoo_button0, "click", /*click_handler*/ ctx[9], false, false, false),
					listen_dev(zoo_button1, "click", /*click_handler_1*/ ctx[10], false, false, false),
					listen_dev(zoo_button2, "click", /*click_handler_2*/ ctx[11], false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*theme*/ 1 && zoo_button0_type_value !== (zoo_button0_type_value = /*theme*/ ctx[0] === "zoo" ? "secondary" : "primary")) {
				set_custom_element_data(zoo_button0, "type", zoo_button0_type_value);
			}

			if (dirty & /*theme*/ 1 && zoo_button1_type_value !== (zoo_button1_type_value = /*theme*/ ctx[0] === "grey" ? "secondary" : "primary")) {
				set_custom_element_data(zoo_button1, "type", zoo_button1_type_value);
			}

			if (dirty & /*theme*/ 1 && zoo_button2_type_value !== (zoo_button2_type_value = /*theme*/ ctx[0] === "random" ? "secondary" : "primary")) {
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
			mounted = false;
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
		this.shadowRoot.innerHTML = `<style>:host{contain:layout}header{position:relative}.buttons-holder{display:flex;justify-content:flex-end;flex-direction:row;flex-grow:1;padding:0 25px 0 0}@media only screen and (max-width: 900px){.buttons-holder{justify-content:initial;overflow:scroll;max-width:250px}}@media only screen and (max-width: 544px){.buttons-holder{justify-content:initial;overflow:scroll;max-width:250px}}.header-button{display:flex;max-width:250px;min-width:140px;margin-left:15px}.header-button zoo-button{align-self:center}.nav{position:sticky;top:0;color:white;font-size:14px;line-height:20px;font-weight:bold;cursor:pointer}.nav .nav-link{cursor:pointer;display:flex;align-items:center}.nav .nav-link:hover{background:rgba(255, 255, 255, 0.3)}.nav .nav-link a{color:white;text-decoration:none;padding:0 15px}</style>`;
		init(this, { target: this.shadowRoot }, instance$1, create_fragment$1, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert_dev(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("app-header", Header);

/* src/sections/Form.svelte generated by Svelte v3.23.0 */

const file$2 = "src/sections/Form.svelte";

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = list[i];
	return child_ctx;
}

// (55:3) {#each options as option}
function create_each_block_1(ctx) {
	let option;
	let t0_value = /*option*/ ctx[1].text + "";
	let t0;
	let t1;
	let option_value_value;

	const block = {
		c: function create() {
			option = element("option");
			t0 = text(t0_value);
			t1 = space();
			option.__value = option_value_value = /*option*/ ctx[1].value;
			option.value = option.__value;
			add_location(option, file$2, 55, 4, 2876);
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
		source: "(55:3) {#each options as option}",
		ctx
	});

	return block;
}

// (64:3) {#each options as option}
function create_each_block$1(ctx) {
	let option;
	let t0_value = /*option*/ ctx[1].text + "";
	let t0;
	let t1;
	let option_value_value;

	const block = {
		c: function create() {
			option = element("option");
			t0 = text(t0_value);
			t1 = space();
			option.__value = option_value_value = /*option*/ ctx[1].value;
			option.value = option.__value;
			add_location(option, file$2, 64, 4, 3193);
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
		source: "(64:3) {#each options as option}",
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
	let label0;
	let t3;
	let zoo_input1;
	let input1;
	let t4;
	let label1;
	let t6;
	let datalist;
	let option0;
	let option1;
	let option2;
	let option3;
	let option4;
	let t7;
	let zoo_input2;
	let input2;
	let t8;
	let label2;
	let t10;
	let zoo_input3;
	let input3;
	let t11;
	let label3;
	let t13;
	let zoo_input4;
	let textarea;
	let t14;
	let label4;
	let t16;
	let zoo_select0;
	let select0;
	let option5;
	let option6;
	let option7;
	let option8;
	let t21;
	let label5;
	let t23;
	let zoo_select1;
	let select1;
	let option9;
	let option10;
	let option11;
	let option12;
	let t28;
	let label6;
	let t30;
	let zoo_searchable_select0;
	let select2;
	let t31;
	let zoo_searchable_select1;
	let select3;
	let t32;
	let zoo_checkbox0;
	let input4;
	let t33;
	let label7;
	let zoo_checkbox0_highlighted_value;
	let t35;
	let zoo_checkbox1;
	let input5;
	let t36;
	let label8;
	let zoo_checkbox1_highlighted_value;
	let t38;
	let zoo_radio;
	let input6;
	let t39;
	let label9;
	let t41;
	let input7;
	let t42;
	let label10;
	let t44;
	let input8;
	let t45;
	let label11;
	let each_value_1 = /*options*/ ctx[0];
	validate_each_argument(each_value_1);
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	let each_value = /*options*/ ctx[0];
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
			label0 = element("label");
			label0.textContent = "Input type text";
			t3 = space();
			zoo_input1 = element("zoo-input");
			input1 = element("input");
			t4 = space();
			label1 = element("label");
			label1.textContent = "Autocomplete";
			t6 = space();
			datalist = element("datalist");
			option0 = element("option");
			option1 = element("option");
			option2 = element("option");
			option3 = element("option");
			option4 = element("option");
			t7 = space();
			zoo_input2 = element("zoo-input");
			input2 = element("input");
			t8 = space();
			label2 = element("label");
			label2.textContent = "Input type date";
			t10 = space();
			zoo_input3 = element("zoo-input");
			input3 = element("input");
			t11 = space();
			label3 = element("label");
			label3.textContent = "Input type time";
			t13 = space();
			zoo_input4 = element("zoo-input");
			textarea = element("textarea");
			t14 = space();
			label4 = element("label");
			label4.textContent = "Textarea";
			t16 = space();
			zoo_select0 = element("zoo-select");
			select0 = element("select");
			option5 = element("option");
			option5.textContent = "Placeholder";
			option6 = element("option");
			option6.textContent = "1";
			option7 = element("option");
			option7.textContent = "2";
			option8 = element("option");
			option8.textContent = "3";
			t21 = space();
			label5 = element("label");
			label5.textContent = "Multiselect";
			t23 = space();
			zoo_select1 = element("zoo-select");
			select1 = element("select");
			option9 = element("option");
			option9.textContent = "Placeholder";
			option10 = element("option");
			option10.textContent = "1";
			option11 = element("option");
			option11.textContent = "2";
			option12 = element("option");
			option12.textContent = "3";
			t28 = space();
			label6 = element("label");
			label6.textContent = "Standard select";
			t30 = space();
			zoo_searchable_select0 = element("zoo-searchable-select");
			select2 = element("select");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t31 = space();
			zoo_searchable_select1 = element("zoo-searchable-select");
			select3 = element("select");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t32 = space();
			zoo_checkbox0 = element("zoo-checkbox");
			input4 = element("input");
			t33 = space();
			label7 = element("label");
			label7.textContent = "An example checkbox";
			t35 = space();
			zoo_checkbox1 = element("zoo-checkbox");
			input5 = element("input");
			t36 = space();
			label8 = element("label");
			label8.textContent = "Disabled checkbox";
			t38 = space();
			zoo_radio = element("zoo-radio");
			input6 = element("input");
			t39 = space();
			label9 = element("label");
			label9.textContent = "Email";
			t41 = space();
			input7 = element("input");
			t42 = space();
			label10 = element("label");
			label10.textContent = "Phone";
			t44 = space();
			input8 = element("input");
			t45 = space();
			label11 = element("label");
			label11.textContent = "Mail";
			this.c = noop;
			set_custom_element_data(app_context, "text", "Form elements");
			add_location(app_context, file$2, 1, 0, 49);
			attr_dev(input0, "id", "input-type-text");
			attr_dev(input0, "slot", "inputelement");
			attr_dev(input0, "type", "text");
			attr_dev(input0, "placeholder", "input");
			add_location(input0, file$2, 5, 2, 286);
			attr_dev(label0, "for", "input-type-text");
			attr_dev(label0, "slot", "inputlabel");
			add_location(label0, file$2, 6, 2, 371);
			set_custom_element_data(zoo_input0, "linktext", "Forgotten your password?");
			set_custom_element_data(zoo_input0, "linkhref", "https://google.com");
			set_custom_element_data(zoo_input0, "linktarget", "about:blank");
			set_custom_element_data(zoo_input0, "infotext", "Additional helpful information for our users");
			add_location(zoo_input0, file$2, 3, 1, 119);
			attr_dev(input1, "id", "input-type-number");
			attr_dev(input1, "slot", "inputelement");
			attr_dev(input1, "placeholder", "input");
			attr_dev(input1, "list", "animals");
			add_location(input1, file$2, 11, 2, 701);
			attr_dev(label1, "for", "input-type-number");
			attr_dev(label1, "slot", "inputlabel");
			add_location(label1, file$2, 12, 2, 790);
			set_custom_element_data(zoo_input1, "linktext", "Learn your HTML and don't overcomplicate");
			set_custom_element_data(zoo_input1, "linktarget", "about:blank");
			set_custom_element_data(zoo_input1, "linkhref", "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist");
			set_custom_element_data(zoo_input1, "infotext", "Possible values: Dog, Cat, Small Pet, Bird, Aquatic");
			add_location(zoo_input1, file$2, 8, 1, 457);
			option0.__value = "Dog";
			option0.value = option0.__value;
			add_location(option0, file$2, 15, 2, 901);
			option1.__value = "Cat";
			option1.value = option1.__value;
			add_location(option1, file$2, 16, 2, 924);
			option2.__value = "Small Pet";
			option2.value = option2.__value;
			add_location(option2, file$2, 17, 2, 947);
			option3.__value = "Bird";
			option3.value = option3.__value;
			add_location(option3, file$2, 18, 2, 976);
			option4.__value = "Aquatic";
			option4.value = option4.__value;
			add_location(option4, file$2, 19, 2, 1000);
			attr_dev(datalist, "id", "animals");
			add_location(datalist, file$2, 14, 1, 875);
			attr_dev(input2, "id", "input-type-date");
			attr_dev(input2, "slot", "inputelement");
			attr_dev(input2, "type", "date");
			attr_dev(input2, "placeholder", "Enter date");
			add_location(input2, file$2, 23, 2, 1259);
			attr_dev(label2, "for", "input-type-date");
			attr_dev(label2, "slot", "inputlabel");
			add_location(label2, file$2, 24, 2, 1349);
			set_custom_element_data(zoo_input2, "linktext", "Native date picker polyfill on Github");
			set_custom_element_data(zoo_input2, "linkhref", "https://github.com/jcgertig/date-input-polyfill");
			set_custom_element_data(zoo_input2, "linktarget", "about:blank");
			set_custom_element_data(zoo_input2, "infotext", "Click on input to show context menu with date selection");
			add_location(zoo_input2, file$2, 21, 1, 1039);
			attr_dev(input3, "id", "input-type-time");
			attr_dev(input3, "slot", "inputelement");
			attr_dev(input3, "type", "time");
			attr_dev(input3, "placeholder", "Enter time");
			add_location(input3, file$2, 27, 2, 1472);
			attr_dev(label3, "for", "input-type-time");
			attr_dev(label3, "slot", "inputlabel");
			add_location(label3, file$2, 28, 2, 1562);
			set_custom_element_data(zoo_input3, "infotext", "Select time");
			add_location(zoo_input3, file$2, 26, 1, 1435);
			attr_dev(textarea, "id", "textarea");
			attr_dev(textarea, "slot", "inputelement");
			attr_dev(textarea, "placeholder", "Textarea");
			add_location(textarea, file$2, 31, 2, 1662);
			attr_dev(label4, "for", "textarea");
			attr_dev(label4, "slot", "inputlabel");
			add_location(label4, file$2, 32, 2, 1743);
			add_location(zoo_input4, file$2, 30, 1, 1648);
			attr_dev(option5, "class", "placeholder");
			option5.__value = "";
			option5.value = option5.__value;
			option5.disabled = true;
			option5.selected = true;
			add_location(option5, file$2, 36, 3, 2030);
			option6.__value = "1";
			option6.value = option6.__value;
			add_location(option6, file$2, 37, 3, 2109);
			option7.__value = "2";
			option7.value = option7.__value;
			add_location(option7, file$2, 38, 3, 2131);
			option8.__value = "3";
			option8.value = option8.__value;
			add_location(option8, file$2, 39, 3, 2153);
			attr_dev(select0, "id", "multiselect");
			attr_dev(select0, "slot", "selectelement");
			select0.multiple = true;
			add_location(select0, file$2, 35, 2, 1971);
			attr_dev(label5, "for", "multiselect");
			attr_dev(label5, "slot", "selectlabel");
			add_location(label5, file$2, 41, 2, 2186);
			set_custom_element_data(zoo_select0, "linktext", "Documentation link");
			set_custom_element_data(zoo_select0, "linkhref", "https://google.com");
			set_custom_element_data(zoo_select0, "linktarget", "about:blank");
			set_custom_element_data(zoo_select0, "infotext", "Additional helpful information for our users");
			add_location(zoo_select0, file$2, 34, 1, 1815);
			attr_dev(option9, "class", "placeholder");
			option9.__value = "";
			option9.value = option9.__value;
			option9.disabled = true;
			option9.selected = true;
			add_location(option9, file$2, 45, 3, 2391);
			option10.__value = "1";
			option10.value = option10.__value;
			add_location(option10, file$2, 46, 3, 2470);
			option11.__value = "2";
			option11.value = option11.__value;
			add_location(option11, file$2, 47, 3, 2492);
			option12.__value = "3";
			option12.value = option12.__value;
			add_location(option12, file$2, 48, 3, 2514);
			attr_dev(select1, "id", "standard-select");
			attr_dev(select1, "slot", "selectelement");
			add_location(select1, file$2, 44, 2, 2337);
			attr_dev(label6, "for", "standard-select");
			attr_dev(label6, "slot", "selectlabel");
			add_location(label6, file$2, 50, 2, 2547);
			set_custom_element_data(zoo_select1, "infotext", "Additional helpful information for our users");
			add_location(zoo_select1, file$2, 43, 1, 2266);
			select2.multiple = true;
			attr_dev(select2, "slot", "selectelement");
			add_location(select2, file$2, 53, 2, 2804);
			set_custom_element_data(zoo_searchable_select0, "labeltext", "Searchable multiple select");
			set_custom_element_data(zoo_searchable_select0, "placeholder", "Placeholder");
			set_custom_element_data(zoo_searchable_select0, "infotext", "Additional helpful information for our users which is a long text.");
			add_location(zoo_searchable_select0, file$2, 52, 1, 2635);
			attr_dev(select3, "slot", "selectelement");
			add_location(select3, file$2, 62, 2, 3130);
			set_custom_element_data(zoo_searchable_select1, "labeltext", "Searchable select");
			set_custom_element_data(zoo_searchable_select1, "placeholder", "Placeholder");
			set_custom_element_data(zoo_searchable_select1, "infotext", "Additional helpful information for our users.");
			add_location(zoo_searchable_select1, file$2, 61, 1, 2991);
			attr_dev(input4, "id", "checkbox");
			attr_dev(input4, "slot", "checkboxelement");
			attr_dev(input4, "type", "checkbox");
			add_location(input4, file$2, 71, 2, 3368);
			attr_dev(label7, "for", "checkbox");
			attr_dev(label7, "slot", "checkboxlabel");
			add_location(label7, file$2, 72, 2, 3432);
			set_custom_element_data(zoo_checkbox0, "highlighted", zoo_checkbox0_highlighted_value = true);
			set_custom_element_data(zoo_checkbox0, "inputerrormsg", "error");
			add_location(zoo_checkbox0, file$2, 70, 1, 3308);
			attr_dev(input5, "id", "disabled-checkbox");
			input5.disabled = true;
			attr_dev(input5, "slot", "checkboxelement");
			attr_dev(input5, "type", "checkbox");
			add_location(input5, file$2, 75, 2, 3559);
			attr_dev(label8, "for", "disabled-checkbox");
			attr_dev(label8, "slot", "checkboxlabel");
			add_location(label8, file$2, 76, 2, 3641);
			set_custom_element_data(zoo_checkbox1, "highlighted", zoo_checkbox1_highlighted_value = true);
			add_location(zoo_checkbox1, file$2, 74, 1, 3521);
			attr_dev(input6, "type", "radio");
			attr_dev(input6, "id", "contactChoice1");
			attr_dev(input6, "name", "contact");
			input6.value = "email";
			input6.disabled = true;
			add_location(input6, file$2, 79, 2, 3794);
			attr_dev(label9, "for", "contactChoice1");
			add_location(label9, file$2, 80, 2, 3875);
			attr_dev(input7, "type", "radio");
			attr_dev(input7, "id", "contactChoice2");
			attr_dev(input7, "name", "contact");
			input7.value = "phone";
			add_location(input7, file$2, 81, 2, 3919);
			attr_dev(label10, "for", "contactChoice2");
			add_location(label10, file$2, 82, 2, 3991);
			attr_dev(input8, "type", "radio");
			attr_dev(input8, "id", "contactChoice3");
			attr_dev(input8, "name", "contact");
			input8.value = "mail";
			add_location(input8, file$2, 83, 2, 4035);
			attr_dev(label11, "for", "contactChoice3");
			add_location(label11, file$2, 84, 2, 4106);
			set_custom_element_data(zoo_radio, "infotext", "infotext");
			set_custom_element_data(zoo_radio, "labeltext", "Label text");
			add_location(zoo_radio, file$2, 78, 1, 3737);
			attr_dev(form, "class", "form");
			add_location(form, file$2, 2, 0, 98);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, app_context, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, form, anchor);
			append_dev(form, zoo_input0);
			append_dev(zoo_input0, input0);
			append_dev(zoo_input0, t1);
			append_dev(zoo_input0, label0);
			append_dev(form, t3);
			append_dev(form, zoo_input1);
			append_dev(zoo_input1, input1);
			append_dev(zoo_input1, t4);
			append_dev(zoo_input1, label1);
			append_dev(form, t6);
			append_dev(form, datalist);
			append_dev(datalist, option0);
			append_dev(datalist, option1);
			append_dev(datalist, option2);
			append_dev(datalist, option3);
			append_dev(datalist, option4);
			append_dev(form, t7);
			append_dev(form, zoo_input2);
			append_dev(zoo_input2, input2);
			append_dev(zoo_input2, t8);
			append_dev(zoo_input2, label2);
			append_dev(form, t10);
			append_dev(form, zoo_input3);
			append_dev(zoo_input3, input3);
			append_dev(zoo_input3, t11);
			append_dev(zoo_input3, label3);
			append_dev(form, t13);
			append_dev(form, zoo_input4);
			append_dev(zoo_input4, textarea);
			append_dev(zoo_input4, t14);
			append_dev(zoo_input4, label4);
			append_dev(form, t16);
			append_dev(form, zoo_select0);
			append_dev(zoo_select0, select0);
			append_dev(select0, option5);
			append_dev(select0, option6);
			append_dev(select0, option7);
			append_dev(select0, option8);
			append_dev(zoo_select0, t21);
			append_dev(zoo_select0, label5);
			append_dev(form, t23);
			append_dev(form, zoo_select1);
			append_dev(zoo_select1, select1);
			append_dev(select1, option9);
			append_dev(select1, option10);
			append_dev(select1, option11);
			append_dev(select1, option12);
			append_dev(zoo_select1, t28);
			append_dev(zoo_select1, label6);
			append_dev(form, t30);
			append_dev(form, zoo_searchable_select0);
			append_dev(zoo_searchable_select0, select2);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(select2, null);
			}

			append_dev(form, t31);
			append_dev(form, zoo_searchable_select1);
			append_dev(zoo_searchable_select1, select3);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(select3, null);
			}

			append_dev(form, t32);
			append_dev(form, zoo_checkbox0);
			append_dev(zoo_checkbox0, input4);
			append_dev(zoo_checkbox0, t33);
			append_dev(zoo_checkbox0, label7);
			append_dev(form, t35);
			append_dev(form, zoo_checkbox1);
			append_dev(zoo_checkbox1, input5);
			append_dev(zoo_checkbox1, t36);
			append_dev(zoo_checkbox1, label8);
			append_dev(form, t38);
			append_dev(form, zoo_radio);
			append_dev(zoo_radio, input6);
			append_dev(zoo_radio, t39);
			append_dev(zoo_radio, label9);
			append_dev(zoo_radio, t41);
			append_dev(zoo_radio, input7);
			append_dev(zoo_radio, t42);
			append_dev(zoo_radio, label10);
			append_dev(zoo_radio, t44);
			append_dev(zoo_radio, input8);
			append_dev(zoo_radio, t45);
			append_dev(zoo_radio, label11);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*options*/ 1) {
				each_value_1 = /*options*/ ctx[0];
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

			if (dirty & /*options*/ 1) {
				each_value = /*options*/ ctx[0];
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
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(app_context);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(form);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
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

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<app-form> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("app-form", $$slots, []);
	$$self.$capture_state = () => ({ options });

	$$self.$inject_state = $$props => {
		if ("options" in $$props) $$invalidate(0, options = $$props.options);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [options];
}

class Form extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.form{flex:1 0 auto;margin:20px auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));grid-template-rows:120px 150px 150px 100px;grid-gap:20px}@media only screen and (max-width: 544px){.form{width:300px;grid-template-columns:auto}}@media only screen and (max-width: 812px){.form{grid-template-rows:120px 150px 120px 120px}}</style>`;
		init(this, { target: this.shadowRoot }, instance$2, create_fragment$2, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert_dev(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("app-form", Form);

/* src/sections/Buttons.svelte generated by Svelte v3.23.0 */

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
	let zoo_button4;
	let svg0;
	let g;
	let path0;
	let path1;
	let t11;
	let zoo_button5;
	let svg1;
	let path2;
	let t12;
	let zoo_modal;
	let div2;
	let zoo_feedback;
	let t13;
	let br0;
	let t14;
	let zoo_select;
	let select;
	let option0;
	let option1;
	let option2;
	let option3;
	let zoo_select_valid_value;
	let t19;
	let br1;
	let t20;
	let zoo_checkbox;
	let input;
	let t21;
	let br2;
	let t22;
	let zoo_button6;
	let span3;
	let mounted;
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
			zoo_button4 = element("zoo-button");
			svg0 = svg_element("svg");
			g = svg_element("g");
			path0 = svg_element("path");
			path1 = svg_element("path");
			t11 = space();
			zoo_button5 = element("zoo-button");
			svg1 = svg_element("svg");
			path2 = svg_element("path");
			t12 = space();
			zoo_modal = element("zoo-modal");
			div2 = element("div");
			zoo_feedback = element("zoo-feedback");
			t13 = space();
			br0 = element("br");
			t14 = space();
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
			t19 = space();
			br1 = element("br");
			t20 = space();
			zoo_checkbox = element("zoo-checkbox");
			input = element("input");
			t21 = space();
			br2 = element("br");
			t22 = space();
			zoo_button6 = element("zoo-button");
			span3 = element("span");
			span3.textContent = "Add to cart";
			this.c = noop;
			set_custom_element_data(zoo_toast0, "text", "Search for more than 8.000 products.");
			add_location(zoo_toast0, file$3, 1, 0, 52);
			set_custom_element_data(zoo_toast1, "text", "Added to cart!");
			add_location(zoo_toast1, file$3, 2, 0, 138);
			set_custom_element_data(app_context, "text", "Buttons, tooltips, modal windows");
			add_location(app_context, file$3, 3, 0, 207);
			attr_dev(span0, "slot", "buttoncontent");
			add_location(span0, file$3, 6, 2, 358);
			set_custom_element_data(zoo_button0, "size", "small");
			add_location(zoo_button0, file$3, 5, 1, 298);
			set_custom_element_data(zoo_tooltip, "position", "bottom");
			set_custom_element_data(zoo_tooltip, "text", "Just set disabled attribute on `zoo-button`");
			add_location(zoo_tooltip, file$3, 11, 3, 533);
			attr_dev(div0, "slot", "buttoncontent");
			add_location(div0, file$3, 9, 2, 488);
			set_custom_element_data(zoo_button1, "size", "small");
			set_custom_element_data(zoo_button1, "disabled", zoo_button1_disabled_value = true);
			set_custom_element_data(zoo_button1, "class", "top-tooltip");
			add_location(zoo_button1, file$3, 8, 1, 422);
			attr_dev(span1, "slot", "buttoncontent");
			add_location(span1, file$3, 15, 2, 737);
			set_custom_element_data(zoo_button2, "type", "secondary");
			set_custom_element_data(zoo_button2, "size", "small");
			add_location(zoo_button2, file$3, 14, 1, 655);
			attr_dev(span2, "slot", "buttoncontent");
			add_location(span2, file$3, 18, 2, 840);
			set_custom_element_data(zoo_button3, "type", "hollow");
			set_custom_element_data(zoo_button3, "size", "small");
			add_location(zoo_button3, file$3, 17, 1, 798);
			attr_dev(path0, "d", "M9 14.998a3 3 0 010 6v2.252a.75.75 0 11-1.5 0v-7.434a.75.75 0 01.747-.818h.753zm3.875-15c.597 0 1.17.238 1.591.66l5.871 5.87c.422.423.66.995.659 1.592v4.628a.75.75 0 11-1.5 0V8.12a.75.75 0 00-.22-.53l-5.87-5.872a.75.75 0 00-.531-.22H2.246a.75.75 0 00-.75.75v19.5c0 .414.336.75.75.75h3a.75.75 0 110 1.5h-3a2.25 2.25 0 01-2.25-2.25v-19.5a2.25 2.25 0 012.25-2.25h10.63zm10.371 15a.75.75 0 010 1.5h-1.5a.75.75 0 00-.75.75v2.251l1.504.001a.75.75 0 110 1.5l-1.504-.001v2.249a.75.75 0 11-1.5 0v-6a2.25 2.25 0 012.25-2.25h1.5zm-9 0a3.75 3.75 0 013.75 3.75v1.5a3.75 3.75 0 01-3.75 3.75.75.75 0 01-.75-.75v-7.5a.75.75 0 01.75-.75zm.75 1.628v5.744a2.25 2.25 0 001.5-2.122v-1.5a2.25 2.25 0 00-1.5-2.122zM9 16.498v3a1.5 1.5 0 000-3z");
			add_location(path0, file$3, 21, 159, 1123);
			attr_dev(path1, "d", "M20.246 7.498a.75.75 0 110 1.5h-6a2.25 2.25 0 01-2.25-2.25v-6a.75.75 0 011.5 0v6c0 .414.336.75.75.75h6z");
			add_location(path1, file$3, 21, 890, 1854);
			attr_dev(g, "fill", "#555");
			attr_dev(g, "fill-rule", "evenodd");
			add_location(g, file$3, 21, 124, 1088);
			attr_dev(svg0, "title", "Example title");
			attr_dev(svg0, "class", "btn-svg");
			attr_dev(svg0, "slot", "buttoncontent");
			attr_dev(svg0, "width", "24");
			attr_dev(svg0, "height", "24");
			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
			add_location(svg0, file$3, 21, 2, 966);
			set_custom_element_data(zoo_button4, "size", "small");
			set_custom_element_data(zoo_button4, "class", "icon-btn");
			add_location(zoo_button4, file$3, 20, 1, 921);
			attr_dev(path2, "d", "M12 4.324l1.036-1.035a6.423 6.423 0 019.094 9.071l-9.589 10.003a.75.75 0 01-1.082 0l-9.577-9.988A6.422 6.422 0 015.394 1.49a6.423 6.423 0 015.57 1.798L12 4.324z");
			attr_dev(path2, "fill", "#555");
			attr_dev(path2, "fill-rule", "evenodd");
			add_location(path2, file$3, 24, 124, 2180);
			attr_dev(svg1, "title", "Example title");
			attr_dev(svg1, "class", "btn-svg");
			attr_dev(svg1, "slot", "buttoncontent");
			attr_dev(svg1, "width", "24");
			attr_dev(svg1, "height", "24");
			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
			add_location(svg1, file$3, 24, 2, 2058);
			set_custom_element_data(zoo_button5, "type", "secondary");
			set_custom_element_data(zoo_button5, "size", "small");
			set_custom_element_data(zoo_button5, "class", "icon-btn");
			add_location(zoo_button5, file$3, 23, 1, 1996);
			attr_dev(div1, "class", "buttons");
			add_location(div1, file$3, 4, 0, 275);
			set_custom_element_data(zoo_feedback, "type", "info");
			set_custom_element_data(zoo_feedback, "text", "This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered.");
			add_location(zoo_feedback, file$3, 29, 2, 2524);
			add_location(br0, file$3, 33, 2, 2706);
			attr_dev(option0, "class", "placeholder");
			option0.__value = "";
			option0.value = option0.__value;
			option0.disabled = true;
			option0.selected = true;
			add_location(option0, file$3, 37, 4, 2814);
			option1.__value = "Doge";
			option1.value = option1.__value;
			add_location(option1, file$3, 38, 4, 2887);
			option2.__value = "Catz";
			option2.value = option2.__value;
			add_location(option2, file$3, 39, 4, 2913);
			option3.__value = "Snek";
			option3.value = option3.__value;
			add_location(option3, file$3, 40, 4, 2939);
			attr_dev(select, "slot", "selectelement");
			add_location(select, file$3, 36, 3, 2780);
			set_custom_element_data(zoo_select, "labeltext", "This product is for");
			set_custom_element_data(zoo_select, "valid", zoo_select_valid_value = true);
			add_location(zoo_select, file$3, 34, 2, 2713);
			add_location(br1, file$3, 43, 2, 2992);
			attr_dev(input, "slot", "checkboxelement");
			attr_dev(input, "type", "checkbox");
			add_location(input, file$3, 46, 3, 3111);
			set_custom_element_data(zoo_checkbox, "highlighted", "");
			set_custom_element_data(zoo_checkbox, "labeltext", "I understand and confirm that ALL of the above statements are true");
			add_location(zoo_checkbox, file$3, 44, 2, 2999);
			add_location(br2, file$3, 48, 2, 3179);
			attr_dev(span3, "slot", "buttoncontent");
			add_location(span3, file$3, 50, 3, 3285);
			set_style(zoo_button6, "margin", "0 auto");
			set_custom_element_data(zoo_button6, "type", "hollow");
			set_custom_element_data(zoo_button6, "size", "medium");
			add_location(zoo_button6, file$3, 49, 2, 3186);
			add_location(div2, file$3, 28, 1, 2516);
			set_style(zoo_modal, "display", "none");
			set_custom_element_data(zoo_modal, "headertext", "Your basket contains licensed items");
			add_location(zoo_modal, file$3, 27, 0, 2414);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
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
			append_dev(div1, t10);
			append_dev(div1, zoo_button4);
			append_dev(zoo_button4, svg0);
			append_dev(svg0, g);
			append_dev(g, path0);
			append_dev(g, path1);
			append_dev(div1, t11);
			append_dev(div1, zoo_button5);
			append_dev(zoo_button5, svg1);
			append_dev(svg1, path2);
			insert_dev(target, t12, anchor);
			insert_dev(target, zoo_modal, anchor);
			append_dev(zoo_modal, div2);
			append_dev(div2, zoo_feedback);
			append_dev(div2, t13);
			append_dev(div2, br0);
			append_dev(div2, t14);
			append_dev(div2, zoo_select);
			append_dev(zoo_select, select);
			append_dev(select, option0);
			append_dev(select, option1);
			append_dev(select, option2);
			append_dev(select, option3);
			append_dev(div2, t19);
			append_dev(div2, br1);
			append_dev(div2, t20);
			append_dev(div2, zoo_checkbox);
			append_dev(zoo_checkbox, input);
			append_dev(div2, t21);
			append_dev(div2, br2);
			append_dev(div2, t22);
			append_dev(div2, zoo_button6);
			append_dev(zoo_button6, span3);
			/*zoo_modal_binding*/ ctx[10](zoo_modal);

			if (!mounted) {
				dispose = [
					listen_dev(zoo_button0, "click", /*click_handler*/ ctx[7], false, false, false),
					listen_dev(zoo_button2, "click", /*click_handler_1*/ ctx[8], false, false, false),
					listen_dev(zoo_button6, "click", /*click_handler_2*/ ctx[9], false, false, false)
				];

				mounted = true;
			}
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
			if (detaching) detach_dev(t12);
			if (detaching) detach_dev(zoo_modal);
			/*zoo_modal_binding*/ ctx[10](null);
			mounted = false;
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
		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.buttons{max-width:1280px;margin:20px auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));grid-gap:15px;width:90%;justify-content:center}@media only screen and (max-width: 850px){.buttons{grid-template-columns:auto}}zoo-tooltip{display:none}.top-tooltip{position:relative;display:inline-block}.top-tooltip:hover zoo-tooltip{display:block;animation:fadeTooltipIn 0.2s}.icon-btn{width:40px}.btn-svg{padding:0}.btn-svg path{fill:white}</style>`;
		init(this, { target: this.shadowRoot }, instance$3, create_fragment$3, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert_dev(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("app-buttons", Buttons);

/* src/sections/Grids.svelte generated by Svelte v3.23.0 */

const { Object: Object_1 } = globals;
const file$4 = "src/sections/Grids.svelte";

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[17] = list[i];
	child_ctx[19] = i;
	return child_ctx;
}

function get_each_context_1$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[20] = list[i];
	child_ctx[22] = i;
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[23] = list[i];
	child_ctx[22] = i;
	return child_ctx;
}

function get_each_context_3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[17] = list[i];
	child_ctx[19] = i;
	return child_ctx;
}

function get_each_context_5(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[27] = list[i];
	return child_ctx;
}

function get_each_context_4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[20] = list[i];
	child_ctx[22] = i;
	return child_ctx;
}

function get_each_context_6(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[23] = list[i];
	child_ctx[19] = i;
	return child_ctx;
}

// (10:2) {#each headers as header, idx}
function create_each_block_6(ctx) {
	let zoo_grid_header;
	let t_value = /*header*/ ctx[23].title + "";
	let t;
	let zoo_grid_header_sortable_value;
	let zoo_grid_header_sortableproperty_value;

	const block = {
		c: function create() {
			zoo_grid_header = element("zoo-grid-header");
			t = text(t_value);
			set_custom_element_data(zoo_grid_header, "class", "header-cell");
			set_custom_element_data(zoo_grid_header, "slot", "headercell");
			set_custom_element_data(zoo_grid_header, "sortable", zoo_grid_header_sortable_value = /*header*/ ctx[23].sortable);
			set_custom_element_data(zoo_grid_header, "sortableproperty", zoo_grid_header_sortableproperty_value = /*header*/ ctx[23].sortProperty);
			add_location(zoo_grid_header, file$4, 10, 3, 487);
		},
		m: function mount(target, anchor) {
			insert_dev(target, zoo_grid_header, anchor);
			append_dev(zoo_grid_header, t);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(zoo_grid_header);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_6.name,
		type: "each",
		source: "(10:2) {#each headers as header, idx}",
		ctx
	});

	return block;
}

// (22:6) {#each statuses as status}
function create_each_block_5(ctx) {
	let option;
	let t_value = /*status*/ ctx[27] + "";
	let t;
	let option_selected_value;
	let option_value_value;

	const block = {
		c: function create() {
			option = element("option");
			t = text(t_value);
			option.selected = option_selected_value = /*status*/ ctx[27] == /*row*/ ctx[20].status;
			option.__value = option_value_value = /*status*/ ctx[27];
			option.value = option.__value;
			add_location(option, file$4, 22, 7, 1254);
		},
		m: function mount(target, anchor) {
			insert_dev(target, option, anchor);
			append_dev(option, t);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(option);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_5.name,
		type: "each",
		source: "(22:6) {#each statuses as status}",
		ctx
	});

	return block;
}

// (13:2) {#each data as row, i}
function create_each_block_4(ctx) {
	let div5;
	let zoo_checkbox;
	let input0;
	let input0_id_value;
	let input0_disabled_value;
	let input0_checked_value;
	let t0;
	let label;
	let label_for_value;
	let t2;
	let div0;
	let t3_value = /*row*/ ctx[20].createdDate + "";
	let t3;
	let t4;
	let zoo_select;
	let select;
	let select_disabled_value;
	let t5;
	let div1;
	let t6_value = /*row*/ ctx[20].minWeight + "";
	let t6;
	let t7;
	let div2;
	let t8_value = /*row*/ ctx[20].maxWeight + "";
	let t8;
	let t9;
	let zoo_input;
	let input1;
	let input1_disabled_value;
	let input1_value_value;
	let t10;
	let div3;
	let t11_value = /*row*/ ctx[20].noOfPieces + "";
	let t11;
	let t12;
	let div4;
	let t13_value = /*row*/ ctx[20].price + "";
	let t13;
	let each_value_5 = /*statuses*/ ctx[3];
	validate_each_argument(each_value_5);
	let each_blocks = [];

	for (let i = 0; i < each_value_5.length; i += 1) {
		each_blocks[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
	}

	const block = {
		c: function create() {
			div5 = element("div");
			zoo_checkbox = element("zoo-checkbox");
			input0 = element("input");
			t0 = space();
			label = element("label");
			label.textContent = "Valid";
			t2 = space();
			div0 = element("div");
			t3 = text(t3_value);
			t4 = space();
			zoo_select = element("zoo-select");
			select = element("select");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t5 = space();
			div1 = element("div");
			t6 = text(t6_value);
			t7 = space();
			div2 = element("div");
			t8 = text(t8_value);
			t9 = space();
			zoo_input = element("zoo-input");
			input1 = element("input");
			t10 = space();
			div3 = element("div");
			t11 = text(t11_value);
			t12 = space();
			div4 = element("div");
			t13 = text(t13_value);
			attr_dev(input0, "id", input0_id_value = "" + (/*i*/ ctx[22] + "-first-grid-checkbox"));
			input0.disabled = input0_disabled_value = /*row*/ ctx[20].status != "DELIVERED" ? null : true;
			input0.checked = input0_checked_value = /*row*/ ctx[20].valid;
			attr_dev(input0, "slot", "checkboxelement");
			attr_dev(input0, "type", "checkbox");
			add_location(input0, file$4, 15, 5, 757);
			attr_dev(label, "for", label_for_value = "" + (/*i*/ ctx[22] + "-first-grid-checkbox"));
			attr_dev(label, "slot", "checkboxlabel");
			add_location(label, file$4, 16, 5, 914);
			add_location(zoo_checkbox, file$4, 14, 4, 737);
			add_location(div0, file$4, 18, 4, 1010);
			attr_dev(select, "title", "Delivery Status");
			select.disabled = select_disabled_value = /*row*/ ctx[20].status == "DELIVERED" ? true : null;
			attr_dev(select, "slot", "selectelement");
			attr_dev(select, "class", "item-per-page-selector");
			add_location(select, file$4, 20, 5, 1076);
			set_custom_element_data(zoo_select, "class", "status");
			add_location(zoo_select, file$4, 19, 4, 1043);
			add_location(div1, file$4, 26, 4, 1365);
			add_location(div2, file$4, 27, 4, 1396);
			attr_dev(input1, "title", "Delivery Date");
			input1.disabled = input1_disabled_value = /*row*/ ctx[20].status == "DELIVERED" ? true : null;
			input1.value = input1_value_value = /*row*/ ctx[20].deliveryDate;
			attr_dev(input1, "slot", "inputelement");
			attr_dev(input1, "type", "date");
			attr_dev(input1, "placeholder", "Enter date");
			add_location(input1, file$4, 29, 5, 1466);
			set_custom_element_data(zoo_input, "class", "delivery-date");
			add_location(zoo_input, file$4, 28, 4, 1427);
			add_location(div3, file$4, 31, 4, 1656);
			add_location(div4, file$4, 32, 4, 1688);
			attr_dev(div5, "class", "example-row limited-width");
			attr_dev(div5, "slot", "row");
			add_location(div5, file$4, 13, 3, 682);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div5, anchor);
			append_dev(div5, zoo_checkbox);
			append_dev(zoo_checkbox, input0);
			append_dev(zoo_checkbox, t0);
			append_dev(zoo_checkbox, label);
			append_dev(div5, t2);
			append_dev(div5, div0);
			append_dev(div0, t3);
			append_dev(div5, t4);
			append_dev(div5, zoo_select);
			append_dev(zoo_select, select);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(select, null);
			}

			append_dev(div5, t5);
			append_dev(div5, div1);
			append_dev(div1, t6);
			append_dev(div5, t7);
			append_dev(div5, div2);
			append_dev(div2, t8);
			append_dev(div5, t9);
			append_dev(div5, zoo_input);
			append_dev(zoo_input, input1);
			append_dev(div5, t10);
			append_dev(div5, div3);
			append_dev(div3, t11);
			append_dev(div5, t12);
			append_dev(div5, div4);
			append_dev(div4, t13);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*statuses, data*/ 40) {
				each_value_5 = /*statuses*/ ctx[3];
				validate_each_argument(each_value_5);
				let i;

				for (i = 0; i < each_value_5.length; i += 1) {
					const child_ctx = get_each_context_5(ctx, each_value_5, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_5(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(select, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_5.length;
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div5);
			destroy_each(each_blocks, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_4.name,
		type: "each",
		source: "(13:2) {#each data as row, i}",
		ctx
	});

	return block;
}

// (40:5) {#each possibleNumberOfItems as number, idx}
function create_each_block_3(ctx) {
	let option;
	let t_value = /*number*/ ctx[17] + "";
	let t;
	let option_selected_value;
	let option_value_value;

	const block = {
		c: function create() {
			option = element("option");
			t = text(t_value);
			option.selected = option_selected_value = /*idx*/ ctx[19] == 0;
			option.__value = option_value_value = /*number*/ ctx[17];
			option.value = option.__value;
			add_location(option, file$4, 40, 6, 1987);
		},
		m: function mount(target, anchor) {
			insert_dev(target, option, anchor);
			append_dev(option, t);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(option);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_3.name,
		type: "each",
		source: "(40:5) {#each possibleNumberOfItems as number, idx}",
		ctx
	});

	return block;
}

// (55:3) {#each extendedHeaders as header, i}
function create_each_block_2(ctx) {
	let zoo_grid_header;
	let t_value = /*header*/ ctx[23].title + "";
	let t;
	let zoo_grid_header_sortable_value;
	let zoo_grid_header_sortableproperty_value;

	const block = {
		c: function create() {
			zoo_grid_header = element("zoo-grid-header");
			t = text(t_value);
			set_custom_element_data(zoo_grid_header, "slot", "headercell");
			set_custom_element_data(zoo_grid_header, "sortable", zoo_grid_header_sortable_value = /*header*/ ctx[23].sortable ? "sortable" : null);
			set_custom_element_data(zoo_grid_header, "sortableproperty", zoo_grid_header_sortableproperty_value = /*header*/ ctx[23].sortProperty);
			add_location(zoo_grid_header, file$4, 55, 4, 2652);
		},
		m: function mount(target, anchor) {
			insert_dev(target, zoo_grid_header, anchor);
			append_dev(zoo_grid_header, t);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(zoo_grid_header);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_2.name,
		type: "each",
		source: "(55:3) {#each extendedHeaders as header, i}",
		ctx
	});

	return block;
}

// (59:3) {#each extendedData as row, i}
function create_each_block_1$1(ctx) {
	let div8;
	let zoo_checkbox0;
	let input0;
	let input0_id_value;
	let input0_disabled_value;
	let input0_checked_value;
	let t0;
	let label0;
	let label0_for_value;
	let t2;
	let div0;
	let t3_value = /*row*/ ctx[20].createdDate + "";
	let t3;
	let t4;
	let div1;
	let t5_value = /*row*/ ctx[20].status + "";
	let t5;
	let t6;
	let div2;
	let t7_value = /*row*/ ctx[20].minWeight + "";
	let t7;
	let t8;
	let div3;
	let t9_value = /*row*/ ctx[20].maxWeight + "";
	let t9;
	let t10;
	let div4;
	let t11_value = /*row*/ ctx[20].deliveryDate + "";
	let t11;
	let t12;
	let div5;
	let t13_value = /*row*/ ctx[20].noOfPieces + "";
	let t13;
	let t14;
	let div6;
	let t15_value = /*row*/ ctx[20].price + "";
	let t15;
	let t16;
	let div7;
	let t17_value = /*row*/ ctx[20].rating + "";
	let t17;
	let t18;
	let zoo_checkbox1;
	let input1;
	let input1_id_value;
	let input1_checked_value;
	let t19;
	let label1;
	let label1_for_value;

	const block = {
		c: function create() {
			div8 = element("div");
			zoo_checkbox0 = element("zoo-checkbox");
			input0 = element("input");
			t0 = space();
			label0 = element("label");
			label0.textContent = "Valid";
			t2 = space();
			div0 = element("div");
			t3 = text(t3_value);
			t4 = space();
			div1 = element("div");
			t5 = text(t5_value);
			t6 = space();
			div2 = element("div");
			t7 = text(t7_value);
			t8 = space();
			div3 = element("div");
			t9 = text(t9_value);
			t10 = space();
			div4 = element("div");
			t11 = text(t11_value);
			t12 = space();
			div5 = element("div");
			t13 = text(t13_value);
			t14 = space();
			div6 = element("div");
			t15 = text(t15_value);
			t16 = space();
			div7 = element("div");
			t17 = text(t17_value);
			t18 = space();
			zoo_checkbox1 = element("zoo-checkbox");
			input1 = element("input");
			t19 = space();
			label1 = element("label");
			label1.textContent = "Promotion";
			attr_dev(input0, "id", input0_id_value = "" + (/*i*/ ctx[22] + "-second-grid-checkbox"));
			input0.disabled = input0_disabled_value = /*row*/ ctx[20].status != "DELIVERED" ? null : true;
			input0.checked = input0_checked_value = /*row*/ ctx[20].valid;
			attr_dev(input0, "slot", "checkboxelement");
			attr_dev(input0, "type", "checkbox");
			add_location(input0, file$4, 61, 6, 2954);
			attr_dev(label0, "for", label0_for_value = "" + (/*i*/ ctx[22] + "-second-grid-checkbox"));
			attr_dev(label0, "slot", "checkboxlabel");
			add_location(label0, file$4, 62, 6, 3113);
			set_custom_element_data(zoo_checkbox0, "labeltext", "Valid");
			add_location(zoo_checkbox0, file$4, 60, 5, 2915);
			add_location(div0, file$4, 64, 5, 3212);
			add_location(div1, file$4, 65, 5, 3246);
			add_location(div2, file$4, 66, 5, 3275);
			add_location(div3, file$4, 67, 5, 3307);
			add_location(div4, file$4, 68, 5, 3339);
			add_location(div5, file$4, 69, 5, 3374);
			add_location(div6, file$4, 70, 5, 3407);
			add_location(div7, file$4, 71, 5, 3435);
			attr_dev(input1, "id", input1_id_value = "" + (/*i*/ ctx[22] + "-second-grid-promo-checkbox"));
			input1.checked = input1_checked_value = /*row*/ ctx[20].promotion;
			attr_dev(input1, "slot", "checkboxelement");
			attr_dev(input1, "type", "checkbox");
			add_location(input1, file$4, 73, 6, 3485);
			attr_dev(label1, "for", label1_for_value = "" + (/*i*/ ctx[22] + "-second-grid-promo-checkbox"));
			attr_dev(label1, "slot", "checkboxlabel");
			add_location(label1, file$4, 74, 6, 3601);
			add_location(zoo_checkbox1, file$4, 72, 5, 3464);
			attr_dev(div8, "class", "example-row limited-width");
			attr_dev(div8, "slot", "row");
			add_location(div8, file$4, 59, 4, 2859);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div8, anchor);
			append_dev(div8, zoo_checkbox0);
			append_dev(zoo_checkbox0, input0);
			append_dev(zoo_checkbox0, t0);
			append_dev(zoo_checkbox0, label0);
			append_dev(div8, t2);
			append_dev(div8, div0);
			append_dev(div0, t3);
			append_dev(div8, t4);
			append_dev(div8, div1);
			append_dev(div1, t5);
			append_dev(div8, t6);
			append_dev(div8, div2);
			append_dev(div2, t7);
			append_dev(div8, t8);
			append_dev(div8, div3);
			append_dev(div3, t9);
			append_dev(div8, t10);
			append_dev(div8, div4);
			append_dev(div4, t11);
			append_dev(div8, t12);
			append_dev(div8, div5);
			append_dev(div5, t13);
			append_dev(div8, t14);
			append_dev(div8, div6);
			append_dev(div6, t15);
			append_dev(div8, t16);
			append_dev(div8, div7);
			append_dev(div7, t17);
			append_dev(div8, t18);
			append_dev(div8, zoo_checkbox1);
			append_dev(zoo_checkbox1, input1);
			append_dev(zoo_checkbox1, t19);
			append_dev(zoo_checkbox1, label1);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div8);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_1$1.name,
		type: "each",
		source: "(59:3) {#each extendedData as row, i}",
		ctx
	});

	return block;
}

// (83:6) {#each possibleNumberOfItems as number, idx}
function create_each_block$2(ctx) {
	let option;
	let t_value = /*number*/ ctx[17] + "";
	let t;
	let option_selected_value;
	let option_value_value;

	const block = {
		c: function create() {
			option = element("option");
			t = text(t_value);
			option.selected = option_selected_value = /*idx*/ ctx[19] == 0;
			option.__value = option_value_value = /*number*/ ctx[17];
			option.value = option.__value;
			add_location(option, file$4, 83, 7, 3989);
		},
		m: function mount(target, anchor) {
			insert_dev(target, option, anchor);
			append_dev(option, t);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(option);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$2.name,
		type: "each",
		source: "(83:6) {#each possibleNumberOfItems as number, idx}",
		ctx
	});

	return block;
}

function create_fragment$4(ctx) {
	let app_context;
	let t0;
	let div4;
	let h30;
	let t2;
	let div1;
	let zoo_grid0;
	let t3;
	let t4;
	let div0;
	let zoo_select0;
	let select0;
	let t5;
	let label0;
	let t7;
	let h31;
	let t9;
	let div3;
	let zoo_grid1;
	let t10;
	let t11;
	let div2;
	let zoo_select1;
	let select1;
	let t12;
	let label1;
	let mounted;
	let dispose;
	let each_value_6 = /*headers*/ ctx[2];
	validate_each_argument(each_value_6);
	let each_blocks_5 = [];

	for (let i = 0; i < each_value_6.length; i += 1) {
		each_blocks_5[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
	}

	let each_value_4 = /*data*/ ctx[5];
	validate_each_argument(each_value_4);
	let each_blocks_4 = [];

	for (let i = 0; i < each_value_4.length; i += 1) {
		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
	}

	let each_value_3 = /*possibleNumberOfItems*/ ctx[1];
	validate_each_argument(each_value_3);
	let each_blocks_3 = [];

	for (let i = 0; i < each_value_3.length; i += 1) {
		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
	}

	let each_value_2 = /*extendedHeaders*/ ctx[4];
	validate_each_argument(each_value_2);
	let each_blocks_2 = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	let each_value_1 = /*extendedData*/ ctx[6];
	validate_each_argument(each_value_1);
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
	}

	let each_value = /*possibleNumberOfItems*/ ctx[1];
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
			h30 = element("h3");
			h30.textContent = "A grid with pagination, resizing, reorder and sorting.";
			t2 = space();
			div1 = element("div");
			zoo_grid0 = element("zoo-grid");

			for (let i = 0; i < each_blocks_5.length; i += 1) {
				each_blocks_5[i].c();
			}

			t3 = space();

			for (let i = 0; i < each_blocks_4.length; i += 1) {
				each_blocks_4[i].c();
			}

			t4 = space();
			div0 = element("div");
			zoo_select0 = element("zoo-select");
			select0 = element("select");

			for (let i = 0; i < each_blocks_3.length; i += 1) {
				each_blocks_3[i].c();
			}

			t5 = space();
			label0 = element("label");
			label0.textContent = "Page size";
			t7 = space();
			h31 = element("h3");
			h31.textContent = "Grid with sticky header and pagination. Grid height and width are limited on the client side.";
			t9 = space();
			div3 = element("div");
			zoo_grid1 = element("zoo-grid");

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].c();
			}

			t10 = space();

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t11 = space();
			div2 = element("div");
			zoo_select1 = element("zoo-select");
			select1 = element("select");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t12 = space();
			label1 = element("label");
			label1.textContent = "Page size";
			this.c = noop;
			set_custom_element_data(app_context, "text", "Data grids");
			add_location(app_context, file$4, 1, 0, 50);
			add_location(h30, file$4, 3, 1, 149);
			attr_dev(select0, "id", "first-grid-page-size");
			attr_dev(select0, "slot", "selectelement");
			attr_dev(select0, "class", "item-per-page-selector");
			add_location(select0, file$4, 38, 4, 1844);
			attr_dev(label0, "for", "first-grid-page-size");
			attr_dev(label0, "slot", "selectlabel");
			add_location(label0, file$4, 43, 4, 2066);
			set_custom_element_data(zoo_select0, "labelposition", "left");
			add_location(zoo_select0, file$4, 37, 3, 1805);
			attr_dev(div0, "class", "item-per-page-selector-holder");
			attr_dev(div0, "slot", "pagesizeselector");
			add_location(div0, file$4, 36, 2, 1734);
			set_custom_element_data(zoo_grid0, "class", "limited-width grid-1");
			set_custom_element_data(zoo_grid0, "stickyheader", "");
			set_custom_element_data(zoo_grid0, "currentpage", "5");
			set_custom_element_data(zoo_grid0, "maxpages", "20");
			set_custom_element_data(zoo_grid0, "resizable", "");
			set_custom_element_data(zoo_grid0, "reorderable", "");
			add_location(zoo_grid0, file$4, 6, 1, 242);
			attr_dev(div1, "class", "grid-holder");
			add_location(div1, file$4, 5, 1, 215);
			add_location(h31, file$4, 49, 1, 2186);
			attr_dev(select1, "id", "second-grid-page-size");
			attr_dev(select1, "slot", "selectelement");
			attr_dev(select1, "class", "item-per-page-selector");
			add_location(select1, file$4, 81, 5, 3843);
			attr_dev(label1, "for", "second-grid-page-size");
			attr_dev(label1, "slot", "selectlabel");
			add_location(label1, file$4, 86, 5, 4071);
			set_custom_element_data(zoo_select1, "labelposition", "left");
			add_location(zoo_select1, file$4, 80, 4, 3803);
			attr_dev(div2, "class", "item-per-page-selector-holder");
			attr_dev(div2, "slot", "pagesizeselector");
			add_location(div2, file$4, 79, 3, 3731);
			set_custom_element_data(zoo_grid1, "class", "limited-width grid-2");
			set_style(zoo_grid1, "min-width", "1024px");
			set_style(zoo_grid1, "margin", "0 auto");
			set_style(zoo_grid1, "display", "block");
			set_custom_element_data(zoo_grid1, "stickyheader", "");
			set_custom_element_data(zoo_grid1, "currentpage", "1");
			set_custom_element_data(zoo_grid1, "maxpages", "4");
			add_location(zoo_grid1, file$4, 52, 2, 2364);
			attr_dev(div3, "class", "grid-holder");
			set_style(div3, "max-width", "850px");
			set_style(div3, "max-height", "300px");
			add_location(div3, file$4, 51, 1, 2291);
			attr_dev(div4, "class", "grids-holder");
			add_location(div4, file$4, 2, 0, 96);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, app_context, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, div4, anchor);
			append_dev(div4, h30);
			append_dev(div4, t2);
			append_dev(div4, div1);
			append_dev(div1, zoo_grid0);

			for (let i = 0; i < each_blocks_5.length; i += 1) {
				each_blocks_5[i].m(zoo_grid0, null);
			}

			append_dev(zoo_grid0, t3);

			for (let i = 0; i < each_blocks_4.length; i += 1) {
				each_blocks_4[i].m(zoo_grid0, null);
			}

			append_dev(zoo_grid0, t4);
			append_dev(zoo_grid0, div0);
			append_dev(div0, zoo_select0);
			append_dev(zoo_select0, select0);

			for (let i = 0; i < each_blocks_3.length; i += 1) {
				each_blocks_3[i].m(select0, null);
			}

			append_dev(zoo_select0, t5);
			append_dev(zoo_select0, label0);
			append_dev(div4, t7);
			append_dev(div4, h31);
			append_dev(div4, t9);
			append_dev(div4, div3);
			append_dev(div3, zoo_grid1);

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].m(zoo_grid1, null);
			}

			append_dev(zoo_grid1, t10);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(zoo_grid1, null);
			}

			append_dev(zoo_grid1, t11);
			append_dev(zoo_grid1, div2);
			append_dev(div2, zoo_select1);
			append_dev(zoo_select1, select1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(select1, null);
			}

			append_dev(zoo_select1, t12);
			append_dev(zoo_select1, label1);
			/*div4_binding*/ ctx[16](div4);

			if (!mounted) {
				dispose = [
					listen_dev(zoo_grid0, "sortChange", /*sortChange_handler*/ ctx[12], false, false, false),
					listen_dev(zoo_grid0, "pageChange", /*pageChange_handler*/ ctx[13], false, false, false),
					listen_dev(zoo_grid1, "sortChange", /*sortChange_handler_1*/ ctx[14], false, false, false),
					listen_dev(zoo_grid1, "pageChange", /*pageChange_handler_1*/ ctx[15], false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*headers*/ 4) {
				each_value_6 = /*headers*/ ctx[2];
				validate_each_argument(each_value_6);
				let i;

				for (i = 0; i < each_value_6.length; i += 1) {
					const child_ctx = get_each_context_6(ctx, each_value_6, i);

					if (each_blocks_5[i]) {
						each_blocks_5[i].p(child_ctx, dirty);
					} else {
						each_blocks_5[i] = create_each_block_6(child_ctx);
						each_blocks_5[i].c();
						each_blocks_5[i].m(zoo_grid0, t3);
					}
				}

				for (; i < each_blocks_5.length; i += 1) {
					each_blocks_5[i].d(1);
				}

				each_blocks_5.length = each_value_6.length;
			}

			if (dirty & /*data, statuses*/ 40) {
				each_value_4 = /*data*/ ctx[5];
				validate_each_argument(each_value_4);
				let i;

				for (i = 0; i < each_value_4.length; i += 1) {
					const child_ctx = get_each_context_4(ctx, each_value_4, i);

					if (each_blocks_4[i]) {
						each_blocks_4[i].p(child_ctx, dirty);
					} else {
						each_blocks_4[i] = create_each_block_4(child_ctx);
						each_blocks_4[i].c();
						each_blocks_4[i].m(zoo_grid0, t4);
					}
				}

				for (; i < each_blocks_4.length; i += 1) {
					each_blocks_4[i].d(1);
				}

				each_blocks_4.length = each_value_4.length;
			}

			if (dirty & /*possibleNumberOfItems*/ 2) {
				each_value_3 = /*possibleNumberOfItems*/ ctx[1];
				validate_each_argument(each_value_3);
				let i;

				for (i = 0; i < each_value_3.length; i += 1) {
					const child_ctx = get_each_context_3(ctx, each_value_3, i);

					if (each_blocks_3[i]) {
						each_blocks_3[i].p(child_ctx, dirty);
					} else {
						each_blocks_3[i] = create_each_block_3(child_ctx);
						each_blocks_3[i].c();
						each_blocks_3[i].m(select0, null);
					}
				}

				for (; i < each_blocks_3.length; i += 1) {
					each_blocks_3[i].d(1);
				}

				each_blocks_3.length = each_value_3.length;
			}

			if (dirty & /*extendedHeaders*/ 16) {
				each_value_2 = /*extendedHeaders*/ ctx[4];
				validate_each_argument(each_value_2);
				let i;

				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks_2[i]) {
						each_blocks_2[i].p(child_ctx, dirty);
					} else {
						each_blocks_2[i] = create_each_block_2(child_ctx);
						each_blocks_2[i].c();
						each_blocks_2[i].m(zoo_grid1, t10);
					}
				}

				for (; i < each_blocks_2.length; i += 1) {
					each_blocks_2[i].d(1);
				}

				each_blocks_2.length = each_value_2.length;
			}

			if (dirty & /*extendedData*/ 64) {
				each_value_1 = /*extendedData*/ ctx[6];
				validate_each_argument(each_value_1);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1$1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(zoo_grid1, t11);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty & /*possibleNumberOfItems*/ 2) {
				each_value = /*possibleNumberOfItems*/ ctx[1];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$2(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(select1, null);
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
			destroy_each(each_blocks_5, detaching);
			destroy_each(each_blocks_4, detaching);
			destroy_each(each_blocks_3, detaching);
			destroy_each(each_blocks_2, detaching);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
			/*div4_binding*/ ctx[16](null);
			mounted = false;
			run_all(dispose);
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
	let toast;
	let possibleNumberOfItems = [5, 10, 25, 100];
	let gridHolder;
	let loading = false;

	let headers = [
		{ title: "Valid" },
		{
			title: "Created date",
			sortable: true,
			sortProperty: "createdDate"
		},
		{
			title: "Status",
			sortable: true,
			sortProperty: "status"
		},
		{ title: "Min weight" },
		{ title: "Max weight" },
		{
			title: "Delivery date",
			sortable: true,
			sortProperty: "deliveryDate"
		},
		{ title: "# of pieces" },
		{ title: "Price" }
	];

	let statuses = ["DELIVERED", "READY", "PACKING"];
	let extendedHeaders = [...headers, { title: "Rating" }, { title: "Promotion" }];
	let today = new Date().toISOString().substr(0, 10);

	let data = [
		{
			valid: true,
			createdDate: today,
			status: "READY",
			minWeight: "1 kg",
			maxWeight: "10 kg",
			deliveryDate: "",
			noOfPieces: 5,
			price: "12 EUR"
		},
		{
			valid: true,
			createdDate: today,
			status: "DELIVERED",
			minWeight: "1 kg",
			maxWeight: "10 kg",
			deliveryDate: today,
			noOfPieces: 5,
			price: "12 EUR"
		},
		{
			valid: true,
			createdDate: today,
			status: "READY",
			minWeight: "1 kg",
			maxWeight: "10 kg",
			deliveryDate: "",
			noOfPieces: 5,
			price: "12 EUR"
		},
		{
			valid: true,
			createdDate: today,
			status: "DELIVERED",
			minWeight: "1 kg",
			maxWeight: "10 kg",
			deliveryDate: today,
			noOfPieces: 5,
			price: "12 EUR"
		},
		{
			valid: true,
			createdDate: today,
			status: "READY",
			minWeight: "1 kg",
			maxWeight: "10 kg",
			deliveryDate: "",
			noOfPieces: 5,
			price: "12 EUR"
		}
	];

	let extendedData = [...data].map(el => Object.assign(el, { rating: 3, promotion: false }));

	const handleSortChange = sortState => {
		const toast = document.createElement("zoo-toast");

		toast.text = sortState
		? "Sort state was changed. Property: " + sortState.property + ", direction: " + sortState.direction
		: "Sort state was changed. Sort object is undefined.";

		gridHolder.appendChild(toast);
		toast.show();
	};

	const handlePageChange = page => {
		const toast = document.createElement("zoo-toast");
		toast.text = "Page was changed to: " + page.pageNumber;
		gridHolder.appendChild(toast);
		toast.show();
	};

	const writable_props = [];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<app-grids> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("app-grids", $$slots, []);
	const sortChange_handler = e => handleSortChange(e.detail);
	const pageChange_handler = e => handlePageChange(e.detail);
	const sortChange_handler_1 = e => handleSortChange(e.detail);
	const pageChange_handler_1 = e => handlePageChange(e.detail);

	function div4_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(0, gridHolder = $$value);
		});
	}

	$$self.$capture_state = () => ({
		toast,
		possibleNumberOfItems,
		gridHolder,
		loading,
		headers,
		statuses,
		extendedHeaders,
		today,
		data,
		extendedData,
		handleSortChange,
		handlePageChange
	});

	$$self.$inject_state = $$props => {
		if ("toast" in $$props) toast = $$props.toast;
		if ("possibleNumberOfItems" in $$props) $$invalidate(1, possibleNumberOfItems = $$props.possibleNumberOfItems);
		if ("gridHolder" in $$props) $$invalidate(0, gridHolder = $$props.gridHolder);
		if ("loading" in $$props) loading = $$props.loading;
		if ("headers" in $$props) $$invalidate(2, headers = $$props.headers);
		if ("statuses" in $$props) $$invalidate(3, statuses = $$props.statuses);
		if ("extendedHeaders" in $$props) $$invalidate(4, extendedHeaders = $$props.extendedHeaders);
		if ("today" in $$props) today = $$props.today;
		if ("data" in $$props) $$invalidate(5, data = $$props.data);
		if ("extendedData" in $$props) $$invalidate(6, extendedData = $$props.extendedData);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		gridHolder,
		possibleNumberOfItems,
		headers,
		statuses,
		extendedHeaders,
		data,
		extendedData,
		handleSortChange,
		handlePageChange,
		toast,
		loading,
		today,
		sortChange_handler,
		pageChange_handler,
		sortChange_handler_1,
		pageChange_handler_1,
		div4_binding
	];
}

class Grids extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:layout}h3{color:var(--primary-mid, #3C9700)}.grids-holder{display:flex;flex-direction:column;align-items:center}.grid-1{--grid-column-sizes:150px repeat(7, minmax(50px, 1fr)) !important}.grid-2{--grid-column-sizes:150px repeat(9, minmax(50px, 1fr)) !important}.grid-holder{max-width:1280px;overflow:auto;box-shadow:0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);width:95%}.status,.delivery-date{margin-right:10px}.limited-width{min-width:1024px}.example-row>div{word-break:break-word;flex-grow:1}.item-per-page-selector-holder{max-width:150px}.item-per-page-selector-holder .item-per-page-selector{border:1px solid #E6E6E6}.item-per-page-selector-holder .item-per-page-selector:focus{border:2px solid #555555}</style>`;
		init(this, { target: this.shadowRoot }, instance$4, create_fragment$4, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert_dev(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("app-grids", Grids);
