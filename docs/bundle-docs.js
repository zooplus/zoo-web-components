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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }

    /* src/docs/ThemingDocs.svelte generated by Svelte v3.22.3 */
    const file = "src/docs/ThemingDocs.svelte";

    function create_fragment(ctx) {
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
    	let li6;
    	let b6;
    	let t23;
    	let t24;
    	let li7;
    	let b7;
    	let t26;
    	let t27;
    	let li8;
    	let b8;
    	let t29;
    	let t30;
    	let li9;
    	let b9;
    	let t32;
    	let t33;
    	let li10;
    	let b10;
    	let t35;
    	let t36;
    	let li11;
    	let b11;
    	let t38;
    	let t39;
    	let li12;
    	let b12;
    	let t41;
    	let t42;
    	let li13;
    	let b13;
    	let t44;
    	let t45;
    	let li14;
    	let b14;
    	let t47;
    	let t48;
    	let div1;
    	let t49;
    	let code0;
    	let pre0;
    	let t51;
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
    			t5 = text(" - default color #3C9700;");
    			t6 = space();
    			li1 = element("li");
    			b1 = element("b");
    			b1.textContent = "--primary-light";
    			t8 = text(" - default color #66B100;");
    			t9 = space();
    			li2 = element("li");
    			b2 = element("b");
    			b2.textContent = "--primary-ultralight";
    			t11 = text(" - default color #EBF4E5;");
    			t12 = space();
    			li3 = element("li");
    			b3 = element("b");
    			b3.textContent = "--primary-dark";
    			t14 = text(" - default color #286400;");
    			t15 = space();
    			li4 = element("li");
    			b4 = element("b");
    			b4.textContent = "--secondary-mid";
    			t17 = text(" - default color #FF6200;");
    			t18 = space();
    			li5 = element("li");
    			b5 = element("b");
    			b5.textContent = "--secondary-light";
    			t20 = text(" - default color #FF8800;");
    			t21 = space();
    			li6 = element("li");
    			b6 = element("b");
    			b6.textContent = "--secondary-ultralight";
    			t23 = text(" - default color #FFF0E7;");
    			t24 = space();
    			li7 = element("li");
    			b7 = element("b");
    			b7.textContent = "--secondary-dark";
    			t26 = text(" - default color #CC4E00;");
    			t27 = space();
    			li8 = element("li");
    			b8 = element("b");
    			b8.textContent = "--warning-ultralight";
    			t29 = text(" - default color #FDE8E9;");
    			t30 = space();
    			li9 = element("li");
    			b9 = element("b");
    			b9.textContent = "--warning-mid";
    			t32 = text(" - default color #ED1C24;");
    			t33 = space();
    			li10 = element("li");
    			b10 = element("b");
    			b10.textContent = "--warning-dark";
    			t35 = text(" - default color #BD161C;");
    			t36 = space();
    			li11 = element("li");
    			b11 = element("b");
    			b11.textContent = "--success-ultralight";
    			t38 = text(" - default color #EBF4E5;");
    			t39 = space();
    			li12 = element("li");
    			b12 = element("b");
    			b12.textContent = "--success-mid";
    			t41 = text(" - default color #3C9700;");
    			t42 = space();
    			li13 = element("li");
    			b13 = element("b");
    			b13.textContent = "--info-ultralight";
    			t44 = text(" - default color #ECF5FA;");
    			t45 = space();
    			li14 = element("li");
    			b14 = element("b");
    			b14.textContent = "--info-mid";
    			t47 = text(" - default color #459FD0;");
    			t48 = space();
    			div1 = element("div");
    			t49 = text("Example with a preprocessor:\n\t\t");
    			code0 = element("code");
    			pre0 = element("pre");
    			pre0.textContent = `${/*exampleScss*/ ctx[1]}`;
    			t51 = text("\n\t\tExample with pure css:\n\t\t");
    			code1 = element("code");
    			pre1 = element("pre");
    			pre1.textContent = `${/*exampleCss*/ ctx[2]}`;
    			this.c = noop;
    			set_custom_element_data(app_context, "text", "Theming API.");
    			add_location(app_context, file, 2, 0, 54);
    			attr_dev(a, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/--*");
    			attr_dev(a, "target", "about:blank");
    			add_location(a, file, 5, 57, 205);
    			add_location(b0, file, 11, 6, 482);
    			add_location(li0, file, 10, 5, 471);
    			add_location(b1, file, 14, 6, 555);
    			add_location(li1, file, 13, 5, 544);
    			add_location(b2, file, 17, 6, 630);
    			add_location(li2, file, 16, 5, 619);
    			add_location(b3, file, 20, 6, 710);
    			add_location(li3, file, 19, 5, 699);
    			add_location(b4, file, 23, 6, 784);
    			add_location(li4, file, 22, 5, 773);
    			add_location(b5, file, 26, 6, 859);
    			add_location(li5, file, 25, 5, 848);
    			add_location(b6, file, 29, 6, 936);
    			add_location(li6, file, 28, 5, 925);
    			add_location(b7, file, 32, 6, 1018);
    			add_location(li7, file, 31, 5, 1007);
    			add_location(b8, file, 35, 6, 1094);
    			add_location(li8, file, 34, 5, 1083);
    			add_location(b9, file, 38, 6, 1174);
    			add_location(li9, file, 37, 5, 1163);
    			add_location(b10, file, 41, 6, 1247);
    			add_location(li10, file, 40, 5, 1236);
    			add_location(b11, file, 44, 6, 1321);
    			add_location(li11, file, 43, 5, 1310);
    			add_location(b12, file, 47, 6, 1401);
    			add_location(li12, file, 46, 5, 1390);
    			add_location(b13, file, 50, 6, 1474);
    			add_location(li13, file, 49, 5, 1463);
    			add_location(b14, file, 53, 6, 1551);
    			add_location(li14, file, 52, 5, 1540);
    			add_location(ul, file, 9, 4, 461);
    			set_custom_element_data(zoo_collapsable_list_item, "slot", "item0");
    			add_location(zoo_collapsable_list_item, file, 8, 3, 416);
    			add_location(zoo_collapsable_list, file, 7, 2, 373);
    			attr_dev(div0, "class", "list");
    			add_location(div0, file, 4, 1, 129);
    			add_location(pre0, file, 61, 8, 1743);
    			add_location(code0, file, 61, 2, 1737);
    			add_location(pre1, file, 63, 8, 1808);
    			add_location(code1, file, 63, 2, 1802);
    			attr_dev(div1, "class", "example");
    			add_location(div1, file, 59, 1, 1682);
    			attr_dev(div2, "class", "doc-element");
    			add_location(div2, file, 3, 0, 102);
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
    			append_dev(ul, t21);
    			append_dev(ul, li6);
    			append_dev(li6, b6);
    			append_dev(li6, t23);
    			append_dev(ul, t24);
    			append_dev(ul, li7);
    			append_dev(li7, b7);
    			append_dev(li7, t26);
    			append_dev(ul, t27);
    			append_dev(ul, li8);
    			append_dev(li8, b8);
    			append_dev(li8, t29);
    			append_dev(ul, t30);
    			append_dev(ul, li9);
    			append_dev(li9, b9);
    			append_dev(li9, t32);
    			append_dev(ul, t33);
    			append_dev(ul, li10);
    			append_dev(li10, b10);
    			append_dev(li10, t35);
    			append_dev(ul, t36);
    			append_dev(ul, li11);
    			append_dev(li11, b11);
    			append_dev(li11, t38);
    			append_dev(ul, t39);
    			append_dev(ul, li12);
    			append_dev(li12, b12);
    			append_dev(li12, t41);
    			append_dev(ul, t42);
    			append_dev(ul, li13);
    			append_dev(li13, b13);
    			append_dev(li13, t44);
    			append_dev(ul, t45);
    			append_dev(ul, li14);
    			append_dev(li14, b14);
    			append_dev(li14, t47);
    			/*zoo_collapsable_list_binding*/ ctx[3](zoo_collapsable_list);
    			append_dev(div2, t48);
    			append_dev(div2, div1);
    			append_dev(div1, t49);
    			append_dev(div1, code0);
    			append_dev(code0, pre0);
    			append_dev(div1, t51);
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
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let list;
    	let exampleScss = `@import "variables";\n:root {\n  --primary-mid: #{$primary-mid};\n  --primary-light: #{$primary-light};\n  --primary-dark: #{$primary-dark};\n  --secondary-mid: #{$secondary-mid};\n  --secondary-light: #{$secondary-light};\n  --secondary-dark: #{$secondary-dark};\n}`;
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
    		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, {});

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("docs-theming", ThemingDocs);

}());
