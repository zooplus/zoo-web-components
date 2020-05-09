var app = (function () {
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
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
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
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.22.2 */
    const file = "src/App.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1iv82ik-style";
    	style.textContent = ".app.svelte-1iv82ik.svelte-1iv82ik{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:15px 0px 40px 0px rgba(85, 85, 85, 0.3), -15px 0px 40px 0px rgba(85, 85, 85, 0.3)}.page-content.svelte-1iv82ik.svelte-1iv82ik{position:relative;display:grid;grid-template-columns:320px 1fr;grid-gap:30px;grid-template-areas:\"overview overview\" \"caniuse caniuse\" \"spec-docs content\"}@media only screen and (max-width: 850px){.page-content.svelte-1iv82ik.svelte-1iv82ik{grid-template-areas:\"overview\" \"caniuse\" \"spec-docs\"  \"content\";grid-template-columns:minmax(320px, 90%);justify-content:center}}.what-list.svelte-1iv82ik.svelte-1iv82ik{color:var(--main-color, #3C9700);font-size:20px}@media only screen and (max-width: 850px){#when.svelte-1iv82ik .desktop.svelte-1iv82ik{display:none}}#when.svelte-1iv82ik .mobile.svelte-1iv82ik{display:none}@media only screen and (max-width: 850px){#when.svelte-1iv82ik .mobile.svelte-1iv82ik{display:block}}#when.svelte-1iv82ik .back-btn.svelte-1iv82ik{width:280px;margin:10px auto}#when.svelte-1iv82ik .back-btn a.svelte-1iv82ik{text-decoration:none;color:white}.link-wrapper.svelte-1iv82ik.svelte-1iv82ik{height:auto;transition:color 0.3s, background-color 0.3s}.link-wrapper.svelte-1iv82ik.svelte-1iv82ik:hover{background-color:rgba(0, 0, 0, 0.1);color:white}.link-wrapper.svelte-1iv82ik a.svelte-1iv82ik{color:var(--main-color, #3C9700);padding:12px;display:block;text-decoration:none}.left-menu.svelte-1iv82ik .left-menu-separator.svelte-1iv82ik{margin:0}@media only screen and (max-width: 850px){.left-menu.svelte-1iv82ik.svelte-1iv82ik{display:none}}.overview.svelte-1iv82ik.svelte-1iv82ik{grid-area:overview;max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}.caniuse.svelte-1iv82ik.svelte-1iv82ik{grid-area:caniuse;width:100%;flex:1 0 auto}.caniuse.svelte-1iv82ik p.svelte-1iv82ik{max-width:1280px;margin:0 auto}.spec-docs.svelte-1iv82ik.svelte-1iv82ik{grid-area:spec-docs;position:sticky;top:0;height:200px}.content.svelte-1iv82ik.svelte-1iv82ik{grid-area:content}hr.svelte-1iv82ik.svelte-1iv82ik{border-color:var(--main-color, #3C9700);margin:45px 0;opacity:0.3}.footer.svelte-1iv82ik.svelte-1iv82ik{flex-shrink:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwiYXBwXCI+XG5cdDxhcHAtaGVhZGVyPjwvYXBwLWhlYWRlcj5cblx0PHpvby1ncmlkIGJpbmQ6dGhpcz17em9vR3JpZH0gc3R5bGU9XCJwYWRkaW5nOiAxMHB4OyBtYXgtaGVpZ2h0OiAzMDBweDtcIiBzdGlja3loZWFkZXIgcGFnaW5hdG9yPlxuXHRcdDxkaXYgc2xvdD1cImhlYWRlcmNlbGxcIiBzb3J0YWJsZT5BY3Rpb25zPC9kaXY+XG5cdFx0PGRpdiBzbG90PVwiaGVhZGVyY2VsbFwiPkNyZWF0ZWQgRGF0ZTwvZGl2PlxuXHRcdDxkaXYgc2xvdD1cImhlYWRlcmNlbGxcIj5TdGF0dXM8L2Rpdj5cblx0XHQ8ZGl2IHNsb3Q9XCJoZWFkZXJjZWxsXCI+RnJvbSBEYXRlPC9kaXY+XG5cdFx0PGRpdiBzbG90PVwiaGVhZGVyY2VsbFwiPkNyZWF0b3IgTmFtZTwvZGl2PlxuXHRcdDxkaXYgc2xvdD1cImhlYWRlcmNlbGxcIj5TdXBwbGllcjwvZGl2PlxuXHRcdDxkaXYgc2xvdD1cImhlYWRlcmNlbGxcIj5GdWxmaWxsbWVudCBDZW50ZXI8L2Rpdj5cblx0XHQ8ZGl2IHNsb3Q9XCJoZWFkZXJjZWxsXCI+QXJ0aWNsZSBJbXBvcnRhbmNlIExvd2VyIEJvdW5kICU8L2Rpdj5cblxuXHRcdDxkaXYgc2xvdD1cInJvd1wiPlxuXHRcdFx0PHpvby1mZWVkYmFjayB0eXBlPVwiaW5mb1wiIHRleHQ9XCJUaGlzIGlzIGFuIGluZm8gbWVzc2FnZS5cIj5cblx0XHRcdDwvem9vLWZlZWRiYWNrPlxuXHRcdFx0PGRpdj5jZWxsMjwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMzwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsNDwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsNTwvZGl2PlxuXHRcdFx0PHpvby1zZWxlY3QgbGFiZWx0ZXh0PVwiVGhpcyBwcm9kdWN0IGlzIGZvclwiPlxuXHRcdFx0XHQ8c2VsZWN0IHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XG5cdFx0XHRcdFx0PG9wdGlvbiBjbGFzcz1cInBsYWNlaG9sZGVyXCIgdmFsdWU9XCJcIiBkaXNhYmxlZCBzZWxlY3RlZD5Eb2dlPC9vcHRpb24+XG5cdFx0XHRcdFx0PG9wdGlvbj5Eb2dlPC9vcHRpb24+XG5cdFx0XHRcdFx0PG9wdGlvbj5DYXR6PC9vcHRpb24+XG5cdFx0XHRcdFx0PG9wdGlvbj5TbmVrPC9vcHRpb24+XG5cdFx0XHRcdDwvc2VsZWN0PlxuXHRcdFx0PC96b28tc2VsZWN0PlxuXHRcdFx0PGRpdj5jZWxsNzwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsODwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgc2xvdD1cInJvd1wiPlxuXHRcdFx0PGRpdj5jZWxsOTwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMTA8L2Rpdj5cblx0XHRcdDxkaXY+Y2VsbDExPC9kaXY+XG5cdFx0XHQ8ZGl2PmNlbGwxMjwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMTM8L2Rpdj5cblx0XHRcdDxkaXY+Y2VsbDE0PC9kaXY+XG5cdFx0XHQ8ZGl2PmNlbGwxNTwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMTY8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IHNsb3Q9XCJyb3dcIj5cblx0XHRcdDxkaXY+Y2VsbDk8L2Rpdj5cblx0XHRcdDxkaXY+Y2VsbDEwPC9kaXY+XG5cdFx0XHQ8ZGl2PmNlbGwxMTwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMTI8L2Rpdj5cblx0XHRcdDxkaXY+Y2VsbDEzPC9kaXY+XG5cdFx0XHQ8ZGl2PmNlbGwxNDwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMTU8L2Rpdj5cblx0XHRcdDxkaXY+Y2VsbDE2PC9kaXY+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBzbG90PVwicm93XCI+XG5cdFx0XHQ8ZGl2PmNlbGw5PC9kaXY+XG5cdFx0XHQ8ZGl2PmNlbGwxMDwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMTE8L2Rpdj5cblx0XHRcdDxkaXY+Y2VsbDEyPC9kaXY+XG5cdFx0XHQ8ZGl2PmNlbGwxMzwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMTQ8L2Rpdj5cblx0XHRcdDxkaXY+Y2VsbDE1PC9kaXY+XG5cdFx0XHQ8ZGl2PmNlbGwxNjwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgc2xvdD1cInJvd1wiPlxuXHRcdFx0PGRpdj5jZWxsOTwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMTA8L2Rpdj5cblx0XHRcdDxkaXY+Y2VsbDExPC9kaXY+XG5cdFx0XHQ8ZGl2PmNlbGwxMjwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMTM8L2Rpdj5cblx0XHRcdDxkaXY+Y2VsbDE0PC9kaXY+XG5cdFx0XHQ8ZGl2PmNlbGwxNTwvZGl2PlxuXHRcdFx0PGRpdj5jZWxsMTY8L2Rpdj5cblx0XHQ8L2Rpdj5cblxuXHRcdDx6b28tc2VsZWN0IGxhYmVsdGV4dD1cIkl0ZW1zIHBlciBwYWdlXCIgbGFiZWxwb3NpdGlvbj1cImxlZnRcIiBzbG90PVwicGFnZXNpemVzZWxlY3RvclwiPlxuXHRcdFx0PHNlbGVjdCBzbG90PVwic2VsZWN0ZWxlbWVudFwiPlxuXHRcdFx0XHR7I2VhY2ggcG9zc2libGVOdW1iZXJPZkl0ZW1zIGFzIG51bWJlciwgaWR4fVxuXHRcdFx0XHRcdDxvcHRpb24gc2VsZWN0ZWQ9XCJ7aWR4ID09IDB9XCI+e251bWJlcn08L29wdGlvbj5cblx0XHRcdFx0ey9lYWNofVxuXHRcdFx0PC9zZWxlY3Q+XG5cdFx0PC96b28tc2VsZWN0PlxuXHQ8L3pvby1ncmlkPlxuXHQ8YXBwLWNvbnRleHQgaWQ9XCJ3aGF0XCIgdGV4dD1cIldoYXQgaXMgdGhpcyBwcm9qZWN0P1wiPjwvYXBwLWNvbnRleHQ+XG5cdDx1bCBjbGFzcz1cIndoYXQtbGlzdFwiPlxuXHRcdDxsaT5cblx0XHRcdFNldCBvZiB3ZWItY29tcG9uZW50cyB3aGljaCBjYW4gYmUgdXNlZCBpbiBhbnkgbW9kZXJuIFVJIGZyYW1ld29yayAob3Igd2l0aG91dCBhbnkpLlxuXHRcdDwvbGk+XG5cdFx0PGxpPlxuXHRcdFx0VGhlIHdlYi1jb21wb25lbnQgc2V0IGltcGxlbWVudHMgWisgc2hvcCBzdHlsZSBndWlkZS5cblx0XHQ8L2xpPlxuXHQ8L3VsPlxuXHQ8ZGl2IGNsYXNzPVwicGFnZS1jb250ZW50XCI+XG5cdFx0PGRpdiBjbGFzcz1cIm92ZXJ2aWV3XCI+XG5cdFx0XHQ8YXBwLWZvcm0gaWQ9XCJhcHAtZm9ybVwiPjwvYXBwLWZvcm0+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8YXBwLWJ1dHRvbnMgaWQ9XCJhcHAtYnV0dG9uc1wiPjwvYXBwLWJ1dHRvbnM+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8YXBwLXRvb2x0aXAtYW5kLWZlZWRiYWNrIGlkPVwiYXBwLXRvb2x0aXAtYW5kLWZlZWRiYWNrXCI+PC9hcHAtdG9vbHRpcC1hbmQtZmVlZGJhY2s+XG5cdFx0XHQ8aHI+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBpZD1cIndoZW5cIiBjbGFzcz1cImNhbml1c2VcIj5cblx0XHRcdDxhcHAtY29udGV4dCB0ZXh0PVwiV2hlbiBjYW4gSSB1c2UgaXQ/XCIgYmFja2J0bj1cInt0cnVlfVwiPjwvYXBwLWNvbnRleHQ+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiZGVza3RvcFwiPlxuXHRcdFx0XHQ8cCBjbGFzcz1cImNpdV9lbWJlZFwiIGRhdGEtZmVhdHVyZT1cInNoYWRvd2RvbXYxXCIgZGF0YS1wZXJpb2RzPVwiZnV0dXJlXzEsY3VycmVudCxwYXN0XzEscGFzdF8yXCIgZGF0YS1hY2Nlc3NpYmxlLWNvbG91cnM9XCJmYWxzZVwiPlxuXHRcdFx0XHRcdDxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9c2hhZG93ZG9tdjFcIj5DYW4gSSBVc2Ugc2hhZG93ZG9tdjE/PC9hPiBEYXRhIG9uIHN1cHBvcnQgZm9yIHRoZSBzaGFkb3dkb212MSBmZWF0dXJlIGFjcm9zcyB0aGUgbWFqb3IgYnJvd3NlcnMgZnJvbSBjYW5pdXNlLmNvbS5cblx0XHRcdFx0PC9wPlxuXHRcdFx0XHQ8cCBjbGFzcz1cImNpdV9lbWJlZFwiIGRhdGEtZmVhdHVyZT1cImN1c3RvbS1lbGVtZW50c3YxXCIgZGF0YS1wZXJpb2RzPVwiZnV0dXJlXzEsY3VycmVudCxwYXN0XzEscGFzdF8yXCIgZGF0YS1hY2Nlc3NpYmxlLWNvbG91cnM9XCJmYWxzZVwiPlxuXHRcdFx0XHRcdDxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9Y3VzdG9tLWVsZW1lbnRzdjFcIj5DYW4gSSBVc2UgY3VzdG9tLWVsZW1lbnRzdjE/PC9hPiBEYXRhIG9uIHN1cHBvcnQgZm9yIHRoZSBjdXN0b20tZWxlbWVudHN2MSBmZWF0dXJlIGFjcm9zcyB0aGUgbWFqb3IgYnJvd3NlcnMgZnJvbSBjYW5pdXNlLmNvbS5cblx0XHRcdFx0PC9wPlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwibW9iaWxlXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJiYWNrLWJ0blwiPlxuXHRcdFx0XHRcdDx6b28tYnV0dG9uPlxuXHRcdFx0XHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj48YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PXNoYWRvd2RvbXYxXCIgdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIj5DYW4gSSBVc2Ugc2hhZG93ZG9tdjE/PC9hPjwvc3Bhbj5cblx0XHRcdFx0XHQ8L3pvby1idXR0b24+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYmFjay1idG5cIj5cblx0XHRcdFx0XHQ8em9vLWJ1dHRvbj5cblx0XHRcdFx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1jdXN0b20tZWxlbWVudHN2MVwiIHRhcmdldD1cImFib3V0OmJsYW5rXCI+Q2FuIEkgVXNlIGN1c3RvbS1lbGVtZW50c3YxPzwvYT48L3NwYW4+XG5cdFx0XHRcdFx0PC96b28tYnV0dG9uPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImJhY2stYnRuXCI+XG5cdFx0XHRcdFx0PHpvby1idXR0b24+XG5cdFx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPjxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9dGVtcGxhdGVcIiB0YXJnZXQ9XCJhYm91dDpibGFua1wiPkNhbiBJIFVzZSB0ZW1wbGF0ZT88L2E+IDwvc3Bhbj5cblx0XHRcdFx0XHQ8L3pvby1idXR0b24+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBpZD1cImhvd1wiIGNsYXNzPVwic3BlYy1kb2NzXCI+XG5cdFx0XHQ8YXBwLWNvbnRleHQgdGV4dD1cIkhvdyBjYW4gSSB1c2UgaXQ/XCIgYmFja2J0bj1cInt0cnVlfVwiPjwvYXBwLWNvbnRleHQ+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwibGVmdC1tZW51XCI+XG5cdFx0XHRcdHsjZWFjaCBkb2NsaW5rcyBhcyBsaW5rfVxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJsaW5rLXdyYXBwZXJcIj5cblx0XHRcdFx0XHRcdDxhIGhyZWY9XCJ7bGluay5ocmVmfVwiIHRhcmdldD1cIntsaW5rLnRhcmdldH1cIj57bGluay50ZXh0fTwvYT5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8aHIgY2xhc3M9XCJsZWZ0LW1lbnUtc2VwYXJhdG9yXCI+XG5cdFx0XHRcdHsvZWFjaH1cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG5cdFx0XHQ8ZG9jcy1idXR0b24gIGlkPVwiYnV0dG9uLWRvY1wiPjwvZG9jcy1idXR0b24+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1jaGVja2JveCBpZD1cImNoZWNrYm94LWRvY1wiPjwvZG9jcy1jaGVja2JveD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWNvbGxhcHNhYmxlLWxpc3QgaWQ9XCJjb2xsYXBzYWJsZS1saXN0LWRvY1wiPjwvZG9jcy1jb2xsYXBzYWJsZS1saXN0PlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtZmVlZGJhY2sgaWQ9XCJmZWVkYmFjay1kb2NcIj48L2RvY3MtZmVlZGJhY2s+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1mb290ZXIgaWQ9XCJmb290ZXItZG9jXCI+PC9kb2NzLWZvb3Rlcj5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWhlYWRlciBpZD1cImhlYWRlci1kb2NcIj48L2RvY3MtaGVhZGVyPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtaW5wdXQgaWQ9XCJpbnB1dC1kb2NcIj48L2RvY3MtaW5wdXQ+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1saW5rIGlkPVwibGluay1kb2NcIj48L2RvY3MtbGluaz5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLW1vZGFsIGlkPVwibW9kYWwtZG9jXCI+PC9kb2NzLW1vZGFsPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtbmF2aWdhdGlvbiBpZD1cIm5hdmlnYXRpb24tZG9jXCI+PC9kb2NzLW5hdmlnYXRpb24+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1yYWRpbyBpZD1cInJhZGlvLWRvY1wiPjwvZG9jcy1yYWRpbz5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLXNlYXJjaGFibGUtc2VsZWN0IGlkPVwic2VhcmNoYWJsZS1zZWxlY3QtZG9jXCI+PC9kb2NzLXNlYXJjaGFibGUtc2VsZWN0PlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3Mtc2VsZWN0IGlkPVwic2VsZWN0LWRvY1wiPjwvZG9jcy1zZWxlY3Q+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy10b2FzdCBpZD1cInRvYXN0LWRvY1wiPjwvZG9jcy10b2FzdD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLXRvb2x0aXAgaWQ9XCJ0b29sdGlwLWRvY1wiPjwvZG9jcy10b29sdGlwPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtdGhlbWluZyBpZD1cInRoZW1pbmctZG9jXCI+PC9kb2NzLXRoZW1pbmc+XG5cdFx0XHQ8aHI+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PlxuXHQ8em9vLWZvb3RlciBjbGFzcz1cImZvb3RlclwiIGJpbmQ6dGhpcz17Zm9vdGVyfSBjb3B5cmlnaHQ9XCJ6b29wbHVzIEFHXCI+PC96b28tZm9vdGVyPiBcbjwvZGl2PlxuXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5hcHAge1xuICBtYXJnaW46IDAgYXV0bztcbiAgaGVpZ2h0OiAxMDAlO1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBib3gtc2hhZG93OiAxNXB4IDBweCA0MHB4IDBweCByZ2JhKDg1LCA4NSwgODUsIDAuMyksIC0xNXB4IDBweCA0MHB4IDBweCByZ2JhKDg1LCA4NSwgODUsIDAuMyk7IH1cblxuLnBhZ2UtY29udGVudCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAzMjBweCAxZnI7XG4gIGdyaWQtZ2FwOiAzMHB4O1xuICBncmlkLXRlbXBsYXRlLWFyZWFzOiBcIm92ZXJ2aWV3IG92ZXJ2aWV3XCIgXCJjYW5pdXNlIGNhbml1c2VcIiBcInNwZWMtZG9jcyBjb250ZW50XCI7IH1cbiAgQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA4NTBweCkge1xuICAgIC5wYWdlLWNvbnRlbnQge1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1hcmVhczogXCJvdmVydmlld1wiIFwiY2FuaXVzZVwiIFwic3BlYy1kb2NzXCIgIFwiY29udGVudFwiO1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiBtaW5tYXgoMzIwcHgsIDkwJSk7XG4gICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgfSB9XG5cbi53aGF0LWxpc3Qge1xuICBjb2xvcjogdmFyKC0tbWFpbi1jb2xvciwgIzNDOTcwMCk7XG4gIGZvbnQtc2l6ZTogMjBweDsgfVxuXG5AbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gICN3aGVuIC5kZXNrdG9wIHtcbiAgICBkaXNwbGF5OiBub25lOyB9IH1cblxuI3doZW4gLm1vYmlsZSB7XG4gIGRpc3BsYXk6IG5vbmU7IH1cbiAgQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA4NTBweCkge1xuICAgICN3aGVuIC5tb2JpbGUge1xuICAgICAgZGlzcGxheTogYmxvY2s7IH0gfVxuXG4jd2hlbiAuYmFjay1idG4ge1xuICB3aWR0aDogMjgwcHg7XG4gIG1hcmdpbjogMTBweCBhdXRvOyB9XG4gICN3aGVuIC5iYWNrLWJ0biBhIHtcbiAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgY29sb3I6IHdoaXRlOyB9XG5cbi5saW5rLXdyYXBwZXIge1xuICBoZWlnaHQ6IGF1dG87XG4gIHRyYW5zaXRpb246IGNvbG9yIDAuM3MsIGJhY2tncm91bmQtY29sb3IgMC4zczsgfVxuICAubGluay13cmFwcGVyOmhvdmVyIHtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMSk7XG4gICAgY29sb3I6IHdoaXRlOyB9XG4gIC5saW5rLXdyYXBwZXIgYSB7XG4gICAgY29sb3I6IHZhcigtLW1haW4tY29sb3IsICMzQzk3MDApO1xuICAgIHBhZGRpbmc6IDEycHg7XG4gICAgZGlzcGxheTogYmxvY2s7XG4gICAgdGV4dC1kZWNvcmF0aW9uOiBub25lOyB9XG5cbi5sZWZ0LW1lbnUgLmxlZnQtbWVudS1zZXBhcmF0b3Ige1xuICBtYXJnaW46IDA7IH1cblxuQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA4NTBweCkge1xuICAubGVmdC1tZW51IHtcbiAgICBkaXNwbGF5OiBub25lOyB9IH1cblxuLm92ZXJ2aWV3IHtcbiAgZ3JpZC1hcmVhOiBvdmVydmlldztcbiAgbWF4LXdpZHRoOiAxMjgwcHg7XG4gIHdpZHRoOiAxMDAlO1xuICBmbGV4OiAxIDAgYXV0bztcbiAgbWFyZ2luOiAwIGF1dG87IH1cblxuLmNhbml1c2Uge1xuICBncmlkLWFyZWE6IGNhbml1c2U7XG4gIHdpZHRoOiAxMDAlO1xuICBmbGV4OiAxIDAgYXV0bzsgfVxuXG4uY2FuaXVzZSBwIHtcbiAgbWF4LXdpZHRoOiAxMjgwcHg7XG4gIG1hcmdpbjogMCBhdXRvOyB9XG5cbi5zcGVjLWRvY3Mge1xuICBncmlkLWFyZWE6IHNwZWMtZG9jcztcbiAgcG9zaXRpb246IHN0aWNreTtcbiAgdG9wOiAwO1xuICBoZWlnaHQ6IDIwMHB4OyB9XG5cbi5jb250ZW50IHtcbiAgZ3JpZC1hcmVhOiBjb250ZW50OyB9XG5cbmhyIHtcbiAgYm9yZGVyLWNvbG9yOiB2YXIoLS1tYWluLWNvbG9yLCAjM0M5NzAwKTtcbiAgbWFyZ2luOiA0NXB4IDA7XG4gIG9wYWNpdHk6IDAuMzsgfVxuXG4uZm9vdGVyIHtcbiAgZmxleC1zaHJpbms6IDA7IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSAnc3ZlbHRlJztcblx0bGV0IHBvc3NpYmxlTnVtYmVyT2ZJdGVtcyA9IFs1LCAxMCwgMjUsIDEwMF07XG5cdGxldCB6b29HcmlkO1xuXHRsZXQgZm9vdGVyO1xuXHRsZXQgZG9jbGlua3MgPSBbXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNidXR0b24tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnQnV0dG9uJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNjaGVja2JveC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdDaGVja2JveCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjY29sbGFwc2FibGUtbGlzdC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdDb2xsYXBzYWJsZSBMaXN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNmZWVkYmFjay1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdGZWVkYmFjaydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjZm9vdGVyLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ0Zvb3Rlcidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjaGVhZGVyLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ0hlYWRlcidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjaW5wdXQtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnSW5wdXQnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI2xpbmstZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTGluaydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjbW9kYWwtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTW9kYWwnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI25hdmlnYXRpb24tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTmF2aWdhdGlvbidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjcmFkaW8tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnUmFkaW8nXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI3NlYXJjaGFibGUtc2VsZWN0LWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ1NlYXJjaGFibGUgc2VsZWN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNzZWxlY3QtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnU2VsZWN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyN0b2FzdC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdUb2FzdCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjdG9vbHRpcC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdUb29sdGlwJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyN0aGVtaW5nLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ1RoZW1pbmcnXG5cdFx0fVxuXHRdO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRmb290ZXIuZm9vdGVybGlua3MgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdGhyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxuXHRcdFx0XHR0ZXh0OiAnR2l0aHViJyxcblx0XHRcdFx0dHlwZTogJ3N0YW5kYXJkJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL0B6b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXG5cdFx0XHRcdHRleHQ6ICdOUE0nLFxuXHRcdFx0XHR0eXBlOiAnc3RhbmRhcmQnXG5cdFx0XHR9XG5cdFx0XTtcblx0fSk7XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBOEt3QixJQUFJLDhCQUFDLENBQUMsQUFDNUIsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLENBQ2QsTUFBTSxDQUFFLElBQUksQ0FDWixPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxNQUFNLENBQ3RCLFVBQVUsQ0FBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUFFLENB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 */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (74:4) {#each possibleNumberOfItems as number, idx}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*number*/ ctx[9] + "";
    	let t;
    	let option_selected_value;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.selected = option_selected_value = /*idx*/ ctx[11] == 0;
    			option.__value = option_value_value = /*number*/ ctx[9];
    			option.value = option.__value;
    			add_location(option, file, 74, 5, 1964);
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
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(74:4) {#each possibleNumberOfItems as number, idx}",
    		ctx
    	});

    	return block;
    }

    // (129:4) {#each doclinks as link}
    function create_each_block(ctx) {
    	let div;
    	let a;
    	let t0_value = /*link*/ ctx[6].text + "";
    	let t0;
    	let a_href_value;
    	let a_target_value;
    	let t1;
    	let hr;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			hr = element("hr");
    			attr_dev(a, "href", a_href_value = /*link*/ ctx[6].href);
    			attr_dev(a, "target", a_target_value = /*link*/ ctx[6].target);
    			attr_dev(a, "class", "svelte-1iv82ik");
    			add_location(a, file, 130, 6, 4263);
    			attr_dev(div, "class", "link-wrapper svelte-1iv82ik");
    			add_location(div, file, 129, 5, 4230);
    			attr_dev(hr, "class", "left-menu-separator svelte-1iv82ik");
    			add_location(hr, file, 132, 5, 4341);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, hr, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(hr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(129:4) {#each doclinks as link}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div62;
    	let app_header;
    	let t0;
    	let zoo_grid;
    	let div0;
    	let t2;
    	let div1;
    	let t4;
    	let div2;
    	let t6;
    	let div3;
    	let t8;
    	let div4;
    	let t10;
    	let div5;
    	let t12;
    	let div6;
    	let t14;
    	let div7;
    	let t16;
    	let div14;
    	let zoo_feedback;
    	let t17;
    	let div8;
    	let t19;
    	let div9;
    	let t21;
    	let div10;
    	let t23;
    	let div11;
    	let t25;
    	let zoo_select0;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let t30;
    	let div12;
    	let t32;
    	let div13;
    	let t34;
    	let div23;
    	let div15;
    	let t36;
    	let div16;
    	let t38;
    	let div17;
    	let t40;
    	let div18;
    	let t42;
    	let div19;
    	let t44;
    	let div20;
    	let t46;
    	let div21;
    	let t48;
    	let div22;
    	let t50;
    	let div32;
    	let div24;
    	let t52;
    	let div25;
    	let t54;
    	let div26;
    	let t56;
    	let div27;
    	let t58;
    	let div28;
    	let t60;
    	let div29;
    	let t62;
    	let div30;
    	let t64;
    	let div31;
    	let t66;
    	let div41;
    	let div33;
    	let t68;
    	let div34;
    	let t70;
    	let div35;
    	let t72;
    	let div36;
    	let t74;
    	let div37;
    	let t76;
    	let div38;
    	let t78;
    	let div39;
    	let t80;
    	let div40;
    	let t82;
    	let div50;
    	let div42;
    	let t84;
    	let div43;
    	let t86;
    	let div44;
    	let t88;
    	let div45;
    	let t90;
    	let div46;
    	let t92;
    	let div47;
    	let t94;
    	let div48;
    	let t96;
    	let div49;
    	let t98;
    	let zoo_select1;
    	let select1;
    	let t99;
    	let app_context0;
    	let t100;
    	let ul;
    	let li0;
    	let t102;
    	let li1;
    	let t104;
    	let div61;
    	let div51;
    	let app_form;
    	let t105;
    	let hr0;
    	let t106;
    	let app_buttons;
    	let t107;
    	let hr1;
    	let t108;
    	let app_tooltip_and_feedback;
    	let t109;
    	let hr2;
    	let t110;
    	let div57;
    	let app_context1;
    	let app_context1_backbtn_value;
    	let t111;
    	let div52;
    	let p0;
    	let a0;
    	let t113;
    	let t114;
    	let p1;
    	let a1;
    	let t116;
    	let t117;
    	let div56;
    	let div53;
    	let zoo_button0;
    	let span0;
    	let a2;
    	let t119;
    	let div54;
    	let zoo_button1;
    	let span1;
    	let a3;
    	let t121;
    	let div55;
    	let zoo_button2;
    	let span2;
    	let a4;
    	let t123;
    	let div59;
    	let app_context2;
    	let app_context2_backbtn_value;
    	let t124;
    	let div58;
    	let t125;
    	let div60;
    	let docs_button;
    	let t126;
    	let hr3;
    	let t127;
    	let docs_checkbox;
    	let t128;
    	let hr4;
    	let t129;
    	let docs_collapsable_list;
    	let t130;
    	let hr5;
    	let t131;
    	let docs_feedback;
    	let t132;
    	let hr6;
    	let t133;
    	let docs_footer;
    	let t134;
    	let hr7;
    	let t135;
    	let docs_header;
    	let t136;
    	let hr8;
    	let t137;
    	let docs_input;
    	let t138;
    	let hr9;
    	let t139;
    	let docs_link;
    	let t140;
    	let hr10;
    	let t141;
    	let docs_modal;
    	let t142;
    	let hr11;
    	let t143;
    	let docs_navigation;
    	let t144;
    	let hr12;
    	let t145;
    	let docs_radio;
    	let t146;
    	let hr13;
    	let t147;
    	let docs_searchable_select;
    	let t148;
    	let hr14;
    	let t149;
    	let docs_select;
    	let t150;
    	let hr15;
    	let t151;
    	let docs_toast;
    	let t152;
    	let hr16;
    	let t153;
    	let docs_tooltip;
    	let t154;
    	let hr17;
    	let t155;
    	let docs_theming;
    	let t156;
    	let hr18;
    	let t157;
    	let zoo_footer;
    	let each_value_1 = /*possibleNumberOfItems*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*doclinks*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div62 = element("div");
    			app_header = element("app-header");
    			t0 = space();
    			zoo_grid = element("zoo-grid");
    			div0 = element("div");
    			div0.textContent = "Actions";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "Created Date";
    			t4 = space();
    			div2 = element("div");
    			div2.textContent = "Status";
    			t6 = space();
    			div3 = element("div");
    			div3.textContent = "From Date";
    			t8 = space();
    			div4 = element("div");
    			div4.textContent = "Creator Name";
    			t10 = space();
    			div5 = element("div");
    			div5.textContent = "Supplier";
    			t12 = space();
    			div6 = element("div");
    			div6.textContent = "Fulfillment Center";
    			t14 = space();
    			div7 = element("div");
    			div7.textContent = "Article Importance Lower Bound %";
    			t16 = space();
    			div14 = element("div");
    			zoo_feedback = element("zoo-feedback");
    			t17 = space();
    			div8 = element("div");
    			div8.textContent = "cell2";
    			t19 = space();
    			div9 = element("div");
    			div9.textContent = "cell3";
    			t21 = space();
    			div10 = element("div");
    			div10.textContent = "cell4";
    			t23 = space();
    			div11 = element("div");
    			div11.textContent = "cell5";
    			t25 = space();
    			zoo_select0 = element("zoo-select");
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Doge";
    			option1 = element("option");
    			option1.textContent = "Doge";
    			option2 = element("option");
    			option2.textContent = "Catz";
    			option3 = element("option");
    			option3.textContent = "Snek";
    			t30 = space();
    			div12 = element("div");
    			div12.textContent = "cell7";
    			t32 = space();
    			div13 = element("div");
    			div13.textContent = "cell8";
    			t34 = space();
    			div23 = element("div");
    			div15 = element("div");
    			div15.textContent = "cell9";
    			t36 = space();
    			div16 = element("div");
    			div16.textContent = "cell10";
    			t38 = space();
    			div17 = element("div");
    			div17.textContent = "cell11";
    			t40 = space();
    			div18 = element("div");
    			div18.textContent = "cell12";
    			t42 = space();
    			div19 = element("div");
    			div19.textContent = "cell13";
    			t44 = space();
    			div20 = element("div");
    			div20.textContent = "cell14";
    			t46 = space();
    			div21 = element("div");
    			div21.textContent = "cell15";
    			t48 = space();
    			div22 = element("div");
    			div22.textContent = "cell16";
    			t50 = space();
    			div32 = element("div");
    			div24 = element("div");
    			div24.textContent = "cell9";
    			t52 = space();
    			div25 = element("div");
    			div25.textContent = "cell10";
    			t54 = space();
    			div26 = element("div");
    			div26.textContent = "cell11";
    			t56 = space();
    			div27 = element("div");
    			div27.textContent = "cell12";
    			t58 = space();
    			div28 = element("div");
    			div28.textContent = "cell13";
    			t60 = space();
    			div29 = element("div");
    			div29.textContent = "cell14";
    			t62 = space();
    			div30 = element("div");
    			div30.textContent = "cell15";
    			t64 = space();
    			div31 = element("div");
    			div31.textContent = "cell16";
    			t66 = space();
    			div41 = element("div");
    			div33 = element("div");
    			div33.textContent = "cell9";
    			t68 = space();
    			div34 = element("div");
    			div34.textContent = "cell10";
    			t70 = space();
    			div35 = element("div");
    			div35.textContent = "cell11";
    			t72 = space();
    			div36 = element("div");
    			div36.textContent = "cell12";
    			t74 = space();
    			div37 = element("div");
    			div37.textContent = "cell13";
    			t76 = space();
    			div38 = element("div");
    			div38.textContent = "cell14";
    			t78 = space();
    			div39 = element("div");
    			div39.textContent = "cell15";
    			t80 = space();
    			div40 = element("div");
    			div40.textContent = "cell16";
    			t82 = space();
    			div50 = element("div");
    			div42 = element("div");
    			div42.textContent = "cell9";
    			t84 = space();
    			div43 = element("div");
    			div43.textContent = "cell10";
    			t86 = space();
    			div44 = element("div");
    			div44.textContent = "cell11";
    			t88 = space();
    			div45 = element("div");
    			div45.textContent = "cell12";
    			t90 = space();
    			div46 = element("div");
    			div46.textContent = "cell13";
    			t92 = space();
    			div47 = element("div");
    			div47.textContent = "cell14";
    			t94 = space();
    			div48 = element("div");
    			div48.textContent = "cell15";
    			t96 = space();
    			div49 = element("div");
    			div49.textContent = "cell16";
    			t98 = space();
    			zoo_select1 = element("zoo-select");
    			select1 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t99 = space();
    			app_context0 = element("app-context");
    			t100 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Set of web-components which can be used in any modern UI framework (or without any).";
    			t102 = space();
    			li1 = element("li");
    			li1.textContent = "The web-component set implements Z+ shop style guide.";
    			t104 = space();
    			div61 = element("div");
    			div51 = element("div");
    			app_form = element("app-form");
    			t105 = space();
    			hr0 = element("hr");
    			t106 = space();
    			app_buttons = element("app-buttons");
    			t107 = space();
    			hr1 = element("hr");
    			t108 = space();
    			app_tooltip_and_feedback = element("app-tooltip-and-feedback");
    			t109 = space();
    			hr2 = element("hr");
    			t110 = space();
    			div57 = element("div");
    			app_context1 = element("app-context");
    			t111 = space();
    			div52 = element("div");
    			p0 = element("p");
    			a0 = element("a");
    			a0.textContent = "Can I Use shadowdomv1?";
    			t113 = text(" Data on support for the shadowdomv1 feature across the major browsers from caniuse.com.");
    			t114 = space();
    			p1 = element("p");
    			a1 = element("a");
    			a1.textContent = "Can I Use custom-elementsv1?";
    			t116 = text(" Data on support for the custom-elementsv1 feature across the major browsers from caniuse.com.");
    			t117 = space();
    			div56 = element("div");
    			div53 = element("div");
    			zoo_button0 = element("zoo-button");
    			span0 = element("span");
    			a2 = element("a");
    			a2.textContent = "Can I Use shadowdomv1?";
    			t119 = space();
    			div54 = element("div");
    			zoo_button1 = element("zoo-button");
    			span1 = element("span");
    			a3 = element("a");
    			a3.textContent = "Can I Use custom-elementsv1?";
    			t121 = space();
    			div55 = element("div");
    			zoo_button2 = element("zoo-button");
    			span2 = element("span");
    			a4 = element("a");
    			a4.textContent = "Can I Use template?";
    			t123 = space();
    			div59 = element("div");
    			app_context2 = element("app-context");
    			t124 = space();
    			div58 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t125 = space();
    			div60 = element("div");
    			docs_button = element("docs-button");
    			t126 = space();
    			hr3 = element("hr");
    			t127 = space();
    			docs_checkbox = element("docs-checkbox");
    			t128 = space();
    			hr4 = element("hr");
    			t129 = space();
    			docs_collapsable_list = element("docs-collapsable-list");
    			t130 = space();
    			hr5 = element("hr");
    			t131 = space();
    			docs_feedback = element("docs-feedback");
    			t132 = space();
    			hr6 = element("hr");
    			t133 = space();
    			docs_footer = element("docs-footer");
    			t134 = space();
    			hr7 = element("hr");
    			t135 = space();
    			docs_header = element("docs-header");
    			t136 = space();
    			hr8 = element("hr");
    			t137 = space();
    			docs_input = element("docs-input");
    			t138 = space();
    			hr9 = element("hr");
    			t139 = space();
    			docs_link = element("docs-link");
    			t140 = space();
    			hr10 = element("hr");
    			t141 = space();
    			docs_modal = element("docs-modal");
    			t142 = space();
    			hr11 = element("hr");
    			t143 = space();
    			docs_navigation = element("docs-navigation");
    			t144 = space();
    			hr12 = element("hr");
    			t145 = space();
    			docs_radio = element("docs-radio");
    			t146 = space();
    			hr13 = element("hr");
    			t147 = space();
    			docs_searchable_select = element("docs-searchable-select");
    			t148 = space();
    			hr14 = element("hr");
    			t149 = space();
    			docs_select = element("docs-select");
    			t150 = space();
    			hr15 = element("hr");
    			t151 = space();
    			docs_toast = element("docs-toast");
    			t152 = space();
    			hr16 = element("hr");
    			t153 = space();
    			docs_tooltip = element("docs-tooltip");
    			t154 = space();
    			hr17 = element("hr");
    			t155 = space();
    			docs_theming = element("docs-theming");
    			t156 = space();
    			hr18 = element("hr");
    			t157 = space();
    			zoo_footer = element("zoo-footer");
    			add_location(app_header, file, 1, 1, 19);
    			attr_dev(div0, "slot", "headercell");
    			attr_dev(div0, "sortable", "");
    			add_location(div0, file, 3, 2, 144);
    			attr_dev(div1, "slot", "headercell");
    			add_location(div1, file, 4, 2, 192);
    			attr_dev(div2, "slot", "headercell");
    			add_location(div2, file, 5, 2, 236);
    			attr_dev(div3, "slot", "headercell");
    			add_location(div3, file, 6, 2, 274);
    			attr_dev(div4, "slot", "headercell");
    			add_location(div4, file, 7, 2, 315);
    			attr_dev(div5, "slot", "headercell");
    			add_location(div5, file, 8, 2, 359);
    			attr_dev(div6, "slot", "headercell");
    			add_location(div6, file, 9, 2, 399);
    			attr_dev(div7, "slot", "headercell");
    			add_location(div7, file, 10, 2, 449);
    			set_custom_element_data(zoo_feedback, "type", "info");
    			set_custom_element_data(zoo_feedback, "text", "This is an info message.");
    			add_location(zoo_feedback, file, 13, 3, 534);
    			add_location(div8, file, 15, 3, 615);
    			add_location(div9, file, 16, 3, 635);
    			add_location(div10, file, 17, 3, 655);
    			add_location(div11, file, 18, 3, 675);
    			attr_dev(option0, "class", "placeholder");
    			option0.__value = "";
    			option0.value = option0.__value;
    			option0.disabled = true;
    			option0.selected = true;
    			add_location(option0, file, 21, 5, 779);
    			option1.__value = "Doge";
    			option1.value = option1.__value;
    			add_location(option1, file, 22, 5, 853);
    			option2.__value = "Catz";
    			option2.value = option2.__value;
    			add_location(option2, file, 23, 5, 880);
    			option3.__value = "Snek";
    			option3.value = option3.__value;
    			add_location(option3, file, 24, 5, 907);
    			attr_dev(select0, "slot", "selectelement");
    			add_location(select0, file, 20, 4, 744);
    			set_custom_element_data(zoo_select0, "labeltext", "This product is for");
    			add_location(zoo_select0, file, 19, 3, 695);
    			add_location(div12, file, 27, 3, 963);
    			add_location(div13, file, 28, 3, 983);
    			attr_dev(div14, "slot", "row");
    			add_location(div14, file, 12, 2, 514);
    			add_location(div15, file, 31, 3, 1031);
    			add_location(div16, file, 32, 3, 1051);
    			add_location(div17, file, 33, 3, 1072);
    			add_location(div18, file, 34, 3, 1093);
    			add_location(div19, file, 35, 3, 1114);
    			add_location(div20, file, 36, 3, 1135);
    			add_location(div21, file, 37, 3, 1156);
    			add_location(div22, file, 38, 3, 1177);
    			attr_dev(div23, "slot", "row");
    			add_location(div23, file, 30, 2, 1011);
    			add_location(div24, file, 41, 3, 1226);
    			add_location(div25, file, 42, 3, 1246);
    			add_location(div26, file, 43, 3, 1267);
    			add_location(div27, file, 44, 3, 1288);
    			add_location(div28, file, 45, 3, 1309);
    			add_location(div29, file, 46, 3, 1330);
    			add_location(div30, file, 47, 3, 1351);
    			add_location(div31, file, 48, 3, 1372);
    			attr_dev(div32, "slot", "row");
    			add_location(div32, file, 40, 2, 1206);
    			add_location(div33, file, 51, 3, 1421);
    			add_location(div34, file, 52, 3, 1441);
    			add_location(div35, file, 53, 3, 1462);
    			add_location(div36, file, 54, 3, 1483);
    			add_location(div37, file, 55, 3, 1504);
    			add_location(div38, file, 56, 3, 1525);
    			add_location(div39, file, 57, 3, 1546);
    			add_location(div40, file, 58, 3, 1567);
    			attr_dev(div41, "slot", "row");
    			add_location(div41, file, 50, 2, 1401);
    			add_location(div42, file, 61, 3, 1616);
    			add_location(div43, file, 62, 3, 1636);
    			add_location(div44, file, 63, 3, 1657);
    			add_location(div45, file, 64, 3, 1678);
    			add_location(div46, file, 65, 3, 1699);
    			add_location(div47, file, 66, 3, 1720);
    			add_location(div48, file, 67, 3, 1741);
    			add_location(div49, file, 68, 3, 1762);
    			attr_dev(div50, "slot", "row");
    			add_location(div50, file, 60, 2, 1596);
    			attr_dev(select1, "slot", "selectelement");
    			add_location(select1, file, 72, 3, 1880);
    			set_custom_element_data(zoo_select1, "labeltext", "Items per page");
    			set_custom_element_data(zoo_select1, "labelposition", "left");
    			set_custom_element_data(zoo_select1, "slot", "pagesizeselector");
    			add_location(zoo_select1, file, 71, 2, 1792);
    			set_style(zoo_grid, "padding", "10px");
    			set_style(zoo_grid, "max-height", "300px");
    			set_custom_element_data(zoo_grid, "stickyheader", "");
    			set_custom_element_data(zoo_grid, "paginator", "");
    			add_location(zoo_grid, file, 2, 1, 46);
    			set_custom_element_data(app_context0, "id", "what");
    			set_custom_element_data(app_context0, "text", "What is this project?");
    			add_location(app_context0, file, 79, 1, 2067);
    			add_location(li0, file, 81, 2, 2160);
    			add_location(li1, file, 84, 2, 2263);
    			attr_dev(ul, "class", "what-list svelte-1iv82ik");
    			add_location(ul, file, 80, 1, 2135);
    			set_custom_element_data(app_form, "id", "app-form");
    			add_location(app_form, file, 90, 3, 2396);
    			attr_dev(hr0, "class", "svelte-1iv82ik");
    			add_location(hr0, file, 91, 3, 2435);
    			set_custom_element_data(app_buttons, "id", "app-buttons");
    			add_location(app_buttons, file, 92, 3, 2443);
    			attr_dev(hr1, "class", "svelte-1iv82ik");
    			add_location(hr1, file, 93, 3, 2491);
    			set_custom_element_data(app_tooltip_and_feedback, "id", "app-tooltip-and-feedback");
    			add_location(app_tooltip_and_feedback, file, 94, 3, 2499);
    			attr_dev(hr2, "class", "svelte-1iv82ik");
    			add_location(hr2, file, 95, 3, 2586);
    			attr_dev(div51, "class", "overview svelte-1iv82ik");
    			add_location(div51, file, 89, 2, 2370);
    			set_custom_element_data(app_context1, "text", "When can I use it?");
    			set_custom_element_data(app_context1, "backbtn", app_context1_backbtn_value = true);
    			add_location(app_context1, file, 98, 3, 2637);
    			attr_dev(a0, "href", "http://caniuse.com/#feat=shadowdomv1");
    			attr_dev(a0, "class", "svelte-1iv82ik");
    			add_location(a0, file, 101, 5, 2869);
    			attr_dev(p0, "class", "ciu_embed svelte-1iv82ik");
    			attr_dev(p0, "data-feature", "shadowdomv1");
    			attr_dev(p0, "data-periods", "future_1,current,past_1,past_2");
    			attr_dev(p0, "data-accessible-colours", "false");
    			add_location(p0, file, 100, 4, 2737);
    			attr_dev(a1, "href", "http://caniuse.com/#feat=custom-elementsv1");
    			attr_dev(a1, "class", "svelte-1iv82ik");
    			add_location(a1, file, 104, 5, 3182);
    			attr_dev(p1, "class", "ciu_embed svelte-1iv82ik");
    			attr_dev(p1, "data-feature", "custom-elementsv1");
    			attr_dev(p1, "data-periods", "future_1,current,past_1,past_2");
    			attr_dev(p1, "data-accessible-colours", "false");
    			add_location(p1, file, 103, 4, 3044);
    			attr_dev(div52, "class", "desktop svelte-1iv82ik");
    			add_location(div52, file, 99, 3, 2711);
    			attr_dev(a2, "href", "http://caniuse.com/#feat=shadowdomv1");
    			attr_dev(a2, "target", "about:blank");
    			attr_dev(a2, "class", "svelte-1iv82ik");
    			add_location(a2, file, 110, 33, 3483);
    			attr_dev(span0, "slot", "buttoncontent");
    			add_location(span0, file, 110, 6, 3456);
    			add_location(zoo_button0, file, 109, 5, 3437);
    			attr_dev(div53, "class", "back-btn svelte-1iv82ik");
    			add_location(div53, file, 108, 4, 3409);
    			attr_dev(a3, "href", "http://caniuse.com/#feat=custom-elementsv1");
    			attr_dev(a3, "target", "about:blank");
    			attr_dev(a3, "class", "svelte-1iv82ik");
    			add_location(a3, file, 115, 33, 3693);
    			attr_dev(span1, "slot", "buttoncontent");
    			add_location(span1, file, 115, 6, 3666);
    			add_location(zoo_button1, file, 114, 5, 3647);
    			attr_dev(div54, "class", "back-btn svelte-1iv82ik");
    			add_location(div54, file, 113, 4, 3619);
    			attr_dev(a4, "href", "http://caniuse.com/#feat=template");
    			attr_dev(a4, "target", "about:blank");
    			attr_dev(a4, "class", "svelte-1iv82ik");
    			add_location(a4, file, 120, 33, 3915);
    			attr_dev(span2, "slot", "buttoncontent");
    			add_location(span2, file, 120, 6, 3888);
    			add_location(zoo_button2, file, 119, 5, 3869);
    			attr_dev(div55, "class", "back-btn svelte-1iv82ik");
    			add_location(div55, file, 118, 4, 3841);
    			attr_dev(div56, "class", "mobile svelte-1iv82ik");
    			add_location(div56, file, 107, 3, 3384);
    			attr_dev(div57, "id", "when");
    			attr_dev(div57, "class", "caniuse svelte-1iv82ik");
    			add_location(div57, file, 97, 2, 2602);
    			set_custom_element_data(app_context2, "text", "How can I use it?");
    			set_custom_element_data(app_context2, "backbtn", app_context2_backbtn_value = true);
    			add_location(app_context2, file, 126, 3, 4099);
    			attr_dev(div58, "class", "left-menu svelte-1iv82ik");
    			add_location(div58, file, 127, 3, 4172);
    			attr_dev(div59, "id", "how");
    			attr_dev(div59, "class", "spec-docs svelte-1iv82ik");
    			add_location(div59, file, 125, 2, 4063);
    			set_custom_element_data(docs_button, "id", "button-doc");
    			add_location(docs_button, file, 137, 3, 4432);
    			attr_dev(hr3, "class", "svelte-1iv82ik");
    			add_location(hr3, file, 138, 3, 4480);
    			set_custom_element_data(docs_checkbox, "id", "checkbox-doc");
    			add_location(docs_checkbox, file, 139, 3, 4488);
    			attr_dev(hr4, "class", "svelte-1iv82ik");
    			add_location(hr4, file, 140, 3, 4541);
    			set_custom_element_data(docs_collapsable_list, "id", "collapsable-list-doc");
    			add_location(docs_collapsable_list, file, 141, 3, 4549);
    			attr_dev(hr5, "class", "svelte-1iv82ik");
    			add_location(hr5, file, 142, 3, 4626);
    			set_custom_element_data(docs_feedback, "id", "feedback-doc");
    			add_location(docs_feedback, file, 143, 3, 4634);
    			attr_dev(hr6, "class", "svelte-1iv82ik");
    			add_location(hr6, file, 144, 3, 4687);
    			set_custom_element_data(docs_footer, "id", "footer-doc");
    			add_location(docs_footer, file, 145, 3, 4695);
    			attr_dev(hr7, "class", "svelte-1iv82ik");
    			add_location(hr7, file, 146, 3, 4742);
    			set_custom_element_data(docs_header, "id", "header-doc");
    			add_location(docs_header, file, 147, 3, 4750);
    			attr_dev(hr8, "class", "svelte-1iv82ik");
    			add_location(hr8, file, 148, 3, 4797);
    			set_custom_element_data(docs_input, "id", "input-doc");
    			add_location(docs_input, file, 149, 3, 4805);
    			attr_dev(hr9, "class", "svelte-1iv82ik");
    			add_location(hr9, file, 150, 3, 4849);
    			set_custom_element_data(docs_link, "id", "link-doc");
    			add_location(docs_link, file, 151, 3, 4857);
    			attr_dev(hr10, "class", "svelte-1iv82ik");
    			add_location(hr10, file, 152, 3, 4898);
    			set_custom_element_data(docs_modal, "id", "modal-doc");
    			add_location(docs_modal, file, 153, 3, 4906);
    			attr_dev(hr11, "class", "svelte-1iv82ik");
    			add_location(hr11, file, 154, 3, 4950);
    			set_custom_element_data(docs_navigation, "id", "navigation-doc");
    			add_location(docs_navigation, file, 155, 3, 4958);
    			attr_dev(hr12, "class", "svelte-1iv82ik");
    			add_location(hr12, file, 156, 3, 5017);
    			set_custom_element_data(docs_radio, "id", "radio-doc");
    			add_location(docs_radio, file, 157, 3, 5025);
    			attr_dev(hr13, "class", "svelte-1iv82ik");
    			add_location(hr13, file, 158, 3, 5069);
    			set_custom_element_data(docs_searchable_select, "id", "searchable-select-doc");
    			add_location(docs_searchable_select, file, 159, 3, 5077);
    			attr_dev(hr14, "class", "svelte-1iv82ik");
    			add_location(hr14, file, 160, 3, 5157);
    			set_custom_element_data(docs_select, "id", "select-doc");
    			add_location(docs_select, file, 161, 3, 5165);
    			attr_dev(hr15, "class", "svelte-1iv82ik");
    			add_location(hr15, file, 162, 3, 5212);
    			set_custom_element_data(docs_toast, "id", "toast-doc");
    			add_location(docs_toast, file, 163, 3, 5220);
    			attr_dev(hr16, "class", "svelte-1iv82ik");
    			add_location(hr16, file, 164, 3, 5264);
    			set_custom_element_data(docs_tooltip, "id", "tooltip-doc");
    			add_location(docs_tooltip, file, 165, 3, 5272);
    			attr_dev(hr17, "class", "svelte-1iv82ik");
    			add_location(hr17, file, 166, 3, 5322);
    			set_custom_element_data(docs_theming, "id", "theming-doc");
    			add_location(docs_theming, file, 167, 3, 5330);
    			attr_dev(hr18, "class", "svelte-1iv82ik");
    			add_location(hr18, file, 168, 3, 5380);
    			attr_dev(div60, "class", "content svelte-1iv82ik");
    			add_location(div60, file, 136, 2, 4407);
    			attr_dev(div61, "class", "page-content svelte-1iv82ik");
    			add_location(div61, file, 88, 1, 2341);
    			set_custom_element_data(zoo_footer, "class", "footer svelte-1iv82ik");
    			set_custom_element_data(zoo_footer, "copyright", "zooplus AG");
    			add_location(zoo_footer, file, 171, 1, 5403);
    			attr_dev(div62, "class", "app svelte-1iv82ik");
    			add_location(div62, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div62, anchor);
    			append_dev(div62, app_header);
    			append_dev(div62, t0);
    			append_dev(div62, zoo_grid);
    			append_dev(zoo_grid, div0);
    			append_dev(zoo_grid, t2);
    			append_dev(zoo_grid, div1);
    			append_dev(zoo_grid, t4);
    			append_dev(zoo_grid, div2);
    			append_dev(zoo_grid, t6);
    			append_dev(zoo_grid, div3);
    			append_dev(zoo_grid, t8);
    			append_dev(zoo_grid, div4);
    			append_dev(zoo_grid, t10);
    			append_dev(zoo_grid, div5);
    			append_dev(zoo_grid, t12);
    			append_dev(zoo_grid, div6);
    			append_dev(zoo_grid, t14);
    			append_dev(zoo_grid, div7);
    			append_dev(zoo_grid, t16);
    			append_dev(zoo_grid, div14);
    			append_dev(div14, zoo_feedback);
    			append_dev(div14, t17);
    			append_dev(div14, div8);
    			append_dev(div14, t19);
    			append_dev(div14, div9);
    			append_dev(div14, t21);
    			append_dev(div14, div10);
    			append_dev(div14, t23);
    			append_dev(div14, div11);
    			append_dev(div14, t25);
    			append_dev(div14, zoo_select0);
    			append_dev(zoo_select0, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			append_dev(select0, option3);
    			append_dev(div14, t30);
    			append_dev(div14, div12);
    			append_dev(div14, t32);
    			append_dev(div14, div13);
    			append_dev(zoo_grid, t34);
    			append_dev(zoo_grid, div23);
    			append_dev(div23, div15);
    			append_dev(div23, t36);
    			append_dev(div23, div16);
    			append_dev(div23, t38);
    			append_dev(div23, div17);
    			append_dev(div23, t40);
    			append_dev(div23, div18);
    			append_dev(div23, t42);
    			append_dev(div23, div19);
    			append_dev(div23, t44);
    			append_dev(div23, div20);
    			append_dev(div23, t46);
    			append_dev(div23, div21);
    			append_dev(div23, t48);
    			append_dev(div23, div22);
    			append_dev(zoo_grid, t50);
    			append_dev(zoo_grid, div32);
    			append_dev(div32, div24);
    			append_dev(div32, t52);
    			append_dev(div32, div25);
    			append_dev(div32, t54);
    			append_dev(div32, div26);
    			append_dev(div32, t56);
    			append_dev(div32, div27);
    			append_dev(div32, t58);
    			append_dev(div32, div28);
    			append_dev(div32, t60);
    			append_dev(div32, div29);
    			append_dev(div32, t62);
    			append_dev(div32, div30);
    			append_dev(div32, t64);
    			append_dev(div32, div31);
    			append_dev(zoo_grid, t66);
    			append_dev(zoo_grid, div41);
    			append_dev(div41, div33);
    			append_dev(div41, t68);
    			append_dev(div41, div34);
    			append_dev(div41, t70);
    			append_dev(div41, div35);
    			append_dev(div41, t72);
    			append_dev(div41, div36);
    			append_dev(div41, t74);
    			append_dev(div41, div37);
    			append_dev(div41, t76);
    			append_dev(div41, div38);
    			append_dev(div41, t78);
    			append_dev(div41, div39);
    			append_dev(div41, t80);
    			append_dev(div41, div40);
    			append_dev(zoo_grid, t82);
    			append_dev(zoo_grid, div50);
    			append_dev(div50, div42);
    			append_dev(div50, t84);
    			append_dev(div50, div43);
    			append_dev(div50, t86);
    			append_dev(div50, div44);
    			append_dev(div50, t88);
    			append_dev(div50, div45);
    			append_dev(div50, t90);
    			append_dev(div50, div46);
    			append_dev(div50, t92);
    			append_dev(div50, div47);
    			append_dev(div50, t94);
    			append_dev(div50, div48);
    			append_dev(div50, t96);
    			append_dev(div50, div49);
    			append_dev(zoo_grid, t98);
    			append_dev(zoo_grid, zoo_select1);
    			append_dev(zoo_select1, select1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select1, null);
    			}

    			/*zoo_grid_binding*/ ctx[4](zoo_grid);
    			append_dev(div62, t99);
    			append_dev(div62, app_context0);
    			append_dev(div62, t100);
    			append_dev(div62, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t102);
    			append_dev(ul, li1);
    			append_dev(div62, t104);
    			append_dev(div62, div61);
    			append_dev(div61, div51);
    			append_dev(div51, app_form);
    			append_dev(div51, t105);
    			append_dev(div51, hr0);
    			append_dev(div51, t106);
    			append_dev(div51, app_buttons);
    			append_dev(div51, t107);
    			append_dev(div51, hr1);
    			append_dev(div51, t108);
    			append_dev(div51, app_tooltip_and_feedback);
    			append_dev(div51, t109);
    			append_dev(div51, hr2);
    			append_dev(div61, t110);
    			append_dev(div61, div57);
    			append_dev(div57, app_context1);
    			append_dev(div57, t111);
    			append_dev(div57, div52);
    			append_dev(div52, p0);
    			append_dev(p0, a0);
    			append_dev(p0, t113);
    			append_dev(div52, t114);
    			append_dev(div52, p1);
    			append_dev(p1, a1);
    			append_dev(p1, t116);
    			append_dev(div57, t117);
    			append_dev(div57, div56);
    			append_dev(div56, div53);
    			append_dev(div53, zoo_button0);
    			append_dev(zoo_button0, span0);
    			append_dev(span0, a2);
    			append_dev(div56, t119);
    			append_dev(div56, div54);
    			append_dev(div54, zoo_button1);
    			append_dev(zoo_button1, span1);
    			append_dev(span1, a3);
    			append_dev(div56, t121);
    			append_dev(div56, div55);
    			append_dev(div55, zoo_button2);
    			append_dev(zoo_button2, span2);
    			append_dev(span2, a4);
    			append_dev(div61, t123);
    			append_dev(div61, div59);
    			append_dev(div59, app_context2);
    			append_dev(div59, t124);
    			append_dev(div59, div58);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div58, null);
    			}

    			append_dev(div61, t125);
    			append_dev(div61, div60);
    			append_dev(div60, docs_button);
    			append_dev(div60, t126);
    			append_dev(div60, hr3);
    			append_dev(div60, t127);
    			append_dev(div60, docs_checkbox);
    			append_dev(div60, t128);
    			append_dev(div60, hr4);
    			append_dev(div60, t129);
    			append_dev(div60, docs_collapsable_list);
    			append_dev(div60, t130);
    			append_dev(div60, hr5);
    			append_dev(div60, t131);
    			append_dev(div60, docs_feedback);
    			append_dev(div60, t132);
    			append_dev(div60, hr6);
    			append_dev(div60, t133);
    			append_dev(div60, docs_footer);
    			append_dev(div60, t134);
    			append_dev(div60, hr7);
    			append_dev(div60, t135);
    			append_dev(div60, docs_header);
    			append_dev(div60, t136);
    			append_dev(div60, hr8);
    			append_dev(div60, t137);
    			append_dev(div60, docs_input);
    			append_dev(div60, t138);
    			append_dev(div60, hr9);
    			append_dev(div60, t139);
    			append_dev(div60, docs_link);
    			append_dev(div60, t140);
    			append_dev(div60, hr10);
    			append_dev(div60, t141);
    			append_dev(div60, docs_modal);
    			append_dev(div60, t142);
    			append_dev(div60, hr11);
    			append_dev(div60, t143);
    			append_dev(div60, docs_navigation);
    			append_dev(div60, t144);
    			append_dev(div60, hr12);
    			append_dev(div60, t145);
    			append_dev(div60, docs_radio);
    			append_dev(div60, t146);
    			append_dev(div60, hr13);
    			append_dev(div60, t147);
    			append_dev(div60, docs_searchable_select);
    			append_dev(div60, t148);
    			append_dev(div60, hr14);
    			append_dev(div60, t149);
    			append_dev(div60, docs_select);
    			append_dev(div60, t150);
    			append_dev(div60, hr15);
    			append_dev(div60, t151);
    			append_dev(div60, docs_toast);
    			append_dev(div60, t152);
    			append_dev(div60, hr16);
    			append_dev(div60, t153);
    			append_dev(div60, docs_tooltip);
    			append_dev(div60, t154);
    			append_dev(div60, hr17);
    			append_dev(div60, t155);
    			append_dev(div60, docs_theming);
    			append_dev(div60, t156);
    			append_dev(div60, hr18);
    			append_dev(div62, t157);
    			append_dev(div62, zoo_footer);
    			/*zoo_footer_binding*/ ctx[5](zoo_footer);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*possibleNumberOfItems*/ 4) {
    				each_value_1 = /*possibleNumberOfItems*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*doclinks*/ 8) {
    				each_value = /*doclinks*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div58, null);
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
    			if (detaching) detach_dev(div62);
    			destroy_each(each_blocks_1, detaching);
    			/*zoo_grid_binding*/ ctx[4](null);
    			destroy_each(each_blocks, detaching);
    			/*zoo_footer_binding*/ ctx[5](null);
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
    	let possibleNumberOfItems = [5, 10, 25, 100];
    	let zooGrid;
    	let footer;

    	let doclinks = [
    		{
    			href: "#button-doc",
    			target: "",
    			text: "Button"
    		},
    		{
    			href: "#checkbox-doc",
    			target: "",
    			text: "Checkbox"
    		},
    		{
    			href: "#collapsable-list-doc",
    			target: "",
    			text: "Collapsable List"
    		},
    		{
    			href: "#feedback-doc",
    			target: "",
    			text: "Feedback"
    		},
    		{
    			href: "#footer-doc",
    			target: "",
    			text: "Footer"
    		},
    		{
    			href: "#header-doc",
    			target: "",
    			text: "Header"
    		},
    		{
    			href: "#input-doc",
    			target: "",
    			text: "Input"
    		},
    		{
    			href: "#link-doc",
    			target: "",
    			text: "Link"
    		},
    		{
    			href: "#modal-doc",
    			target: "",
    			text: "Modal"
    		},
    		{
    			href: "#navigation-doc",
    			target: "",
    			text: "Navigation"
    		},
    		{
    			href: "#radio-doc",
    			target: "",
    			text: "Radio"
    		},
    		{
    			href: "#searchable-select-doc",
    			target: "",
    			text: "Searchable select"
    		},
    		{
    			href: "#select-doc",
    			target: "",
    			text: "Select"
    		},
    		{
    			href: "#toast-doc",
    			target: "",
    			text: "Toast"
    		},
    		{
    			href: "#tooltip-doc",
    			target: "",
    			text: "Tooltip"
    		},
    		{
    			href: "#theming-doc",
    			target: "",
    			text: "Theming"
    		}
    	];

    	onMount(() => {
    		$$invalidate(
    			1,
    			footer.footerlinks = [
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
    			footer
    		);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function zoo_grid_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, zooGrid = $$value);
    		});
    	}

    	function zoo_footer_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, footer = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		possibleNumberOfItems,
    		zooGrid,
    		footer,
    		doclinks
    	});

    	$$self.$inject_state = $$props => {
    		if ("possibleNumberOfItems" in $$props) $$invalidate(2, possibleNumberOfItems = $$props.possibleNumberOfItems);
    		if ("zooGrid" in $$props) $$invalidate(0, zooGrid = $$props.zooGrid);
    		if ("footer" in $$props) $$invalidate(1, footer = $$props.footer);
    		if ("doclinks" in $$props) $$invalidate(3, doclinks = $$props.doclinks);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		zooGrid,
    		footer,
    		possibleNumberOfItems,
    		doclinks,
    		zoo_grid_binding,
    		zoo_footer_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1iv82ik-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
