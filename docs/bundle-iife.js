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

    /* zoo-modules/header-module/Header.svelte generated by Svelte v3.22.2 */
    const file = "zoo-modules/header-module/Header.svelte";

    function create_fragment(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let t0;
    	let span;
    	let t1;
    	let t2;
    	let slot;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			span = element("span");
    			t1 = text(/*headertext*/ ctx[0]);
    			t2 = space();
    			slot = element("slot");
    			this.c = noop;
    			attr_dev(img, "class", "app-logo");
    			if (img.src !== (img_src_value = /*imgsrc*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*imgalt*/ ctx[2]);
    			add_location(img, file, 2, 1, 94);
    			attr_dev(span, "class", "app-name");
    			add_location(span, file, 3, 1, 166);
    			add_location(slot, file, 4, 1, 210);
    			attr_dev(div, "class", "box");
    			add_location(div, file, 1, 0, 51);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			/*img_binding*/ ctx[6](img);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(span, t1);
    			append_dev(div, t2);
    			append_dev(div, slot);
    			/*div_binding*/ ctx[7](div);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imgsrc*/ 2 && img.src !== (img_src_value = /*imgsrc*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*imgalt*/ 4) {
    				attr_dev(img, "alt", /*imgalt*/ ctx[2]);
    			}

    			if (dirty & /*headertext*/ 1) set_data_dev(t1, /*headertext*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*img_binding*/ ctx[6](null);
    			/*div_binding*/ ctx[7](null);
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
    	let { imgsrc = "" } = $$props;
    	let { imgalt = "" } = $$props;
    	let _headerRoot;
    	let _img;
    	let host;

    	onMount(() => {
    		host = _headerRoot.getRootNode().host;
    		_img.addEventListener("click", () => host.dispatchEvent(new Event("logoClicked")));
    	});

    	const writable_props = ["headertext", "imgsrc", "imgalt"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-header> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("zoo-header", $$slots, []);

    	function img_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, _img = $$value);
    		});
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, _headerRoot = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("headertext" in $$props) $$invalidate(0, headertext = $$props.headertext);
    		if ("imgsrc" in $$props) $$invalidate(1, imgsrc = $$props.imgsrc);
    		if ("imgalt" in $$props) $$invalidate(2, imgalt = $$props.imgalt);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		headertext,
    		imgsrc,
    		imgalt,
    		_headerRoot,
    		_img,
    		host
    	});

    	$$self.$inject_state = $$props => {
    		if ("headertext" in $$props) $$invalidate(0, headertext = $$props.headertext);
    		if ("imgsrc" in $$props) $$invalidate(1, imgsrc = $$props.imgsrc);
    		if ("imgalt" in $$props) $$invalidate(2, imgalt = $$props.imgalt);
    		if ("_headerRoot" in $$props) $$invalidate(3, _headerRoot = $$props._headerRoot);
    		if ("_img" in $$props) $$invalidate(4, _img = $$props._img);
    		if ("host" in $$props) host = $$props.host;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [headertext, imgsrc, imgalt, _headerRoot, _img, host, img_binding, div_binding];
    }

    class Header extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{contain:style}.box{display:flex;align-items:center;background:#FFFFFF;padding:0 25px;height:70px}.app-logo{height:46px;display:inline-block;padding:5px 25px 5px 0;cursor:pointer}@media only screen and (max-width: 544px){.app-logo{height:36px}}.app-name{display:inline-block;color:var(--primary-mid, #3C9700);font-size:24px;line-height:29px;padding:0 25px 0 0;font-weight:400}@media only screen and (max-width: 544px){.app-name{display:none}}</style>`;
    		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, { headertext: 0, imgsrc: 1, imgalt: 2 });

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
    		return ["headertext", "imgsrc", "imgalt"];
    	}

    	get headertext() {
    		return this.$$.ctx[0];
    	}

    	set headertext(headertext) {
    		this.$set({ headertext });
    		flush();
    	}

    	get imgsrc() {
    		return this.$$.ctx[1];
    	}

    	set imgsrc(imgsrc) {
    		this.$set({ imgsrc });
    		flush();
    	}

    	get imgalt() {
    		return this.$$.ctx[2];
    	}

    	set imgalt(imgalt) {
    		this.$set({ imgalt });
    		flush();
    	}
    }

    customElements.define("zoo-header", Header);

    /* zoo-modules/modal-module/Modal.svelte generated by Svelte v3.22.2 */
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
    		this.shadowRoot.innerHTML = `<style>:host{display:none}.box{position:fixed;width:100%;height:100%;background:rgba(0, 0, 0, 0.8);opacity:0;transition:opacity 0.3s;z-index:9999;left:0;top:0;display:flex;justify-content:center;align-items:center}.box .dialog-content{padding:0 20px 20px 20px;box-sizing:border-box;background:white;overflow-y:auto;max-height:95%;border-radius:5px}.box .dialog-content .heading{display:flex;flex-direction:row;align-items:flex-start}.box .dialog-content .heading .header-text{font-size:24px;line-height:29px;font-weight:bold;margin:30px 0}.box .dialog-content .heading .close{cursor:pointer;margin:30px 0 30px auto}.box .dialog-content .heading .close path{fill:var(--primary-mid, #3C9700)}@media only screen and (max-width: 544px){.box .dialog-content{padding:25px}}@media only screen and (max-width: 375px){.box .dialog-content{width:100%;height:100%;top:0;left:0;transform:none}}.box.show{opacity:1}.box.hide{opacity:0}.box .dialog-content{animation-duration:0.3s;animation-fill-mode:forwards}.box.show .dialog-content{animation-name:anim-show}.box.hide .dialog-content{animation-name:anim-hide}@keyframes anim-show{0%{opacity:0;transform:scale3d(0.9, 0.9, 1)}100%{opacity:1;transform:scale3d(1, 1, 1)}}@keyframes anim-hide{0%{opacity:1}100%{opacity:0;transform:scale3d(0.9, 0.9, 1)}}</style>`;

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

    /* zoo-modules/footer-module/Footer.svelte generated by Svelte v3.22.2 */

    const file$2 = "zoo-modules/footer-module/Footer.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (5:3) {#each footerlinks as footerlink}
    function create_each_block(ctx) {
    	let li;
    	let zoo_link;
    	let zoo_link_href_value;
    	let zoo_link_target_value;
    	let zoo_link_type_value;
    	let zoo_link_disabled_value;
    	let zoo_link_text_value;
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			zoo_link = element("zoo-link");
    			t = space();
    			set_custom_element_data(zoo_link, "href", zoo_link_href_value = /*footerlink*/ ctx[3].href);
    			set_custom_element_data(zoo_link, "target", zoo_link_target_value = /*footerlink*/ ctx[3].target);
    			set_custom_element_data(zoo_link, "type", zoo_link_type_value = /*footerlink*/ ctx[3].type);
    			set_custom_element_data(zoo_link, "disabled", zoo_link_disabled_value = /*footerlink*/ ctx[3].disabled);
    			set_custom_element_data(zoo_link, "text", zoo_link_text_value = /*footerlink*/ ctx[3].text);
    			add_location(zoo_link, file$2, 6, 4, 161);
    			add_location(li, file$2, 5, 3, 152);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, zoo_link);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*footerlinks*/ 1 && zoo_link_href_value !== (zoo_link_href_value = /*footerlink*/ ctx[3].href)) {
    				set_custom_element_data(zoo_link, "href", zoo_link_href_value);
    			}

    			if (dirty & /*footerlinks*/ 1 && zoo_link_target_value !== (zoo_link_target_value = /*footerlink*/ ctx[3].target)) {
    				set_custom_element_data(zoo_link, "target", zoo_link_target_value);
    			}

    			if (dirty & /*footerlinks*/ 1 && zoo_link_type_value !== (zoo_link_type_value = /*footerlink*/ ctx[3].type)) {
    				set_custom_element_data(zoo_link, "type", zoo_link_type_value);
    			}

    			if (dirty & /*footerlinks*/ 1 && zoo_link_disabled_value !== (zoo_link_disabled_value = /*footerlink*/ ctx[3].disabled)) {
    				set_custom_element_data(zoo_link, "disabled", zoo_link_disabled_value);
    			}

    			if (dirty & /*footerlinks*/ 1 && zoo_link_text_value !== (zoo_link_text_value = /*footerlink*/ ctx[3].text)) {
    				set_custom_element_data(zoo_link, "text", zoo_link_text_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(5:3) {#each footerlinks as footerlink}",
    		ctx
    	});

    	return block;
    }

    // (15:0) {#if copyright}
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
    			t1 = text(/*copyright*/ ctx[1]);
    			t2 = space();
    			t3 = text(/*currentYear*/ ctx[2]);
    			attr_dev(div, "class", "footer-copyright");
    			add_location(div, file$2, 15, 1, 389);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*copyright*/ 2) set_data_dev(t1, /*copyright*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(15:0) {#if copyright}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;
    	let ul;
    	let t;
    	let if_block_anchor;
    	let each_value = /*footerlinks*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block = /*copyright*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.c = noop;
    			add_location(ul, file$2, 3, 2, 107);
    			attr_dev(div0, "class", "list-holder");
    			add_location(div0, file$2, 2, 1, 79);
    			attr_dev(div1, "class", "footer-links");
    			add_location(div1, file$2, 1, 0, 51);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*footerlinks*/ 1) {
    				each_value = /*footerlinks*/ ctx[0];
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

    			if (/*copyright*/ ctx[1]) {
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
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
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
    	let { footerlinks = [] } = $$props;
    	let { copyright = "" } = $$props;
    	let currentYear = new Date().getFullYear();
    	const writable_props = ["footerlinks", "copyright"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-footer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("zoo-footer", $$slots, []);

    	$$self.$set = $$props => {
    		if ("footerlinks" in $$props) $$invalidate(0, footerlinks = $$props.footerlinks);
    		if ("copyright" in $$props) $$invalidate(1, copyright = $$props.copyright);
    	};

    	$$self.$capture_state = () => ({ footerlinks, copyright, currentYear });

    	$$self.$inject_state = $$props => {
    		if ("footerlinks" in $$props) $$invalidate(0, footerlinks = $$props.footerlinks);
    		if ("copyright" in $$props) $$invalidate(1, copyright = $$props.copyright);
    		if ("currentYear" in $$props) $$invalidate(2, currentYear = $$props.currentYear);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [footerlinks, copyright, currentYear];
    }

    class Footer extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{contain:style}.footer-links{display:flex;background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));justify-content:center;padding:10px 30px;flex-wrap:wrap}.footer-links .list-holder{position:relative;overflow:hidden}.footer-links .list-holder ul{display:flex;flex-direction:row;flex-wrap:wrap;justify-content:center;list-style:none;margin-left:-1px;padding-left:0;margin-top:0;margin-bottom:0}.footer-links .list-holder ul li{flex-grow:1;flex-basis:auto;margin:5px 0;padding:0 5px;text-align:center;border-left:1px solid #e6e6e6}.footer-copyright{font-size:12px;line-height:14px;text-align:left;background:#FFFFFF;color:#555555;padding:10px 0 10px 30px}@media only screen and (max-width: 544px){.footer-copyright{text-align:center;padding:10px 0}}</style>`;
    		init(this, { target: this.shadowRoot }, instance$2, create_fragment$2, safe_not_equal, { footerlinks: 0, copyright: 1 });

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
    		return ["footerlinks", "copyright"];
    	}

    	get footerlinks() {
    		return this.$$.ctx[0];
    	}

    	set footerlinks(footerlinks) {
    		this.$set({ footerlinks });
    		flush();
    	}

    	get copyright() {
    		return this.$$.ctx[1];
    	}

    	set copyright(copyright) {
    		this.$set({ copyright });
    		flush();
    	}
    }

    customElements.define("zoo-footer", Footer);

    /* zoo-modules/input-module/Input.svelte generated by Svelte v3.22.2 */
    const file$3 = "zoo-modules/input-module/Input.svelte";

    // (9:2) {#if valid}
    function create_if_block_1(ctx) {
    	let slot;

    	const block = {
    		c: function create() {
    			slot = element("slot");
    			attr_dev(slot, "name", "inputicon");
    			add_location(slot, file$3, 9, 3, 445);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(9:2) {#if valid}",
    		ctx
    	});

    	return block;
    }

    // (12:2) {#if !valid}
    function create_if_block$1(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z");
    			add_location(path, file$3, 13, 4, 576);
    			attr_dev(svg, "class", "error-circle");
    			attr_dev(svg, "width", "18");
    			attr_dev(svg, "height", "18");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$3, 12, 3, 502);
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
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(12:2) {#if !valid}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let zoo_input_label;
    	let t0;
    	let zoo_link;
    	let t1;
    	let span;
    	let slot;
    	let t2;
    	let t3;
    	let span_class_value;
    	let t4;
    	let zoo_input_info;
    	let div_class_value;
    	let if_block0 = /*valid*/ ctx[7] && create_if_block_1(ctx);
    	let if_block1 = !/*valid*/ ctx[7] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			zoo_input_label = element("zoo-input-label");
    			t0 = space();
    			zoo_link = element("zoo-link");
    			t1 = space();
    			span = element("span");
    			slot = element("slot");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			zoo_input_info = element("zoo-input-info");
    			this.c = noop;
    			set_custom_element_data(zoo_input_label, "class", "input-label");
    			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
    			add_location(zoo_input_label, file$3, 2, 1, 103);
    			set_custom_element_data(zoo_link, "class", "input-link");
    			set_custom_element_data(zoo_link, "href", /*linkhref*/ ctx[3]);
    			set_custom_element_data(zoo_link, "target", /*linktarget*/ ctx[4]);
    			set_custom_element_data(zoo_link, "type", /*linktype*/ ctx[9]);
    			set_custom_element_data(zoo_link, "text", /*linktext*/ ctx[2]);
    			set_custom_element_data(zoo_link, "textalign", "right");
    			add_location(zoo_link, file$3, 4, 1, 174);
    			attr_dev(slot, "name", "inputelement");
    			add_location(slot, file$3, 7, 2, 371);
    			attr_dev(span, "class", span_class_value = "input-slot " + (/*nopadding*/ ctx[8] ? "no-padding" : ""));
    			add_location(span, file$3, 6, 1, 312);
    			set_custom_element_data(zoo_input_info, "class", "input-info");
    			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
    			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
    			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
    			add_location(zoo_input_info, file$3, 17, 1, 997);
    			attr_dev(div, "class", div_class_value = "box " + /*labelposition*/ ctx[0] + " " + /*linkAbsentClass*/ ctx[11]);
    			add_location(div, file$3, 1, 0, 50);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, zoo_input_label);
    			append_dev(div, t0);
    			append_dev(div, zoo_link);
    			append_dev(div, t1);
    			append_dev(div, span);
    			append_dev(span, slot);
    			/*slot_binding*/ ctx[15](slot);
    			append_dev(span, t2);
    			if (if_block0) if_block0.m(span, null);
    			append_dev(span, t3);
    			if (if_block1) if_block1.m(span, null);
    			append_dev(div, t4);
    			append_dev(div, zoo_input_info);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*labeltext*/ 2) {
    				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
    			}

    			if (dirty & /*linkhref*/ 8) {
    				set_custom_element_data(zoo_link, "href", /*linkhref*/ ctx[3]);
    			}

    			if (dirty & /*linktarget*/ 16) {
    				set_custom_element_data(zoo_link, "target", /*linktarget*/ ctx[4]);
    			}

    			if (dirty & /*linktype*/ 512) {
    				set_custom_element_data(zoo_link, "type", /*linktype*/ ctx[9]);
    			}

    			if (dirty & /*linktext*/ 4) {
    				set_custom_element_data(zoo_link, "text", /*linktext*/ ctx[2]);
    			}

    			if (/*valid*/ ctx[7]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(span, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!/*valid*/ ctx[7]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(span, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*nopadding*/ 256 && span_class_value !== (span_class_value = "input-slot " + (/*nopadding*/ ctx[8] ? "no-padding" : ""))) {
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

    			if (dirty & /*labelposition, linkAbsentClass*/ 2049 && div_class_value !== (div_class_value = "box " + /*labelposition*/ ctx[0] + " " + /*linkAbsentClass*/ ctx[11])) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*slot_binding*/ ctx[15](null);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
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
    	let { nopadding = false } = $$props;
    	let { linktype = "primary" } = $$props;
    	let _slottedInput;
    	let _prevValid;
    	let _inputSlot;
    	let linkAbsentClass = "";

    	beforeUpdate(() => {
    		if (valid != _prevValid) {
    			_prevValid = valid;
    			changeValidState(valid);
    		}
    	});

    	onMount(() => {
    		_inputSlot.addEventListener("slotchange", () => {
    			let nodes = _inputSlot.assignedNodes();
    			_slottedInput = nodes[0];
    			changeValidState(valid);

    			if (!linktext) {
    				$$invalidate(11, linkAbsentClass = "link-absent");
    			}
    		});
    	});

    	const changeValidState = valid => {
    		if (_slottedInput) {
    			if (!valid) {
    				_slottedInput.classList.add("error");
    			} else if (valid) {
    				_slottedInput.classList.remove("error");
    			}
    		}
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
    		"nopadding",
    		"linktype"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-input> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("zoo-input", $$slots, []);

    	function slot_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(10, _inputSlot = $$value);
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
    		if ("nopadding" in $$props) $$invalidate(8, nopadding = $$props.nopadding);
    		if ("linktype" in $$props) $$invalidate(9, linktype = $$props.linktype);
    	};

    	$$self.$capture_state = () => ({
    		beforeUpdate,
    		onMount,
    		labelposition,
    		labeltext,
    		linktext,
    		linkhref,
    		linktarget,
    		inputerrormsg,
    		infotext,
    		valid,
    		nopadding,
    		linktype,
    		_slottedInput,
    		_prevValid,
    		_inputSlot,
    		linkAbsentClass,
    		changeValidState
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
    		if ("nopadding" in $$props) $$invalidate(8, nopadding = $$props.nopadding);
    		if ("linktype" in $$props) $$invalidate(9, linktype = $$props.linktype);
    		if ("_slottedInput" in $$props) _slottedInput = $$props._slottedInput;
    		if ("_prevValid" in $$props) _prevValid = $$props._prevValid;
    		if ("_inputSlot" in $$props) $$invalidate(10, _inputSlot = $$props._inputSlot);
    		if ("linkAbsentClass" in $$props) $$invalidate(11, linkAbsentClass = $$props.linkAbsentClass);
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
    		nopadding,
    		linktype,
    		_inputSlot,
    		linkAbsentClass,
    		_slottedInput,
    		_prevValid,
    		changeValidState,
    		slot_binding
    	];
    }

    class Input extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.box{box-sizing:border-box;width:100%;display:grid;grid-template-areas:"label label link" "input input input" "info info info";grid-template-columns:1fr 1fr 1fr;grid-gap:3px;position:relative}.box.link-absent{grid-template-areas:"label label label" "input input input" "info info info";grid-gap:3px 0}@media only screen and (min-width: 500px){.box.left{grid-template-areas:"label link link" "label input input" "label info info"}}.box.left .input-label{align-self:center;padding-right:5px}.box .input-label{grid-area:label;align-self:self-start}.box .input-link{grid-area:link;align-self:flex-end}.box .input-slot{grid-area:input;position:relative}.box .input-info{grid-area:info}.error-circle{animation:hideshow 0.5s ease;position:absolute;right:0;top:14px;padding:0 15px 0 5px;color:var(--warning-mid, #ED1C24);pointer-events:none}.error-circle path{fill:var(--warning-mid, #ED1C24)}::slotted(input),::slotted(textarea){width:100%;font-size:14px;line-height:20px;padding:13px 35px 13px 15px;margin:0;border:1px solid #767676;border-radius:5px;color:#555555;outline:none;box-sizing:border-box;text-overflow:ellipsis;-moz-appearance:textfield}::slotted(input)::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}::slotted(input)::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}::slotted(input::placeholder),::slotted(textarea::placeholder){color:#767676;opacity:1}::slotted(input:disabled),::slotted(textarea:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#E6E6E6;cursor:not-allowed}::slotted(input:focus),::slotted(textarea:focus){border:2px solid #555555;padding:12px 34px 12px 14px}::slotted(input.error),::slotted(textarea.error){transition:border-color 0.3s ease;border:2px solid var(--warning-mid, #ED1C24);padding:12px 34px 12px 14px}::slotted(input[type='date']),::slotted(input[type='time']){-webkit-appearance:none}.input-slot.no-padding ::slotted(input){padding:0}@keyframes hideshow{0%{opacity:0}100%{opacity:1}}</style>`;

    		init(this, { target: this.shadowRoot }, instance$3, create_fragment$3, safe_not_equal, {
    			labelposition: 0,
    			labeltext: 1,
    			linktext: 2,
    			linkhref: 3,
    			linktarget: 4,
    			inputerrormsg: 5,
    			infotext: 6,
    			valid: 7,
    			nopadding: 8,
    			linktype: 9
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
    			"nopadding",
    			"linktype"
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

    	get nopadding() {
    		return this.$$.ctx[8];
    	}

    	set nopadding(nopadding) {
    		this.$set({ nopadding });
    		flush();
    	}

    	get linktype() {
    		return this.$$.ctx[9];
    	}

    	set linktype(linktype) {
    		this.$set({ linktype });
    		flush();
    	}
    }

    customElements.define("zoo-input", Input);

    /* zoo-modules/button-module/Button.svelte generated by Svelte v3.22.2 */

    const file$4 = "zoo-modules/button-module/Button.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let button;
    	let slot;
    	let button_disabled_value;
    	let button_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			slot = element("slot");
    			this.c = noop;
    			attr_dev(slot, "name", "buttoncontent");
    			add_location(slot, file$4, 3, 2, 159);
    			button.disabled = button_disabled_value = /*disabled*/ ctx[2] ? true : null;
    			attr_dev(button, "class", button_class_value = "" + (/*type*/ ctx[0] + " " + /*size*/ ctx[1] + " zoo-btn"));
    			attr_dev(button, "type", "button");
    			add_location(button, file$4, 2, 1, 70);
    			attr_dev(div, "class", "box");
    			add_location(div, file$4, 1, 0, 51);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, slot);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*disabled*/ 4 && button_disabled_value !== (button_disabled_value = /*disabled*/ ctx[2] ? true : null)) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			if (dirty & /*type, size*/ 3 && button_class_value !== (button_class_value = "" + (/*type*/ ctx[0] + " " + /*size*/ ctx[1] + " zoo-btn"))) {
    				attr_dev(button, "class", button_class_value);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { type = "cold" } = $$props; //'hot', 'hollow'
    	let { size = "small" } = $$props; //'medium'
    	let { disabled = false } = $$props;
    	const writable_props = ["type", "size", "disabled"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("zoo-button", $$slots, []);

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

    	return [type, size, disabled];
    }

    class Button extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{display:block;max-width:330px;contain:layout}.box{position:relative;width:100%;height:100%}.box .zoo-btn{display:flex;flex-direction:row;align-items:center;justify-content:center;color:#FFFFFF;border:0;border-radius:5px;cursor:pointer;width:100%;height:100%;font-size:14px;line-height:20px;font-weight:bold;text-align:center;padding:0 20px}.box .zoo-btn.hollow{border:2px solid var(--primary-mid, #3C9700);color:var(--primary-mid, #3C9700);background:transparent}.box .zoo-btn.hot{background-image:linear-gradient(left, var(--secondary-mid, #FF6200), var(--secondary-light, #FF8800));background-image:-webkit-linear-gradient(left, var(--secondary-mid, #FF6200), var(--secondary-light, #FF8800))}.box .zoo-btn.hot:hover,.box .zoo-btn.hot:focus{background:var(--secondary-mid, #FF6200)}.box .zoo-btn.hot:active{background:var(--secondary-dark, #CC4E00)}.box .zoo-btn.cold{background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100))}.box .zoo-btn.cold:hover,.box .zoo-btn.cold:focus,.box .zoo-btn.hollow:hover,.box .zoo-btn.hollow:focus{background:var(--primary-mid, #3C9700);color:#FFFFFF}.box .zoo-btn.cold:active,.box .zoo-btn.hollow:active{background:var(--primary-dark, #286400);color:#FFFFFF}.box .zoo-btn:disabled{background:#F2F3F4;color:#767676;border:1px solid #E6E6E6}.box .zoo-btn:disabled:hover,.box .zoo-btn:disabled:focus,.box .zoo-btn:disabled:active{cursor:not-allowed;background:#F2F3F4;color:#767676}.box .zoo-btn:active{transform:translateY(1px)}.box .zoo-btn.small{min-height:36px}.box .zoo-btn.medium{min-height:46px}.box .zoo-btn ::slotted(*:first-child){width:100%;height:100%;border:none;display:flex;flex-direction:row;align-items:center;justify-content:center;overflow:hidden}</style>`;
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

    /* zoo-modules/checkbox-module/Checkbox.svelte generated by Svelte v3.22.2 */
    const file$5 = "zoo-modules/checkbox-module/Checkbox.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let label;
    	let slot;
    	let t0;
    	let span;
    	let t1;
    	let t2;
    	let zoo_input_info;
    	let div_class_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			slot = element("slot");
    			t0 = space();
    			span = element("span");
    			t1 = text(/*labeltext*/ ctx[1]);
    			t2 = space();
    			zoo_input_info = element("zoo-input-info");
    			this.c = noop;
    			attr_dev(slot, "name", "checkboxelement");
    			add_location(slot, file$5, 3, 2, 270);
    			attr_dev(span, "class", "input-label");
    			add_location(span, file$5, 4, 2, 369);
    			attr_dev(label, "class", "input-slot");
    			add_location(label, file$5, 2, 1, 241);
    			set_custom_element_data(zoo_input_info, "class", "input-info");
    			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[2]);
    			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[4]);
    			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[5]);
    			add_location(zoo_input_info, file$5, 8, 1, 432);
    			attr_dev(div, "class", div_class_value = "box " + (/*_clicked*/ ctx[6] ? "clicked" : "") + " " + (/*highlighted*/ ctx[3] ? "highlighted" : "") + " " + (/*_focused*/ ctx[8] ? "focused" : ""));
    			toggle_class(div, "error", !/*valid*/ ctx[2]);
    			toggle_class(div, "disabled", /*disabled*/ ctx[0]);
    			add_location(div, file$5, 1, 0, 53);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);
    			append_dev(label, slot);
    			/*slot_binding*/ ctx[15](slot);
    			append_dev(label, t0);
    			append_dev(label, span);
    			append_dev(span, t1);
    			append_dev(div, t2);
    			append_dev(div, zoo_input_info);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(slot, "click", /*click_handler*/ ctx[14], false, false, false),
    				listen_dev(div, "click", /*click_handler_1*/ ctx[16], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*labeltext*/ 2) set_data_dev(t1, /*labeltext*/ ctx[1]);

    			if (dirty & /*valid*/ 4) {
    				set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[2]);
    			}

    			if (dirty & /*inputerrormsg*/ 16) {
    				set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[4]);
    			}

    			if (dirty & /*infotext*/ 32) {
    				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[5]);
    			}

    			if (dirty & /*_clicked, highlighted, _focused*/ 328 && div_class_value !== (div_class_value = "box " + (/*_clicked*/ ctx[6] ? "clicked" : "") + " " + (/*highlighted*/ ctx[3] ? "highlighted" : "") + " " + (/*_focused*/ ctx[8] ? "focused" : ""))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty & /*_clicked, highlighted, _focused, valid*/ 332) {
    				toggle_class(div, "error", !/*valid*/ ctx[2]);
    			}

    			if (dirty & /*_clicked, highlighted, _focused, disabled*/ 329) {
    				toggle_class(div, "disabled", /*disabled*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*slot_binding*/ ctx[15](null);
    			run_all(dispose);
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
    	let { disabled = false } = $$props;
    	let { highlighted = false } = $$props;
    	let { inputerrormsg = "" } = $$props;
    	let { infotext = "" } = $$props;
    	let _clicked = false;
    	let _slottedInput;
    	let _prevValid;
    	let _inputSlot;
    	let _focused = false;

    	const handleClick = event => {
    		if (disabled) {
    			event.preventDefault();
    			return;
    		}

    		event.stopImmediatePropagation();
    		_slottedInput.click();
    	};

    	const handleSlotClick = event => {
    		if (disabled) {
    			event.preventDefault();
    			return;
    		}

    		$$invalidate(6, _clicked = !_clicked);
    		event.stopImmediatePropagation();
    	};

    	const changeValidState = state => {
    		if (_slottedInput) {
    			if (state === false) {
    				_slottedInput.classList.add("error");
    			} else if (state === true) {
    				_slottedInput.classList.remove("error");
    			}
    		}
    	};

    	beforeUpdate(() => {
    		if (valid != _prevValid) {
    			_prevValid = valid;
    			changeValidState(valid);
    		}
    	});

    	onMount(() => {
    		_inputSlot.addEventListener("slotchange", () => {
    			_slottedInput = _inputSlot.assignedNodes()[0];

    			_slottedInput.addEventListener("focus", () => {
    				$$invalidate(8, _focused = true);
    			});

    			_slottedInput.addEventListener("blur", () => {
    				$$invalidate(8, _focused = false);
    			});

    			if (_slottedInput.checked) {
    				$$invalidate(6, _clicked = true);
    			}

    			if (_slottedInput.disabled) {
    				$$invalidate(0, disabled = true);
    			}

    			changeValidState(valid);
    		});

    		_inputSlot.addEventListener("keypress", e => {
    			if (e.keyCode === 13) {
    				_slottedInput.click();
    			}
    		});
    	});

    	const writable_props = ["labeltext", "valid", "disabled", "highlighted", "inputerrormsg", "infotext"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-checkbox> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("zoo-checkbox", $$slots, []);
    	const click_handler = e => handleSlotClick(e);

    	function slot_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(7, _inputSlot = $$value);
    		});
    	}

    	const click_handler_1 = e => handleClick(e);

    	$$self.$set = $$props => {
    		if ("labeltext" in $$props) $$invalidate(1, labeltext = $$props.labeltext);
    		if ("valid" in $$props) $$invalidate(2, valid = $$props.valid);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("highlighted" in $$props) $$invalidate(3, highlighted = $$props.highlighted);
    		if ("inputerrormsg" in $$props) $$invalidate(4, inputerrormsg = $$props.inputerrormsg);
    		if ("infotext" in $$props) $$invalidate(5, infotext = $$props.infotext);
    	};

    	$$self.$capture_state = () => ({
    		beforeUpdate,
    		onMount,
    		labeltext,
    		valid,
    		disabled,
    		highlighted,
    		inputerrormsg,
    		infotext,
    		_clicked,
    		_slottedInput,
    		_prevValid,
    		_inputSlot,
    		_focused,
    		handleClick,
    		handleSlotClick,
    		changeValidState
    	});

    	$$self.$inject_state = $$props => {
    		if ("labeltext" in $$props) $$invalidate(1, labeltext = $$props.labeltext);
    		if ("valid" in $$props) $$invalidate(2, valid = $$props.valid);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("highlighted" in $$props) $$invalidate(3, highlighted = $$props.highlighted);
    		if ("inputerrormsg" in $$props) $$invalidate(4, inputerrormsg = $$props.inputerrormsg);
    		if ("infotext" in $$props) $$invalidate(5, infotext = $$props.infotext);
    		if ("_clicked" in $$props) $$invalidate(6, _clicked = $$props._clicked);
    		if ("_slottedInput" in $$props) _slottedInput = $$props._slottedInput;
    		if ("_prevValid" in $$props) _prevValid = $$props._prevValid;
    		if ("_inputSlot" in $$props) $$invalidate(7, _inputSlot = $$props._inputSlot);
    		if ("_focused" in $$props) $$invalidate(8, _focused = $$props._focused);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		disabled,
    		labeltext,
    		valid,
    		highlighted,
    		inputerrormsg,
    		infotext,
    		_clicked,
    		_inputSlot,
    		_focused,
    		handleClick,
    		handleSlotClick,
    		_slottedInput,
    		_prevValid,
    		changeValidState,
    		click_handler,
    		slot_binding,
    		click_handler_1
    	];
    }

    class Checkbox extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{margin-top:21px}.box{width:100%;display:flex;flex-direction:column;position:relative;box-sizing:border-box;cursor:pointer}.box.highlighted{border:1px solid #E6E6E6;border-radius:5px;padding:12px 15px}.box.clicked{border:2px solid var(--success-mid, #3C9700)}.box.error{border:2px solid var(--warning-mid, #ED1C24)}.box.disabled{cursor:not-allowed}.box.disabled .input-slot{cursor:not-allowed}.box .input-slot{width:100%;display:flex;flex-direction:row;cursor:pointer}.box .input-slot .input-label{display:flex;align-items:center;position:relative;left:5px}::slotted(input[type="checkbox"]){position:relative;margin:0;-webkit-appearance:none;-moz-appearance:none;outline:none;cursor:pointer}::slotted(input[type="checkbox"])::before{position:relative;display:inline-block;width:24px;height:24px;content:"";border-radius:3px;border:2px solid var(--success-mid, #3C9700);background:white}::slotted(input[type="checkbox"]:checked)::before{background:white}::slotted(input[type="checkbox"]:checked)::after{content:"";position:absolute;top:4px;left:10px;width:6px;height:14px;border-bottom:2px solid;border-right:2px solid;transform:rotate(40deg);color:var(--primary-mid, #3C9700)}::slotted(input[type="checkbox"]:disabled){cursor:not-allowed}::slotted(input[type="checkbox"]:checked.error)::after{color:var(--warning-mid, #ED1C24)}::slotted(input[type="checkbox"]:disabled)::before{border-color:#E6E6E6;background-color:#F2F3F4}::slotted(input[type="checkbox"]:disabled)::after{color:#767676}::slotted(input[type="checkbox"].error)::before{border-color:var(--warning-mid, #ED1C24);transition:border-color 0.3s ease}</style>`;

    		init(this, { target: this.shadowRoot }, instance$5, create_fragment$5, safe_not_equal, {
    			labeltext: 1,
    			valid: 2,
    			disabled: 0,
    			highlighted: 3,
    			inputerrormsg: 4,
    			infotext: 5
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
    		return ["labeltext", "valid", "disabled", "highlighted", "inputerrormsg", "infotext"];
    	}

    	get labeltext() {
    		return this.$$.ctx[1];
    	}

    	set labeltext(labeltext) {
    		this.$set({ labeltext });
    		flush();
    	}

    	get valid() {
    		return this.$$.ctx[2];
    	}

    	set valid(valid) {
    		this.$set({ valid });
    		flush();
    	}

    	get disabled() {
    		return this.$$.ctx[0];
    	}

    	set disabled(disabled) {
    		this.$set({ disabled });
    		flush();
    	}

    	get highlighted() {
    		return this.$$.ctx[3];
    	}

    	set highlighted(highlighted) {
    		this.$set({ highlighted });
    		flush();
    	}

    	get inputerrormsg() {
    		return this.$$.ctx[4];
    	}

    	set inputerrormsg(inputerrormsg) {
    		this.$set({ inputerrormsg });
    		flush();
    	}

    	get infotext() {
    		return this.$$.ctx[5];
    	}

    	set infotext(infotext) {
    		this.$set({ infotext });
    		flush();
    	}
    }

    customElements.define("zoo-checkbox", Checkbox);

    /* zoo-modules/radio-module/Radio.svelte generated by Svelte v3.22.2 */
    const file$6 = "zoo-modules/radio-module/Radio.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let zoo_input_label;
    	let t0;
    	let span;
    	let slot;
    	let t1;
    	let zoo_input_info;

    	const block = {
    		c: function create() {
    			div = element("div");
    			zoo_input_label = element("zoo-input-label");
    			t0 = space();
    			span = element("span");
    			slot = element("slot");
    			t1 = space();
    			zoo_input_info = element("zoo-input-info");
    			this.c = noop;
    			set_custom_element_data(zoo_input_label, "class", "input-label");
    			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[3]);
    			add_location(zoo_input_label, file$6, 2, 1, 69);
    			add_location(slot, file$6, 5, 2, 171);
    			attr_dev(span, "class", "template-slot");
    			add_location(span, file$6, 4, 1, 140);
    			set_custom_element_data(zoo_input_info, "class", "input-info");
    			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[0]);
    			set_custom_element_data(zoo_input_info, "inputerrormsg", /*errormsg*/ ctx[1]);
    			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[2]);
    			add_location(zoo_input_info, file$6, 7, 1, 221);
    			attr_dev(div, "class", "box");
    			add_location(div, file$6, 1, 0, 50);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, zoo_input_label);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(span, slot);
    			/*slot_binding*/ ctx[8](slot);
    			append_dev(div, t1);
    			append_dev(div, zoo_input_info);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*labeltext*/ 8) {
    				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[3]);
    			}

    			if (dirty & /*valid*/ 1) {
    				set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[0]);
    			}

    			if (dirty & /*errormsg*/ 2) {
    				set_custom_element_data(zoo_input_info, "inputerrormsg", /*errormsg*/ ctx[1]);
    			}

    			if (dirty & /*infotext*/ 4) {
    				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*slot_binding*/ ctx[8](null);
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
    	let { errormsg = "" } = $$props;
    	let { infotext = "" } = $$props;
    	let { labeltext = "" } = $$props;
    	let _prevValid;
    	let _templateSlot;
    	let clone;

    	const changeValidState = valid => {
    		if (_templateSlot) {
    			_templateSlot.assignedNodes().forEach(el => {
    				if (el.classList) {
    					if (valid === false) {
    						el.classList.add("error");
    					} else if (valid) {
    						el.classList.remove("error");
    					}
    				}
    			});
    		}
    	};

    	beforeUpdate(() => {
    		if (valid !== _prevValid) {
    			_prevValid = valid;
    			changeValidState(valid);
    		}
    	});

    	onMount(() => {
    		_templateSlot.addEventListener("slotchange", () => {
    			if (!clone) {
    				const template = _templateSlot.assignedNodes()[0];

    				if (template.content) {
    					clone = template.content.cloneNode(true);
    					_templateSlot.getRootNode().querySelector("slot").assignedNodes()[0].remove();
    					_templateSlot.getRootNode().host.appendChild(clone);
    				}

    				_templateSlot.getRootNode().host.querySelectorAll("input").forEach(input => {
    					input.addEventListener("focus", e => {
    						e.target.classList.add("focused");
    					});

    					input.addEventListener("blur", e => {
    						e.target.classList.remove("focused");
    					});
    				});
    			}
    		});
    	});

    	const writable_props = ["valid", "errormsg", "infotext", "labeltext"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-radio> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("zoo-radio", $$slots, []);

    	function slot_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, _templateSlot = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
    		if ("errormsg" in $$props) $$invalidate(1, errormsg = $$props.errormsg);
    		if ("infotext" in $$props) $$invalidate(2, infotext = $$props.infotext);
    		if ("labeltext" in $$props) $$invalidate(3, labeltext = $$props.labeltext);
    	};

    	$$self.$capture_state = () => ({
    		beforeUpdate,
    		onMount,
    		valid,
    		errormsg,
    		infotext,
    		labeltext,
    		_prevValid,
    		_templateSlot,
    		clone,
    		changeValidState
    	});

    	$$self.$inject_state = $$props => {
    		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
    		if ("errormsg" in $$props) $$invalidate(1, errormsg = $$props.errormsg);
    		if ("infotext" in $$props) $$invalidate(2, infotext = $$props.infotext);
    		if ("labeltext" in $$props) $$invalidate(3, labeltext = $$props.labeltext);
    		if ("_prevValid" in $$props) _prevValid = $$props._prevValid;
    		if ("_templateSlot" in $$props) $$invalidate(4, _templateSlot = $$props._templateSlot);
    		if ("clone" in $$props) clone = $$props.clone;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		valid,
    		errormsg,
    		infotext,
    		labeltext,
    		_templateSlot,
    		_prevValid,
    		clone,
    		changeValidState,
    		slot_binding
    	];
    }

    class Radio extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{display:flex;flex-direction:column}.template-slot{display:flex}::slotted(input[type="radio"]){position:relative;margin:0;-webkit-appearance:none;-moz-appearance:none;outline:none;cursor:pointer}::slotted(input[type="radio"]):focus::before{border-color:#555555}::slotted(input[type="radio"])::before{position:relative;display:inline-block;width:16px;height:16px;content:"";border-radius:50%;border:2px solid var(--primary-mid, #3C9700);background:white}::slotted(input[type="radio"]:checked)::before{background:white}::slotted(input[type="radio"]:checked)::after,::slotted(input[type="radio"].focused)::after{content:"";position:absolute;top:5px;left:5px;width:6px;height:6px;transform:rotate(40deg);color:var(--primary-mid, #3C9700);border:2px solid;border-radius:50%}::slotted(input[type="radio"]:checked)::after{background:var(--primary-mid, #3C9700)}::slotted(input[type="radio"].focused)::after{background:#E6E6E6;color:#E6E6E6}::slotted(input.focused)::before{border-color:#555555}::slotted(label){cursor:pointer;margin:0 5px;align-self:center}::slotted(input[type="radio"]:disabled){cursor:not-allowed}::slotted(input[type="radio"]:disabled)::before{border-color:#767676;background-color:#E6E6E6}::slotted(input[type="radio"].error)::before{border-color:var(--warning-mid, #ED1C24)}::slotted(label.error){color:var(--warning-mid, #ED1C24)}</style>`;

    		init(this, { target: this.shadowRoot }, instance$6, create_fragment$6, safe_not_equal, {
    			valid: 0,
    			errormsg: 1,
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
    		return ["valid", "errormsg", "infotext", "labeltext"];
    	}

    	get valid() {
    		return this.$$.ctx[0];
    	}

    	set valid(valid) {
    		this.$set({ valid });
    		flush();
    	}

    	get errormsg() {
    		return this.$$.ctx[1];
    	}

    	set errormsg(errormsg) {
    		this.$set({ errormsg });
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

    /* zoo-modules/feedback-module/Feedback.svelte generated by Svelte v3.22.2 */

    const file$7 = "zoo-modules/feedback-module/Feedback.svelte";

    function create_fragment$7(ctx) {
    	let div;
    	let svg;
    	let path;
    	let t0;
    	let slot;
    	let span;
    	let t1;
    	let div_class_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			slot = element("slot");
    			span = element("span");
    			t1 = text(/*text*/ ctx[1]);
    			this.c = noop;
    			attr_dev(path, "d", "M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z");
    			add_location(path, file$7, 3, 2, 145);
    			attr_dev(svg, "class", /*type*/ ctx[0]);
    			attr_dev(svg, "width", "30");
    			attr_dev(svg, "height", "30");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$7, 2, 1, 79);
    			attr_dev(span, "class", "text");
    			add_location(span, file$7, 6, 2, 556);
    			add_location(slot, file$7, 5, 1, 547);
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
    			append_dev(slot, span);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*type*/ 1) {
    				attr_dev(svg, "class", /*type*/ ctx[0]);
    			}

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
    		this.shadowRoot.innerHTML = `<style>.box{box-sizing:border-box;font-size:14px;line-height:20px;border-left:3px solid;display:flex;align-items:center;width:100%;height:100%;padding:5px 0}.box.info{background:var(--info-ultralight, #ECF5FA);border-color:var(--info-mid, #459FD0)}.box.info svg{fill:var(--info-mid, #459FD0)}.box.error{background:var(--warning-ultralight, #FDE8E9);border-color:var(--warning-mid, #ED1C24)}.box.error svg{fill:var(--warning-mid, #ED1C24)}.box.success{background:var(--primary-ultralight, #EBF4E5);border-color:var(--primary-mid, #3C9700)}.box.success svg{fill:var(--primary-mid, #3C9700)}.box svg{min-width:24px;min-height:24px;padding:0 10px 0 15px}.box .text{display:flex;flex-direction:row;align-items:center;height:100%;overflow:auto;box-sizing:border-box;padding:5px 5px 5px 0}</style>`;
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

    /* zoo-modules/tooltip-module/Tooltip.svelte generated by Svelte v3.22.2 */

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
    		this.shadowRoot.innerHTML = `<style>:host{display:flex;position:absolute;width:100%;height:100%;z-index:10000;left:0;bottom:0;pointer-events:none;line-height:initial;font-size:initial;font-weight:initial;contain:layout;justify-content:center}.box{pointer-events:initial;box-shadow:0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);border-radius:5px;position:absolute;transform:translate(0%, -50%)}.box.top{bottom:calc(100% + 11px);right:50%;transform:translate3d(50%, 0, 0)}.box.right{left:calc(100% + 10px);top:50%}.box.bottom{top:100%;right:50%;transform:translate3d(50%, 20%, 0)}.box.left{right:calc(100% + 11px);top:50%}.box .tooltip-content{padding:10px;font-size:12px;line-height:14px;position:relative;z-index:1;background:white;border-radius:5px}.box .tooltip-content .text{white-space:pre;color:black}.box .tip{position:absolute}.box .tip:after{content:"";width:16px;height:16px;position:absolute;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1);top:-8px;transform:rotate(45deg);z-index:0;background:white}.box .tip.top,.box .tip.bottom{right:calc(50% + 8px)}.box .tip.right{bottom:50%;left:-8px}.box .tip.bottom{top:0}.box .tip.left{bottom:50%;right:8px}@keyframes fadeTooltipIn{from{opacity:0}to{opacity:1}}</style>`;
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

    /* zoo-modules/select-module/Select.svelte generated by Svelte v3.22.2 */
    const file$9 = "zoo-modules/select-module/Select.svelte";

    // (9:2) {#if !_multiple}
    function create_if_block$2(ctx) {
    	let svg;
    	let path;
    	let svg_class_value;
    	let t0;
    	let t1;
    	let if_block1_anchor;
    	let if_block0 = /*loading*/ ctx[8] && create_if_block_2(ctx);
    	let if_block1 = /*_valueSelected*/ ctx[12] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(path, "d", "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
    			add_location(path, file$9, 9, 96, 514);
    			attr_dev(svg, "class", svg_class_value = "arrows " + (/*_disabled*/ ctx[13] ? "disabled" : ""));
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$9, 9, 3, 421);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*_disabled*/ 8192 && svg_class_value !== (svg_class_value = "arrows " + (/*_disabled*/ ctx[13] ? "disabled" : ""))) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (/*loading*/ ctx[8]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(t1.parentNode, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*_valueSelected*/ ctx[12]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (detaching) detach_dev(t0);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(9:2) {#if !_multiple}",
    		ctx
    	});

    	return block;
    }

    // (11:3) {#if loading}
    function create_if_block_2(ctx) {
    	let zoo_preloader;

    	const block = {
    		c: function create() {
    			zoo_preloader = element("zoo-preloader");
    			add_location(zoo_preloader, file$9, 11, 4, 609);
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
    		source: "(11:3) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (14:3) {#if _valueSelected}
    function create_if_block_1$1(ctx) {
    	let div;
    	let svg;
    	let path;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
    			add_location(path, file$9, 16, 6, 795);
    			attr_dev(svg, "width", "20");
    			attr_dev(svg, "height", "20");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$9, 15, 5, 740);
    			attr_dev(div, "class", "close");
    			add_location(div, file$9, 14, 4, 678);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", /*click_handler*/ ctx[20], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(14:3) {#if _valueSelected}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div1;
    	let zoo_input_label;
    	let t0;
    	let zoo_link;
    	let t1;
    	let div0;
    	let slot;
    	let t2;
    	let t3;
    	let zoo_input_info;
    	let div1_class_value;
    	let if_block = !/*_multiple*/ ctx[10] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			zoo_input_label = element("zoo-input-label");
    			t0 = space();
    			zoo_link = element("zoo-link");
    			t1 = space();
    			div0 = element("div");
    			slot = element("slot");
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			zoo_input_info = element("zoo-input-info");
    			this.c = noop;
    			set_custom_element_data(zoo_input_label, "class", "input-label");
    			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
    			add_location(zoo_input_label, file$9, 2, 1, 104);
    			set_custom_element_data(zoo_link, "class", "input-link");
    			set_custom_element_data(zoo_link, "href", /*linkhref*/ ctx[3]);
    			set_custom_element_data(zoo_link, "target", /*linktarget*/ ctx[4]);
    			set_custom_element_data(zoo_link, "type", /*linktype*/ ctx[9]);
    			set_custom_element_data(zoo_link, "text", /*linktext*/ ctx[2]);
    			set_custom_element_data(zoo_link, "textalign", "right");
    			add_location(zoo_link, file$9, 4, 1, 175);
    			attr_dev(slot, "name", "selectelement");
    			add_location(slot, file$9, 7, 2, 340);
    			attr_dev(div0, "class", "input-slot");
    			add_location(div0, file$9, 6, 1, 313);
    			set_custom_element_data(zoo_input_info, "class", "input-info");
    			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
    			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
    			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
    			add_location(zoo_input_info, file$9, 22, 1, 908);
    			attr_dev(div1, "class", div1_class_value = "box " + /*labelposition*/ ctx[0] + " " + /*linkAbsentClass*/ ctx[14]);
    			add_location(div1, file$9, 1, 0, 51);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, zoo_input_label);
    			append_dev(div1, t0);
    			append_dev(div1, zoo_link);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, slot);
    			/*slot_binding*/ ctx[19](slot);
    			append_dev(div0, t2);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div1, t3);
    			append_dev(div1, zoo_input_info);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*labeltext*/ 2) {
    				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
    			}

    			if (dirty & /*linkhref*/ 8) {
    				set_custom_element_data(zoo_link, "href", /*linkhref*/ ctx[3]);
    			}

    			if (dirty & /*linktarget*/ 16) {
    				set_custom_element_data(zoo_link, "target", /*linktarget*/ ctx[4]);
    			}

    			if (dirty & /*linktype*/ 512) {
    				set_custom_element_data(zoo_link, "type", /*linktype*/ ctx[9]);
    			}

    			if (dirty & /*linktext*/ 4) {
    				set_custom_element_data(zoo_link, "text", /*linktext*/ ctx[2]);
    			}

    			if (!/*_multiple*/ ctx[10]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
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

    			if (dirty & /*labelposition, linkAbsentClass*/ 16385 && div1_class_value !== (div1_class_value = "box " + /*labelposition*/ ctx[0] + " " + /*linkAbsentClass*/ ctx[14])) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*slot_binding*/ ctx[19](null);
    			if (if_block) if_block.d();
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
    	let { linktype = "primary" } = $$props;
    	let _prevValid;
    	let _multiple = false;
    	let _slottedSelect;
    	let _selectSlot;
    	let _valueSelected;
    	let _disabled;
    	let linkAbsentClass = "";

    	beforeUpdate(() => {
    		if (valid != _prevValid) {
    			_prevValid = valid;
    			changeValidState(valid);
    		}
    	});

    	onMount(() => {
    		_selectSlot.addEventListener("slotchange", () => {
    			let select = _selectSlot.assignedNodes()[0];
    			_slottedSelect = select;

    			if (select.multiple === true) {
    				$$invalidate(10, _multiple = true);
    			}

    			if (select.disabled === true) {
    				$$invalidate(13, _disabled = true);
    			}

    			_slottedSelect.addEventListener("change", e => $$invalidate(12, _valueSelected = e.target.value ? true : false));
    			changeValidState(valid);

    			if (!linktext) {
    				$$invalidate(14, linkAbsentClass = "link-absent");
    			}
    		});
    	});

    	const changeValidState = valid => {
    		if (_slottedSelect) {
    			if (!valid) {
    				_slottedSelect.classList.add("error");
    			} else if (valid) {
    				_slottedSelect.classList.remove("error");
    			}
    		}
    	};

    	const handleCrossClick = () => {
    		_slottedSelect.value = null;
    		_slottedSelect.dispatchEvent(new Event("change"));
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
    		"loading",
    		"linktype"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-select> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("zoo-select", $$slots, []);

    	function slot_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(11, _selectSlot = $$value);
    		});
    	}

    	const click_handler = e => handleCrossClick();

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
    		if ("linktype" in $$props) $$invalidate(9, linktype = $$props.linktype);
    	};

    	$$self.$capture_state = () => ({
    		beforeUpdate,
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
    		linktype,
    		_prevValid,
    		_multiple,
    		_slottedSelect,
    		_selectSlot,
    		_valueSelected,
    		_disabled,
    		linkAbsentClass,
    		changeValidState,
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
    		if ("linktype" in $$props) $$invalidate(9, linktype = $$props.linktype);
    		if ("_prevValid" in $$props) _prevValid = $$props._prevValid;
    		if ("_multiple" in $$props) $$invalidate(10, _multiple = $$props._multiple);
    		if ("_slottedSelect" in $$props) _slottedSelect = $$props._slottedSelect;
    		if ("_selectSlot" in $$props) $$invalidate(11, _selectSlot = $$props._selectSlot);
    		if ("_valueSelected" in $$props) $$invalidate(12, _valueSelected = $$props._valueSelected);
    		if ("_disabled" in $$props) $$invalidate(13, _disabled = $$props._disabled);
    		if ("linkAbsentClass" in $$props) $$invalidate(14, linkAbsentClass = $$props.linkAbsentClass);
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
    		linktype,
    		_multiple,
    		_selectSlot,
    		_valueSelected,
    		_disabled,
    		linkAbsentClass,
    		handleCrossClick,
    		_prevValid,
    		_slottedSelect,
    		changeValidState,
    		slot_binding,
    		click_handler
    	];
    }

    class Select extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.box{box-sizing:border-box;width:100%;display:grid;grid-template-areas:"label label link" "input input input" "info info info";grid-template-columns:1fr 1fr 1fr;grid-gap:3px;position:relative}.box.link-absent{grid-template-areas:"label label label" "input input input" "info info info";grid-gap:3px 0}@media only screen and (min-width: 500px){.box.left{grid-template-areas:"label link link" "label input input" "label info info"}}.box.left .input-label{align-self:center;padding-right:5px}.box .input-label{grid-area:label;align-self:self-start}.box .input-link{grid-area:link;align-self:flex-end}.box .input-slot{grid-area:input;position:relative}.box .input-info{grid-area:info}.close,.arrows{position:absolute;right:9px;top:12px}.close{display:inline-block;cursor:pointer;right:28px;top:14px}.arrows path{fill:var(--primary-mid, #3C9700)}.arrows.disabled path{fill:#E6E6E6}::slotted(select){-webkit-appearance:none;-moz-appearance:none;width:100%;background:white;font-size:14px;line-height:20px;padding:13px 40px 13px 15px;border:1px solid #767676;border-radius:5px;color:#555555;outline:none;box-sizing:border-box;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}::slotted(select:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#E6E6E6}::slotted(select:disabled:hover){cursor:not-allowed}::slotted(select:focus){border:2px solid #555555;padding:12px 40px 12px 14px}::slotted(select.error){border:2px solid var(--warning-mid, #ED1C24);padding:12px 14px;transition:border-color 0.3s ease}</style>`;

    		init(this, { target: this.shadowRoot }, instance$9, create_fragment$9, safe_not_equal, {
    			labelposition: 0,
    			labeltext: 1,
    			linktext: 2,
    			linkhref: 3,
    			linktarget: 4,
    			inputerrormsg: 5,
    			infotext: 6,
    			valid: 7,
    			loading: 8,
    			linktype: 9
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
    			"loading",
    			"linktype"
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

    	get linktype() {
    		return this.$$.ctx[9];
    	}

    	set linktype(linktype) {
    		this.$set({ linktype });
    		flush();
    	}
    }

    customElements.define("zoo-select", Select);

    /* zoo-modules/searchable-select-module/SearchableSelect.svelte generated by Svelte v3.22.2 */
    const file$a = "zoo-modules/searchable-select-module/SearchableSelect.svelte";

    // (24:1) {:else}
    function create_else_block(ctx) {
    	let zoo_select;
    	let slot;

    	const block = {
    		c: function create() {
    			zoo_select = element("zoo-select");
    			slot = element("slot");
    			attr_dev(slot, "name", "selectelement");
    			attr_dev(slot, "slot", "selectelement");
    			add_location(slot, file$a, 26, 3, 1334);
    			set_custom_element_data(zoo_select, "labelposition", /*labelposition*/ ctx[1]);
    			set_custom_element_data(zoo_select, "linktext", /*linktext*/ ctx[3]);
    			set_custom_element_data(zoo_select, "linkhref", /*linkhref*/ ctx[4]);
    			set_custom_element_data(zoo_select, "linktarget", /*linktarget*/ ctx[5]);
    			set_custom_element_data(zoo_select, "labeltext", /*labeltext*/ ctx[2]);
    			set_custom_element_data(zoo_select, "inputerrormsg", /*inputerrormsg*/ ctx[6]);
    			set_custom_element_data(zoo_select, "infotext", /*infotext*/ ctx[7]);
    			set_custom_element_data(zoo_select, "valid", /*valid*/ ctx[0]);
    			add_location(zoo_select, file$a, 24, 2, 1119);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, zoo_select, anchor);
    			append_dev(zoo_select, slot);
    			/*slot_binding_1*/ ctx[33](slot);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*labelposition*/ 2) {
    				set_custom_element_data(zoo_select, "labelposition", /*labelposition*/ ctx[1]);
    			}

    			if (dirty[0] & /*linktext*/ 8) {
    				set_custom_element_data(zoo_select, "linktext", /*linktext*/ ctx[3]);
    			}

    			if (dirty[0] & /*linkhref*/ 16) {
    				set_custom_element_data(zoo_select, "linkhref", /*linkhref*/ ctx[4]);
    			}

    			if (dirty[0] & /*linktarget*/ 32) {
    				set_custom_element_data(zoo_select, "linktarget", /*linktarget*/ ctx[5]);
    			}

    			if (dirty[0] & /*labeltext*/ 4) {
    				set_custom_element_data(zoo_select, "labeltext", /*labeltext*/ ctx[2]);
    			}

    			if (dirty[0] & /*inputerrormsg*/ 64) {
    				set_custom_element_data(zoo_select, "inputerrormsg", /*inputerrormsg*/ ctx[6]);
    			}

    			if (dirty[0] & /*infotext*/ 128) {
    				set_custom_element_data(zoo_select, "infotext", /*infotext*/ ctx[7]);
    			}

    			if (dirty[0] & /*valid*/ 1) {
    				set_custom_element_data(zoo_select, "valid", /*valid*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(zoo_select);
    			/*slot_binding_1*/ ctx[33](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(24:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (3:1) {#if !_isMobile}
    function create_if_block$3(ctx) {
    	let t0;
    	let zoo_input;
    	let input;
    	let t1;
    	let div;
    	let t2;
    	let span;
    	let t3;
    	let slot;
    	let dispose;
    	let if_block0 = /*tooltipText*/ ctx[14] && create_if_block_3(ctx);
    	let if_block1 = /*_valueSelected*/ ctx[13] && create_if_block_2$1(ctx);
    	let if_block2 = /*loading*/ ctx[9] && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			zoo_input = element("zoo-input");
    			input = element("input");
    			t1 = space();
    			div = element("div");
    			if (if_block1) if_block1.c();
    			t2 = space();
    			span = element("span");
    			if (if_block2) if_block2.c();
    			t3 = space();
    			slot = element("slot");
    			attr_dev(input, "slot", "inputelement");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[8]);
    			add_location(input, file$a, 10, 3, 541);
    			attr_dev(div, "slot", "inputelement");
    			attr_dev(div, "class", "close");
    			add_location(div, file$a, 11, 3, 681);
    			attr_dev(span, "slot", "inputelement");
    			add_location(span, file$a, 16, 3, 929);
    			set_custom_element_data(zoo_input, "infotext", /*infotext*/ ctx[7]);
    			set_custom_element_data(zoo_input, "valid", /*valid*/ ctx[0]);
    			set_custom_element_data(zoo_input, "type", "text");
    			set_custom_element_data(zoo_input, "labeltext", /*labeltext*/ ctx[2]);
    			set_custom_element_data(zoo_input, "inputerrormsg", /*inputerrormsg*/ ctx[6]);
    			set_custom_element_data(zoo_input, "labelposition", /*labelposition*/ ctx[1]);
    			set_custom_element_data(zoo_input, "linktext", /*linktext*/ ctx[3]);
    			set_custom_element_data(zoo_input, "linkhref", /*linkhref*/ ctx[4]);
    			set_custom_element_data(zoo_input, "linktarget", /*linktarget*/ ctx[5]);
    			toggle_class(zoo_input, "mobile", /*_isMobile*/ ctx[12]);
    			add_location(zoo_input, file$a, 7, 2, 243);
    			attr_dev(slot, "name", "selectelement");
    			add_location(slot, file$a, 22, 2, 1049);
    		},
    		m: function mount(target, anchor, remount) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, zoo_input, anchor);
    			append_dev(zoo_input, input);
    			/*input_binding*/ ctx[28](input);
    			append_dev(zoo_input, t1);
    			append_dev(zoo_input, div);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(zoo_input, t2);
    			append_dev(zoo_input, span);
    			if (if_block2) if_block2.m(span, null);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, slot, anchor);
    			/*slot_binding*/ ctx[32](slot);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "input", /*input_handler*/ ctx[29], false, false, false),
    				listen_dev(div, "click", /*click_handler*/ ctx[30], false, false, false),
    				listen_dev(zoo_input, "click", /*click_handler_1*/ ctx[31], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (/*tooltipText*/ ctx[14]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*placeholder*/ 256) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[8]);
    			}

    			if (/*_valueSelected*/ ctx[13]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*loading*/ ctx[9]) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_1$2(ctx);
    					if_block2.c();
    					if_block2.m(span, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty[0] & /*infotext*/ 128) {
    				set_custom_element_data(zoo_input, "infotext", /*infotext*/ ctx[7]);
    			}

    			if (dirty[0] & /*valid*/ 1) {
    				set_custom_element_data(zoo_input, "valid", /*valid*/ ctx[0]);
    			}

    			if (dirty[0] & /*labeltext*/ 4) {
    				set_custom_element_data(zoo_input, "labeltext", /*labeltext*/ ctx[2]);
    			}

    			if (dirty[0] & /*inputerrormsg*/ 64) {
    				set_custom_element_data(zoo_input, "inputerrormsg", /*inputerrormsg*/ ctx[6]);
    			}

    			if (dirty[0] & /*labelposition*/ 2) {
    				set_custom_element_data(zoo_input, "labelposition", /*labelposition*/ ctx[1]);
    			}

    			if (dirty[0] & /*linktext*/ 8) {
    				set_custom_element_data(zoo_input, "linktext", /*linktext*/ ctx[3]);
    			}

    			if (dirty[0] & /*linkhref*/ 16) {
    				set_custom_element_data(zoo_input, "linkhref", /*linkhref*/ ctx[4]);
    			}

    			if (dirty[0] & /*linktarget*/ 32) {
    				set_custom_element_data(zoo_input, "linktarget", /*linktarget*/ ctx[5]);
    			}

    			if (dirty[0] & /*_isMobile*/ 4096) {
    				toggle_class(zoo_input, "mobile", /*_isMobile*/ ctx[12]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(zoo_input);
    			/*input_binding*/ ctx[28](null);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(slot);
    			/*slot_binding*/ ctx[32](null);
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

    // (4:2) {#if tooltipText}
    function create_if_block_3(ctx) {
    	let zoo_tooltip;
    	let zoo_tooltip_folding_value;

    	const block = {
    		c: function create() {
    			zoo_tooltip = element("zoo-tooltip");
    			set_custom_element_data(zoo_tooltip, "class", "selected-options");
    			set_custom_element_data(zoo_tooltip, "position", "right");
    			set_custom_element_data(zoo_tooltip, "text", /*tooltipText*/ ctx[14]);
    			set_custom_element_data(zoo_tooltip, "folding", zoo_tooltip_folding_value = true);
    			add_location(zoo_tooltip, file$a, 4, 3, 121);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, zoo_tooltip, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*tooltipText*/ 16384) {
    				set_custom_element_data(zoo_tooltip, "text", /*tooltipText*/ ctx[14]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(zoo_tooltip);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(4:2) {#if tooltipText}",
    		ctx
    	});

    	return block;
    }

    // (13:4) {#if _valueSelected}
    function create_if_block_2$1(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
    			add_location(path, file$a, 13, 53, 836);
    			attr_dev(svg, "width", "20");
    			attr_dev(svg, "height", "20");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$a, 13, 5, 788);
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
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(13:4) {#if _valueSelected}",
    		ctx
    	});

    	return block;
    }

    // (18:4) {#if loading}
    function create_if_block_1$2(ctx) {
    	let zoo_preloader;

    	const block = {
    		c: function create() {
    			zoo_preloader = element("zoo-preloader");
    			add_location(zoo_preloader, file$a, 18, 5, 979);
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
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(18:4) {#if loading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (!/*_isMobile*/ ctx[12]) return create_if_block$3;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			this.c = noop;
    			attr_dev(div, "class", "box");
    			add_location(div, file$a, 1, 0, 62);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
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
    	let multiple = false;
    	let searchableInput;
    	let _selectSlot;
    	let _selectElement;
    	let _prevValid;
    	let options;
    	let _isMobile;
    	let _valueSelected;
    	let tooltipText;

    	beforeUpdate(() => {
    		if (valid != _prevValid) {
    			_prevValid = valid;
    			changeValidState(valid);
    		}
    	});

    	onMount(() => {
    		$$invalidate(12, _isMobile = isMobile());

    		_selectSlot.addEventListener("slotchange", () => {
    			let select = _selectSlot.assignedNodes()[0];
    			_selectElement = select;
    			options = _selectElement.options;

    			if (!options || options.length < 1) {
    				$$invalidate(14, tooltipText = null);
    			}

    			_selectElement.addEventListener("blur", () => {
    				_hideSelectOptions();
    			});

    			if (_selectElement.multiple === true) {
    				multiple = true;
    			}

    			_selectElement.addEventListener("change", () => handleOptionChange());
    			_selectElement.addEventListener("keydown", e => handleOptionKeydown(e));
    			observeDisabledAttributeChange();
    			_selectElement.classList.add("searchable-zoo-select");
    			_selectElement.addEventListener("change", e => $$invalidate(13, _valueSelected = e.target.value ? true : false));
    			_hideSelectOptions();
    			changeValidState(valid);
    		});

    		searchableInput.addEventListener("focus", () => {
    			_selectElement.classList.remove("hidden");
    			openSearchableSelect();
    		});

    		searchableInput.addEventListener("blur", event => {
    			if (event.relatedTarget !== _selectElement) {
    				_hideSelectOptions();
    			}
    		});
    	});

    	const observeDisabledAttributeChange = () => {
    		const observer = new MutationObserver(mutations => {
    				mutations.forEach(mutation => {
    					if (mutation.type == "attributes" && mutation.attributeName == "disabled") {
    						$$invalidate(10, searchableInput.disabled = _selectElement.disabled, searchableInput);
    					}
    				});
    			});

    		observer.observe(_selectElement, { attributes: true });
    	};

    	const handleSearchChange = () => {
    		const inputVal = searchableInput.value.toLowerCase();

    		for (const option of options) {
    			if (option.text.toLowerCase().indexOf(inputVal) > -1) option.style.display = "block"; else option.style.display = "none";
    		}
    	};

    	const openSearchableSelect = () => {
    		if (!multiple) {
    			_selectElement.size = 4;
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
    		$$invalidate(14, tooltipText = inputValString);

    		$$invalidate(
    			10,
    			searchableInput.placeholder = inputValString && inputValString.length > 0
    			? inputValString
    			: placeholder,
    			searchableInput
    		);

    		for (const option of options) {
    			option.style.display = "block";
    		}

    		if (!multiple) _hideSelectOptions();
    	};

    	const _hideSelectOptions = () => {
    		_selectElement.classList.add("hidden");
    		$$invalidate(10, searchableInput.value = null, searchableInput);
    	};

    	const changeValidState = state => {
    		if (_selectElement && state !== undefined) {
    			if (state === false) {
    				_selectElement.classList.add("error");
    			} else if (state) {
    				_selectElement.classList.remove("error");
    			}

    			$$invalidate(0, valid = state);
    		}
    	};

    	const isMobile = () => {
    		const index = navigator.appVersion.indexOf("Mobile");
    		return index > -1;
    	};

    	const handleCrossClick = () => {
    		_selectElement.value = null;
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
    	const click_handler_1 = () => openSearchableSelect();

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
    		if ("labelposition" in $$props) $$invalidate(1, labelposition = $$props.labelposition);
    		if ("labeltext" in $$props) $$invalidate(2, labeltext = $$props.labeltext);
    		if ("linktext" in $$props) $$invalidate(3, linktext = $$props.linktext);
    		if ("linkhref" in $$props) $$invalidate(4, linkhref = $$props.linkhref);
    		if ("linktarget" in $$props) $$invalidate(5, linktarget = $$props.linktarget);
    		if ("inputerrormsg" in $$props) $$invalidate(6, inputerrormsg = $$props.inputerrormsg);
    		if ("infotext" in $$props) $$invalidate(7, infotext = $$props.infotext);
    		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
    		if ("placeholder" in $$props) $$invalidate(8, placeholder = $$props.placeholder);
    		if ("loading" in $$props) $$invalidate(9, loading = $$props.loading);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		beforeUpdate,
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
    		multiple,
    		searchableInput,
    		_selectSlot,
    		_selectElement,
    		_prevValid,
    		options,
    		_isMobile,
    		_valueSelected,
    		tooltipText,
    		observeDisabledAttributeChange,
    		handleSearchChange,
    		openSearchableSelect,
    		handleOptionKeydown,
    		handleOptionChange,
    		_hideSelectOptions,
    		changeValidState,
    		isMobile,
    		handleCrossClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("labelposition" in $$props) $$invalidate(1, labelposition = $$props.labelposition);
    		if ("labeltext" in $$props) $$invalidate(2, labeltext = $$props.labeltext);
    		if ("linktext" in $$props) $$invalidate(3, linktext = $$props.linktext);
    		if ("linkhref" in $$props) $$invalidate(4, linkhref = $$props.linkhref);
    		if ("linktarget" in $$props) $$invalidate(5, linktarget = $$props.linktarget);
    		if ("inputerrormsg" in $$props) $$invalidate(6, inputerrormsg = $$props.inputerrormsg);
    		if ("infotext" in $$props) $$invalidate(7, infotext = $$props.infotext);
    		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
    		if ("placeholder" in $$props) $$invalidate(8, placeholder = $$props.placeholder);
    		if ("loading" in $$props) $$invalidate(9, loading = $$props.loading);
    		if ("multiple" in $$props) multiple = $$props.multiple;
    		if ("searchableInput" in $$props) $$invalidate(10, searchableInput = $$props.searchableInput);
    		if ("_selectSlot" in $$props) $$invalidate(11, _selectSlot = $$props._selectSlot);
    		if ("_selectElement" in $$props) _selectElement = $$props._selectElement;
    		if ("_prevValid" in $$props) _prevValid = $$props._prevValid;
    		if ("options" in $$props) options = $$props.options;
    		if ("_isMobile" in $$props) $$invalidate(12, _isMobile = $$props._isMobile);
    		if ("_valueSelected" in $$props) $$invalidate(13, _valueSelected = $$props._valueSelected);
    		if ("tooltipText" in $$props) $$invalidate(14, tooltipText = $$props.tooltipText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		valid,
    		labelposition,
    		labeltext,
    		linktext,
    		linkhref,
    		linktarget,
    		inputerrormsg,
    		infotext,
    		placeholder,
    		loading,
    		searchableInput,
    		_selectSlot,
    		_isMobile,
    		_valueSelected,
    		tooltipText,
    		handleSearchChange,
    		openSearchableSelect,
    		handleCrossClick,
    		handleOptionChange,
    		multiple,
    		_selectElement,
    		_prevValid,
    		options,
    		observeDisabledAttributeChange,
    		handleOptionKeydown,
    		_hideSelectOptions,
    		changeValidState,
    		isMobile,
    		input_binding,
    		input_handler,
    		click_handler,
    		click_handler_1,
    		slot_binding,
    		slot_binding_1
    	];
    }

    class SearchableSelect extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.close{display:inline-block;position:absolute;top:34%;right:4%;cursor:pointer}:host{position:relative}.box{position:relative}.box:hover .selected-options{display:block;animation:fadeTooltipIn 0.2s}.selected-options{display:none}.selected-options:hover{display:block}::slotted(select.searchable-zoo-select){-webkit-appearance:none;-moz-appearance:none;text-indent:1px;text-overflow:'';width:100%;padding:13px 15px;border:1px solid #767676;border-bottom-left-radius:3px;border-bottom-right-radius:3px;border-top:none;position:absolute;z-index:2;top:60px;font-size:14px}::slotted(select.error){border:2px solid var(--warning-mid, #ED1C24);transition:border-color 0.3s ease}::slotted(select.hidden){display:none}::slotted(select:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#E6E6E6}::slotted(select:disabled:hover){cursor:not-allowed}</style>`;

    		init(
    			this,
    			{ target: this.shadowRoot },
    			instance$a,
    			create_fragment$a,
    			safe_not_equal,
    			{
    				labelposition: 1,
    				labeltext: 2,
    				linktext: 3,
    				linkhref: 4,
    				linktarget: 5,
    				inputerrormsg: 6,
    				infotext: 7,
    				valid: 0,
    				placeholder: 8,
    				loading: 9,
    				handleOptionChange: 18
    			},
    			[-1, -1]
    		);

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
    		return this.$$.ctx[1];
    	}

    	set labelposition(labelposition) {
    		this.$set({ labelposition });
    		flush();
    	}

    	get labeltext() {
    		return this.$$.ctx[2];
    	}

    	set labeltext(labeltext) {
    		this.$set({ labeltext });
    		flush();
    	}

    	get linktext() {
    		return this.$$.ctx[3];
    	}

    	set linktext(linktext) {
    		this.$set({ linktext });
    		flush();
    	}

    	get linkhref() {
    		return this.$$.ctx[4];
    	}

    	set linkhref(linkhref) {
    		this.$set({ linkhref });
    		flush();
    	}

    	get linktarget() {
    		return this.$$.ctx[5];
    	}

    	set linktarget(linktarget) {
    		this.$set({ linktarget });
    		flush();
    	}

    	get inputerrormsg() {
    		return this.$$.ctx[6];
    	}

    	set inputerrormsg(inputerrormsg) {
    		this.$set({ inputerrormsg });
    		flush();
    	}

    	get infotext() {
    		return this.$$.ctx[7];
    	}

    	set infotext(infotext) {
    		this.$set({ infotext });
    		flush();
    	}

    	get valid() {
    		return this.$$.ctx[0];
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
    		return this.$$.ctx[18];
    	}

    	set handleOptionChange(value) {
    		throw new Error("<zoo-searchable-select>: Cannot set read-only property 'handleOptionChange'");
    	}
    }

    customElements.define("zoo-searchable-select", SearchableSelect);

    /* zoo-modules/link-module/Link.svelte generated by Svelte v3.22.2 */

    const file$b = "zoo-modules/link-module/Link.svelte";

    // (2:0) {#if text && href}
    function create_if_block$4(ctx) {
    	let div1;
    	let a;
    	let span;
    	let t0;
    	let t1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			a = element("a");
    			span = element("span");
    			t0 = text(/*text*/ ctx[1]);
    			t1 = space();
    			div0 = element("div");
    			add_location(span, file$b, 4, 3, 208);
    			attr_dev(div0, "class", "bottom-line");
    			add_location(div0, file$b, 5, 3, 231);
    			set_style(a, "text-align", /*textalign*/ ctx[5]);
    			attr_dev(a, "href", /*href*/ ctx[0]);
    			attr_dev(a, "target", /*target*/ ctx[2]);
    			attr_dev(a, "class", /*type*/ ctx[3]);
    			toggle_class(a, "disabled", /*disabled*/ ctx[4]);
    			add_location(a, file$b, 3, 2, 94);
    			attr_dev(div1, "class", "link-box");
    			add_location(div1, file$b, 2, 1, 69);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, a);
    			append_dev(a, span);
    			append_dev(span, t0);
    			append_dev(a, t1);
    			append_dev(a, div0);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*text*/ 2) set_data_dev(t0, /*text*/ ctx[1]);

    			if (dirty & /*textalign*/ 32) {
    				set_style(a, "text-align", /*textalign*/ ctx[5]);
    			}

    			if (dirty & /*href*/ 1) {
    				attr_dev(a, "href", /*href*/ ctx[0]);
    			}

    			if (dirty & /*target*/ 4) {
    				attr_dev(a, "target", /*target*/ ctx[2]);
    			}

    			if (dirty & /*type*/ 8) {
    				attr_dev(a, "class", /*type*/ ctx[3]);
    			}

    			if (dirty & /*type, disabled*/ 24) {
    				toggle_class(a, "disabled", /*disabled*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(2:0) {#if text && href}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let if_block_anchor;
    	let if_block = /*text*/ ctx[1] && /*href*/ ctx[0] && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.c = noop;
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*text*/ ctx[1] && /*href*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
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
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    	let { type = "negative" } = $$props; // primary
    	let { disabled = false } = $$props;
    	let { textalign = "center" } = $$props;
    	const writable_props = ["href", "text", "target", "type", "disabled", "textalign"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("zoo-link", $$slots, []);

    	$$self.$set = $$props => {
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("target" in $$props) $$invalidate(2, target = $$props.target);
    		if ("type" in $$props) $$invalidate(3, type = $$props.type);
    		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
    		if ("textalign" in $$props) $$invalidate(5, textalign = $$props.textalign);
    	};

    	$$self.$capture_state = () => ({
    		href,
    		text,
    		target,
    		type,
    		disabled,
    		textalign
    	});

    	$$self.$inject_state = $$props => {
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("target" in $$props) $$invalidate(2, target = $$props.target);
    		if ("type" in $$props) $$invalidate(3, type = $$props.type);
    		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
    		if ("textalign" in $$props) $$invalidate(5, textalign = $$props.textalign);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [href, text, target, type, disabled, textalign];
    }

    class Link extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.link-box{width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;position:relative}.link-box a{text-decoration:none;font-size:12px;line-height:14px}.link-box a.disabled{color:#E6E6E6}.link-box a.disabled:hover{cursor:not-allowed}.link-box a.primary{color:var(--primary-mid, #3C9700)}.link-box a.primary:hover,.link-box a.primary:focus,.link-box a.primary:active{color:var(--primary-dark, #286400)}.link-box a.primary:visited{color:var(--primary-light, #66B100)}.link-box a.negative{color:white}.link-box a.negative:hover,.link-box a.negative:focus,.link-box a.negative:active{color:#FFFFFF;cursor:pointer}.link-box a.negative:visited{color:#FFFFFF}.link-box a.negative .bottom-line{position:absolute;bottom:-3px;left:0;overflow:hidden;width:0;border-bottom:1px solid #fff;color:#FFFFFF;transition:width 0.3s}.link-box a.negative:hover .bottom-line{width:100%}.link-box a.grey{color:#767676}.link-box a.grey:hover,.link-box a.grey:focus,.link-box a.grey:active{color:var(--primary-dark, #286400)}.link-box a.grey:visited{color:var(--primary-light, #66B100)}</style>`;

    		init(this, { target: this.shadowRoot }, instance$b, create_fragment$b, safe_not_equal, {
    			href: 0,
    			text: 1,
    			target: 2,
    			type: 3,
    			disabled: 4,
    			textalign: 5
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
    		return ["href", "text", "target", "type", "disabled", "textalign"];
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
    }

    customElements.define("zoo-link", Link);

    /* zoo-modules/shared-module/InputInfo.svelte generated by Svelte v3.22.2 */
    const file$c = "zoo-modules/shared-module/InputInfo.svelte";

    function create_fragment$c(ctx) {
    	let div2;
    	let div0;
    	let span0;
    	let t0;
    	let t1;
    	let div1;
    	let span1;
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
    			span0 = element("span");
    			t0 = text(/*infotext*/ ctx[2]);
    			t1 = space();
    			div1 = element("div");
    			span1 = element("span");
    			t2 = text(/*inputerrormsg*/ ctx[1]);
    			t3 = space();
    			template = element("template");
    			style = element("style");
    			style.textContent = "svg {padding-right: 5px;}";
    			t5 = space();
    			svg = svg_element("svg");
    			path = svg_element("path");
    			this.c = noop;
    			attr_dev(span0, "class", "info-text");
    			add_location(span0, file$c, 3, 2, 127);
    			attr_dev(div0, "class", "info");
    			toggle_class(div0, "hidden", !/*infotext*/ ctx[2]);
    			add_location(div0, file$c, 2, 1, 79);
    			attr_dev(span1, "class", "error-label");
    			add_location(span1, file$c, 6, 2, 241);
    			attr_dev(div1, "class", "error");
    			toggle_class(div1, "hidden", /*valid*/ ctx[0] || !/*inputerrormsg*/ ctx[1]);
    			add_location(div1, file$c, 5, 1, 178);
    			add_location(style, file$c, 9, 2, 322);
    			attr_dev(path, "d", "M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z");
    			add_location(path, file$c, 11, 3, 417);
    			attr_dev(svg, "width", "18");
    			attr_dev(svg, "height", "18");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$c, 10, 2, 365);
    			attr_dev(template, "id", "icon");
    			add_location(template, file$c, 8, 1, 299);
    			add_location(div2, file$c, 1, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, span1);
    			append_dev(span1, t2);
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
    		this.shadowRoot.innerHTML = `<style>.info,.error{padding:0 2px 2px 0;font-size:12px;line-height:14px;color:#555555;display:flex;align-items:center}.info.hidden,.error.hidden{display:none}.info svg path{fill:#459FD0}.error{animation:hideshow 0.5s ease}.error svg path{fill:var(--warning-mid, #ED1C24)}@keyframes hideshow{0%{opacity:0}100%{opacity:1}}</style>`;
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

    /* zoo-modules/navigation-module/Navigation.svelte generated by Svelte v3.22.2 */

    const file$d = "zoo-modules/navigation-module/Navigation.svelte";

    function create_fragment$d(ctx) {
    	let div;
    	let slot;

    	const block = {
    		c: function create() {
    			div = element("div");
    			slot = element("slot");
    			this.c = noop;
    			add_location(slot, file$d, 2, 1, 74);
    			attr_dev(div, "class", "box");
    			add_location(div, file$d, 1, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, slot);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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
    		this.shadowRoot.innerHTML = `<style>.box{height:56px;background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100))}::slotted(*:first-child){display:flex;flex-direction:row;height:100%;overflow:auto;overflow-y:hidden;padding:0 20px}</style>`;
    		init(this, { target: this.shadowRoot }, instance$d, create_fragment$d, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("zoo-navigation", Navigation);

    /* zoo-modules/shared-module/InputLabel.svelte generated by Svelte v3.22.2 */

    const file$e = "zoo-modules/shared-module/InputLabel.svelte";

    // (2:0) {#if labeltext}
    function create_if_block$5(ctx) {
    	let div;
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t = text(/*labeltext*/ ctx[0]);
    			add_location(span, file$e, 3, 1, 93);
    			attr_dev(div, "class", "label");
    			add_location(div, file$e, 2, 0, 72);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*labeltext*/ 1) set_data_dev(t, /*labeltext*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(2:0) {#if labeltext}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let if_block_anchor;
    	let if_block = /*labeltext*/ ctx[0] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.c = noop;
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*labeltext*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$5(ctx);
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
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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
    		this.shadowRoot.innerHTML = `<style>.label{font-size:14px;line-height:20px;font-weight:800;color:#555555;text-align:left}</style>`;
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

    /* zoo-modules/toast-module/Toast.svelte generated by Svelte v3.22.2 */

    const file$f = "zoo-modules/toast-module/Toast.svelte";

    function create_fragment$f(ctx) {
    	let div1;
    	let div0;
    	let svg0;
    	let path0;
    	let t0;
    	let span;
    	let t1;
    	let t2;
    	let svg1;
    	let path1;
    	let div0_class_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
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
    			attr_dev(path0, "fill-rule", "evenodd");
    			add_location(path0, file$f, 4, 3, 187);
    			attr_dev(svg0, "width", "30");
    			attr_dev(svg0, "height", "30");
    			attr_dev(svg0, "viewBox", "0 0 24 24");
    			add_location(svg0, file$f, 3, 2, 135);
    			add_location(span, file$f, 6, 2, 606);
    			attr_dev(path1, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
    			add_location(path1, file$f, 8, 3, 729);
    			attr_dev(svg1, "class", "close");
    			attr_dev(svg1, "width", "24");
    			attr_dev(svg1, "height", "24");
    			attr_dev(svg1, "viewBox", "0 0 24 24");
    			add_location(svg1, file$f, 7, 2, 628);
    			attr_dev(div0, "class", div0_class_value = "toast " + (/*hidden*/ ctx[3] ? "hide" : "show") + " " + /*type*/ ctx[0]);
    			add_location(div0, file$f, 2, 1, 79);
    			add_location(div1, file$f, 1, 0, 50);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, svg0);
    			append_dev(svg0, path0);
    			append_dev(div0, t0);
    			append_dev(div0, span);
    			append_dev(span, t1);
    			append_dev(div0, t2);
    			append_dev(div0, svg1);
    			append_dev(svg1, path1);
    			/*div1_binding*/ ctx[9](div1);
    			if (remount) dispose();
    			dispose = listen_dev(svg1, "click", /*click_handler*/ ctx[8], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 2) set_data_dev(t1, /*text*/ ctx[1]);

    			if (dirty & /*hidden, type*/ 9 && div0_class_value !== (div0_class_value = "toast " + (/*hidden*/ ctx[3] ? "hide" : "show") + " " + /*type*/ ctx[0])) {
    				attr_dev(div0, "class", div0_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*div1_binding*/ ctx[9](null);
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
    	const click_handler = event => close();

    	function div1_binding($$value) {
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
    		div1_binding
    	];
    }

    class Toast extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{display:none;top:20px;right:20px;position:fixed;z-index:10001}.toast{max-width:330px;box-shadow:0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);border-left:3px solid;display:flex;align-items:center;word-break:break-word;font-size:14px;line-height:20px;padding:15px;transition:transform 0.3s, opacity 0.4s}.toast.info{background:var(--info-ultralight, #ECF5FA);border-color:var(--info-mid, #459FD0)}.toast.info svg{fill:var(--info-mid, #459FD0)}.toast.error{background:var(--warning-ultralight, #FDE8E9);border-color:var(--warning-mid, #ED1C24)}.toast.error svg{fill:var(--warning-mid, #ED1C24)}.toast.success{background:var(--primary-ultralight, #EBF4E5);border-color:var(--primary-mid, #3C9700)}.toast.success svg{fill:var(--primary-mid, #3C9700)}.toast .close{cursor:pointer}.toast svg{padding-right:10px;min-width:48px}.toast.hide{opacity:0;transform:translate3d(100%, 0, 0)}.toast.show{opacity:1;transform:translate3d(0, 0, 0)}</style>`;

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

    /* zoo-modules/collapsable-list-module/CollapsableList.svelte generated by Svelte v3.22.2 */
    const file$g = "zoo-modules/collapsable-list-module/CollapsableList.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (4:2) {#each items as item, idx}
    function create_each_block$1(ctx) {
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
    			add_location(path, file$g, 7, 53, 328);
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$g, 7, 5, 280);
    			attr_dev(span, "class", "header");
    			add_location(span, file$g, 5, 4, 186);
    			attr_dev(slot, "name", slot_name_value = "item" + /*idx*/ ctx[7]);
    			add_location(slot, file$g, 9, 4, 418);
    			attr_dev(li, "class", "item");
    			toggle_class(li, "active", /*_items*/ ctx[1] && /*_items*/ ctx[1][/*idx*/ ctx[7]].active);
    			add_location(li, file$g, 4, 3, 117);
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
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(4:2) {#each items as item, idx}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$g(ctx) {
    	let div;
    	let ul;
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			this.c = noop;
    			add_location(ul, file$g, 2, 1, 80);
    			attr_dev(div, "class", "box");
    			add_location(div, file$g, 1, 0, 61);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);

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
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
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
    			if (detaching) detach_dev(div);
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
    		this.shadowRoot.innerHTML = `<style>.item ::slotted(*){display:none}.item.active ::slotted(*){display:initial}ul{padding:0}.item{position:relative;color:#767676;list-style-type:none;padding:0 10px;border:0}.item .header{display:flex;align-items:center;height:8px;padding:20px 0;font-size:14px;line-height:20px;color:var(--primary-mid, #3C9700);font-weight:bold;cursor:pointer}.item .header svg{display:flex;margin-left:auto;fill:var(--primary-mid, #3C9700);transition:transform 0.3s}.item.active{border:1px solid rgba(0, 0, 0, 0.2)}.item.active .header{color:var(--primary-dark, #286400)}.item.active .header svg{fill:var(--primary-dark, #286400);transform:rotateX(180deg)}</style>`;
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

    /* zoo-modules/collapsable-list-module/CollapsableListItem.svelte generated by Svelte v3.22.2 */

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
    		this.shadowRoot.innerHTML = `<style>ul{padding:0}ul li{list-style-type:none}</style>`;
    		init(this, { target: this.shadowRoot }, instance$h, create_fragment$h, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("zoo-collapsable-list-item", CollapsableListItem);

    /* zoo-modules/shared-module/Preloader.svelte generated by Svelte v3.22.2 */

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

    /* zoo-modules/spinner-module/Spinner.svelte generated by Svelte v3.22.2 */

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
    		this.shadowRoot.innerHTML = `<style>.spinner{position:absolute;left:0;top:0;right:0;bottom:0;height:150px;width:150px;margin:auto;transform-origin:center center;animation:rotate 2s linear infinite}.spinner .path{animation:dash 1.5s ease-in-out infinite;stroke:var(--primary-mid, #3C9700);stroke-dasharray:1, 200;stroke-dashoffset:0;stroke-linecap:round}@keyframes rotate{100%{transform:rotate(360deg)}}@keyframes dash{0%{stroke-dasharray:1, 200;stroke-dashoffset:0}50%{stroke-dasharray:89, 200;stroke-dashoffset:-35px}100%{stroke-dasharray:89, 200;stroke-dashoffset:-124px}}</style>`;
    		init(this, { target: this.shadowRoot }, instance$j, create_fragment$j, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("zoo-spinner", Spinner);

    /* zoo-modules/grid-module/Grid.svelte generated by Svelte v3.22.2 */
    const file$k = "zoo-modules/grid-module/Grid.svelte";

    // (8:1) {#if paginator}
    function create_if_block$6(ctx) {
    	let slot1;
    	let zoo_grid_paginator;
    	let slot0;

    	const block = {
    		c: function create() {
    			slot1 = element("slot");
    			zoo_grid_paginator = element("zoo-grid-paginator");
    			slot0 = element("slot");
    			attr_dev(slot0, "name", "pagesizeselector");
    			attr_dev(slot0, "slot", "pagesizeselector");
    			add_location(slot0, file$k, 10, 4, 407);
    			set_custom_element_data(zoo_grid_paginator, "class", "paginator");
    			set_custom_element_data(zoo_grid_paginator, "currentpage", /*currentpage*/ ctx[0]);
    			set_custom_element_data(zoo_grid_paginator, "maxpages", /*maxpages*/ ctx[1]);
    			add_location(zoo_grid_paginator, file$k, 9, 3, 339);
    			attr_dev(slot1, "name", "paginator");
    			add_location(slot1, file$k, 8, 2, 312);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot1, anchor);
    			append_dev(slot1, zoo_grid_paginator);
    			append_dev(zoo_grid_paginator, slot0);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentpage*/ 1) {
    				set_custom_element_data(zoo_grid_paginator, "currentpage", /*currentpage*/ ctx[0]);
    			}

    			if (dirty & /*maxpages*/ 2) {
    				set_custom_element_data(zoo_grid_paginator, "maxpages", /*maxpages*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(8:1) {#if paginator}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$k(ctx) {
    	let div1;
    	let div0;
    	let slot0;
    	let t0;
    	let slot1;
    	let t1;
    	let slot2;
    	let t2;
    	let if_block = /*paginator*/ ctx[5] && create_if_block$6(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			slot0 = element("slot");
    			t0 = space();
    			slot1 = element("slot");
    			t1 = space();
    			slot2 = element("slot");
    			t2 = space();
    			if (if_block) if_block.c();
    			this.c = noop;
    			attr_dev(slot0, "name", "headercell");
    			add_location(slot0, file$k, 3, 2, 168);
    			attr_dev(div0, "class", "header-row");
    			toggle_class(div0, "sticky", /*stickyheader*/ ctx[2]);
    			add_location(div0, file$k, 2, 1, 89);
    			attr_dev(slot1, "name", "row");
    			add_location(slot1, file$k, 5, 1, 236);
    			attr_dev(slot2, "name", "norecords");
    			add_location(slot2, file$k, 6, 1, 262);
    			attr_dev(div1, "class", "box");
    			add_location(div1, file$k, 1, 0, 49);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, slot0);
    			/*slot0_binding*/ ctx[9](slot0);
    			/*div0_binding*/ ctx[10](div0);
    			append_dev(div1, t0);
    			append_dev(div1, slot1);
    			append_dev(div1, t1);
    			append_dev(div1, slot2);
    			append_dev(div1, t2);
    			if (if_block) if_block.m(div1, null);
    			/*div1_binding*/ ctx[11](div1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*stickyheader*/ 4) {
    				toggle_class(div0, "sticky", /*stickyheader*/ ctx[2]);
    			}

    			if (/*paginator*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*slot0_binding*/ ctx[9](null);
    			/*div0_binding*/ ctx[10](null);
    			if (if_block) if_block.d();
    			/*div1_binding*/ ctx[11](null);
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
    	let stickyheader = false;
    	let gridRoot;
    	let headerCellSlot;
    	let paginator = false;
    	let sortableHeaders = [];
    	let headerRow;

    	onMount(() => {
    		headerCellSlot.addEventListener("slotchange", () => {
    			const host = gridRoot.getRootNode().host;
    			const headers = headerCellSlot.assignedNodes();
    			gridRoot.style.setProperty("--grid-columns-num", headers.length);
    			handleHeaders(headers, host);

    			if (host.hasAttribute("paginator")) {
    				$$invalidate(5, paginator = true);
    			}

    			if (host.hasAttribute("stickyheader")) {
    				$$invalidate(2, stickyheader = true);
    			}
    		});
    	});

    	const handleHeaders = (headers, host) => {
    		for (let header of headers) {
    			header.classList.add("header-cell");

    			if (header.hasAttribute("sortable")) {
    				header.innerHTML = "<zoo-grid-header>" + header.innerHTML + "</zoo-grid-header>";

    				header.addEventListener("sortChange", e => {
    					e.stopPropagation();
    					const sortState = e.detail.sortState;
    					sortableHeaders.forEach(h => h.discardSort());
    					header.children[0].setSort(sortState);

    					host.dispatchEvent(new CustomEvent("sortChange",
    					{
    							detail: {
    								property: header.getAttribute("sortableproperty"),
    								sortState
    							},
    							bubbles: true
    						}));
    				});

    				sortableHeaders.push(header.children[0]);
    			}
    		}
    	};

    	const writable_props = ["currentpage", "maxpages"];

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

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(6, headerRow = $$value);
    		});
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, gridRoot = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("currentpage" in $$props) $$invalidate(0, currentpage = $$props.currentpage);
    		if ("maxpages" in $$props) $$invalidate(1, maxpages = $$props.maxpages);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		currentpage,
    		maxpages,
    		stickyheader,
    		gridRoot,
    		headerCellSlot,
    		paginator,
    		sortableHeaders,
    		headerRow,
    		handleHeaders
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentpage" in $$props) $$invalidate(0, currentpage = $$props.currentpage);
    		if ("maxpages" in $$props) $$invalidate(1, maxpages = $$props.maxpages);
    		if ("stickyheader" in $$props) $$invalidate(2, stickyheader = $$props.stickyheader);
    		if ("gridRoot" in $$props) $$invalidate(3, gridRoot = $$props.gridRoot);
    		if ("headerCellSlot" in $$props) $$invalidate(4, headerCellSlot = $$props.headerCellSlot);
    		if ("paginator" in $$props) $$invalidate(5, paginator = $$props.paginator);
    		if ("sortableHeaders" in $$props) sortableHeaders = $$props.sortableHeaders;
    		if ("headerRow" in $$props) $$invalidate(6, headerRow = $$props.headerRow);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		currentpage,
    		maxpages,
    		stickyheader,
    		gridRoot,
    		headerCellSlot,
    		paginator,
    		headerRow,
    		sortableHeaders,
    		handleHeaders,
    		slot0_binding,
    		div0_binding,
    		div1_binding
    	];
    }

    class Grid extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.box{max-height:inherit;overflow:auto;box-shadow:0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12)}.box .header-row,.box ::slotted(*[slot="row"]){display:grid;grid-template-columns:repeat(var(--grid-columns-num), minmax(50px, 1fr));padding:10px;border-bottom:1px solid rgba(0, 0, 0, 0.2);min-height:40px}.box ::slotted(*[slot="row"]){align-items:center}.box .header-row{z-index:1}.box .header-row.sticky{top:0;position:sticky;background:white}.box ::slotted(.header-cell){display:flex;align-items:center;padding-right:5px}.box ::slotted(*[slot="row"]:nth-child(odd)){background:#F2F3F4}.box ::slotted(*[slot="row"]:hover){background:#E6E6E6}.box ::slotted(*[slot="norecords"]){color:var(--warning-mid, #ED1C24);grid-column:span var(--grid-columns-num);text-align:center;padding:10px 0}.box .paginator{display:block;position:sticky;grid-column:span var(--grid-columns-num);bottom:0;background:#FFFFFF}</style>`;
    		init(this, { target: this.shadowRoot }, instance$k, create_fragment$k, safe_not_equal, { currentpage: 0, maxpages: 1 });

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
    		return ["currentpage", "maxpages"];
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
    }

    customElements.define("zoo-grid", Grid);

    /* zoo-modules/grid-module/GridHeader.svelte generated by Svelte v3.22.2 */
    const file$l = "zoo-modules/grid-module/GridHeader.svelte";

    function create_fragment$l(ctx) {
    	let div;
    	let slot;
    	let t;
    	let svg;
    	let path;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			slot = element("slot");
    			t = space();
    			svg = svg_element("svg");
    			path = svg_element("path");
    			this.c = noop;
    			add_location(slot, file$l, 2, 1, 102);
    			attr_dev(path, "d", "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
    			add_location(path, file$l, 3, 127, 243);
    			attr_dev(svg, "class", "sort-arrow");
    			attr_dev(svg, "sortstate", /*sortState*/ ctx[0]);
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$l, 3, 1, 117);
    			attr_dev(div, "class", "box");
    			add_location(div, file$l, 1, 0, 56);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, slot);
    			append_dev(div, t);
    			append_dev(div, svg);
    			append_dev(svg, path);
    			/*div_binding*/ ctx[7](div);
    			if (remount) dispose();
    			dispose = listen_dev(svg, "click", /*click_handler*/ ctx[6], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*sortState*/ 1) {
    				attr_dev(svg, "sortstate", /*sortState*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[7](null);
    			dispose();
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
    	let sortState;
    	let gridHeaderRoot;
    	let host;

    	onMount(() => {
    		host = gridHeaderRoot.getRootNode().host;
    	});

    	const handleSortClick = () => {
    		if (!sortState) {
    			$$invalidate(0, sortState = "desc");
    		} else if (sortState == "desc") {
    			$$invalidate(0, sortState = "asc");
    		} else if ($$invalidate(0, sortState = "asc")) {
    			$$invalidate(0, sortState = undefined);
    		}

    		host.dispatchEvent(new CustomEvent("sortChange", { detail: { sortState }, bubbles: true }));
    	};

    	const discardSort = () => {
    		$$invalidate(0, sortState = undefined);
    	};

    	const setSort = newSortState => {
    		$$invalidate(0, sortState = newSortState);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-grid-header> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("zoo-grid-header", $$slots, []);
    	const click_handler = () => handleSortClick();

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, gridHeaderRoot = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		sortState,
    		gridHeaderRoot,
    		host,
    		handleSortClick,
    		discardSort,
    		setSort
    	});

    	$$self.$inject_state = $$props => {
    		if ("sortState" in $$props) $$invalidate(0, sortState = $$props.sortState);
    		if ("gridHeaderRoot" in $$props) $$invalidate(1, gridHeaderRoot = $$props.gridHeaderRoot);
    		if ("host" in $$props) host = $$props.host;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		sortState,
    		gridHeaderRoot,
    		handleSortClick,
    		discardSort,
    		setSort,
    		host,
    		click_handler,
    		div_binding
    	];
    }

    class GridHeader extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.box{display:flex;align-items:center}.box .sort-arrow{width:20px;opacity:0;transform:rotate(0deg);transition:opacity 0.1s;cursor:pointer;margin-left:5px;border-radius:5px}.box .sort-arrow:hover{opacity:1;background:#F2F3F4}.box .sort-arrow[sortstate='asc']{transform:rotate(180deg)}.box .sort-arrow[sortstate='desc'],.box .sort-arrow[sortstate='asc']{opacity:1;background:#F2F3F4}.box .sort-arrow:active,.box .sort-arrow[sortstate='desc']:active,.box .sort-arrow[sortstate='asc']:active{opacity:0.5}</style>`;
    		init(this, { target: this.shadowRoot }, instance$l, create_fragment$l, safe_not_equal, { discardSort: 3, setSort: 4 });

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
    		return ["discardSort", "setSort"];
    	}

    	get discardSort() {
    		return this.$$.ctx[3];
    	}

    	set discardSort(value) {
    		throw new Error("<zoo-grid-header>: Cannot set read-only property 'discardSort'");
    	}

    	get setSort() {
    		return this.$$.ctx[4];
    	}

    	set setSort(value) {
    		throw new Error("<zoo-grid-header>: Cannot set read-only property 'setSort'");
    	}
    }

    customElements.define("zoo-grid-header", GridHeader);

    /* zoo-modules/grid-module/GridPaginator.svelte generated by Svelte v3.22.2 */
    const file$m = "zoo-modules/grid-module/GridPaginator.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    // (10:3) {:else}
    function create_else_block$1(ctx) {
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
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(10:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (8:3) {#if page == 1 || page == currentpage || i == currentpage - 2 || i == currentpage || page == maxpages}
    function create_if_block$7(ctx) {
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
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(8:3) {#if page == 1 || page == currentpage || i == currentpage - 2 || i == currentpage || page == maxpages}",
    		ctx
    	});

    	return block;
    }

    // (6:2) {#each pages as page, i}
    function create_each_block$2(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*page*/ ctx[14] == 1 || /*page*/ ctx[14] == /*currentpage*/ ctx[0] || /*i*/ ctx[16] == /*currentpage*/ ctx[0] - 2 || /*i*/ ctx[16] == /*currentpage*/ ctx[0] || /*page*/ ctx[14] == /*maxpages*/ ctx[1]) return create_if_block$7;
    		return create_else_block$1;
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
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(6:2) {#each pages as page, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$m(ctx) {
    	let div3;
    	let slot;
    	let t0;
    	let div2;
    	let div0;
    	let t1;
    	let t2;
    	let div1;
    	let t3;
    	let template;
    	let svg;
    	let path;
    	let dispose;
    	let each_value = /*pages*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			slot = element("slot");
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			t3 = space();
    			template = element("template");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			this.c = noop;
    			attr_dev(slot, "name", "pagesizeselector");
    			add_location(slot, file$m, 2, 1, 108);
    			attr_dev(div0, "class", "btn prev");
    			toggle_class(div0, "hidden", !/*currentpage*/ ctx[0] || /*currentpage*/ ctx[0] == 1);
    			add_location(div0, file$m, 4, 2, 213);
    			attr_dev(div1, "class", "btn next");
    			toggle_class(div1, "hidden", !/*currentpage*/ ctx[0] || !/*maxpages*/ ctx[1] || /*currentpage*/ ctx[0] == /*maxpages*/ ctx[1]);
    			add_location(div1, file$m, 13, 2, 706);
    			attr_dev(path, "d", "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
    			add_location(path, file$m, 15, 69, 932);
    			attr_dev(svg, "class", "nav-arrow");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$m, 15, 3, 866);
    			attr_dev(template, "id", "arrow");
    			add_location(template, file$m, 14, 2, 841);
    			attr_dev(div2, "class", "paging");
    			toggle_class(div2, "hidden", !/*currentpage*/ ctx[0] || !/*maxpages*/ ctx[1]);
    			add_location(div2, file$m, 3, 1, 147);
    			attr_dev(div3, "class", "box");
    			add_location(div3, file$m, 1, 0, 59);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, slot);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div2, t3);
    			append_dev(div2, template);
    			append_dev(template.content, svg);
    			append_dev(svg, path);
    			/*div3_binding*/ ctx[13](div3);
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
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, t2);
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
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			/*div3_binding*/ ctx[13](null);
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
    		host.dispatchEvent(new Event("pageChange", { pageNumber }));
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

    	function div3_binding($$value) {
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
    		div3_binding
    	];
    }

    class GridPaginator extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.box{display:flex;justify-content:end;padding:10px 15px 10px 0;font-size:14px}.box .paging{display:flex;align-items:center;border:1px solid #E6E6E6;border-radius:5px;margin:3px 0 3px 20px;padding:0 15px}.box .paging.hidden{opacity:0}.box .btn{display:flex;cursor:pointer;opacity:1;transition:opacity 0.1s}.box .btn:active{opacity:0.5}.box .btn.hidden{display:none}.box .btn.next{margin-left:5px}.box .btn.next svg{transform:rotate(-90deg)}.box .btn.prev{margin-right:10px}.box .btn.prev svg{transform:rotate(90deg)}.box svg{fill:#555555}.box .nav-arrow path{fill:var(--primary-mid, #3C9700)}.box .page-element{cursor:pointer}.box .page-element:hover{background:#F2F3F4}.box .page-element.active{background:var(--primary-ultralight, #EBF4E5);color:var(--primary-mid, #3C9700)}.box .page-element,.box .page-element-dots{display:flex;align-items:center;justify-content:center;border-radius:5px;width:24px;height:24px;margin-right:5px}.box .page-element-dots{display:none}.box .page-element+.page-element-dots{display:flex}</style>`;
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

}());
