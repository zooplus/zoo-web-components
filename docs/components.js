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
function empty() {
    return text('');
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
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
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
function beforeUpdate(fn) {
    get_current_component().$$.before_update.push(fn);
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
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
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.3' }, detail)));
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
function prop_dev(node, property, value) {
    node[property] = value;
    dispatch_dev("SvelteDOMSetProperty", { node, property, value });
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

/* zoo-modules/header-module/Header.svelte generated by Svelte v3.22.3 */

const file = "zoo-modules/header-module/Header.svelte";

function create_fragment(ctx) {
	let header;
	let slot0;
	let t0;
	let slot1;
	let h2;
	let t1;
	let t2;
	let slot2;

	const block = {
		c: function create() {
			header = element("header");
			slot0 = element("slot");
			t0 = space();
			slot1 = element("slot");
			h2 = element("h2");
			t1 = text(/*headertext*/ ctx[0]);
			t2 = space();
			slot2 = element("slot");
			this.c = noop;
			attr_dev(slot0, "name", "img");
			add_location(slot0, file, 2, 1, 61);
			add_location(h2, file, 4, 2, 114);
			attr_dev(slot1, "name", "headertext");
			add_location(slot1, file, 3, 1, 87);
			add_location(slot2, file, 6, 1, 146);
			add_location(header, file, 1, 0, 51);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, header, anchor);
			append_dev(header, slot0);
			append_dev(header, t0);
			append_dev(header, slot1);
			append_dev(slot1, h2);
			append_dev(h2, t1);
			append_dev(header, t2);
			append_dev(header, slot2);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*headertext*/ 1) set_data_dev(t1, /*headertext*/ ctx[0]);
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(header);
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
	let { headertext = "" } = $$props;
	const writable_props = ["headertext"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-header> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-header", $$slots, []);

	$$self.$set = $$props => {
		if ("headertext" in $$props) $$invalidate(0, headertext = $$props.headertext);
	};

	$$self.$capture_state = () => ({ headertext });

	$$self.$inject_state = $$props => {
		if ("headertext" in $$props) $$invalidate(0, headertext = $$props.headertext);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [headertext];
}

class Header extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:style}header{display:flex;align-items:center;background:#FFFFFF;padding:0 25px;height:70px}::slotted(img){height:46px;display:inline-block;padding:5px 25px 5px 0;cursor:pointer}@media only screen and (max-width: 544px){::slotted(img){height:36px}}::slotted(*[slot="headertext"]),h2{display:inline-block;color:var(--primary-mid, #3C9700)}@media only screen and (max-width: 544px){::slotted(*[slot="headertext"]),h2{display:none}}</style>`;
		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, { headertext: 0 });

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
		return ["headertext"];
	}

	get headertext() {
		return this.$$.ctx[0];
	}

	set headertext(headertext) {
		this.$set({ headertext });
		flush();
	}
}

customElements.define("zoo-header", Header);

/* zoo-modules/modal-module/Modal.svelte generated by Svelte v3.22.3 */
const file$1 = "zoo-modules/modal-module/Modal.svelte";

function create_fragment$1(ctx) {
	let div4;
	let div3;
	let div1;
	let span;
	let t0;
	let t1;
	let div0;
	let svg;
	let path;
	let t2;
	let div2;
	let slot;
	let div4_class_value;
	let dispose;

	const block = {
		c: function create() {
			div4 = element("div");
			div3 = element("div");
			div1 = element("div");
			span = element("span");
			t0 = text(/*headertext*/ ctx[0]);
			t1 = space();
			div0 = element("div");
			svg = svg_element("svg");
			path = svg_element("path");
			t2 = space();
			div2 = element("div");
			slot = element("slot");
			this.c = noop;
			attr_dev(span, "class", "header-text");
			add_location(span, file$1, 4, 3, 175);
			attr_dev(path, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
			add_location(path, file$1, 6, 52, 331);
			attr_dev(svg, "width", "24");
			attr_dev(svg, "height", "24");
			attr_dev(svg, "viewBox", "0 0 24 24");
			add_location(svg, file$1, 6, 4, 283);
			attr_dev(div0, "class", "close");
			add_location(div0, file$1, 5, 3, 224);
			attr_dev(div1, "class", "heading");
			add_location(div1, file$1, 3, 2, 150);
			add_location(slot, file$1, 10, 3, 447);
			attr_dev(div2, "class", "content");
			add_location(div2, file$1, 9, 2, 422);
			attr_dev(div3, "class", "dialog-content");
			add_location(div3, file$1, 2, 1, 119);
			attr_dev(div4, "class", div4_class_value = "box " + (/*hidden*/ ctx[3] ? "hide" : "show"));
			add_location(div4, file$1, 1, 0, 50);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, div4, anchor);
			append_dev(div4, div3);
			append_dev(div3, div1);
			append_dev(div1, span);
			append_dev(span, t0);
			append_dev(div1, t1);
			append_dev(div1, div0);
			append_dev(div0, svg);
			append_dev(svg, path);
			append_dev(div3, t2);
			append_dev(div3, div2);
			append_dev(div2, slot);
			/*div4_binding*/ ctx[8](div4);
			if (remount) dispose();
			dispose = listen_dev(div0, "click", /*click_handler*/ ctx[7], false, false, false);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*headertext*/ 1) set_data_dev(t0, /*headertext*/ ctx[0]);

			if (dirty & /*hidden*/ 8 && div4_class_value !== (div4_class_value = "box " + (/*hidden*/ ctx[3] ? "hide" : "show"))) {
				attr_dev(div4, "class", div4_class_value);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div4);
			/*div4_binding*/ ctx[8](null);
			dispose();
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
	let { headertext = "" } = $$props;
	let _modalRoot;
	let host;
	let hidden = false;
	let timeoutVar;

	onMount(() => {
		host = _modalRoot.getRootNode().host;

		_modalRoot.addEventListener("click", event => {
			if (event.target == _modalRoot) {
				closeModal();
			}
		});
	});

	const openModal = () => {
		host.style.display = "block";
	};

	const closeModal = () => {
		if (timeoutVar) return;
		$$invalidate(3, hidden = !hidden);

		timeoutVar = setTimeout(
			() => {
				host.style.display = "none";
				host.dispatchEvent(new Event("modalClosed"));
				$$invalidate(3, hidden = !hidden);
				timeoutVar = undefined;
			},
			300
		);
	};

	const writable_props = ["headertext"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-modal> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-modal", $$slots, []);
	const click_handler = event => closeModal();

	function div4_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(2, _modalRoot = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("headertext" in $$props) $$invalidate(0, headertext = $$props.headertext);
	};

	$$self.$capture_state = () => ({
		onMount,
		headertext,
		_modalRoot,
		host,
		hidden,
		timeoutVar,
		openModal,
		closeModal
	});

	$$self.$inject_state = $$props => {
		if ("headertext" in $$props) $$invalidate(0, headertext = $$props.headertext);
		if ("_modalRoot" in $$props) $$invalidate(2, _modalRoot = $$props._modalRoot);
		if ("host" in $$props) host = $$props.host;
		if ("hidden" in $$props) $$invalidate(3, hidden = $$props.hidden);
		if ("timeoutVar" in $$props) timeoutVar = $$props.timeoutVar;
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		headertext,
		closeModal,
		_modalRoot,
		hidden,
		openModal,
		host,
		timeoutVar,
		click_handler,
		div4_binding
	];
}

class Modal extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:none;contain:style}.box{position:fixed;width:100%;height:100%;background:rgba(0, 0, 0, 0.8);opacity:0;transition:opacity 0.3s;z-index:9999;left:0;top:0;display:flex;justify-content:center;align-items:center;will-change:opacity;transform:translateZ(0)}.dialog-content{padding:0 20px 20px 20px;box-sizing:border-box;background:white;overflow-y:auto;max-height:95%;border-radius:5px}@media only screen and (max-width: 544px){.dialog-content{padding:25px}}@media only screen and (max-width: 375px){.dialog-content{width:100%;height:100%;top:0;left:0;transform:none}}.heading{display:flex;flex-direction:row;align-items:flex-start}.heading .header-text{font-size:24px;line-height:29px;font-weight:bold;margin:30px 0}.heading .close{cursor:pointer;margin:30px 0 30px auto}.heading .close path{fill:var(--primary-mid, #3C9700)}.show{opacity:1}.dialog-content{animation-name:anim-show;animation-duration:0.3s;animation-fill-mode:forwards}.hide .dialog-content{animation-name:anim-hide}@keyframes anim-show{0%{opacity:0;transform:scale3d(0.9, 0.9, 1)}100%{opacity:1;transform:scale3d(1, 1, 1)}}@keyframes anim-hide{0%{opacity:1}100%{opacity:0;transform:scale3d(0.9, 0.9, 1)}}</style>`;

		init(this, { target: this.shadowRoot }, instance$1, create_fragment$1, safe_not_equal, {
			headertext: 0,
			openModal: 4,
			closeModal: 1
		});

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
		return ["headertext", "openModal", "closeModal"];
	}

	get headertext() {
		return this.$$.ctx[0];
	}

	set headertext(headertext) {
		this.$set({ headertext });
		flush();
	}

	get openModal() {
		return this.$$.ctx[4];
	}

	set openModal(value) {
		throw new Error("<zoo-modal>: Cannot set read-only property 'openModal'");
	}

	get closeModal() {
		return this.$$.ctx[1];
	}

	set closeModal(value) {
		throw new Error("<zoo-modal>: Cannot set read-only property 'closeModal'");
	}
}

customElements.define("zoo-modal", Modal);

/* zoo-modules/footer-module/Footer.svelte generated by Svelte v3.22.3 */

const file$2 = "zoo-modules/footer-module/Footer.svelte";

// (5:0) {#if copyright}
function create_if_block(ctx) {
	let div;
	let t0;
	let t1;
	let t2;
	let t3;

	const block = {
		c: function create() {
			div = element("div");
			t0 = text("© ");
			t1 = text(/*copyright*/ ctx[0]);
			t2 = space();
			t3 = text(/*currentYear*/ ctx[1]);
			attr_dev(div, "class", "footer-copyright");
			add_location(div, file$2, 5, 1, 96);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, t0);
			append_dev(div, t1);
			append_dev(div, t2);
			append_dev(div, t3);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*copyright*/ 1) set_data_dev(t1, /*copyright*/ ctx[0]);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(5:0) {#if copyright}",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let nav;
	let slot;
	let t;
	let if_block_anchor;
	let if_block = /*copyright*/ ctx[0] && create_if_block(ctx);

	const block = {
		c: function create() {
			nav = element("nav");
			slot = element("slot");
			t = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			this.c = noop;
			add_location(slot, file$2, 2, 1, 58);
			add_location(nav, file$2, 1, 0, 51);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, nav, anchor);
			append_dev(nav, slot);
			insert_dev(target, t, anchor);
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
		},
		p: function update(ctx, [dirty]) {
			if (/*copyright*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(nav);
			if (detaching) detach_dev(t);
			if (if_block) if_block.d(detaching);
			if (detaching) detach_dev(if_block_anchor);
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
	let { copyright = "" } = $$props;
	let currentYear = new Date().getFullYear();
	const writable_props = ["copyright"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-footer> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-footer", $$slots, []);

	$$self.$set = $$props => {
		if ("copyright" in $$props) $$invalidate(0, copyright = $$props.copyright);
	};

	$$self.$capture_state = () => ({ copyright, currentYear });

	$$self.$inject_state = $$props => {
		if ("copyright" in $$props) $$invalidate(0, copyright = $$props.copyright);
		if ("currentYear" in $$props) $$invalidate(1, currentYear = $$props.currentYear);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [copyright, currentYear];
}

class Footer extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:style}nav{display:flex;background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));justify-content:center;padding:10px 30px;flex-wrap:wrap}.footer-copyright{font-size:12px;line-height:14px;text-align:left;background:#FFFFFF;color:#555555;padding:10px 0 10px 30px}@media only screen and (max-width: 544px){.footer-copyright{text-align:center;padding:10px 0}}</style>`;
		init(this, { target: this.shadowRoot }, instance$2, create_fragment$2, safe_not_equal, { copyright: 0 });

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
		return ["copyright"];
	}

	get copyright() {
		return this.$$.ctx[0];
	}

	set copyright(copyright) {
		this.$set({ copyright });
		flush();
	}
}

customElements.define("zoo-footer", Footer);

/* zoo-modules/input-module/Input.svelte generated by Svelte v3.22.3 */

const file$3 = "zoo-modules/input-module/Input.svelte";

// (6:1) {#if linktext}
function create_if_block$1(ctx) {
	let a;
	let t;

	const block = {
		c: function create() {
			a = element("a");
			t = text(/*linktext*/ ctx[2]);
			attr_dev(a, "class", "input-link");
			attr_dev(a, "href", /*linkhref*/ ctx[3]);
			attr_dev(a, "target", /*linktarget*/ ctx[4]);
			add_location(a, file$3, 5, 15, 236);
		},
		m: function mount(target, anchor) {
			insert_dev(target, a, anchor);
			append_dev(a, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*linktext*/ 4) set_data_dev(t, /*linktext*/ ctx[2]);

			if (dirty & /*linkhref*/ 8) {
				attr_dev(a, "href", /*linkhref*/ ctx[3]);
			}

			if (dirty & /*linktarget*/ 16) {
				attr_dev(a, "target", /*linktarget*/ ctx[4]);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(a);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$1.name,
		type: "if",
		source: "(6:1) {#if linktext}",
		ctx
	});

	return block;
}

function create_fragment$3(ctx) {
	let div;
	let slot0;
	let zoo_input_label;
	let t0;
	let t1;
	let span;
	let slot1;
	let t2;
	let svg;
	let path;
	let span_class_value;
	let t3;
	let zoo_input_info;
	let div_class_value;
	let if_block = /*linktext*/ ctx[2] && create_if_block$1(ctx);

	const block = {
		c: function create() {
			div = element("div");
			slot0 = element("slot");
			zoo_input_label = element("zoo-input-label");
			t0 = space();
			if (if_block) if_block.c();
			t1 = space();
			span = element("span");
			slot1 = element("slot");
			t2 = space();
			svg = svg_element("svg");
			path = svg_element("path");
			t3 = space();
			zoo_input_info = element("zoo-input-info");
			this.c = noop;
			set_custom_element_data(zoo_input_label, "class", "input-label");
			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
			add_location(zoo_input_label, file$3, 3, 2, 144);
			attr_dev(slot0, "name", "inputlabel");
			add_location(slot0, file$3, 2, 1, 117);
			attr_dev(slot1, "name", "inputelement");
			add_location(slot1, file$3, 7, 2, 370);
			attr_dev(path, "d", "M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z");
			add_location(path, file$3, 9, 3, 479);
			attr_dev(svg, "class", "error-circle");
			attr_dev(svg, "width", "18");
			attr_dev(svg, "height", "18");
			attr_dev(svg, "viewBox", "0 0 24 24");
			add_location(svg, file$3, 8, 2, 406);
			attr_dev(span, "class", span_class_value = "input-slot " + (/*valid*/ ctx[7] ? "" : "error"));
			add_location(span, file$3, 6, 1, 319);
			set_custom_element_data(zoo_input_info, "class", "input-info");
			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
			add_location(zoo_input_info, file$3, 12, 1, 891);
			attr_dev(div, "class", div_class_value = "box " + /*labelposition*/ ctx[0] + " " + (/*linktext*/ ctx[2] ? "" : "link-absent"));
			add_location(div, file$3, 1, 0, 50);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, slot0);
			append_dev(slot0, zoo_input_label);
			append_dev(div, t0);
			if (if_block) if_block.m(div, null);
			append_dev(div, t1);
			append_dev(div, span);
			append_dev(span, slot1);
			append_dev(span, t2);
			append_dev(span, svg);
			append_dev(svg, path);
			append_dev(div, t3);
			append_dev(div, zoo_input_info);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*labeltext*/ 2) {
				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
			}

			if (/*linktext*/ ctx[2]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$1(ctx);
					if_block.c();
					if_block.m(div, t1);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*valid*/ 128 && span_class_value !== (span_class_value = "input-slot " + (/*valid*/ ctx[7] ? "" : "error"))) {
				attr_dev(span, "class", span_class_value);
			}

			if (dirty & /*valid*/ 128) {
				set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
			}

			if (dirty & /*inputerrormsg*/ 32) {
				set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			}

			if (dirty & /*infotext*/ 64) {
				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
			}

			if (dirty & /*labelposition, linktext*/ 5 && div_class_value !== (div_class_value = "box " + /*labelposition*/ ctx[0] + " " + (/*linktext*/ ctx[2] ? "" : "link-absent"))) {
				attr_dev(div, "class", div_class_value);
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
		id: create_fragment$3.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$3($$self, $$props, $$invalidate) {
	let { labelposition = "top" } = $$props;
	let { labeltext = "" } = $$props;
	let { linktext = "" } = $$props;
	let { linkhref = "" } = $$props;
	let { linktarget = "about:blank" } = $$props;
	let { inputerrormsg = "" } = $$props;
	let { infotext = "" } = $$props;
	let { valid = true } = $$props;

	const writable_props = [
		"labelposition",
		"labeltext",
		"linktext",
		"linkhref",
		"linktarget",
		"inputerrormsg",
		"infotext",
		"valid"
	];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-input> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-input", $$slots, []);

	$$self.$set = $$props => {
		if ("labelposition" in $$props) $$invalidate(0, labelposition = $$props.labelposition);
		if ("labeltext" in $$props) $$invalidate(1, labeltext = $$props.labeltext);
		if ("linktext" in $$props) $$invalidate(2, linktext = $$props.linktext);
		if ("linkhref" in $$props) $$invalidate(3, linkhref = $$props.linkhref);
		if ("linktarget" in $$props) $$invalidate(4, linktarget = $$props.linktarget);
		if ("inputerrormsg" in $$props) $$invalidate(5, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(6, infotext = $$props.infotext);
		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
	};

	$$self.$capture_state = () => ({
		labelposition,
		labeltext,
		linktext,
		linkhref,
		linktarget,
		inputerrormsg,
		infotext,
		valid
	});

	$$self.$inject_state = $$props => {
		if ("labelposition" in $$props) $$invalidate(0, labelposition = $$props.labelposition);
		if ("labeltext" in $$props) $$invalidate(1, labeltext = $$props.labeltext);
		if ("linktext" in $$props) $$invalidate(2, linktext = $$props.linktext);
		if ("linkhref" in $$props) $$invalidate(3, linkhref = $$props.linkhref);
		if ("linktarget" in $$props) $$invalidate(4, linktarget = $$props.linktarget);
		if ("inputerrormsg" in $$props) $$invalidate(5, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(6, infotext = $$props.infotext);
		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		labelposition,
		labeltext,
		linktext,
		linkhref,
		linktarget,
		inputerrormsg,
		infotext,
		valid
	];
}

class Input extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>.box{box-sizing:border-box;width:100%;display:grid;grid-template-areas:"label label link" "input input input" "info info info";grid-template-columns:1fr 1fr 1fr;grid-gap:3px;position:relative}.link-absent{grid-template-areas:"label label label" "input input input" "info info info";grid-gap:3px 0}@media only screen and (min-width: 500px){.left{grid-template-areas:"label link link" "label input input" "label info info"}}.left .input-label{align-self:center;padding-right:5px}.input-label{grid-area:label;align-self:self-start}.input-link{grid-area:link;align-self:flex-end}.input-slot{grid-area:input;position:relative}.input-info{grid-area:info}a{text-align:right;text-decoration:none;font-size:12px;line-height:14px;color:var(--primary-mid, #3C9700)}a:visited{color:var(--primary-light, #66B100)}a:hover,a:focus,a:active{color:var(--primary-dark, #286400)}.error-circle{position:absolute;right:15px;top:15px;color:var(--warning-mid, #ED1C24);pointer-events:none;opacity:0;transition:opacity 0.2s}.error-circle path{fill:var(--warning-mid, #ED1C24)}.error .error-circle{opacity:1}.error ::slotted(input),.error ::slotted(textarea){transition:border-color 0.3s ease;border:2px solid var(--warning-mid, #ED1C24);padding:12px 14px}::slotted(input),::slotted(textarea){width:100%;font-size:14px;line-height:20px;padding:13px 15px;margin:0;border:1px solid #767676;border-radius:5px;color:#555555;outline:none;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;-moz-appearance:textfield;background:#FFFFFF}::slotted(input[type="date"]),::slotted(input[type="time"]){-webkit-min-logical-height:48px;-webkit-appearance:textfield}::slotted(input::placeholder),::slotted(textarea::placeholder){color:#767676;opacity:1}::slotted(input:disabled),::slotted(textarea:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#767676;cursor:not-allowed}::slotted(input:focus),::slotted(textarea:focus){border:2px solid #555555;padding:12px 14px}::slotted(label){grid-area:label;align-self:self-start;font-size:14px;line-height:20px;font-weight:800;color:#555555;text-align:left}</style>`;

		init(this, { target: this.shadowRoot }, instance$3, create_fragment$3, safe_not_equal, {
			labelposition: 0,
			labeltext: 1,
			linktext: 2,
			linkhref: 3,
			linktarget: 4,
			inputerrormsg: 5,
			infotext: 6,
			valid: 7
		});

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
		return [
			"labelposition",
			"labeltext",
			"linktext",
			"linkhref",
			"linktarget",
			"inputerrormsg",
			"infotext",
			"valid"
		];
	}

	get labelposition() {
		return this.$$.ctx[0];
	}

	set labelposition(labelposition) {
		this.$set({ labelposition });
		flush();
	}

	get labeltext() {
		return this.$$.ctx[1];
	}

	set labeltext(labeltext) {
		this.$set({ labeltext });
		flush();
	}

	get linktext() {
		return this.$$.ctx[2];
	}

	set linktext(linktext) {
		this.$set({ linktext });
		flush();
	}

	get linkhref() {
		return this.$$.ctx[3];
	}

	set linkhref(linkhref) {
		this.$set({ linkhref });
		flush();
	}

	get linktarget() {
		return this.$$.ctx[4];
	}

	set linktarget(linktarget) {
		this.$set({ linktarget });
		flush();
	}

	get inputerrormsg() {
		return this.$$.ctx[5];
	}

	set inputerrormsg(inputerrormsg) {
		this.$set({ inputerrormsg });
		flush();
	}

	get infotext() {
		return this.$$.ctx[6];
	}

	set infotext(infotext) {
		this.$set({ infotext });
		flush();
	}

	get valid() {
		return this.$$.ctx[7];
	}

	set valid(valid) {
		this.$set({ valid });
		flush();
	}
}

customElements.define("zoo-input", Input);

/* zoo-modules/button-module/Button.svelte generated by Svelte v3.22.3 */

const file$4 = "zoo-modules/button-module/Button.svelte";

function create_fragment$4(ctx) {
	let button;
	let slot;
	let button_class_value;
	let dispose;

	const block = {
		c: function create() {
			button = element("button");
			slot = element("slot");
			this.c = noop;
			attr_dev(slot, "name", "buttoncontent");
			add_location(slot, file$4, 2, 1, 161);
			button.disabled = /*disabled*/ ctx[2];
			attr_dev(button, "class", button_class_value = "" + (/*type*/ ctx[0] + " " + /*size*/ ctx[1]));
			attr_dev(button, "type", "button");
			add_location(button, file$4, 1, 0, 51);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, button, anchor);
			append_dev(button, slot);
			if (remount) dispose();
			dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*disabled*/ 4) {
				prop_dev(button, "disabled", /*disabled*/ ctx[2]);
			}

			if (dirty & /*type, size*/ 3 && button_class_value !== (button_class_value = "" + (/*type*/ ctx[0] + " " + /*size*/ ctx[1]))) {
				attr_dev(button, "class", button_class_value);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(button);
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
	let { type = "primary" } = $$props; //'secondary', 'hollow'
	let { size = "small" } = $$props; //'medium'
	let { disabled = false } = $$props;
	const writable_props = ["type", "size", "disabled"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-button> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-button", $$slots, []);
	const click_handler = e => disabled ? e.preventDefault() : "";

	$$self.$set = $$props => {
		if ("type" in $$props) $$invalidate(0, type = $$props.type);
		if ("size" in $$props) $$invalidate(1, size = $$props.size);
		if ("disabled" in $$props) $$invalidate(2, disabled = $$props.disabled);
	};

	$$self.$capture_state = () => ({ type, size, disabled });

	$$self.$inject_state = $$props => {
		if ("type" in $$props) $$invalidate(0, type = $$props.type);
		if ("size" in $$props) $$invalidate(1, size = $$props.size);
		if ("disabled" in $$props) $$invalidate(2, disabled = $$props.disabled);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [type, size, disabled, click_handler];
}

class Button extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:block;max-width:330px;position:relative}button{display:flex;flex-direction:row;align-items:center;justify-content:center;color:#FFFFFF;border:0;border-radius:5px;cursor:pointer;width:100%;height:100%;font-size:14px;line-height:20px;font-weight:bold;text-align:center;background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100))}button:hover,button:focus{background:var(--primary-mid, #3C9700)}button:active{background:var(--primary-dark, #286400);transform:translateY(1px)}button:disabled{background:#F2F3F4;color:#767676;border:1px solid #E6E6E6;cursor:not-allowed}button:disabled:hover,button:disabled:focus,button:disabled:active{cursor:not-allowed;background:#F2F3F4;color:#767676}.secondary{background-image:linear-gradient(left, var(--secondary-mid, #FF6200), var(--secondary-light, #FF8800));background-image:-webkit-linear-gradient(left, var(--secondary-mid, #FF6200), var(--secondary-light, #FF8800))}.secondary:hover,.secondary:focus{background:var(--secondary-mid, #FF6200)}.secondary:active{background:var(--secondary-dark, #CC4E00)}.hollow{border:2px solid var(--primary-mid, #3C9700);color:var(--primary-mid, #3C9700);background:transparent}.hollow:hover,.hollow:focus,.hollow:active{color:#FFFFFF}.small{min-height:36px}.medium{min-height:46px}::slotted(*){padding:0 20px}</style>`;
		init(this, { target: this.shadowRoot }, instance$4, create_fragment$4, safe_not_equal, { type: 0, size: 1, disabled: 2 });

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
		return ["type", "size", "disabled"];
	}

	get type() {
		return this.$$.ctx[0];
	}

	set type(type) {
		this.$set({ type });
		flush();
	}

	get size() {
		return this.$$.ctx[1];
	}

	set size(size) {
		this.$set({ size });
		flush();
	}

	get disabled() {
		return this.$$.ctx[2];
	}

	set disabled(disabled) {
		this.$set({ disabled });
		flush();
	}
}

customElements.define("zoo-button", Button);

/* zoo-modules/checkbox-module/Checkbox.svelte generated by Svelte v3.22.3 */
const file$5 = "zoo-modules/checkbox-module/Checkbox.svelte";

function create_fragment$5(ctx) {
	let div1;
	let div0;
	let slot0;
	let t0;
	let svg;
	let path0;
	let path1;
	let t1;
	let slot1;
	let label;
	let t2;
	let t3;
	let zoo_input_info;
	let dispose;

	const block = {
		c: function create() {
			div1 = element("div");
			div0 = element("div");
			slot0 = element("slot");
			t0 = space();
			svg = svg_element("svg");
			path0 = svg_element("path");
			path1 = svg_element("path");
			t1 = space();
			slot1 = element("slot");
			label = element("label");
			t2 = text(/*labeltext*/ ctx[0]);
			t3 = space();
			zoo_input_info = element("zoo-input-info");
			this.c = noop;
			attr_dev(slot0, "name", "checkboxelement");
			add_location(slot0, file$5, 3, 2, 273);
			attr_dev(path0, "d", "M0 0h24v24H0V0z");
			attr_dev(path0, "fill", "none");
			add_location(path0, file$5, 4, 64, 397);
			attr_dev(path1, "d", "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z");
			add_location(path1, file$5, 4, 103, 436);
			attr_dev(svg, "class", "check");
			attr_dev(svg, "viewBox", "0 0 24 24");
			attr_dev(svg, "width", "22");
			attr_dev(svg, "height", "22");
			add_location(svg, file$5, 4, 2, 335);
			add_location(label, file$5, 6, 3, 561);
			attr_dev(slot1, "name", "checkboxlabel");
			add_location(slot1, file$5, 5, 2, 507);
			attr_dev(div0, "class", "checkbox");
			toggle_class(div0, "clicked", /*_clicked*/ ctx[5]);
			toggle_class(div0, "highlighted", /*highlighted*/ ctx[2]);
			toggle_class(div0, "error", !/*valid*/ ctx[1]);
			add_location(div0, file$5, 2, 1, 164);
			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[1]);
			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[3]);
			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[4]);
			add_location(zoo_input_info, file$5, 9, 1, 607);
			attr_dev(div1, "class", "box");
			toggle_class(div1, "disabled", /*_slottedInput*/ ctx[6] && /*_slottedInput*/ ctx[6].disabled);
			add_location(div1, file$5, 1, 0, 53);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);
			append_dev(div0, slot0);
			/*slot0_binding*/ ctx[10](slot0);
			append_dev(div0, t0);
			append_dev(div0, svg);
			append_dev(svg, path0);
			append_dev(svg, path1);
			append_dev(div0, t1);
			append_dev(div0, slot1);
			append_dev(slot1, label);
			append_dev(label, t2);
			/*slot1_binding*/ ctx[11](slot1);
			append_dev(div1, t3);
			append_dev(div1, zoo_input_info);
			if (remount) dispose();
			dispose = listen_dev(div1, "click", /*click_handler*/ ctx[12], false, false, false);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*labeltext*/ 1) set_data_dev(t2, /*labeltext*/ ctx[0]);

			if (dirty & /*_clicked*/ 32) {
				toggle_class(div0, "clicked", /*_clicked*/ ctx[5]);
			}

			if (dirty & /*highlighted*/ 4) {
				toggle_class(div0, "highlighted", /*highlighted*/ ctx[2]);
			}

			if (dirty & /*valid*/ 2) {
				toggle_class(div0, "error", !/*valid*/ ctx[1]);
			}

			if (dirty & /*valid*/ 2) {
				set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[1]);
			}

			if (dirty & /*inputerrormsg*/ 8) {
				set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[3]);
			}

			if (dirty & /*infotext*/ 16) {
				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[4]);
			}

			if (dirty & /*_slottedInput*/ 64) {
				toggle_class(div1, "disabled", /*_slottedInput*/ ctx[6] && /*_slottedInput*/ ctx[6].disabled);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div1);
			/*slot0_binding*/ ctx[10](null);
			/*slot1_binding*/ ctx[11](null);
			dispose();
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
	let { labeltext = "" } = $$props;
	let { valid = true } = $$props;
	let { highlighted = false } = $$props;
	let { inputerrormsg = "" } = $$props;
	let { infotext = "" } = $$props;
	let _clicked = false;
	let _slottedInput;
	let _inputSlot;
	let _labelSlot;

	const handleClick = e => {
		// browser should handle it
		if (e.target == _labelSlot.assignedNodes()[0]) {
			$$invalidate(5, _clicked = _slottedInput.checked);
			return;
		}

		// replicate browser behaviour
		if (_slottedInput.disabled) {
			e.preventDefault();
			return;
		}

		if (e.target != _slottedInput) {
			$$invalidate(6, _slottedInput.checked = !_slottedInput.checked, _slottedInput);
		}

		$$invalidate(5, _clicked = _slottedInput.checked);
	};

	onMount(() => {
		// todo support multiple slots
		_inputSlot.addEventListener("slotchange", () => {
			$$invalidate(6, _slottedInput = _inputSlot.assignedNodes()[0]);
			$$invalidate(5, _clicked = _slottedInput.checked);
		});

		_inputSlot.addEventListener("keypress", e => {
			if (e.keyCode === 13) {
				_slottedInput.click();
			}
		});
	});

	const writable_props = ["labeltext", "valid", "highlighted", "inputerrormsg", "infotext"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-checkbox> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-checkbox", $$slots, []);

	function slot0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(7, _inputSlot = $$value);
		});
	}

	function slot1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(8, _labelSlot = $$value);
		});
	}

	const click_handler = e => handleClick(e);

	$$self.$set = $$props => {
		if ("labeltext" in $$props) $$invalidate(0, labeltext = $$props.labeltext);
		if ("valid" in $$props) $$invalidate(1, valid = $$props.valid);
		if ("highlighted" in $$props) $$invalidate(2, highlighted = $$props.highlighted);
		if ("inputerrormsg" in $$props) $$invalidate(3, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(4, infotext = $$props.infotext);
	};

	$$self.$capture_state = () => ({
		onMount,
		labeltext,
		valid,
		highlighted,
		inputerrormsg,
		infotext,
		_clicked,
		_slottedInput,
		_inputSlot,
		_labelSlot,
		handleClick
	});

	$$self.$inject_state = $$props => {
		if ("labeltext" in $$props) $$invalidate(0, labeltext = $$props.labeltext);
		if ("valid" in $$props) $$invalidate(1, valid = $$props.valid);
		if ("highlighted" in $$props) $$invalidate(2, highlighted = $$props.highlighted);
		if ("inputerrormsg" in $$props) $$invalidate(3, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(4, infotext = $$props.infotext);
		if ("_clicked" in $$props) $$invalidate(5, _clicked = $$props._clicked);
		if ("_slottedInput" in $$props) $$invalidate(6, _slottedInput = $$props._slottedInput);
		if ("_inputSlot" in $$props) $$invalidate(7, _inputSlot = $$props._inputSlot);
		if ("_labelSlot" in $$props) $$invalidate(8, _labelSlot = $$props._labelSlot);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		labeltext,
		valid,
		highlighted,
		inputerrormsg,
		infotext,
		_clicked,
		_slottedInput,
		_inputSlot,
		_labelSlot,
		handleClick,
		slot0_binding,
		slot1_binding,
		click_handler
	];
}

class Checkbox extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:flex;flex-direction:column;align-items:center;height:100%}.box{width:100%;display:flex;flex-direction:column;align-items:center;position:relative;box-sizing:border-box;cursor:pointer;font-size:14px;line-height:20px}.checkbox{display:flex;width:100%;box-sizing:border-box;padding:11px 15px}.highlighted{border:1px solid #E6E6E6;border-radius:5px}.highlighted.clicked{border:2px solid var(--success-mid, #3C9700)}.highlighted.error{border:2px solid var(--warning-mid, #ED1C24)}.highlighted.error,.highlighted.clicked{padding:10px 14px}label{display:flex;align-items:center}zoo-input-info{display:flex;align-self:flex-start;margin-top:2px}::slotted(input[type="checkbox"]){position:relative;display:flex;min-width:24px;height:24px;border-radius:3px;border:1px solid #767676;margin:0 10px 0 0;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:none;cursor:pointer}::slotted(input[type="checkbox"]:checked){border:1px solid var(--success-mid, #3C9700)}::slotted(input[type="checkbox"]:focus){border-width:2px}::slotted(input[type="checkbox"]:disabled){border-color:#E6E6E6;background-color:#F2F3F4;cursor:not-allowed}.check{display:none;position:absolute;margin:1px}.clicked .check{display:flex;fill:var(--primary-mid, #3C9700)}.disabled .check{fill:#767676}.error .check{fill:var(--warning-mid, #ED1C24)}.error ::slotted(input[type="checkbox"]),.error ::slotted(input[type="checkbox"]:checked){border-color:var(--warning-mid, #ED1C24)}::slotted(label){display:flex;align-items:center;cursor:pointer}.disabled,.disabled ::slotted(label){cursor:not-allowed}</style>`;

		init(this, { target: this.shadowRoot }, instance$5, create_fragment$5, safe_not_equal, {
			labeltext: 0,
			valid: 1,
			highlighted: 2,
			inputerrormsg: 3,
			infotext: 4
		});

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
		return ["labeltext", "valid", "highlighted", "inputerrormsg", "infotext"];
	}

	get labeltext() {
		return this.$$.ctx[0];
	}

	set labeltext(labeltext) {
		this.$set({ labeltext });
		flush();
	}

	get valid() {
		return this.$$.ctx[1];
	}

	set valid(valid) {
		this.$set({ valid });
		flush();
	}

	get highlighted() {
		return this.$$.ctx[2];
	}

	set highlighted(highlighted) {
		this.$set({ highlighted });
		flush();
	}

	get inputerrormsg() {
		return this.$$.ctx[3];
	}

	set inputerrormsg(inputerrormsg) {
		this.$set({ inputerrormsg });
		flush();
	}

	get infotext() {
		return this.$$.ctx[4];
	}

	set infotext(infotext) {
		this.$set({ infotext });
		flush();
	}
}

customElements.define("zoo-checkbox", Checkbox);

/* zoo-modules/radio-module/Radio.svelte generated by Svelte v3.22.3 */

const file$6 = "zoo-modules/radio-module/Radio.svelte";

function create_fragment$6(ctx) {
	let zoo_input_label;
	let t0;
	let div;
	let slot;
	let t1;
	let zoo_input_info;

	const block = {
		c: function create() {
			zoo_input_label = element("zoo-input-label");
			t0 = space();
			div = element("div");
			slot = element("slot");
			t1 = space();
			zoo_input_info = element("zoo-input-info");
			this.c = noop;
			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[3]);
			add_location(zoo_input_label, file$6, 1, 0, 50);
			add_location(slot, file$6, 3, 1, 128);
			toggle_class(div, "error", !/*valid*/ ctx[0]);
			add_location(div, file$6, 2, 0, 98);
			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[0]);
			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[1]);
			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[2]);
			add_location(zoo_input_info, file$6, 5, 0, 149);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, zoo_input_label, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, div, anchor);
			append_dev(div, slot);
			insert_dev(target, t1, anchor);
			insert_dev(target, zoo_input_info, anchor);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*labeltext*/ 8) {
				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[3]);
			}

			if (dirty & /*valid*/ 1) {
				toggle_class(div, "error", !/*valid*/ ctx[0]);
			}

			if (dirty & /*valid*/ 1) {
				set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[0]);
			}

			if (dirty & /*inputerrormsg*/ 2) {
				set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[1]);
			}

			if (dirty & /*infotext*/ 4) {
				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[2]);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(zoo_input_label);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(div);
			if (detaching) detach_dev(t1);
			if (detaching) detach_dev(zoo_input_info);
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
	let { valid = true } = $$props;
	let { inputerrormsg = "" } = $$props;
	let { infotext = "" } = $$props;
	let { labeltext = "" } = $$props;
	const writable_props = ["valid", "inputerrormsg", "infotext", "labeltext"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-radio> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-radio", $$slots, []);

	$$self.$set = $$props => {
		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
		if ("inputerrormsg" in $$props) $$invalidate(1, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(2, infotext = $$props.infotext);
		if ("labeltext" in $$props) $$invalidate(3, labeltext = $$props.labeltext);
	};

	$$self.$capture_state = () => ({
		valid,
		inputerrormsg,
		infotext,
		labeltext
	});

	$$self.$inject_state = $$props => {
		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
		if ("inputerrormsg" in $$props) $$invalidate(1, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(2, infotext = $$props.infotext);
		if ("labeltext" in $$props) $$invalidate(3, labeltext = $$props.labeltext);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [valid, inputerrormsg, infotext, labeltext];
}

class Radio extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:flex;flex-direction:column}div{display:flex;padding:11px 0;font-size:14px;line-height:20px}::slotted(input[type="radio"]){position:relative;border:1px solid #767676;border-color:var(--primary-mid, #3C9700);min-width:24px;height:24px;border-radius:50%;margin:0 2px 0 0;padding:3px;background-clip:content-box;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:none;cursor:pointer}::slotted(input[type="radio"]:focus){border-width:2px}::slotted(input[type="radio"]:checked){background-color:var(--primary-mid, #3C9700)}::slotted(input[type="radio"]:disabled){cursor:not-allowed;border-color:#767676;background-color:#E6E6E6}.error ::slotted(input[type="radio"]:checked){background-color:var(--warning-mid, #ED1C24)}.error ::slotted(input[type="radio"]){border-color:var(--warning-mid, #ED1C24)}::slotted(label){cursor:pointer;margin:0 5px;align-self:center}.error ::slotted(label){color:var(--warning-mid, #ED1C24)}</style>`;

		init(this, { target: this.shadowRoot }, instance$6, create_fragment$6, safe_not_equal, {
			valid: 0,
			inputerrormsg: 1,
			infotext: 2,
			labeltext: 3
		});

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
		return ["valid", "inputerrormsg", "infotext", "labeltext"];
	}

	get valid() {
		return this.$$.ctx[0];
	}

	set valid(valid) {
		this.$set({ valid });
		flush();
	}

	get inputerrormsg() {
		return this.$$.ctx[1];
	}

	set inputerrormsg(inputerrormsg) {
		this.$set({ inputerrormsg });
		flush();
	}

	get infotext() {
		return this.$$.ctx[2];
	}

	set infotext(infotext) {
		this.$set({ infotext });
		flush();
	}

	get labeltext() {
		return this.$$.ctx[3];
	}

	set labeltext(labeltext) {
		this.$set({ labeltext });
		flush();
	}
}

customElements.define("zoo-radio", Radio);

/* zoo-modules/feedback-module/Feedback.svelte generated by Svelte v3.22.3 */

const file$7 = "zoo-modules/feedback-module/Feedback.svelte";

function create_fragment$7(ctx) {
	let div;
	let svg;
	let path;
	let t0;
	let slot;
	let t1;
	let div_class_value;

	const block = {
		c: function create() {
			div = element("div");
			svg = svg_element("svg");
			path = svg_element("path");
			t0 = space();
			slot = element("slot");
			t1 = text(/*text*/ ctx[1]);
			this.c = noop;
			attr_dev(path, "d", "M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z");
			add_location(path, file$7, 3, 2, 130);
			attr_dev(svg, "width", "30");
			attr_dev(svg, "height", "30");
			attr_dev(svg, "viewBox", "0 0 24 24");
			add_location(svg, file$7, 2, 1, 79);
			add_location(slot, file$7, 5, 1, 532);
			attr_dev(div, "class", div_class_value = "box " + /*type*/ ctx[0]);
			add_location(div, file$7, 1, 0, 53);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, svg);
			append_dev(svg, path);
			append_dev(div, t0);
			append_dev(div, slot);
			append_dev(slot, t1);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*text*/ 2) set_data_dev(t1, /*text*/ ctx[1]);

			if (dirty & /*type*/ 1 && div_class_value !== (div_class_value = "box " + /*type*/ ctx[0])) {
				attr_dev(div, "class", div_class_value);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
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
	let { type = "info" } = $$props; // error, success
	let { text = "" } = $$props;
	const writable_props = ["type", "text"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-feedback> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-feedback", $$slots, []);

	$$self.$set = $$props => {
		if ("type" in $$props) $$invalidate(0, type = $$props.type);
		if ("text" in $$props) $$invalidate(1, text = $$props.text);
	};

	$$self.$capture_state = () => ({ type, text });

	$$self.$inject_state = $$props => {
		if ("type" in $$props) $$invalidate(0, type = $$props.type);
		if ("text" in $$props) $$invalidate(1, text = $$props.text);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [type, text];
}

class Feedback extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>.box{box-sizing:border-box;font-size:14px;line-height:20px;border-left:3px solid;display:flex;align-items:center;width:100%;height:100%;padding:5px 0;background:var(--info-ultralight, #ECF5FA);border-color:var(--info-mid, #459FD0)}svg{min-width:30px;min-height:30px;padding:0 10px 0 15px;fill:var(--info-mid, #459FD0)}.error{background:var(--warning-ultralight, #FDE8E9);border-color:var(--warning-mid, #ED1C24)}.error svg{fill:var(--warning-mid, #ED1C24)}.success{background:var(--primary-ultralight, #EBF4E5);border-color:var(--primary-mid, #3C9700)}.success svg{fill:var(--primary-mid, #3C9700)}</style>`;
		init(this, { target: this.shadowRoot }, instance$7, create_fragment$7, safe_not_equal, { type: 0, text: 1 });

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
		return ["type", "text"];
	}

	get type() {
		return this.$$.ctx[0];
	}

	set type(type) {
		this.$set({ type });
		flush();
	}

	get text() {
		return this.$$.ctx[1];
	}

	set text(text) {
		this.$set({ text });
		flush();
	}
}

customElements.define("zoo-feedback", Feedback);

/* zoo-modules/tooltip-module/Tooltip.svelte generated by Svelte v3.22.3 */

const file$8 = "zoo-modules/tooltip-module/Tooltip.svelte";

function create_fragment$8(ctx) {
	let div2;
	let div0;
	let slot;
	let span;
	let t0;
	let t1;
	let div1;
	let div1_class_value;
	let div2_class_value;

	const block = {
		c: function create() {
			div2 = element("div");
			div0 = element("div");
			slot = element("slot");
			span = element("span");
			t0 = text(/*text*/ ctx[0]);
			t1 = space();
			div1 = element("div");
			this.c = noop;
			attr_dev(span, "class", "text");
			add_location(span, file$8, 4, 3, 124);
			add_location(slot, file$8, 3, 2, 114);
			attr_dev(div0, "class", "tooltip-content");
			add_location(div0, file$8, 2, 1, 82);
			attr_dev(div1, "class", div1_class_value = "tip " + /*position*/ ctx[1]);
			add_location(div1, file$8, 7, 1, 176);
			attr_dev(div2, "class", div2_class_value = "box " + /*position*/ ctx[1]);
			add_location(div2, file$8, 1, 0, 52);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div2, anchor);
			append_dev(div2, div0);
			append_dev(div0, slot);
			append_dev(slot, span);
			append_dev(span, t0);
			append_dev(div2, t1);
			append_dev(div2, div1);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*text*/ 1) set_data_dev(t0, /*text*/ ctx[0]);

			if (dirty & /*position*/ 2 && div1_class_value !== (div1_class_value = "tip " + /*position*/ ctx[1])) {
				attr_dev(div1, "class", div1_class_value);
			}

			if (dirty & /*position*/ 2 && div2_class_value !== (div2_class_value = "box " + /*position*/ ctx[1])) {
				attr_dev(div2, "class", div2_class_value);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div2);
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
	let { text = "" } = $$props;
	let { position = "top" } = $$props; // left, right, bottom
	const writable_props = ["text", "position"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-tooltip> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-tooltip", $$slots, []);

	$$self.$set = $$props => {
		if ("text" in $$props) $$invalidate(0, text = $$props.text);
		if ("position" in $$props) $$invalidate(1, position = $$props.position);
	};

	$$self.$capture_state = () => ({ text, position });

	$$self.$inject_state = $$props => {
		if ("text" in $$props) $$invalidate(0, text = $$props.text);
		if ("position" in $$props) $$invalidate(1, position = $$props.position);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [text, position];
}

class Tooltip extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:flex;position:absolute;width:100%;height:100%;z-index:9997;left:0;bottom:0;pointer-events:none;contain:layout;justify-content:center}.box{pointer-events:initial;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1);border-radius:5px;position:absolute;transform:translate(0%, -50%)}.box.top{bottom:calc(100% + 11px);right:50%;transform:translate3d(50%, 0, 0)}.box.right{left:calc(100% + 10px);top:50%}.box.bottom{top:100%;right:50%;transform:translate3d(50%, 20%, 0)}.box.left{right:calc(100% + 11px);top:50%}.tooltip-content{padding:10px;font-size:12px;line-height:14px;font-weight:initial;position:relative;z-index:1;background:white;border-radius:5px}.tooltip-content .text{white-space:pre;color:black}.tip{position:absolute}.tip:after{content:"";width:16px;height:16px;position:absolute;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1);top:-8px;transform:rotate(45deg);z-index:0;background:white}.tip.top,.tip.bottom{right:calc(50% + 8px)}.tip.right{bottom:50%;left:-8px}.tip.bottom{top:0}.tip.left{bottom:50%;right:8px}</style>`;
		init(this, { target: this.shadowRoot }, instance$8, create_fragment$8, safe_not_equal, { text: 0, position: 1 });

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
		return ["text", "position"];
	}

	get text() {
		return this.$$.ctx[0];
	}

	set text(text) {
		this.$set({ text });
		flush();
	}

	get position() {
		return this.$$.ctx[1];
	}

	set position(position) {
		this.$set({ position });
		flush();
	}
}

customElements.define("zoo-tooltip", Tooltip);

/* zoo-modules/select-module/Select.svelte generated by Svelte v3.22.3 */
const file$9 = "zoo-modules/select-module/Select.svelte";

// (8:1) {#if linktext}
function create_if_block_3(ctx) {
	let a;
	let t;

	const block = {
		c: function create() {
			a = element("a");
			t = text(/*linktext*/ ctx[2]);
			attr_dev(a, "class", "input-link");
			attr_dev(a, "href", /*linkhref*/ ctx[3]);
			attr_dev(a, "target", /*linktarget*/ ctx[4]);
			add_location(a, file$9, 7, 15, 258);
		},
		m: function mount(target, anchor) {
			insert_dev(target, a, anchor);
			append_dev(a, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*linktext*/ 4) set_data_dev(t, /*linktext*/ ctx[2]);

			if (dirty & /*linkhref*/ 8) {
				attr_dev(a, "href", /*linkhref*/ ctx[3]);
			}

			if (dirty & /*linktarget*/ 16) {
				attr_dev(a, "target", /*linktarget*/ ctx[4]);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(a);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_3.name,
		type: "if",
		source: "(8:1) {#if linktext}",
		ctx
	});

	return block;
}

// (11:2) {#if slottedSelect && !slottedSelect.hasAttribute('multiple')}
function create_if_block$2(ctx) {
	let t;
	let if_block1_anchor;
	let if_block0 = /*loading*/ ctx[8] && create_if_block_2(ctx);

	function select_block_type(ctx, dirty) {
		if (/*valueSelected*/ ctx[11]) return create_if_block_1;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block1 = current_block_type(ctx);

	const block = {
		c: function create() {
			if (if_block0) if_block0.c();
			t = space();
			if_block1.c();
			if_block1_anchor = empty();
		},
		m: function mount(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert_dev(target, t, anchor);
			if_block1.m(target, anchor);
			insert_dev(target, if_block1_anchor, anchor);
		},
		p: function update(ctx, dirty) {
			if (/*loading*/ ctx[8]) {
				if (if_block0) ; else {
					if_block0 = create_if_block_2(ctx);
					if_block0.c();
					if_block0.m(t.parentNode, t);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
				if_block1.p(ctx, dirty);
			} else {
				if_block1.d(1);
				if_block1 = current_block_type(ctx);

				if (if_block1) {
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			}
		},
		d: function destroy(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach_dev(t);
			if_block1.d(detaching);
			if (detaching) detach_dev(if_block1_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$2.name,
		type: "if",
		source: "(11:2) {#if slottedSelect && !slottedSelect.hasAttribute('multiple')}",
		ctx
	});

	return block;
}

// (12:3) {#if loading}
function create_if_block_2(ctx) {
	let zoo_preloader;

	const block = {
		c: function create() {
			zoo_preloader = element("zoo-preloader");
			add_location(zoo_preloader, file$9, 12, 4, 535);
		},
		m: function mount(target, anchor) {
			insert_dev(target, zoo_preloader, anchor);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(zoo_preloader);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_2.name,
		type: "if",
		source: "(12:3) {#if loading}",
		ctx
	});

	return block;
}

// (19:3) {:else}
function create_else_block(ctx) {
	let svg;
	let path;
	let svg_class_value;

	const block = {
		c: function create() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr_dev(path, "d", "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
			add_location(path, file$9, 20, 5, 911);
			attr_dev(svg, "class", svg_class_value = "arrows " + (/*slottedSelect*/ ctx[9].disabled ? "disabled" : ""));
			attr_dev(svg, "width", "24");
			attr_dev(svg, "height", "24");
			attr_dev(svg, "viewBox", "0 0 24 24");
			add_location(svg, file$9, 19, 4, 799);
		},
		m: function mount(target, anchor) {
			insert_dev(target, svg, anchor);
			append_dev(svg, path);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*slottedSelect*/ 512 && svg_class_value !== (svg_class_value = "arrows " + (/*slottedSelect*/ ctx[9].disabled ? "disabled" : ""))) {
				attr_dev(svg, "class", svg_class_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(svg);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block.name,
		type: "else",
		source: "(19:3) {:else}",
		ctx
	});

	return block;
}

// (15:3) {#if valueSelected}
function create_if_block_1(ctx) {
	let svg;
	let path;
	let dispose;

	const block = {
		c: function create() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr_dev(path, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
			add_location(path, file$9, 16, 5, 709);
			attr_dev(svg, "class", "close");
			attr_dev(svg, "width", "21");
			attr_dev(svg, "height", "21");
			attr_dev(svg, "viewBox", "0 0 24 24");
			add_location(svg, file$9, 15, 4, 603);
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, svg, anchor);
			append_dev(svg, path);
			if (remount) dispose();
			dispose = listen_dev(svg, "click", /*click_handler*/ ctx[14], false, false, false);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(svg);
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(15:3) {#if valueSelected}",
		ctx
	});

	return block;
}

function create_fragment$9(ctx) {
	let div1;
	let span;
	let slot0;
	let zoo_input_label;
	let t0;
	let t1;
	let div0;
	let slot1;
	let t2;
	let show_if = /*slottedSelect*/ ctx[9] && !/*slottedSelect*/ ctx[9].hasAttribute("multiple");
	let div0_class_value;
	let t3;
	let zoo_input_info;
	let div1_class_value;
	let if_block0 = /*linktext*/ ctx[2] && create_if_block_3(ctx);
	let if_block1 = show_if && create_if_block$2(ctx);

	const block = {
		c: function create() {
			div1 = element("div");
			span = element("span");
			slot0 = element("slot");
			zoo_input_label = element("zoo-input-label");
			t0 = space();
			if (if_block0) if_block0.c();
			t1 = space();
			div0 = element("div");
			slot1 = element("slot");
			t2 = space();
			if (if_block1) if_block1.c();
			t3 = space();
			zoo_input_info = element("zoo-input-info");
			this.c = noop;
			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
			add_location(zoo_input_label, file$9, 4, 3, 176);
			attr_dev(slot0, "name", "selectlabel");
			add_location(slot0, file$9, 3, 2, 147);
			attr_dev(span, "class", "input-label");
			add_location(span, file$9, 2, 1, 118);
			attr_dev(slot1, "name", "selectelement");
			add_location(slot1, file$9, 9, 2, 391);
			attr_dev(div0, "class", div0_class_value = "input-slot " + (/*valid*/ ctx[7] ? "" : "error"));
			add_location(div0, file$9, 8, 1, 341);
			set_custom_element_data(zoo_input_info, "class", "input-info");
			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
			add_location(zoo_input_info, file$9, 25, 1, 1016);
			attr_dev(div1, "class", div1_class_value = "box " + /*labelposition*/ ctx[0] + " " + (/*linktext*/ ctx[2] ? "" : "link-absent"));
			add_location(div1, file$9, 1, 0, 51);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			append_dev(div1, span);
			append_dev(span, slot0);
			append_dev(slot0, zoo_input_label);
			append_dev(div1, t0);
			if (if_block0) if_block0.m(div1, null);
			append_dev(div1, t1);
			append_dev(div1, div0);
			append_dev(div0, slot1);
			/*slot1_binding*/ ctx[13](slot1);
			append_dev(div0, t2);
			if (if_block1) if_block1.m(div0, null);
			append_dev(div1, t3);
			append_dev(div1, zoo_input_info);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*labeltext*/ 2) {
				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
			}

			if (/*linktext*/ ctx[2]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_3(ctx);
					if_block0.c();
					if_block0.m(div1, t1);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (dirty & /*slottedSelect*/ 512) show_if = /*slottedSelect*/ ctx[9] && !/*slottedSelect*/ ctx[9].hasAttribute("multiple");

			if (show_if) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block$2(ctx);
					if_block1.c();
					if_block1.m(div0, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (dirty & /*valid*/ 128 && div0_class_value !== (div0_class_value = "input-slot " + (/*valid*/ ctx[7] ? "" : "error"))) {
				attr_dev(div0, "class", div0_class_value);
			}

			if (dirty & /*valid*/ 128) {
				set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
			}

			if (dirty & /*inputerrormsg*/ 32) {
				set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			}

			if (dirty & /*infotext*/ 64) {
				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
			}

			if (dirty & /*labelposition, linktext*/ 5 && div1_class_value !== (div1_class_value = "box " + /*labelposition*/ ctx[0] + " " + (/*linktext*/ ctx[2] ? "" : "link-absent"))) {
				attr_dev(div1, "class", div1_class_value);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div1);
			if (if_block0) if_block0.d();
			/*slot1_binding*/ ctx[13](null);
			if (if_block1) if_block1.d();
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
	let { labelposition = "top" } = $$props;
	let { labeltext = "" } = $$props;
	let { linktext = "" } = $$props;
	let { linkhref = "" } = $$props;
	let { linktarget = "about:blank" } = $$props;
	let { inputerrormsg = "" } = $$props;
	let { infotext = "" } = $$props;
	let { valid = true } = $$props;
	let { loading = false } = $$props;
	let slottedSelect;
	let selectSlot;
	let valueSelected;

	// todo support multiple slots
	onMount(() => {
		selectSlot.addEventListener("slotchange", () => {
			$$invalidate(9, slottedSelect = selectSlot.assignedNodes()[0]);

			$$invalidate(11, valueSelected = slottedSelect.value && !slottedSelect.disabled
			? true
			: false);

			slottedSelect.addEventListener("change", e => $$invalidate(11, valueSelected = e.target.value ? true : false));
		});
	});

	const handleCrossClick = () => {
		$$invalidate(9, slottedSelect.value = null, slottedSelect);
		slottedSelect.dispatchEvent(new Event("change"));
	};

	const writable_props = [
		"labelposition",
		"labeltext",
		"linktext",
		"linkhref",
		"linktarget",
		"inputerrormsg",
		"infotext",
		"valid",
		"loading"
	];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-select> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-select", $$slots, []);

	function slot1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(10, selectSlot = $$value);
		});
	}

	const click_handler = () => handleCrossClick();

	$$self.$set = $$props => {
		if ("labelposition" in $$props) $$invalidate(0, labelposition = $$props.labelposition);
		if ("labeltext" in $$props) $$invalidate(1, labeltext = $$props.labeltext);
		if ("linktext" in $$props) $$invalidate(2, linktext = $$props.linktext);
		if ("linkhref" in $$props) $$invalidate(3, linkhref = $$props.linkhref);
		if ("linktarget" in $$props) $$invalidate(4, linktarget = $$props.linktarget);
		if ("inputerrormsg" in $$props) $$invalidate(5, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(6, infotext = $$props.infotext);
		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
		if ("loading" in $$props) $$invalidate(8, loading = $$props.loading);
	};

	$$self.$capture_state = () => ({
		onMount,
		labelposition,
		labeltext,
		linktext,
		linkhref,
		linktarget,
		inputerrormsg,
		infotext,
		valid,
		loading,
		slottedSelect,
		selectSlot,
		valueSelected,
		handleCrossClick
	});

	$$self.$inject_state = $$props => {
		if ("labelposition" in $$props) $$invalidate(0, labelposition = $$props.labelposition);
		if ("labeltext" in $$props) $$invalidate(1, labeltext = $$props.labeltext);
		if ("linktext" in $$props) $$invalidate(2, linktext = $$props.linktext);
		if ("linkhref" in $$props) $$invalidate(3, linkhref = $$props.linkhref);
		if ("linktarget" in $$props) $$invalidate(4, linktarget = $$props.linktarget);
		if ("inputerrormsg" in $$props) $$invalidate(5, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(6, infotext = $$props.infotext);
		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
		if ("loading" in $$props) $$invalidate(8, loading = $$props.loading);
		if ("slottedSelect" in $$props) $$invalidate(9, slottedSelect = $$props.slottedSelect);
		if ("selectSlot" in $$props) $$invalidate(10, selectSlot = $$props.selectSlot);
		if ("valueSelected" in $$props) $$invalidate(11, valueSelected = $$props.valueSelected);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		labelposition,
		labeltext,
		linktext,
		linkhref,
		linktarget,
		inputerrormsg,
		infotext,
		valid,
		loading,
		slottedSelect,
		selectSlot,
		valueSelected,
		handleCrossClick,
		slot1_binding,
		click_handler
	];
}

class Select extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>.box{box-sizing:border-box;width:100%;display:grid;grid-template-areas:"label label link" "input input input" "info info info";grid-template-columns:1fr 1fr 1fr;grid-gap:3px;position:relative}.link-absent{grid-template-areas:"label label label" "input input input" "info info info";grid-gap:3px 0}@media only screen and (min-width: 500px){.left{grid-template-areas:"label link link" "label input input" "label info info"}}.left .input-label{align-self:center;padding-right:5px}.input-label{grid-area:label;align-self:self-start}.input-link{grid-area:link;align-self:flex-end}.input-slot{grid-area:input;position:relative}.input-info{grid-area:info}a{text-align:right;text-decoration:none;font-size:12px;line-height:14px;color:var(--primary-mid, #3C9700)}a:visited{color:var(--primary-light, #66B100)}a:hover,a:focus,a:active{color:var(--primary-dark, #286400)}.close,.arrows{position:absolute;right:10px;top:12px}.close{cursor:pointer;right:11px;top:14px}.arrows{pointer-events:none}.arrows path{fill:var(--primary-mid, #3C9700)}.arrows.disabled path{fill:#E6E6E6}.error .arrows path{fill:var(--warning-mid, #ED1C24)}::slotted(select){-webkit-appearance:none;-moz-appearance:none;width:100%;background:white;font-size:14px;line-height:20px;padding:13px 25px 13px 15px;border:1px solid #767676;border-radius:5px;color:#555555;outline:none;box-sizing:border-box;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}::slotted(select:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#767676}::slotted(select:disabled:hover){cursor:not-allowed}::slotted(select:focus){border:2px solid #555555;padding:12px 24px 12px 14px}.error ::slotted(select){border:2px solid var(--warning-mid, #ED1C24);padding:12px 24px 12px 14px}::slotted(label){font-size:14px;line-height:20px;font-weight:800;color:#555555;text-align:left}</style>`;

		init(this, { target: this.shadowRoot }, instance$9, create_fragment$9, safe_not_equal, {
			labelposition: 0,
			labeltext: 1,
			linktext: 2,
			linkhref: 3,
			linktarget: 4,
			inputerrormsg: 5,
			infotext: 6,
			valid: 7,
			loading: 8
		});

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
		return [
			"labelposition",
			"labeltext",
			"linktext",
			"linkhref",
			"linktarget",
			"inputerrormsg",
			"infotext",
			"valid",
			"loading"
		];
	}

	get labelposition() {
		return this.$$.ctx[0];
	}

	set labelposition(labelposition) {
		this.$set({ labelposition });
		flush();
	}

	get labeltext() {
		return this.$$.ctx[1];
	}

	set labeltext(labeltext) {
		this.$set({ labeltext });
		flush();
	}

	get linktext() {
		return this.$$.ctx[2];
	}

	set linktext(linktext) {
		this.$set({ linktext });
		flush();
	}

	get linkhref() {
		return this.$$.ctx[3];
	}

	set linkhref(linkhref) {
		this.$set({ linkhref });
		flush();
	}

	get linktarget() {
		return this.$$.ctx[4];
	}

	set linktarget(linktarget) {
		this.$set({ linktarget });
		flush();
	}

	get inputerrormsg() {
		return this.$$.ctx[5];
	}

	set inputerrormsg(inputerrormsg) {
		this.$set({ inputerrormsg });
		flush();
	}

	get infotext() {
		return this.$$.ctx[6];
	}

	set infotext(infotext) {
		this.$set({ infotext });
		flush();
	}

	get valid() {
		return this.$$.ctx[7];
	}

	set valid(valid) {
		this.$set({ valid });
		flush();
	}

	get loading() {
		return this.$$.ctx[8];
	}

	set loading(loading) {
		this.$set({ loading });
		flush();
	}
}

customElements.define("zoo-select", Select);

/* zoo-modules/searchable-select-module/SearchableSelect.svelte generated by Svelte v3.22.3 */
const file$a = "zoo-modules/searchable-select-module/SearchableSelect.svelte";

// (23:1) {:else}
function create_else_block$1(ctx) {
	let zoo_select;
	let slot;

	const block = {
		c: function create() {
			zoo_select = element("zoo-select");
			slot = element("slot");
			attr_dev(slot, "name", "selectelement");
			attr_dev(slot, "slot", "selectelement");
			add_location(slot, file$a, 24, 3, 1240);
			set_custom_element_data(zoo_select, "labelposition", /*labelposition*/ ctx[0]);
			set_custom_element_data(zoo_select, "linktext", /*linktext*/ ctx[2]);
			set_custom_element_data(zoo_select, "linkhref", /*linkhref*/ ctx[3]);
			set_custom_element_data(zoo_select, "linktarget", /*linktarget*/ ctx[4]);
			set_custom_element_data(zoo_select, "labeltext", /*labeltext*/ ctx[1]);
			set_custom_element_data(zoo_select, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			set_custom_element_data(zoo_select, "infotext", /*infotext*/ ctx[6]);
			set_custom_element_data(zoo_select, "valid", /*valid*/ ctx[7]);
			add_location(zoo_select, file$a, 23, 2, 1126);
		},
		m: function mount(target, anchor) {
			insert_dev(target, zoo_select, anchor);
			append_dev(zoo_select, slot);
			/*slot_binding_1*/ ctx[28](slot);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*labelposition*/ 1) {
				set_custom_element_data(zoo_select, "labelposition", /*labelposition*/ ctx[0]);
			}

			if (dirty & /*linktext*/ 4) {
				set_custom_element_data(zoo_select, "linktext", /*linktext*/ ctx[2]);
			}

			if (dirty & /*linkhref*/ 8) {
				set_custom_element_data(zoo_select, "linkhref", /*linkhref*/ ctx[3]);
			}

			if (dirty & /*linktarget*/ 16) {
				set_custom_element_data(zoo_select, "linktarget", /*linktarget*/ ctx[4]);
			}

			if (dirty & /*labeltext*/ 2) {
				set_custom_element_data(zoo_select, "labeltext", /*labeltext*/ ctx[1]);
			}

			if (dirty & /*inputerrormsg*/ 32) {
				set_custom_element_data(zoo_select, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			}

			if (dirty & /*infotext*/ 64) {
				set_custom_element_data(zoo_select, "infotext", /*infotext*/ ctx[6]);
			}

			if (dirty & /*valid*/ 128) {
				set_custom_element_data(zoo_select, "valid", /*valid*/ ctx[7]);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(zoo_select);
			/*slot_binding_1*/ ctx[28](null);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block$1.name,
		type: "else",
		source: "(23:1) {:else}",
		ctx
	});

	return block;
}

// (3:1) {#if !_isMobile}
function create_if_block$3(ctx) {
	let zoo_input;
	let label;
	let t0;
	let t1;
	let input;
	let input_disabled_value;
	let t2;
	let div;
	let t3;
	let span;
	let t4;
	let t5;
	let slot;
	let dispose;
	let if_block0 = /*_valueSelected*/ ctx[14] && create_if_block_3$1(ctx);
	let if_block1 = /*loading*/ ctx[9] && create_if_block_2$1(ctx);
	let if_block2 = /*tooltipText*/ ctx[15] && create_if_block_1$1(ctx);

	const block = {
		c: function create() {
			zoo_input = element("zoo-input");
			label = element("label");
			t0 = text(/*labeltext*/ ctx[1]);
			t1 = space();
			input = element("input");
			t2 = space();
			div = element("div");
			if (if_block0) if_block0.c();
			t3 = space();
			span = element("span");
			if (if_block1) if_block1.c();
			t4 = space();
			if (if_block2) if_block2.c();
			t5 = space();
			slot = element("slot");
			attr_dev(label, "for", "input");
			attr_dev(label, "slot", "inputlabel");
			add_location(label, file$a, 4, 3, 288);
			attr_dev(input, "id", "input");
			input.disabled = input_disabled_value = /*_selectElement*/ ctx[12] && /*_selectElement*/ ctx[12].disabled;
			attr_dev(input, "slot", "inputelement");
			attr_dev(input, "type", "text");
			attr_dev(input, "placeholder", /*placeholder*/ ctx[8]);
			add_location(input, file$a, 5, 3, 348);
			attr_dev(div, "slot", "inputelement");
			attr_dev(div, "class", "close");
			add_location(div, file$a, 6, 3, 538);
			attr_dev(span, "slot", "inputelement");
			add_location(span, file$a, 11, 3, 786);
			set_custom_element_data(zoo_input, "type", "text");
			set_custom_element_data(zoo_input, "valid", /*valid*/ ctx[7]);
			set_custom_element_data(zoo_input, "labelposition", /*labelposition*/ ctx[0]);
			set_custom_element_data(zoo_input, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			set_custom_element_data(zoo_input, "linktext", /*linktext*/ ctx[2]);
			set_custom_element_data(zoo_input, "linkhref", /*linkhref*/ ctx[3]);
			set_custom_element_data(zoo_input, "linktarget", /*linktarget*/ ctx[4]);
			set_custom_element_data(zoo_input, "infotext", /*infotext*/ ctx[6]);
			add_location(zoo_input, file$a, 3, 2, 175);
			attr_dev(slot, "name", "selectelement");
			add_location(slot, file$a, 21, 2, 1056);
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, zoo_input, anchor);
			append_dev(zoo_input, label);
			append_dev(label, t0);
			append_dev(zoo_input, t1);
			append_dev(zoo_input, input);
			/*input_binding*/ ctx[24](input);
			append_dev(zoo_input, t2);
			append_dev(zoo_input, div);
			if (if_block0) if_block0.m(div, null);
			append_dev(zoo_input, t3);
			append_dev(zoo_input, span);
			if (if_block1) if_block1.m(span, null);
			append_dev(zoo_input, t4);
			if (if_block2) if_block2.m(zoo_input, null);
			insert_dev(target, t5, anchor);
			insert_dev(target, slot, anchor);
			/*slot_binding*/ ctx[27](slot);
			if (remount) run_all(dispose);

			dispose = [
				listen_dev(input, "input", /*input_handler*/ ctx[25], false, false, false),
				listen_dev(div, "click", /*click_handler*/ ctx[26], false, false, false)
			];
		},
		p: function update(ctx, dirty) {
			if (dirty & /*labeltext*/ 2) set_data_dev(t0, /*labeltext*/ ctx[1]);

			if (dirty & /*_selectElement*/ 4096 && input_disabled_value !== (input_disabled_value = /*_selectElement*/ ctx[12] && /*_selectElement*/ ctx[12].disabled)) {
				prop_dev(input, "disabled", input_disabled_value);
			}

			if (dirty & /*placeholder*/ 256) {
				attr_dev(input, "placeholder", /*placeholder*/ ctx[8]);
			}

			if (/*_valueSelected*/ ctx[14]) {
				if (if_block0) ; else {
					if_block0 = create_if_block_3$1(ctx);
					if_block0.c();
					if_block0.m(div, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*loading*/ ctx[9]) {
				if (if_block1) ; else {
					if_block1 = create_if_block_2$1(ctx);
					if_block1.c();
					if_block1.m(span, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*tooltipText*/ ctx[15]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_1$1(ctx);
					if_block2.c();
					if_block2.m(zoo_input, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (dirty & /*valid*/ 128) {
				set_custom_element_data(zoo_input, "valid", /*valid*/ ctx[7]);
			}

			if (dirty & /*labelposition*/ 1) {
				set_custom_element_data(zoo_input, "labelposition", /*labelposition*/ ctx[0]);
			}

			if (dirty & /*inputerrormsg*/ 32) {
				set_custom_element_data(zoo_input, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			}

			if (dirty & /*linktext*/ 4) {
				set_custom_element_data(zoo_input, "linktext", /*linktext*/ ctx[2]);
			}

			if (dirty & /*linkhref*/ 8) {
				set_custom_element_data(zoo_input, "linkhref", /*linkhref*/ ctx[3]);
			}

			if (dirty & /*linktarget*/ 16) {
				set_custom_element_data(zoo_input, "linktarget", /*linktarget*/ ctx[4]);
			}

			if (dirty & /*infotext*/ 64) {
				set_custom_element_data(zoo_input, "infotext", /*infotext*/ ctx[6]);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(zoo_input);
			/*input_binding*/ ctx[24](null);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (detaching) detach_dev(t5);
			if (detaching) detach_dev(slot);
			/*slot_binding*/ ctx[27](null);
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$3.name,
		type: "if",
		source: "(3:1) {#if !_isMobile}",
		ctx
	});

	return block;
}

// (8:4) {#if _valueSelected}
function create_if_block_3$1(ctx) {
	let svg;
	let path;

	const block = {
		c: function create() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr_dev(path, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
			add_location(path, file$a, 8, 53, 693);
			attr_dev(svg, "width", "20");
			attr_dev(svg, "height", "20");
			attr_dev(svg, "viewBox", "0 0 24 24");
			add_location(svg, file$a, 8, 5, 645);
		},
		m: function mount(target, anchor) {
			insert_dev(target, svg, anchor);
			append_dev(svg, path);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(svg);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_3$1.name,
		type: "if",
		source: "(8:4) {#if _valueSelected}",
		ctx
	});

	return block;
}

// (13:4) {#if loading}
function create_if_block_2$1(ctx) {
	let zoo_preloader;

	const block = {
		c: function create() {
			zoo_preloader = element("zoo-preloader");
			add_location(zoo_preloader, file$a, 13, 5, 836);
		},
		m: function mount(target, anchor) {
			insert_dev(target, zoo_preloader, anchor);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(zoo_preloader);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_2$1.name,
		type: "if",
		source: "(13:4) {#if loading}",
		ctx
	});

	return block;
}

// (17:3) {#if tooltipText}
function create_if_block_1$1(ctx) {
	let zoo_tooltip;

	const block = {
		c: function create() {
			zoo_tooltip = element("zoo-tooltip");
			set_custom_element_data(zoo_tooltip, "slot", "inputelement");
			set_custom_element_data(zoo_tooltip, "class", "selected-options");
			set_custom_element_data(zoo_tooltip, "position", "right");
			set_custom_element_data(zoo_tooltip, "text", /*tooltipText*/ ctx[15]);
			add_location(zoo_tooltip, file$a, 17, 4, 914);
		},
		m: function mount(target, anchor) {
			insert_dev(target, zoo_tooltip, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*tooltipText*/ 32768) {
				set_custom_element_data(zoo_tooltip, "text", /*tooltipText*/ ctx[15]);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(zoo_tooltip);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1$1.name,
		type: "if",
		source: "(17:3) {#if tooltipText}",
		ctx
	});

	return block;
}

function create_fragment$a(ctx) {
	let div;
	let div_class_value;

	function select_block_type(ctx, dirty) {
		if (!/*_isMobile*/ ctx[13]) return create_if_block$3;
		return create_else_block$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	const block = {
		c: function create() {
			div = element("div");
			if_block.c();
			this.c = noop;
			attr_dev(div, "class", div_class_value = "box " + (/*valid*/ ctx[7] ? "" : "error") + " " + (/*hidden*/ ctx[16] ? "hidden" : ""));
			toggle_class(div, "mobile", /*_isMobile*/ ctx[13]);
			add_location(div, file$a, 1, 0, 62);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			if_block.m(div, null);
		},
		p: function update(ctx, [dirty]) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(div, null);
				}
			}

			if (dirty & /*valid, hidden*/ 65664 && div_class_value !== (div_class_value = "box " + (/*valid*/ ctx[7] ? "" : "error") + " " + (/*hidden*/ ctx[16] ? "hidden" : ""))) {
				attr_dev(div, "class", div_class_value);
			}

			if (dirty & /*valid, hidden, _isMobile*/ 73856) {
				toggle_class(div, "mobile", /*_isMobile*/ ctx[13]);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if_block.d();
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
	let { labelposition = "top" } = $$props;
	let { labeltext = "" } = $$props;
	let { linktext = "" } = $$props;
	let { linkhref = "" } = $$props;
	let { linktarget = "about:blank" } = $$props;
	let { inputerrormsg = "" } = $$props;
	let { infotext = "" } = $$props;
	let { valid = true } = $$props;
	let { placeholder = "" } = $$props;
	let { loading = false } = $$props;
	let searchableInput;
	let _selectSlot;
	let _selectElement;
	let options;
	let _isMobile;
	let _valueSelected;
	let tooltipText;
	let hidden = true;

	onMount(() => {
		$$invalidate(13, _isMobile = isMobile());
		if (_isMobile) $$invalidate(16, hidden = false);

		// todo support multiple slots
		_selectSlot.addEventListener("slotchange", () => {
			let select = _selectSlot.assignedNodes()[0];
			$$invalidate(12, _selectElement = select);
			options = select.options;
			select.size = 4;
			select.addEventListener("blur", () => _hideSelectOptions());
			select.addEventListener("change", () => handleOptionChange());
			select.addEventListener("change", e => $$invalidate(14, _valueSelected = e.target.value ? true : false));
			select.addEventListener("keydown", e => handleOptionKeydown(e));
		});

		if (searchableInput) {
			searchableInput.addEventListener("focus", () => $$invalidate(16, hidden = false));

			searchableInput.addEventListener("blur", event => {
				if (event.relatedTarget !== _selectElement) {
					_hideSelectOptions();
				}
			});
		}
	});

	const handleSearchChange = () => {
		const inputVal = searchableInput.value.toLowerCase();

		for (const option of options) {
			if (option.text.toLowerCase().indexOf(inputVal) > -1) option.style.display = "block"; else option.style.display = "none";
		}
	};

	const handleOptionKeydown = e => {
		if (e.keyCode && e.keyCode === 13) {
			handleOptionChange();
		}
	};

	const handleOptionChange = () => {
		if (!_selectElement) {
			return;
		}

		let inputValString = "";

		for (const selectedOpts of _selectElement.selectedOptions) {
			inputValString += selectedOpts.text + ", \n";
		}

		inputValString = inputValString.substr(0, inputValString.length - 3);
		$$invalidate(15, tooltipText = inputValString);

		if (searchableInput) {
			$$invalidate(
				10,
				searchableInput.placeholder = inputValString && inputValString.length > 0
				? inputValString
				: placeholder,
				searchableInput
			);
		}

		for (const option of options) {
			option.style.display = "block";
		}

		if (!_selectElement.multiple) _hideSelectOptions();
	};

	const _hideSelectOptions = () => {
		$$invalidate(16, hidden = true);

		if (searchableInput) {
			$$invalidate(10, searchableInput.value = null, searchableInput);
		}
	};

	const isMobile = () => {
		const index = navigator.appVersion.indexOf("Mobile");
		return index > -1;
	};

	const handleCrossClick = () => {
		$$invalidate(12, _selectElement.value = null, _selectElement);
		_selectElement.dispatchEvent(new Event("change"));
	};

	const writable_props = [
		"labelposition",
		"labeltext",
		"linktext",
		"linkhref",
		"linktarget",
		"inputerrormsg",
		"infotext",
		"valid",
		"placeholder",
		"loading"
	];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-searchable-select> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-searchable-select", $$slots, []);

	function input_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(10, searchableInput = $$value);
		});
	}

	const input_handler = () => handleSearchChange();
	const click_handler = e => handleCrossClick();

	function slot_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(11, _selectSlot = $$value);
		});
	}

	function slot_binding_1($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(11, _selectSlot = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("labelposition" in $$props) $$invalidate(0, labelposition = $$props.labelposition);
		if ("labeltext" in $$props) $$invalidate(1, labeltext = $$props.labeltext);
		if ("linktext" in $$props) $$invalidate(2, linktext = $$props.linktext);
		if ("linkhref" in $$props) $$invalidate(3, linkhref = $$props.linkhref);
		if ("linktarget" in $$props) $$invalidate(4, linktarget = $$props.linktarget);
		if ("inputerrormsg" in $$props) $$invalidate(5, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(6, infotext = $$props.infotext);
		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
		if ("placeholder" in $$props) $$invalidate(8, placeholder = $$props.placeholder);
		if ("loading" in $$props) $$invalidate(9, loading = $$props.loading);
	};

	$$self.$capture_state = () => ({
		onMount,
		labelposition,
		labeltext,
		linktext,
		linkhref,
		linktarget,
		inputerrormsg,
		infotext,
		valid,
		placeholder,
		loading,
		searchableInput,
		_selectSlot,
		_selectElement,
		options,
		_isMobile,
		_valueSelected,
		tooltipText,
		hidden,
		handleSearchChange,
		handleOptionKeydown,
		handleOptionChange,
		_hideSelectOptions,
		isMobile,
		handleCrossClick
	});

	$$self.$inject_state = $$props => {
		if ("labelposition" in $$props) $$invalidate(0, labelposition = $$props.labelposition);
		if ("labeltext" in $$props) $$invalidate(1, labeltext = $$props.labeltext);
		if ("linktext" in $$props) $$invalidate(2, linktext = $$props.linktext);
		if ("linkhref" in $$props) $$invalidate(3, linkhref = $$props.linkhref);
		if ("linktarget" in $$props) $$invalidate(4, linktarget = $$props.linktarget);
		if ("inputerrormsg" in $$props) $$invalidate(5, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(6, infotext = $$props.infotext);
		if ("valid" in $$props) $$invalidate(7, valid = $$props.valid);
		if ("placeholder" in $$props) $$invalidate(8, placeholder = $$props.placeholder);
		if ("loading" in $$props) $$invalidate(9, loading = $$props.loading);
		if ("searchableInput" in $$props) $$invalidate(10, searchableInput = $$props.searchableInput);
		if ("_selectSlot" in $$props) $$invalidate(11, _selectSlot = $$props._selectSlot);
		if ("_selectElement" in $$props) $$invalidate(12, _selectElement = $$props._selectElement);
		if ("options" in $$props) options = $$props.options;
		if ("_isMobile" in $$props) $$invalidate(13, _isMobile = $$props._isMobile);
		if ("_valueSelected" in $$props) $$invalidate(14, _valueSelected = $$props._valueSelected);
		if ("tooltipText" in $$props) $$invalidate(15, tooltipText = $$props.tooltipText);
		if ("hidden" in $$props) $$invalidate(16, hidden = $$props.hidden);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		labelposition,
		labeltext,
		linktext,
		linkhref,
		linktarget,
		inputerrormsg,
		infotext,
		valid,
		placeholder,
		loading,
		searchableInput,
		_selectSlot,
		_selectElement,
		_isMobile,
		_valueSelected,
		tooltipText,
		hidden,
		handleSearchChange,
		handleCrossClick,
		handleOptionChange,
		options,
		handleOptionKeydown,
		_hideSelectOptions,
		isMobile,
		input_binding,
		input_handler,
		click_handler,
		slot_binding,
		slot_binding_1
	];
}

class SearchableSelect extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host,.box{position:relative}.close{display:inline-block;position:absolute;top:15px;right:14px;cursor:pointer;background:white;z-index:1}.box:hover .selected-options{display:block}.selected-options{display:none}.selected-options:hover{display:block}.mobile ::slotted(select){border-radius:3px;border:1px solid #767676;position:relative;top:0}::slotted(select){-webkit-appearance:none;-moz-appearance:none;width:100%;background:white;padding:13px 15px;border:1px solid #767676;border-bottom-left-radius:3px;border-bottom-right-radius:3px;border-top:none;position:absolute;z-index:2;top:60px;font-size:14px}.box.hidden ::slotted(select){display:none}.box input{padding:13px 25px 13px 15px}.box.error input{padding:12px 24px 12px 14px}.box:focus-within ::slotted(select){border:2px solid #555555;border-top:none;padding:12px 14px}.box.mobile:focus-within ::slotted(select){border:2px solid #555555;padding:12px 14px}.box:focus-within input{border:2px solid #555555;padding:12px 24px 12px 14px}.box.error ::slotted(select){border:2px solid var(--warning-mid, #ED1C24);border-top:none;padding:12px 14px}.box.error input{border:2px solid var(--warning-mid, #ED1C24)}::slotted(select:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#767676}::slotted(select:disabled:hover){cursor:not-allowed}</style>`;

		init(this, { target: this.shadowRoot }, instance$a, create_fragment$a, safe_not_equal, {
			labelposition: 0,
			labeltext: 1,
			linktext: 2,
			linkhref: 3,
			linktarget: 4,
			inputerrormsg: 5,
			infotext: 6,
			valid: 7,
			placeholder: 8,
			loading: 9,
			handleOptionChange: 19
		});

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
		return [
			"labelposition",
			"labeltext",
			"linktext",
			"linkhref",
			"linktarget",
			"inputerrormsg",
			"infotext",
			"valid",
			"placeholder",
			"loading",
			"handleOptionChange"
		];
	}

	get labelposition() {
		return this.$$.ctx[0];
	}

	set labelposition(labelposition) {
		this.$set({ labelposition });
		flush();
	}

	get labeltext() {
		return this.$$.ctx[1];
	}

	set labeltext(labeltext) {
		this.$set({ labeltext });
		flush();
	}

	get linktext() {
		return this.$$.ctx[2];
	}

	set linktext(linktext) {
		this.$set({ linktext });
		flush();
	}

	get linkhref() {
		return this.$$.ctx[3];
	}

	set linkhref(linkhref) {
		this.$set({ linkhref });
		flush();
	}

	get linktarget() {
		return this.$$.ctx[4];
	}

	set linktarget(linktarget) {
		this.$set({ linktarget });
		flush();
	}

	get inputerrormsg() {
		return this.$$.ctx[5];
	}

	set inputerrormsg(inputerrormsg) {
		this.$set({ inputerrormsg });
		flush();
	}

	get infotext() {
		return this.$$.ctx[6];
	}

	set infotext(infotext) {
		this.$set({ infotext });
		flush();
	}

	get valid() {
		return this.$$.ctx[7];
	}

	set valid(valid) {
		this.$set({ valid });
		flush();
	}

	get placeholder() {
		return this.$$.ctx[8];
	}

	set placeholder(placeholder) {
		this.$set({ placeholder });
		flush();
	}

	get loading() {
		return this.$$.ctx[9];
	}

	set loading(loading) {
		this.$set({ loading });
		flush();
	}

	get handleOptionChange() {
		return this.$$.ctx[19];
	}

	set handleOptionChange(value) {
		throw new Error("<zoo-searchable-select>: Cannot set read-only property 'handleOptionChange'");
	}
}

customElements.define("zoo-searchable-select", SearchableSelect);

/* zoo-modules/link-module/Link.svelte generated by Svelte v3.22.3 */

const file$b = "zoo-modules/link-module/Link.svelte";

function create_fragment$b(ctx) {
	let div1;
	let slot0;
	let t0;
	let a;
	let span;
	let t1;
	let t2;
	let div0;
	let a_class_value;
	let t3;
	let slot1;
	let dispose;

	const block = {
		c: function create() {
			div1 = element("div");
			slot0 = element("slot");
			t0 = space();
			a = element("a");
			span = element("span");
			t1 = text(/*text*/ ctx[1]);
			t2 = space();
			div0 = element("div");
			t3 = space();
			slot1 = element("slot");
			this.c = noop;
			attr_dev(slot0, "name", "pre");
			add_location(slot0, file$b, 2, 1, 100);
			add_location(span, file$b, 4, 2, 279);
			attr_dev(div0, "class", "bottom-line");
			add_location(div0, file$b, 5, 2, 301);
			set_style(a, "text-align", /*textalign*/ ctx[5]);
			attr_dev(a, "href", /*href*/ ctx[0]);
			attr_dev(a, "target", /*target*/ ctx[2]);
			attr_dev(a, "class", a_class_value = "" + (/*type*/ ctx[3] + " " + /*size*/ ctx[6]));
			toggle_class(a, "disabled", /*disabled*/ ctx[4]);
			add_location(a, file$b, 3, 1, 126);
			attr_dev(slot1, "name", "post");
			add_location(slot1, file$b, 7, 1, 340);
			attr_dev(div1, "class", "box");
			toggle_class(div1, "hidden", !/*text*/ ctx[1] || !/*href*/ ctx[0]);
			add_location(div1, file$b, 1, 0, 49);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, div1, anchor);
			append_dev(div1, slot0);
			append_dev(div1, t0);
			append_dev(div1, a);
			append_dev(a, span);
			append_dev(span, t1);
			append_dev(a, t2);
			append_dev(a, div0);
			append_dev(div1, t3);
			append_dev(div1, slot1);
			if (remount) dispose();
			dispose = listen_dev(a, "click", /*click_handler*/ ctx[8], false, false, false);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*text*/ 2) set_data_dev(t1, /*text*/ ctx[1]);

			if (dirty & /*textalign*/ 32) {
				set_style(a, "text-align", /*textalign*/ ctx[5]);
			}

			if (dirty & /*href*/ 1) {
				attr_dev(a, "href", /*href*/ ctx[0]);
			}

			if (dirty & /*target*/ 4) {
				attr_dev(a, "target", /*target*/ ctx[2]);
			}

			if (dirty & /*type, size*/ 72 && a_class_value !== (a_class_value = "" + (/*type*/ ctx[3] + " " + /*size*/ ctx[6]))) {
				attr_dev(a, "class", a_class_value);
			}

			if (dirty & /*type, size, disabled*/ 88) {
				toggle_class(a, "disabled", /*disabled*/ ctx[4]);
			}

			if (dirty & /*text, href*/ 3) {
				toggle_class(div1, "hidden", !/*text*/ ctx[1] || !/*href*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div1);
			dispose();
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
	let { href = "" } = $$props;
	let { text = "" } = $$props;
	let { target = "about:blank" } = $$props;
	let { type = "negative" } = $$props; // primary, grey, warning
	let { disabled = false } = $$props;
	let { textalign = "center" } = $$props;
	let { size = "regular" } = $$props; // bold, large

	const handleClick = e => {
		if (disabled) e.preventDefault();
	};

	const writable_props = ["href", "text", "target", "type", "disabled", "textalign", "size"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-link> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-link", $$slots, []);
	const click_handler = e => handleClick(e);

	$$self.$set = $$props => {
		if ("href" in $$props) $$invalidate(0, href = $$props.href);
		if ("text" in $$props) $$invalidate(1, text = $$props.text);
		if ("target" in $$props) $$invalidate(2, target = $$props.target);
		if ("type" in $$props) $$invalidate(3, type = $$props.type);
		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
		if ("textalign" in $$props) $$invalidate(5, textalign = $$props.textalign);
		if ("size" in $$props) $$invalidate(6, size = $$props.size);
	};

	$$self.$capture_state = () => ({
		href,
		text,
		target,
		type,
		disabled,
		textalign,
		size,
		handleClick
	});

	$$self.$inject_state = $$props => {
		if ("href" in $$props) $$invalidate(0, href = $$props.href);
		if ("text" in $$props) $$invalidate(1, text = $$props.text);
		if ("target" in $$props) $$invalidate(2, target = $$props.target);
		if ("type" in $$props) $$invalidate(3, type = $$props.type);
		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
		if ("textalign" in $$props) $$invalidate(5, textalign = $$props.textalign);
		if ("size" in $$props) $$invalidate(6, size = $$props.size);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		href,
		text,
		target,
		type,
		disabled,
		textalign,
		size,
		handleClick,
		click_handler
	];
}

class Link extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:layout;display:flex}.box{width:100%;height:100%;display:flex;justify-content:center;align-items:center;position:relative;padding:0 5px}a{text-decoration:none;font-size:12px;line-height:14px;padding:0 2px;color:#FFFFFF}a:hover,a:focus,a:active{color:#FFFFFF;cursor:pointer}.hidden,.hidden a{padding:0}.negative:hover .bottom-line{width:100%}.bottom-line{position:absolute;bottom:-3px;left:0;overflow:hidden;width:0;border-bottom:1px solid #FFFFFF;color:#FFFFFF}.disabled{color:#767676 !important}.disabled:hover{cursor:not-allowed}.primary{color:var(--primary-mid, #3C9700)}.primary:visited{color:var(--primary-light, #66B100)}.primary:hover,.primary:focus,.primary:active{color:var(--primary-dark, #286400)}.grey{color:#767676}.grey:hover,.grey:focus,.grey:active{color:var(--primary-dark, #286400)}.warning{color:#ED1C24}.warning:hover,.warning:focus,.warning:active{color:var(--warning-dark, #BD161C)}.large{font-size:18px;line-height:22px;font-weight:bold}.bold{font-weight:bold}.bold:active{background:#E6E6E6;border-radius:5px}</style>`;

		init(this, { target: this.shadowRoot }, instance$b, create_fragment$b, safe_not_equal, {
			href: 0,
			text: 1,
			target: 2,
			type: 3,
			disabled: 4,
			textalign: 5,
			size: 6
		});

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
		return ["href", "text", "target", "type", "disabled", "textalign", "size"];
	}

	get href() {
		return this.$$.ctx[0];
	}

	set href(href) {
		this.$set({ href });
		flush();
	}

	get text() {
		return this.$$.ctx[1];
	}

	set text(text) {
		this.$set({ text });
		flush();
	}

	get target() {
		return this.$$.ctx[2];
	}

	set target(target) {
		this.$set({ target });
		flush();
	}

	get type() {
		return this.$$.ctx[3];
	}

	set type(type) {
		this.$set({ type });
		flush();
	}

	get disabled() {
		return this.$$.ctx[4];
	}

	set disabled(disabled) {
		this.$set({ disabled });
		flush();
	}

	get textalign() {
		return this.$$.ctx[5];
	}

	set textalign(textalign) {
		this.$set({ textalign });
		flush();
	}

	get size() {
		return this.$$.ctx[6];
	}

	set size(size) {
		this.$set({ size });
		flush();
	}
}

customElements.define("zoo-link", Link);

/* zoo-modules/shared-module/InputInfo.svelte generated by Svelte v3.22.3 */
const file$c = "zoo-modules/shared-module/InputInfo.svelte";

function create_fragment$c(ctx) {
	let div2;
	let div0;
	let t0;
	let t1;
	let div1;
	let t2;
	let t3;
	let template;
	let style;
	let t5;
	let svg;
	let path;

	const block = {
		c: function create() {
			div2 = element("div");
			div0 = element("div");
			t0 = text(/*infotext*/ ctx[2]);
			t1 = space();
			div1 = element("div");
			t2 = text(/*inputerrormsg*/ ctx[1]);
			t3 = space();
			template = element("template");
			style = element("style");
			style.textContent = "svg {padding-right: 5px;}";
			t5 = space();
			svg = svg_element("svg");
			path = svg_element("path");
			this.c = noop;
			attr_dev(div0, "class", "info");
			toggle_class(div0, "hidden", !/*infotext*/ ctx[2]);
			add_location(div0, file$c, 2, 1, 79);
			attr_dev(div1, "class", "error");
			toggle_class(div1, "hidden", /*valid*/ ctx[0] || !/*inputerrormsg*/ ctx[1]);
			add_location(div1, file$c, 3, 1, 142);
			add_location(style, file$c, 5, 2, 248);
			attr_dev(path, "d", "M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z");
			add_location(path, file$c, 7, 3, 343);
			attr_dev(svg, "width", "18");
			attr_dev(svg, "height", "18");
			attr_dev(svg, "viewBox", "0 0 24 24");
			add_location(svg, file$c, 6, 2, 291);
			attr_dev(template, "id", "icon");
			add_location(template, file$c, 4, 1, 225);
			add_location(div2, file$c, 1, 0, 55);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div2, anchor);
			append_dev(div2, div0);
			append_dev(div0, t0);
			append_dev(div2, t1);
			append_dev(div2, div1);
			append_dev(div1, t2);
			append_dev(div2, t3);
			append_dev(div2, template);
			append_dev(template.content, style);
			append_dev(template.content, t5);
			append_dev(template.content, svg);
			append_dev(svg, path);
			/*div2_binding*/ ctx[4](div2);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*infotext*/ 4) set_data_dev(t0, /*infotext*/ ctx[2]);

			if (dirty & /*infotext*/ 4) {
				toggle_class(div0, "hidden", !/*infotext*/ ctx[2]);
			}

			if (dirty & /*inputerrormsg*/ 2) set_data_dev(t2, /*inputerrormsg*/ ctx[1]);

			if (dirty & /*valid, inputerrormsg*/ 3) {
				toggle_class(div1, "hidden", /*valid*/ ctx[0] || !/*inputerrormsg*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div2);
			/*div2_binding*/ ctx[4](null);
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
	let { valid = true } = $$props;
	let { inputerrormsg = "" } = $$props;
	let { infotext = "" } = $$props;
	let root;

	onMount(() => {
		const iconContent = root.querySelector("#icon").content;
		root.querySelector(".info").prepend(iconContent.cloneNode(true));
		root.querySelector(".error").prepend(iconContent.cloneNode(true));
	});

	const writable_props = ["valid", "inputerrormsg", "infotext"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-input-info> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-input-info", $$slots, []);

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(3, root = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
		if ("inputerrormsg" in $$props) $$invalidate(1, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(2, infotext = $$props.infotext);
	};

	$$self.$capture_state = () => ({
		onMount,
		valid,
		inputerrormsg,
		infotext,
		root
	});

	$$self.$inject_state = $$props => {
		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
		if ("inputerrormsg" in $$props) $$invalidate(1, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(2, infotext = $$props.infotext);
		if ("root" in $$props) $$invalidate(3, root = $$props.root);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [valid, inputerrormsg, infotext, root, div2_binding];
}

class InputInfo extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>.info,.error{padding:0 2px 2px 0;font-size:12px;line-height:14px;color:#555555;display:flex;align-items:center}.info.hidden,.error.hidden{display:none}.info svg path{fill:var(--info-mid, #459FD0)}.error svg path{fill:var(--warning-mid, #ED1C24)}</style>`;
		init(this, { target: this.shadowRoot }, instance$c, create_fragment$c, safe_not_equal, { valid: 0, inputerrormsg: 1, infotext: 2 });

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
		return ["valid", "inputerrormsg", "infotext"];
	}

	get valid() {
		return this.$$.ctx[0];
	}

	set valid(valid) {
		this.$set({ valid });
		flush();
	}

	get inputerrormsg() {
		return this.$$.ctx[1];
	}

	set inputerrormsg(inputerrormsg) {
		this.$set({ inputerrormsg });
		flush();
	}

	get infotext() {
		return this.$$.ctx[2];
	}

	set infotext(infotext) {
		this.$set({ infotext });
		flush();
	}
}

customElements.define("zoo-input-info", InputInfo);

/* zoo-modules/navigation-module/Navigation.svelte generated by Svelte v3.22.3 */

const file$d = "zoo-modules/navigation-module/Navigation.svelte";

function create_fragment$d(ctx) {
	let nav;
	let slot;

	const block = {
		c: function create() {
			nav = element("nav");
			slot = element("slot");
			this.c = noop;
			add_location(slot, file$d, 1, 5, 60);
			add_location(nav, file$d, 1, 0, 55);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, nav, anchor);
			append_dev(nav, slot);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(nav);
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

function instance$d($$self, $$props) {
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-navigation> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-navigation", $$slots, []);
	return [];
}

class Navigation extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:layout}nav{height:56px;background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100))}::slotted(*:first-child){display:flex;flex-direction:row;height:100%;overflow:auto;overflow-y:hidden;padding:0 20px}</style>`;
		init(this, { target: this.shadowRoot }, instance$d, create_fragment$d, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert_dev(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-navigation", Navigation);

/* zoo-modules/shared-module/InputLabel.svelte generated by Svelte v3.22.3 */

const file$e = "zoo-modules/shared-module/InputLabel.svelte";

function create_fragment$e(ctx) {
	let label;
	let t;

	const block = {
		c: function create() {
			label = element("label");
			t = text(/*labeltext*/ ctx[0]);
			this.c = noop;
			add_location(label, file$e, 1, 0, 56);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, label, anchor);
			append_dev(label, t);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*labeltext*/ 1) set_data_dev(t, /*labeltext*/ ctx[0]);
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(label);
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
	let { labeltext = "" } = $$props;
	const writable_props = ["labeltext"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-input-label> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-input-label", $$slots, []);

	$$self.$set = $$props => {
		if ("labeltext" in $$props) $$invalidate(0, labeltext = $$props.labeltext);
	};

	$$self.$capture_state = () => ({ labeltext });

	$$self.$inject_state = $$props => {
		if ("labeltext" in $$props) $$invalidate(0, labeltext = $$props.labeltext);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [labeltext];
}

class InputLabel extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>label{font-size:14px;line-height:20px;font-weight:800;color:#555555;text-align:left}</style>`;
		init(this, { target: this.shadowRoot }, instance$e, create_fragment$e, safe_not_equal, { labeltext: 0 });

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
		return ["labeltext"];
	}

	get labeltext() {
		return this.$$.ctx[0];
	}

	set labeltext(labeltext) {
		this.$set({ labeltext });
		flush();
	}
}

customElements.define("zoo-input-label", InputLabel);

/* zoo-modules/toast-module/Toast.svelte generated by Svelte v3.22.3 */

const file$f = "zoo-modules/toast-module/Toast.svelte";

function create_fragment$f(ctx) {
	let div;
	let svg0;
	let path0;
	let t0;
	let span;
	let t1;
	let t2;
	let svg1;
	let path1;
	let div_class_value;
	let dispose;

	const block = {
		c: function create() {
			div = element("div");
			svg0 = svg_element("svg");
			path0 = svg_element("path");
			t0 = space();
			span = element("span");
			t1 = text(/*text*/ ctx[1]);
			t2 = space();
			svg1 = svg_element("svg");
			path1 = svg_element("path");
			this.c = noop;
			attr_dev(path0, "d", "M14.2 21c.4.1.6.6.5 1a2.8 2.8 0 01-5.4 0 .7.7 0 111.4-.5 1.3 1.3 0 002.6 0c.1-.4.5-.6 1-.5zM12 0c.4 0 .8.3.8.8v1.5c4.2.4 7.4 3.9 7.4 8.2 0 3 .3 5.1.8 6.5l.4 1v.2c.6.4.3 1.3-.4 1.3H3c-.6 0-1-.7-.6-1.2.1-.2.4-.6.6-1.5.5-1.5.7-3.6.7-6.3 0-4.3 3.3-7.8 7.6-8.2V.8c0-.5.3-.8.7-.8zm0 3.8c-3.7 0-6.7 3-6.8 6.7a24.2 24.2 0 01-1 7.5h15.5l-.2-.5c-.5-1.6-.8-3.8-.8-7 0-3.7-3-6.8-6.7-6.8z");
			add_location(path0, file$f, 3, 2, 178);
			attr_dev(svg0, "width", "30");
			attr_dev(svg0, "height", "30");
			attr_dev(svg0, "viewBox", "0 0 24 24");
			add_location(svg0, file$f, 2, 1, 127);
			attr_dev(span, "class", "text");
			add_location(span, file$f, 5, 1, 575);
			attr_dev(path1, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
			add_location(path1, file$f, 7, 2, 701);
			attr_dev(svg1, "class", "close");
			attr_dev(svg1, "width", "24");
			attr_dev(svg1, "height", "24");
			attr_dev(svg1, "viewBox", "0 0 24 24");
			add_location(svg1, file$f, 6, 1, 609);
			attr_dev(div, "class", div_class_value = "toast " + (/*hidden*/ ctx[3] ? "hide" : "show") + " " + /*type*/ ctx[0]);
			add_location(div, file$f, 1, 0, 50);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, div, anchor);
			append_dev(div, svg0);
			append_dev(svg0, path0);
			append_dev(div, t0);
			append_dev(div, span);
			append_dev(span, t1);
			append_dev(div, t2);
			append_dev(div, svg1);
			append_dev(svg1, path1);
			/*div_binding*/ ctx[9](div);
			if (remount) dispose();
			dispose = listen_dev(svg1, "click", /*click_handler*/ ctx[8], false, false, false);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*text*/ 2) set_data_dev(t1, /*text*/ ctx[1]);

			if (dirty & /*hidden, type*/ 9 && div_class_value !== (div_class_value = "toast " + (/*hidden*/ ctx[3] ? "hide" : "show") + " " + /*type*/ ctx[0])) {
				attr_dev(div, "class", div_class_value);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			/*div_binding*/ ctx[9](null);
			dispose();
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
	let { type = "info" } = $$props;
	let { text = "" } = $$props;
	let { timeout = 3 } = $$props;
	let hidden = true;
	let toastRoot;
	let timeoutVar;

	const show = () => {
		if (!hidden) return;
		const root = toastRoot.getRootNode().host;
		root.style.display = "block";

		timeoutVar = setTimeout(
			() => {
				$$invalidate(3, hidden = !hidden);

				timeoutVar = setTimeout(
					() => {
						if (root && !hidden) {
							$$invalidate(3, hidden = !hidden);

							timeoutVar = setTimeout(
								() => {
									root.style.display = "none";
								},
								300
							);
						}
					},
					timeout * 1000
				);
			},
			30
		);
	};

	const close = () => {
		if (hidden) return;
		clearTimeout(timeoutVar);
		const root = toastRoot.getRootNode().host;

		setTimeout(
			() => {
				if (root && !hidden) {
					$$invalidate(3, hidden = !hidden);

					setTimeout(
						() => {
							root.style.display = "none";
						},
						300
					);
				}
			},
			30
		);
	};

	const writable_props = ["type", "text", "timeout"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-toast> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-toast", $$slots, []);
	const click_handler = () => close();

	function div_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(4, toastRoot = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("type" in $$props) $$invalidate(0, type = $$props.type);
		if ("text" in $$props) $$invalidate(1, text = $$props.text);
		if ("timeout" in $$props) $$invalidate(5, timeout = $$props.timeout);
	};

	$$self.$capture_state = () => ({
		type,
		text,
		timeout,
		hidden,
		toastRoot,
		timeoutVar,
		show,
		close
	});

	$$self.$inject_state = $$props => {
		if ("type" in $$props) $$invalidate(0, type = $$props.type);
		if ("text" in $$props) $$invalidate(1, text = $$props.text);
		if ("timeout" in $$props) $$invalidate(5, timeout = $$props.timeout);
		if ("hidden" in $$props) $$invalidate(3, hidden = $$props.hidden);
		if ("toastRoot" in $$props) $$invalidate(4, toastRoot = $$props.toastRoot);
		if ("timeoutVar" in $$props) timeoutVar = $$props.timeoutVar;
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		type,
		text,
		close,
		hidden,
		toastRoot,
		timeout,
		show,
		timeoutVar,
		click_handler,
		div_binding
	];
}

class Toast extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:none;top:20px;right:20px;position:fixed;z-index:10001;contain:layout}.toast{max-width:330px;min-height:50px;box-shadow:0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);border-left:3px solid;display:flex;align-items:center;word-break:break-word;font-size:14px;line-height:20px;padding:15px;transition:transform 0.3s, opacity 0.4s}.info{background:var(--info-ultralight, #ECF5FA);border-color:var(--info-mid, #459FD0)}.info svg{fill:var(--info-mid, #459FD0)}.error{background:var(--warning-ultralight, #FDE8E9);border-color:var(--warning-mid, #ED1C24)}.error svg{fill:var(--warning-mid, #ED1C24)}.success{background:var(--primary-ultralight, #EBF4E5);border-color:var(--primary-mid, #3C9700)}.success svg{fill:var(--primary-mid, #3C9700)}.text{flex-grow:1}.close{cursor:pointer}svg{padding-right:10px;min-width:48px}.hide{opacity:0;transform:translate3d(100%, 0, 0)}.show{opacity:1;transform:translate3d(0, 0, 0)}</style>`;

		init(this, { target: this.shadowRoot }, instance$f, create_fragment$f, safe_not_equal, {
			type: 0,
			text: 1,
			timeout: 5,
			show: 6,
			close: 2
		});

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
		return ["type", "text", "timeout", "show", "close"];
	}

	get type() {
		return this.$$.ctx[0];
	}

	set type(type) {
		this.$set({ type });
		flush();
	}

	get text() {
		return this.$$.ctx[1];
	}

	set text(text) {
		this.$set({ text });
		flush();
	}

	get timeout() {
		return this.$$.ctx[5];
	}

	set timeout(timeout) {
		this.$set({ timeout });
		flush();
	}

	get show() {
		return this.$$.ctx[6];
	}

	set show(value) {
		throw new Error("<zoo-toast>: Cannot set read-only property 'show'");
	}

	get close() {
		return this.$$.ctx[2];
	}

	set close(value) {
		throw new Error("<zoo-toast>: Cannot set read-only property 'close'");
	}
}

customElements.define("zoo-toast", Toast);

/* zoo-modules/collapsable-list-module/CollapsableList.svelte generated by Svelte v3.22.3 */
const file$g = "zoo-modules/collapsable-list-module/CollapsableList.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i];
	child_ctx[7] = i;
	return child_ctx;
}

// (3:1) {#each items as item, idx}
function create_each_block(ctx) {
	let li;
	let span;
	let t0_value = /*item*/ ctx[5].header + "";
	let t0;
	let t1;
	let svg;
	let path;
	let t2;
	let slot;
	let slot_name_value;
	let t3;
	let dispose;

	function click_handler(...args) {
		return /*click_handler*/ ctx[4](/*idx*/ ctx[7], ...args);
	}

	const block = {
		c: function create() {
			li = element("li");
			span = element("span");
			t0 = text(t0_value);
			t1 = space();
			svg = svg_element("svg");
			path = svg_element("path");
			t2 = space();
			slot = element("slot");
			t3 = space();
			attr_dev(path, "d", "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
			add_location(path, file$g, 6, 52, 304);
			attr_dev(svg, "width", "24");
			attr_dev(svg, "height", "24");
			attr_dev(svg, "viewBox", "0 0 24 24");
			add_location(svg, file$g, 6, 4, 256);
			attr_dev(span, "class", "header");
			add_location(span, file$g, 4, 3, 164);
			attr_dev(slot, "name", slot_name_value = "item" + /*idx*/ ctx[7]);
			add_location(slot, file$g, 8, 3, 392);
			attr_dev(li, "class", "item");
			toggle_class(li, "active", /*_items*/ ctx[1] && /*_items*/ ctx[1][/*idx*/ ctx[7]].active);
			add_location(li, file$g, 3, 2, 96);
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, li, anchor);
			append_dev(li, span);
			append_dev(span, t0);
			append_dev(span, t1);
			append_dev(span, svg);
			append_dev(svg, path);
			append_dev(li, t2);
			append_dev(li, slot);
			append_dev(li, t3);
			if (remount) dispose();
			dispose = listen_dev(span, "click", click_handler, false, false, false);
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*items*/ 1 && t0_value !== (t0_value = /*item*/ ctx[5].header + "")) set_data_dev(t0, t0_value);

			if (dirty & /*_items*/ 2) {
				toggle_class(li, "active", /*_items*/ ctx[1] && /*_items*/ ctx[1][/*idx*/ ctx[7]].active);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(li);
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(3:1) {#each items as item, idx}",
		ctx
	});

	return block;
}

function create_fragment$g(ctx) {
	let ul;
	let each_value = /*items*/ ctx[0];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			this.c = noop;
			add_location(ul, file$g, 1, 0, 61);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, ul, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*_items, handleItemHeaderClick, items*/ 7) {
				each_value = /*items*/ ctx[0];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(ul, null);
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
			if (detaching) detach_dev(ul);
			destroy_each(each_blocks, detaching);
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
	let { items = [] } = $$props;
	let _items;

	beforeUpdate(() => {
		if (_items != items) {
			$$invalidate(1, _items = items);
		}
	});

	const handleItemHeaderClick = (e, id) => {
		if (_items[id].active) {
			$$invalidate(1, _items[id].active = false, _items);
		} else {
			clearActiveStatus();
			$$invalidate(1, _items[id].active = true, _items);
		}
	};

	const clearActiveStatus = () => {
		for (const item of _items) {
			item.active = false;
		}
	};

	const writable_props = ["items"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-collapsable-list> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-collapsable-list", $$slots, []);
	const click_handler = (idx, e) => handleItemHeaderClick(e, idx);

	$$self.$set = $$props => {
		if ("items" in $$props) $$invalidate(0, items = $$props.items);
	};

	$$self.$capture_state = () => ({
		beforeUpdate,
		items,
		_items,
		handleItemHeaderClick,
		clearActiveStatus
	});

	$$self.$inject_state = $$props => {
		if ("items" in $$props) $$invalidate(0, items = $$props.items);
		if ("_items" in $$props) $$invalidate(1, _items = $$props._items);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [items, _items, handleItemHeaderClick, clearActiveStatus, click_handler];
}

class CollapsableList extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>.item ::slotted(*){display:none}.item.active ::slotted(*){display:initial}ul{padding:0}.item{position:relative;color:#767676;list-style-type:none;padding:0 10px;border:0}.item.active{border:1px solid rgba(0, 0, 0, 0.2)}.item.active .header{color:var(--primary-dark, #286400)}.item.active .header svg{fill:var(--primary-dark, #286400);transform:rotateX(180deg)}.header{display:flex;align-items:center;height:8px;padding:20px 0;font-size:14px;line-height:20px;color:var(--primary-mid, #3C9700);font-weight:bold;cursor:pointer}.header svg{display:flex;margin-left:auto;fill:var(--primary-mid, #3C9700);transition:transform 0.3s}</style>`;
		init(this, { target: this.shadowRoot }, instance$g, create_fragment$g, safe_not_equal, { items: 0 });

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
		return ["items"];
	}

	get items() {
		return this.$$.ctx[0];
	}

	set items(items) {
		this.$set({ items });
		flush();
	}
}

customElements.define("zoo-collapsable-list", CollapsableList);

/* zoo-modules/collapsable-list-module/CollapsableListItem.svelte generated by Svelte v3.22.3 */

const file$h = "zoo-modules/collapsable-list-module/CollapsableListItem.svelte";

function create_fragment$h(ctx) {
	let ul;
	let li;
	let slot;

	const block = {
		c: function create() {
			ul = element("ul");
			li = element("li");
			slot = element("slot");
			this.c = noop;
			add_location(slot, file$h, 3, 2, 79);
			add_location(li, file$h, 2, 1, 72);
			add_location(ul, file$h, 1, 0, 66);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, ul, anchor);
			append_dev(ul, li);
			append_dev(li, slot);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(ul);
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

function instance$h($$self, $$props) {
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-collapsable-list-item> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-collapsable-list-item", $$slots, []);
	return [];
}

class CollapsableListItem extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>ul{padding:0}li{list-style-type:none}</style>`;
		init(this, { target: this.shadowRoot }, instance$h, create_fragment$h, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert_dev(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-collapsable-list-item", CollapsableListItem);

/* zoo-modules/shared-module/Preloader.svelte generated by Svelte v3.22.3 */

const file$i = "zoo-modules/shared-module/Preloader.svelte";

function create_fragment$i(ctx) {
	let div3;
	let div0;
	let t0;
	let div1;
	let t1;
	let div2;

	const block = {
		c: function create() {
			div3 = element("div");
			div0 = element("div");
			t0 = space();
			div1 = element("div");
			t1 = space();
			div2 = element("div");
			this.c = noop;
			attr_dev(div0, "class", "bounce1");
			add_location(div0, file$i, 2, 1, 76);
			attr_dev(div1, "class", "bounce2");
			add_location(div1, file$i, 3, 1, 105);
			attr_dev(div2, "class", "bounce3");
			add_location(div2, file$i, 4, 1, 134);
			attr_dev(div3, "class", "bounce");
			add_location(div3, file$i, 1, 0, 54);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div3, anchor);
			append_dev(div3, div0);
			append_dev(div3, t0);
			append_dev(div3, div1);
			append_dev(div3, t1);
			append_dev(div3, div2);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div3);
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

function instance$i($$self, $$props) {
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-preloader> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-preloader", $$slots, []);
	return [];
}

class Preloader extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{position:absolute;width:100%;height:100%;top:0;display:flex;align-items:center;justify-content:center;pointer-events:none}.bounce{text-align:center}.bounce>div{width:10px;height:10px;background-color:#333;border-radius:100%;display:inline-block;animation:sk-bouncedelay 1.4s infinite ease-in-out both}.bounce .bounce1{animation-delay:-0.32s}.bounce .bounce2{animation-delay:-0.16s}@keyframes sk-bouncedelay{0%,80%,100%{transform:scale(0)}40%{transform:scale(1.0)}}</style>`;
		init(this, { target: this.shadowRoot }, instance$i, create_fragment$i, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert_dev(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-preloader", Preloader);

/* zoo-modules/spinner-module/Spinner.svelte generated by Svelte v3.22.3 */

const file$j = "zoo-modules/spinner-module/Spinner.svelte";

function create_fragment$j(ctx) {
	let svg;
	let circle;

	const block = {
		c: function create() {
			svg = svg_element("svg");
			circle = svg_element("circle");
			this.c = noop;
			attr_dev(circle, "class", "path");
			attr_dev(circle, "cx", "50");
			attr_dev(circle, "cy", "50");
			attr_dev(circle, "r", "20");
			attr_dev(circle, "fill", "none");
			attr_dev(circle, "stroke-width", "2.5");
			attr_dev(circle, "stroke-miterlimit", "10");
			add_location(circle, file$j, 2, 1, 97);
			attr_dev(svg, "class", "spinner");
			attr_dev(svg, "viewBox", "25 25 50 50");
			add_location(svg, file$j, 1, 0, 52);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, svg, anchor);
			append_dev(svg, circle);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(svg);
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

function instance$j($$self, $$props) {
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-spinner> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-spinner", $$slots, []);
	return [];
}

class Spinner extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.spinner{position:absolute;left:calc(50% - 60px);top:calc(50% - 60px);right:0;bottom:0;height:120px;width:120px;transform-origin:center center;animation:rotate 2s linear infinite;z-index:10002}.spinner .path{animation:dash 1.5s ease-in-out infinite;stroke:var(--primary-mid, #3C9700);stroke-dasharray:1, 200;stroke-dashoffset:0;stroke-linecap:round}@keyframes rotate{100%{transform:rotate(360deg)}}@keyframes dash{0%{stroke-dasharray:1, 200;stroke-dashoffset:0}50%{stroke-dasharray:89, 200;stroke-dashoffset:-35px}100%{stroke-dasharray:89, 200;stroke-dashoffset:-124px}}</style>`;
		init(this, { target: this.shadowRoot }, instance$j, create_fragment$j, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert_dev(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-spinner", Spinner);

/* zoo-modules/grid-module/Grid.svelte generated by Svelte v3.22.3 */
const file$k = "zoo-modules/grid-module/Grid.svelte";

// (3:1) {#if loading}
function create_if_block$4(ctx) {
	let div;
	let t;
	let zoo_spinner;

	const block = {
		c: function create() {
			div = element("div");
			t = space();
			zoo_spinner = element("zoo-spinner");
			attr_dev(div, "class", "loading-shade");
			add_location(div, file$k, 3, 2, 105);
			add_location(zoo_spinner, file$k, 4, 2, 141);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			insert_dev(target, t, anchor);
			insert_dev(target, zoo_spinner, anchor);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if (detaching) detach_dev(t);
			if (detaching) detach_dev(zoo_spinner);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$4.name,
		type: "if",
		source: "(3:1) {#if loading}",
		ctx
	});

	return block;
}

function create_fragment$k(ctx) {
	let div1;
	let t0;
	let div0;
	let slot0;
	let t1;
	let slot1;
	let t2;
	let slot2;
	let t3;
	let slot4;
	let zoo_grid_paginator;
	let slot3;
	let dispose;
	let if_block = /*loading*/ ctx[2] && create_if_block$4(ctx);

	const block = {
		c: function create() {
			div1 = element("div");
			if (if_block) if_block.c();
			t0 = space();
			div0 = element("div");
			slot0 = element("slot");
			t1 = space();
			slot1 = element("slot");
			t2 = space();
			slot2 = element("slot");
			t3 = space();
			slot4 = element("slot");
			zoo_grid_paginator = element("zoo-grid-paginator");
			slot3 = element("slot");
			this.c = noop;
			attr_dev(slot0, "name", "headercell");
			add_location(slot0, file$k, 7, 2, 247);
			attr_dev(div0, "class", "header-row");
			add_location(div0, file$k, 6, 1, 177);
			attr_dev(slot1, "name", "row");
			add_location(slot1, file$k, 9, 1, 315);
			attr_dev(slot2, "name", "norecords");
			add_location(slot2, file$k, 10, 1, 361);
			attr_dev(slot3, "name", "pagesizeselector");
			attr_dev(slot3, "slot", "pagesizeselector");
			add_location(slot3, file$k, 13, 3, 512);
			set_custom_element_data(zoo_grid_paginator, "currentpage", /*currentpage*/ ctx[0]);
			set_custom_element_data(zoo_grid_paginator, "maxpages", /*maxpages*/ ctx[1]);
			add_location(zoo_grid_paginator, file$k, 12, 2, 419);
			attr_dev(slot4, "name", "paginator");
			add_location(slot4, file$k, 11, 1, 393);
			attr_dev(div1, "class", "box");
			add_location(div1, file$k, 1, 0, 49);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, div1, anchor);
			if (if_block) if_block.m(div1, null);
			append_dev(div1, t0);
			append_dev(div1, div0);
			append_dev(div0, slot0);
			/*slot0_binding*/ ctx[18](slot0);
			append_dev(div1, t1);
			append_dev(div1, slot1);
			/*slot1_binding*/ ctx[20](slot1);
			append_dev(div1, t2);
			append_dev(div1, slot2);
			append_dev(div1, t3);
			append_dev(div1, slot4);
			append_dev(slot4, zoo_grid_paginator);
			append_dev(zoo_grid_paginator, slot3);
			/*div1_binding*/ ctx[22](div1);
			if (remount) run_all(dispose);

			dispose = [
				listen_dev(div0, "sortChange", /*sortChange_handler*/ ctx[19], false, false, false),
				listen_dev(zoo_grid_paginator, "pageChange", /*pageChange_handler*/ ctx[21], false, false, false)
			];
		},
		p: function update(ctx, [dirty]) {
			if (/*loading*/ ctx[2]) {
				if (if_block) ; else {
					if_block = create_if_block$4(ctx);
					if_block.c();
					if_block.m(div1, t0);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*currentpage*/ 1) {
				set_custom_element_data(zoo_grid_paginator, "currentpage", /*currentpage*/ ctx[0]);
			}

			if (dirty & /*maxpages*/ 2) {
				set_custom_element_data(zoo_grid_paginator, "maxpages", /*maxpages*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div1);
			if (if_block) if_block.d();
			/*slot0_binding*/ ctx[18](null);
			/*slot1_binding*/ ctx[20](null);
			/*div1_binding*/ ctx[22](null);
			run_all(dispose);
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
	let { currentpage = "" } = $$props;
	let { maxpages = "" } = $$props;
	let { loading = false } = $$props;
	let gridRoot;
	let headerCellSlot;
	let rowSlot;
	let resizeObserver;
	let prevSortedHeader;
	let draggedOverHeader;

	// sortable grid -> set min-width to set width
	// not sortable -> set --grid-column-sizes variable
	onMount(() => {
		headerCellSlot.addEventListener("slotchange", () => {
			const host = gridRoot.getRootNode().host;
			const headers = headerCellSlot.assignedNodes();
			host.style.setProperty("--grid-column-num", headers.length);
			host.style.setProperty("--grid-column-sizes", "repeat(var(--grid-column-num), minmax(50px, 1fr))");
			handleHeaders(headers, host);
		});

		rowSlot.addEventListener("slotchange", assignColumnNumberToRows);
	});

	const handleHeaders = (headers, host) => {
		let i = 1;

		for (let header of headers) {
			header.setAttribute("column", i);
			i++;
		}

		if (host.hasAttribute("resizable")) {
			handleResizableHeaders(headers, host);
		}

		if (host.hasAttribute("reorderable")) {
			handleDraggableHeaders(headers, host);
		}
	};

	const handleResizableHeaders = (headers, host) => {
		createResizeObserver(host);
		resizeObserver.disconnect();

		for (let header of headers) {
			resizeObserver.observe(header);
		}
	};

	const handleDraggableHeaders = (headers, host) => {
		for (let header of headers) {
			handleDraggableHeader(header, host);
		}
	};

	const handleDraggableHeader = (header, host) => {
		// avoid attaching multiple eventListeners to the same element
		if (header.getAttribute("reorderable")) return;

		header.setAttribute("reorderable", true);
		header.setAttribute("ondragover", "event.preventDefault()");
		header.setAttribute("ondrop", "event.preventDefault()");

		header.addEventListener("dragstart", e => {
			host.classList.add("dragging");
			e.dataTransfer.setData("text/plain", header.getAttribute("column"));
		});

		header.addEventListener("dragend", e => {
			host.classList.remove("dragging");
			draggedOverHeader.classList.remove("drag-over");
		});

		header.addEventListener("dragenter", e => {
			// header is present and drag target is not its child -> some sibling of header
			if (draggedOverHeader && !draggedOverHeader.contains(e.target)) {
				draggedOverHeader.classList.remove("drag-over");
			}

			// already marked
			if (header.classList.contains("drag-over")) {
				return;
			}

			// dragging over a valid drop target or its child
			if (header == e.target || header.contains(e.target)) {
				header.classList.add("drag-over");
				draggedOverHeader = header;
			}
		});

		header.addEventListener("drop", e => {
			const sourceColumn = e.dataTransfer.getData("text");
			const targetColumn = e.target.getAttribute("column");

			if (targetColumn == sourceColumn) {
				return;
			}

			// move headers
			const sourceHeader = host.querySelector(":scope > zoo-grid-header[column=\"" + sourceColumn + "\"]");

			if (targetColumn < sourceColumn) {
				e.target.parentNode.insertBefore(sourceHeader, e.target);
			} else {
				e.target.parentNode.insertBefore(e.target, sourceHeader);
			}

			// move rows
			const allRows = rowSlot.assignedNodes();

			for (const row of allRows) {
				const sourceRowColumn = row.querySelector(":scope > [column=\"" + sourceColumn + "\"]");
				const targetRowColumn = row.querySelector(":scope > [column=\"" + targetColumn + "\"]");

				if (targetColumn < sourceColumn) {
					targetRowColumn.parentNode.insertBefore(sourceRowColumn, targetRowColumn);
				} else {
					targetRowColumn.parentNode.insertBefore(targetRowColumn, sourceRowColumn);
				}
			}

			assignColumnNumberToRows();
		});
	};

	const assignColumnNumberToRows = () => {
		const allRows = rowSlot.assignedNodes();

		for (const row of allRows) {
			let i = 1;
			const rowChildren = row.children;

			for (const child of rowChildren) {
				child.setAttribute("column", i);
				i++;
			}
		}
	};

	const handleSortChange = e => {
		e.stopPropagation();
		const header = e.detail.header;
		const sortState = e.detail.sortState;

		if (prevSortedHeader && !header.isEqualNode(prevSortedHeader)) {
			prevSortedHeader.sortState = undefined;
		}

		prevSortedHeader = header;

		const detail = sortState
		? {
				property: header.getAttribute("sortableproperty"),
				direction: sortState
			}
		: undefined;

		gridRoot.getRootNode().host.dispatchEvent(new CustomEvent("sortChange", { detail, bubbles: true }));
	};

	const createResizeObserver = host => {
		if (resizeObserver) return;

		resizeObserver = new ResizeObserver(debounce(
				entries => {
					requestAnimationFrame(() => {
						for (const entry of entries) {
							const columnNum = entry.target.getAttribute("column");
							const rowColumns = host.querySelectorAll(":scope > [slot=\"row\"] > [column=\"" + columnNum + "\"] ");
							const headerColumn = host.querySelector(":scope > [column=\"" + columnNum + "\"]");
							const elements = [...rowColumns, headerColumn];
							const width = entry.contentRect.width;

							for (const columnEl of elements) {
								columnEl.style.width = width + "px";
							}
						}
					});
				},
				0
			));
	};

	const debounce = (func, wait) => {
		let timeout;

		return function () {
			const later = () => {
				timeout = null;
				func.apply(this, arguments);
			};

			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (!timeout) func.apply(this, arguments);
		};
	};

	const dispatchPageEvent = e => {
		const host = gridRoot.getRootNode().host;

		host.dispatchEvent(new CustomEvent("pageChange",
		{
				detail: { pageNumber: e.detail.pageNumber },
				bubbles: true
			}));
	};

	onDestroy(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
	});

	const writable_props = ["currentpage", "maxpages", "loading"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-grid> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-grid", $$slots, []);

	function slot0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(4, headerCellSlot = $$value);
		});
	}

	const sortChange_handler = e => handleSortChange(e);

	function slot1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(5, rowSlot = $$value);
		});
	}

	const pageChange_handler = e => dispatchPageEvent(e);

	function div1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(3, gridRoot = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("currentpage" in $$props) $$invalidate(0, currentpage = $$props.currentpage);
		if ("maxpages" in $$props) $$invalidate(1, maxpages = $$props.maxpages);
		if ("loading" in $$props) $$invalidate(2, loading = $$props.loading);
	};

	$$self.$capture_state = () => ({
		onMount,
		onDestroy,
		currentpage,
		maxpages,
		loading,
		gridRoot,
		headerCellSlot,
		rowSlot,
		resizeObserver,
		prevSortedHeader,
		draggedOverHeader,
		handleHeaders,
		handleResizableHeaders,
		handleDraggableHeaders,
		handleDraggableHeader,
		assignColumnNumberToRows,
		handleSortChange,
		createResizeObserver,
		debounce,
		dispatchPageEvent
	});

	$$self.$inject_state = $$props => {
		if ("currentpage" in $$props) $$invalidate(0, currentpage = $$props.currentpage);
		if ("maxpages" in $$props) $$invalidate(1, maxpages = $$props.maxpages);
		if ("loading" in $$props) $$invalidate(2, loading = $$props.loading);
		if ("gridRoot" in $$props) $$invalidate(3, gridRoot = $$props.gridRoot);
		if ("headerCellSlot" in $$props) $$invalidate(4, headerCellSlot = $$props.headerCellSlot);
		if ("rowSlot" in $$props) $$invalidate(5, rowSlot = $$props.rowSlot);
		if ("resizeObserver" in $$props) resizeObserver = $$props.resizeObserver;
		if ("prevSortedHeader" in $$props) prevSortedHeader = $$props.prevSortedHeader;
		if ("draggedOverHeader" in $$props) draggedOverHeader = $$props.draggedOverHeader;
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		currentpage,
		maxpages,
		loading,
		gridRoot,
		headerCellSlot,
		rowSlot,
		handleSortChange,
		dispatchPageEvent,
		resizeObserver,
		prevSortedHeader,
		draggedOverHeader,
		handleHeaders,
		handleResizableHeaders,
		handleDraggableHeaders,
		handleDraggableHeader,
		assignColumnNumberToRows,
		createResizeObserver,
		debounce,
		slot0_binding,
		sortChange_handler,
		slot1_binding,
		pageChange_handler,
		div1_binding
	];
}

class Grid extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.box{position:relative;max-height:inherit;max-width:inherit;min-height:inherit;min-width:inherit}.loading-shade{position:absolute;left:0;top:0;right:0;bottom:56px;z-index:9998;display:flex;align-items:center;justify-content:center;height:100%;background:rgba(0, 0, 0, 0.15);pointer-events:none}::slotted(*[slot="row"]){overflow:visible}.header-row{min-width:inherit;font-size:12px;line-height:14px;font-weight:600;color:#555555;box-sizing:border-box}.header-row,::slotted(*[slot="row"]){display:grid;grid-template-columns:var(--grid-column-sizes, repeat(var(--grid-column-num), minmax(50px, 1fr)));padding:5px 10px;border-bottom:1px solid rgba(0, 0, 0, 0.2);min-height:50px;font-size:14px;line-height:20px}:host([resizable]) .header-row,:host([resizable]) ::slotted(*[slot="row"]){display:flex}:host([resizable]) ::slotted(*[slot="headercell"]){overflow:auto;resize:horizontal;height:inherit}:host(.dragging) ::slotted(*[ondrop]){border-radius:3px;box-shadow:inset 0px 0px 1px 1px rgba(0, 0, 0, 0.1)}:host(.dragging) ::slotted(.drag-over){box-shadow:inset 0px 0px 1px 1px rgba(0, 0, 0, 0.4)}::slotted(*[slot="row"]){align-items:center;box-sizing:border-box}::slotted(*[slot="row"] *[column]){align-items:center}:host([stickyheader]) .header-row{top:0;position:sticky;background:white}.header-row{z-index:1}::slotted(*[slot="headercell"]){display:flex;align-items:center;flex-grow:1}::slotted(*[slot="row"]:nth-child(odd)){background:#F2F3F4}::slotted(*[slot="row"]:hover){background:#E6E6E6}::slotted(*[slot="norecords"]){color:var(--warning-dark, #BD161C);grid-column:span var(--grid-column-num);text-align:center;padding:10px 0}zoo-grid-paginator{display:grid;position:sticky;grid-column:span var(--grid-column-num);bottom:0;background:#FFFFFF}</style>`;
		init(this, { target: this.shadowRoot }, instance$k, create_fragment$k, safe_not_equal, { currentpage: 0, maxpages: 1, loading: 2 });

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
		return ["currentpage", "maxpages", "loading"];
	}

	get currentpage() {
		return this.$$.ctx[0];
	}

	set currentpage(currentpage) {
		this.$set({ currentpage });
		flush();
	}

	get maxpages() {
		return this.$$.ctx[1];
	}

	set maxpages(maxpages) {
		this.$set({ maxpages });
		flush();
	}

	get loading() {
		return this.$$.ctx[2];
	}

	set loading(loading) {
		this.$set({ loading });
		flush();
	}
}

customElements.define("zoo-grid", Grid);

/* zoo-modules/grid-module/GridHeader.svelte generated by Svelte v3.22.3 */
const file$l = "zoo-modules/grid-module/GridHeader.svelte";

function create_fragment$l(ctx) {
	let div;
	let slot;
	let t0;
	let svg0;
	let path0;
	let t1;
	let svg1;
	let path1;
	let path2;
	let dispose;

	const block = {
		c: function create() {
			div = element("div");
			slot = element("slot");
			t0 = space();
			svg0 = svg_element("svg");
			path0 = svg_element("path");
			t1 = space();
			svg1 = svg_element("svg");
			path1 = svg_element("path");
			path2 = svg_element("path");
			this.c = noop;
			add_location(slot, file$l, 2, 1, 128);
			attr_dev(path0, "d", "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
			add_location(path0, file$l, 4, 2, 267);
			attr_dev(svg0, "class", "arrow");
			attr_dev(svg0, "sortstate", /*sortState*/ ctx[0]);
			attr_dev(svg0, "width", "24");
			attr_dev(svg0, "height", "24");
			attr_dev(svg0, "viewBox", "0 0 24 24");
			add_location(svg0, file$l, 3, 1, 143);
			attr_dev(path1, "d", "M0 0h24v24H0V0z");
			attr_dev(path1, "fill", "none");
			add_location(path1, file$l, 7, 2, 459);
			attr_dev(path2, "d", "M7 11l-4 4 4 4v-3h7v-2H7v-3zm14-2l-4-4v3h-7v2h7v3l4-4z");
			add_location(path2, file$l, 7, 41, 498);
			attr_dev(svg1, "reorderable", /*reorderable*/ ctx[2]);
			attr_dev(svg1, "class", "swap");
			attr_dev(svg1, "viewBox", "0 0 24 24");
			attr_dev(svg1, "width", "18");
			attr_dev(svg1, "height", "18");
			add_location(svg1, file$l, 6, 1, 344);
			attr_dev(div, "class", "box");
			toggle_class(div, "sortable", /*sortable*/ ctx[1]);
			add_location(div, file$l, 1, 0, 56);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, div, anchor);
			append_dev(div, slot);
			append_dev(div, t0);
			append_dev(div, svg0);
			append_dev(svg0, path0);
			append_dev(div, t1);
			append_dev(div, svg1);
			append_dev(svg1, path1);
			append_dev(svg1, path2);
			/*div_binding*/ ctx[8](div);
			if (remount) run_all(dispose);

			dispose = [
				listen_dev(svg0, "click", /*click_handler*/ ctx[7], false, false, false),
				listen_dev(svg1, "mousedown", /*toggleHostDraggable*/ ctx[5], false, false, false)
			];
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*sortState*/ 1) {
				attr_dev(svg0, "sortstate", /*sortState*/ ctx[0]);
			}

			if (dirty & /*reorderable*/ 4) {
				attr_dev(svg1, "reorderable", /*reorderable*/ ctx[2]);
			}

			if (dirty & /*sortable*/ 2) {
				toggle_class(div, "sortable", /*sortable*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			/*div_binding*/ ctx[8](null);
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$l.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$l($$self, $$props, $$invalidate) {
	let { sortState = undefined } = $$props;
	let { sortable = false } = $$props;
	let { reorderable = undefined } = $$props;
	let gridHeaderRoot;
	let host;

	onMount(() => {
		host = gridHeaderRoot.getRootNode().host;
		host.addEventListener("dragend", () => host.setAttribute("draggable", false));
	});

	const handleSortClick = () => {
		if (!sortState) {
			$$invalidate(0, sortState = "desc");
		} else if (sortState == "desc") {
			$$invalidate(0, sortState = "asc");
		} else if ($$invalidate(0, sortState = "asc")) {
			$$invalidate(0, sortState = undefined);
		}

		host.dispatchEvent(new CustomEvent("sortChange",
		{
				detail: { sortState, header: host },
				bubbles: true
			}));
	};

	const toggleHostDraggable = () => host.setAttribute("draggable", true);
	const writable_props = ["sortState", "sortable", "reorderable"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-grid-header> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-grid-header", $$slots, []);
	const click_handler = () => handleSortClick();

	function div_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(3, gridHeaderRoot = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("sortState" in $$props) $$invalidate(0, sortState = $$props.sortState);
		if ("sortable" in $$props) $$invalidate(1, sortable = $$props.sortable);
		if ("reorderable" in $$props) $$invalidate(2, reorderable = $$props.reorderable);
	};

	$$self.$capture_state = () => ({
		onMount,
		sortState,
		sortable,
		reorderable,
		gridHeaderRoot,
		host,
		handleSortClick,
		toggleHostDraggable
	});

	$$self.$inject_state = $$props => {
		if ("sortState" in $$props) $$invalidate(0, sortState = $$props.sortState);
		if ("sortable" in $$props) $$invalidate(1, sortable = $$props.sortable);
		if ("reorderable" in $$props) $$invalidate(2, reorderable = $$props.reorderable);
		if ("gridHeaderRoot" in $$props) $$invalidate(3, gridHeaderRoot = $$props.gridHeaderRoot);
		if ("host" in $$props) host = $$props.host;
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		sortState,
		sortable,
		reorderable,
		gridHeaderRoot,
		handleSortClick,
		toggleHostDraggable,
		host,
		click_handler,
		div_binding
	];
}

class GridHeader extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:flex;align-items:center;width:100%;height:100%}.box{display:flex;align-items:center;width:100%;height:100%}.box:hover .arrow{opacity:1}.box:hover .swap{opacity:1}.box.sortable .arrow,.swap[reorderable]{display:flex}.arrow,.swap{display:none;min-width:20px;width:20px;opacity:0;transition:opacity 0.1s;margin-left:5px;border-radius:5px;background:#F2F3F4}.arrow{cursor:pointer;transform:rotate(0deg)}.swap{cursor:grab}.swap:active{cursor:grabbing}.arrow[sortstate='asc']{transform:rotate(180deg)}.arrow[sortstate='desc'],.arrow[sortstate='asc']{opacity:1;background:#F2F3F4}.box .arrow:active,.arrow[sortstate='desc']:active,.arrow[sortstate='asc']:active{opacity:0.5;transform:translateY(1px)}</style>`;

		init(this, { target: this.shadowRoot }, instance$l, create_fragment$l, safe_not_equal, {
			sortState: 0,
			sortable: 1,
			reorderable: 2
		});

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
		return ["sortState", "sortable", "reorderable"];
	}

	get sortState() {
		return this.$$.ctx[0];
	}

	set sortState(sortState) {
		this.$set({ sortState });
		flush();
	}

	get sortable() {
		return this.$$.ctx[1];
	}

	set sortable(sortable) {
		this.$set({ sortable });
		flush();
	}

	get reorderable() {
		return this.$$.ctx[2];
	}

	set reorderable(reorderable) {
		this.$set({ reorderable });
		flush();
	}
}

customElements.define("zoo-grid-header", GridHeader);

/* zoo-modules/grid-module/GridPaginator.svelte generated by Svelte v3.22.3 */
const file$m = "zoo-modules/grid-module/GridPaginator.svelte";

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[14] = list[i];
	child_ctx[16] = i;
	return child_ctx;
}

// (10:3) {:else}
function create_else_block$2(ctx) {
	let div;

	const block = {
		c: function create() {
			div = element("div");
			div.textContent = "...";
			attr_dev(div, "class", "page-element-dots");
			add_location(div, file$m, 10, 4, 644);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block$2.name,
		type: "else",
		source: "(10:3) {:else}",
		ctx
	});

	return block;
}

// (8:3) {#if page == 1 || page == currentpage || i == currentpage - 2 || i == currentpage || page == maxpages}
function create_if_block$5(ctx) {
	let div;
	let t_value = /*page*/ ctx[14] + "";
	let t;
	let dispose;

	function click_handler_1(...args) {
		return /*click_handler_1*/ ctx[11](/*page*/ ctx[14], ...args);
	}

	const block = {
		c: function create() {
			div = element("div");
			t = text(t_value);
			attr_dev(div, "class", "page-element");
			toggle_class(div, "active", /*page*/ ctx[14] == /*currentpage*/ ctx[0]);
			add_location(div, file$m, 8, 4, 519);
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, div, anchor);
			append_dev(div, t);
			if (remount) dispose();
			dispose = listen_dev(div, "click", click_handler_1, false, false, false);
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*pages*/ 8 && t_value !== (t_value = /*page*/ ctx[14] + "")) set_data_dev(t, t_value);

			if (dirty & /*pages, currentpage*/ 9) {
				toggle_class(div, "active", /*page*/ ctx[14] == /*currentpage*/ ctx[0]);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$5.name,
		type: "if",
		source: "(8:3) {#if page == 1 || page == currentpage || i == currentpage - 2 || i == currentpage || page == maxpages}",
		ctx
	});

	return block;
}

// (6:2) {#each pages as page, i}
function create_each_block$1(ctx) {
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (/*page*/ ctx[14] == 1 || /*page*/ ctx[14] == /*currentpage*/ ctx[0] || /*i*/ ctx[16] == /*currentpage*/ ctx[0] - 2 || /*i*/ ctx[16] == /*currentpage*/ ctx[0] || /*page*/ ctx[14] == /*maxpages*/ ctx[1]) return create_if_block$5;
		return create_else_block$2;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	const block = {
		c: function create() {
			if_block.c();
			if_block_anchor = empty();
		},
		m: function mount(target, anchor) {
			if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
		},
		p: function update(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		d: function destroy(detaching) {
			if_block.d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$1.name,
		type: "each",
		source: "(6:2) {#each pages as page, i}",
		ctx
	});

	return block;
}

function create_fragment$m(ctx) {
	let div2;
	let slot;
	let t0;
	let nav;
	let div0;
	let t1;
	let t2;
	let div1;
	let t3;
	let template;
	let style;
	let t5;
	let svg;
	let path;
	let dispose;
	let each_value = /*pages*/ ctx[3];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			div2 = element("div");
			slot = element("slot");
			t0 = space();
			nav = element("nav");
			div0 = element("div");
			t1 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t2 = space();
			div1 = element("div");
			t3 = space();
			template = element("template");
			style = element("style");
			style.textContent = ".btn.next svg {transform: rotate(-90deg);}\n\n\t\t\t\t.btn.prev svg {transform: rotate(90deg);}";
			t5 = space();
			svg = svg_element("svg");
			path = svg_element("path");
			this.c = noop;
			attr_dev(slot, "name", "pagesizeselector");
			add_location(slot, file$m, 2, 1, 151);
			attr_dev(div0, "class", "btn prev");
			toggle_class(div0, "hidden", !/*currentpage*/ ctx[0] || /*currentpage*/ ctx[0] == 1);
			add_location(div0, file$m, 4, 2, 213);
			attr_dev(div1, "class", "btn next");
			toggle_class(div1, "hidden", !/*currentpage*/ ctx[0] || !/*maxpages*/ ctx[1] || /*currentpage*/ ctx[0] == /*maxpages*/ ctx[1]);
			add_location(div1, file$m, 13, 2, 706);
			add_location(style, file$m, 15, 3, 866);
			attr_dev(path, "d", "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
			add_location(path, file$m, 20, 65, 1045);
			attr_dev(svg, "class", "arrow");
			attr_dev(svg, "width", "24");
			attr_dev(svg, "height", "24");
			attr_dev(svg, "viewBox", "0 0 24 24");
			add_location(svg, file$m, 20, 3, 983);
			attr_dev(template, "id", "arrow");
			add_location(template, file$m, 14, 2, 841);
			attr_dev(nav, "class", "paging");
			add_location(nav, file$m, 3, 1, 190);
			attr_dev(div2, "class", "box");
			toggle_class(div2, "hidden", !/*currentpage*/ ctx[0] || !/*maxpages*/ ctx[1]);
			add_location(div2, file$m, 1, 0, 59);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor, remount) {
			insert_dev(target, div2, anchor);
			append_dev(div2, slot);
			append_dev(div2, t0);
			append_dev(div2, nav);
			append_dev(nav, div0);
			append_dev(nav, t1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(nav, null);
			}

			append_dev(nav, t2);
			append_dev(nav, div1);
			append_dev(nav, t3);
			append_dev(nav, template);
			append_dev(template.content, style);
			append_dev(template.content, t5);
			append_dev(template.content, svg);
			append_dev(svg, path);
			/*div2_binding*/ ctx[13](div2);
			if (remount) run_all(dispose);

			dispose = [
				listen_dev(div0, "click", /*click_handler*/ ctx[10], false, false, false),
				listen_dev(div1, "click", /*click_handler_2*/ ctx[12], false, false, false)
			];
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*currentpage*/ 1) {
				toggle_class(div0, "hidden", !/*currentpage*/ ctx[0] || /*currentpage*/ ctx[0] == 1);
			}

			if (dirty & /*pages, currentpage, goToPage, maxpages*/ 75) {
				each_value = /*pages*/ ctx[3];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(nav, t2);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty & /*currentpage, maxpages*/ 3) {
				toggle_class(div1, "hidden", !/*currentpage*/ ctx[0] || !/*maxpages*/ ctx[1] || /*currentpage*/ ctx[0] == /*maxpages*/ ctx[1]);
			}

			if (dirty & /*currentpage, maxpages*/ 3) {
				toggle_class(div2, "hidden", !/*currentpage*/ ctx[0] || !/*maxpages*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div2);
			destroy_each(each_blocks, detaching);
			/*div2_binding*/ ctx[13](null);
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$m.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$m($$self, $$props, $$invalidate) {
	let { maxpages = "" } = $$props;
	let { currentpage = "" } = $$props;
	let gridPaginatorRoot;
	let disablePrev = true;
	let disableNext = true;
	let host;
	let pages = [];

	onMount(() => {
		host = gridPaginatorRoot.getRootNode().host;
		const arrowTemplateContent = gridPaginatorRoot.querySelector("#arrow").content;
		gridPaginatorRoot.querySelector(".btn.prev").appendChild(arrowTemplateContent.cloneNode(true));
		gridPaginatorRoot.querySelector(".btn.next").appendChild(arrowTemplateContent.cloneNode(true));
	});

	afterUpdate(() => {
		if (!currentpage || !maxpages) {
			disablePrev = true;
			disableNext = true;
		} else if (currentpage == 1) {
			disablePrev = true;
			disableNext = false;
		} else if (currentpage == maxpages) {
			disableNext = true;
			disablePrev = false;
		} else {
			disablePrev = false;
			disableNext = false;
		}
	});

	beforeUpdate(() => {
		if (pages.length != maxpages) {
			let temp = 1;
			$$invalidate(3, pages = []);

			while (temp <= +maxpages) {
				pages.push(temp);
				temp++;
			}

			$$invalidate(3, pages = pages.slice());
		}
	});

	const goToPrevPage = () => {
		if (disablePrev || currentpage <= 1) {
			return;
		}

		goToPage(+currentpage - 1);
	};

	const goToNextPage = () => {
		if (disableNext || currentpage == maxpages) {
			return;
		}

		goToPage(+currentpage + 1);
	};

	const goToPage = pageNumber => {
		$$invalidate(0, currentpage = pageNumber);

		host.dispatchEvent(new CustomEvent("pageChange",
		{
				detail: { pageNumber },
				bubbles: true,
				compose: true
			}));
	};

	const writable_props = ["maxpages", "currentpage"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-grid-paginator> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("zoo-grid-paginator", $$slots, []);
	const click_handler = () => goToPrevPage();
	const click_handler_1 = page => goToPage(page);
	const click_handler_2 = () => goToNextPage();

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(2, gridPaginatorRoot = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("maxpages" in $$props) $$invalidate(1, maxpages = $$props.maxpages);
		if ("currentpage" in $$props) $$invalidate(0, currentpage = $$props.currentpage);
	};

	$$self.$capture_state = () => ({
		afterUpdate,
		beforeUpdate,
		onMount,
		maxpages,
		currentpage,
		gridPaginatorRoot,
		disablePrev,
		disableNext,
		host,
		pages,
		goToPrevPage,
		goToNextPage,
		goToPage
	});

	$$self.$inject_state = $$props => {
		if ("maxpages" in $$props) $$invalidate(1, maxpages = $$props.maxpages);
		if ("currentpage" in $$props) $$invalidate(0, currentpage = $$props.currentpage);
		if ("gridPaginatorRoot" in $$props) $$invalidate(2, gridPaginatorRoot = $$props.gridPaginatorRoot);
		if ("disablePrev" in $$props) disablePrev = $$props.disablePrev;
		if ("disableNext" in $$props) disableNext = $$props.disableNext;
		if ("host" in $$props) host = $$props.host;
		if ("pages" in $$props) $$invalidate(3, pages = $$props.pages);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		currentpage,
		maxpages,
		gridPaginatorRoot,
		pages,
		goToPrevPage,
		goToNextPage,
		goToPage,
		disablePrev,
		disableNext,
		host,
		click_handler,
		click_handler_1,
		click_handler_2,
		div2_binding
	];
}

class GridPaginator extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{padding:10px;min-width:inherit;border-top:1px solid #E6E6E6}.box{display:flex;font-size:14px;width:max-content;right:10px;justify-self:flex-end;position:sticky}.box.hidden{display:none}.paging{display:flex;align-items:center;border:1px solid #E6E6E6;border-radius:5px;margin:3px 0 3px 20px;padding:0 15px}.btn{display:flex;cursor:pointer;opacity:1;transition:opacity 0.1s}.btn:active{opacity:0.5}.btn.hidden{display:none}.btn.next{margin-left:5px}.btn.prev{margin-right:10px}svg{fill:#555555}.arrow path{fill:var(--primary-mid, #3C9700)}.page-element{cursor:pointer}.page-element:hover{background:#F2F3F4}.page-element.active{background:var(--primary-ultralight, #EBF4E5);color:var(--primary-mid, #3C9700)}.page-element,.page-element-dots{display:flex;align-items:center;justify-content:center;border-radius:5px;margin-right:5px;padding:4px 8px}.page-element-dots{display:none}.page-element+.page-element-dots{display:flex}</style>`;
		init(this, { target: this.shadowRoot }, instance$m, create_fragment$m, safe_not_equal, { maxpages: 1, currentpage: 0 });

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
		return ["maxpages", "currentpage"];
	}

	get maxpages() {
		return this.$$.ctx[1];
	}

	set maxpages(maxpages) {
		this.$set({ maxpages });
		flush();
	}

	get currentpage() {
		return this.$$.ctx[0];
	}

	set currentpage(currentpage) {
		this.$set({ currentpage });
		flush();
	}
}

customElements.define("zoo-grid-paginator", GridPaginator);
