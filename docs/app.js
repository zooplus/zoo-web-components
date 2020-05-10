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
    	style.id = "svelte-2gt4v3-style";
    	style.textContent = ".app.svelte-2gt4v3.svelte-2gt4v3{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1)}.page-content.svelte-2gt4v3.svelte-2gt4v3{position:relative;display:grid;grid-template-columns:320px 1fr;grid-gap:30px;grid-template-areas:\"overview overview\" \"caniuse caniuse\" \"spec-docs content\"}@media only screen and (max-width: 850px){.page-content.svelte-2gt4v3.svelte-2gt4v3{grid-template-areas:\"overview\" \"caniuse\" \"spec-docs\"  \"content\";grid-template-columns:minmax(320px, 90%);justify-content:center}}.what-list.svelte-2gt4v3.svelte-2gt4v3{color:var(--primary-mid, #3C9700);font-size:20px}@media only screen and (max-width: 850px){#when.svelte-2gt4v3 .desktop.svelte-2gt4v3{display:none}}#when.svelte-2gt4v3 .mobile.svelte-2gt4v3{display:none}@media only screen and (max-width: 850px){#when.svelte-2gt4v3 .mobile.svelte-2gt4v3{display:block}}#when.svelte-2gt4v3 .back-btn.svelte-2gt4v3{width:280px;margin:10px auto}#when.svelte-2gt4v3 .back-btn a.svelte-2gt4v3{text-decoration:none;color:white}.link-wrapper.svelte-2gt4v3.svelte-2gt4v3{height:auto;transition:color 0.3s, background-color 0.3s}.link-wrapper.svelte-2gt4v3.svelte-2gt4v3:hover{background-color:rgba(0, 0, 0, 0.1);color:white}.link-wrapper.svelte-2gt4v3 a.svelte-2gt4v3{color:var(--primary-mid, #3C9700);padding:12px;display:block;text-decoration:none}.left-menu.svelte-2gt4v3 .left-menu-separator.svelte-2gt4v3{margin:0}@media only screen and (max-width: 850px){.left-menu.svelte-2gt4v3.svelte-2gt4v3{display:none}}.overview.svelte-2gt4v3.svelte-2gt4v3{grid-area:overview;max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}.caniuse.svelte-2gt4v3.svelte-2gt4v3{grid-area:caniuse;width:100%;flex:1 0 auto}.caniuse.svelte-2gt4v3 p.svelte-2gt4v3{max-width:1280px;margin:0 auto}.spec-docs.svelte-2gt4v3.svelte-2gt4v3{grid-area:spec-docs;position:sticky;top:0;height:200px}.content.svelte-2gt4v3.svelte-2gt4v3{grid-area:content}hr.svelte-2gt4v3.svelte-2gt4v3{border-color:var(--primary-mid, #3C9700);margin:45px 0;opacity:0.3}.footer.svelte-2gt4v3.svelte-2gt4v3{flex-shrink:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwiYXBwXCI+XG5cdDxhcHAtaGVhZGVyPjwvYXBwLWhlYWRlcj5cblx0PGFwcC1jb250ZXh0IGlkPVwid2hhdFwiIHRleHQ9XCJXaGF0IGlzIHRoaXMgcHJvamVjdD9cIj48L2FwcC1jb250ZXh0PlxuXHQ8dWwgY2xhc3M9XCJ3aGF0LWxpc3RcIj5cblx0XHQ8bGk+XG5cdFx0XHRTZXQgb2Ygd2ViLWNvbXBvbmVudHMgd2hpY2ggY2FuIGJlIHVzZWQgaW4gYW55IG1vZGVybiBVSSBmcmFtZXdvcmsgKG9yIHdpdGhvdXQgYW55KS5cblx0XHQ8L2xpPlxuXHRcdDxsaT5cblx0XHRcdFRoZSB3ZWItY29tcG9uZW50IHNldCBpbXBsZW1lbnRzIForIHNob3Agc3R5bGUgZ3VpZGUuXG5cdFx0PC9saT5cblx0PC91bD5cblx0PGRpdiBjbGFzcz1cInBhZ2UtY29udGVudFwiPlxuXHRcdDxkaXYgY2xhc3M9XCJvdmVydmlld1wiPlxuXHRcdFx0PGFwcC1mb3JtPjwvYXBwLWZvcm0+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8YXBwLWJ1dHRvbnM+PC9hcHAtYnV0dG9ucz5cblx0XHRcdDxocj5cblx0XHRcdDxhcHAtdG9vbHRpcC1hbmQtZmVlZGJhY2s+PC9hcHAtdG9vbHRpcC1hbmQtZmVlZGJhY2s+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8YXBwLWdyaWRzPjwvYXBwLWdyaWRzPlxuXHRcdFx0PGhyPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgaWQ9XCJ3aGVuXCIgY2xhc3M9XCJjYW5pdXNlXCI+XG5cdFx0XHQ8YXBwLWNvbnRleHQgdGV4dD1cIldoZW4gY2FuIEkgdXNlIGl0P1wiIGJhY2tidG49XCJ7dHJ1ZX1cIj48L2FwcC1jb250ZXh0PlxuXHRcdFx0PGRpdiBjbGFzcz1cImRlc2t0b3BcIj5cblx0XHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJzaGFkb3dkb212MVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0XHQ8YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PXNoYWRvd2RvbXYxXCI+Q2FuIEkgVXNlIHNoYWRvd2RvbXYxPzwvYT4gRGF0YSBvbiBzdXBwb3J0IGZvciB0aGUgc2hhZG93ZG9tdjEgZmVhdHVyZSBhY3Jvc3MgdGhlIG1ham9yIGJyb3dzZXJzIGZyb20gY2FuaXVzZS5jb20uXG5cdFx0XHRcdDwvcD5cblx0XHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJjdXN0b20tZWxlbWVudHN2MVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0XHQ8YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PWN1c3RvbS1lbGVtZW50c3YxXCI+Q2FuIEkgVXNlIGN1c3RvbS1lbGVtZW50c3YxPzwvYT4gRGF0YSBvbiBzdXBwb3J0IGZvciB0aGUgY3VzdG9tLWVsZW1lbnRzdjEgZmVhdHVyZSBhY3Jvc3MgdGhlIG1ham9yIGJyb3dzZXJzIGZyb20gY2FuaXVzZS5jb20uXG5cdFx0XHRcdDwvcD5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cIm1vYmlsZVwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYmFjay1idG5cIj5cblx0XHRcdFx0XHQ8em9vLWJ1dHRvbj5cblx0XHRcdFx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1zaGFkb3dkb212MVwiIHRhcmdldD1cImFib3V0OmJsYW5rXCI+Q2FuIEkgVXNlIHNoYWRvd2RvbXYxPzwvYT48L3NwYW4+XG5cdFx0XHRcdFx0PC96b28tYnV0dG9uPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImJhY2stYnRuXCI+XG5cdFx0XHRcdFx0PHpvby1idXR0b24+XG5cdFx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPjxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9Y3VzdG9tLWVsZW1lbnRzdjFcIiB0YXJnZXQ9XCJhYm91dDpibGFua1wiPkNhbiBJIFVzZSBjdXN0b20tZWxlbWVudHN2MT88L2E+PC9zcGFuPlxuXHRcdFx0XHRcdDwvem9vLWJ1dHRvbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJiYWNrLWJ0blwiPlxuXHRcdFx0XHRcdDx6b28tYnV0dG9uPlxuXHRcdFx0XHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj48YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PXRlbXBsYXRlXCIgdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIj5DYW4gSSBVc2UgdGVtcGxhdGU/PC9hPiA8L3NwYW4+XG5cdFx0XHRcdFx0PC96b28tYnV0dG9uPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgaWQ9XCJob3dcIiBjbGFzcz1cInNwZWMtZG9jc1wiPlxuXHRcdFx0PGFwcC1jb250ZXh0IHRleHQ9XCJIb3cgY2FuIEkgdXNlIGl0P1wiIGJhY2tidG49XCJ7dHJ1ZX1cIj48L2FwcC1jb250ZXh0PlxuXHRcdFx0PGRpdiBjbGFzcz1cImxlZnQtbWVudVwiPlxuXHRcdFx0XHR7I2VhY2ggZG9jbGlua3MgYXMgbGlua31cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwibGluay13cmFwcGVyXCI+XG5cdFx0XHRcdFx0XHQ8YSBocmVmPVwie2xpbmsuaHJlZn1cIiB0YXJnZXQ9XCJ7bGluay50YXJnZXR9XCI+e2xpbmsudGV4dH08L2E+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGhyIGNsYXNzPVwibGVmdC1tZW51LXNlcGFyYXRvclwiPlxuXHRcdFx0XHR7L2VhY2h9XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuXHRcdFx0PGRvY3MtYnV0dG9uICBpZD1cImJ1dHRvbi1kb2NcIj48L2RvY3MtYnV0dG9uPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtY2hlY2tib3ggaWQ9XCJjaGVja2JveC1kb2NcIj48L2RvY3MtY2hlY2tib3g+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1jb2xsYXBzYWJsZS1saXN0IGlkPVwiY29sbGFwc2FibGUtbGlzdC1kb2NcIj48L2RvY3MtY29sbGFwc2FibGUtbGlzdD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWZlZWRiYWNrIGlkPVwiZmVlZGJhY2stZG9jXCI+PC9kb2NzLWZlZWRiYWNrPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtZm9vdGVyIGlkPVwiZm9vdGVyLWRvY1wiPjwvZG9jcy1mb290ZXI+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1oZWFkZXIgaWQ9XCJoZWFkZXItZG9jXCI+PC9kb2NzLWhlYWRlcj5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWlucHV0IGlkPVwiaW5wdXQtZG9jXCI+PC9kb2NzLWlucHV0PlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtbGluayBpZD1cImxpbmstZG9jXCI+PC9kb2NzLWxpbms+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1tb2RhbCBpZD1cIm1vZGFsLWRvY1wiPjwvZG9jcy1tb2RhbD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLW5hdmlnYXRpb24gaWQ9XCJuYXZpZ2F0aW9uLWRvY1wiPjwvZG9jcy1uYXZpZ2F0aW9uPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtcmFkaW8gaWQ9XCJyYWRpby1kb2NcIj48L2RvY3MtcmFkaW8+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1zZWFyY2hhYmxlLXNlbGVjdCBpZD1cInNlYXJjaGFibGUtc2VsZWN0LWRvY1wiPjwvZG9jcy1zZWFyY2hhYmxlLXNlbGVjdD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLXNlbGVjdCBpZD1cInNlbGVjdC1kb2NcIj48L2RvY3Mtc2VsZWN0PlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtdG9hc3QgaWQ9XCJ0b2FzdC1kb2NcIj48L2RvY3MtdG9hc3Q+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy10b29sdGlwIGlkPVwidG9vbHRpcC1kb2NcIj48L2RvY3MtdG9vbHRpcD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLXRoZW1pbmcgaWQ9XCJ0aGVtaW5nLWRvY1wiPjwvZG9jcy10aGVtaW5nPlxuXHRcdFx0PGhyPlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5cblx0PHpvby1mb290ZXIgY2xhc3M9XCJmb290ZXJcIiBiaW5kOnRoaXM9e2Zvb3Rlcn0gY29weXJpZ2h0PVwiem9vcGx1cyBBR1wiPjwvem9vLWZvb3Rlcj4gXG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uYXBwIHtcbiAgbWFyZ2luOiAwIGF1dG87XG4gIGhlaWdodDogMTAwJTtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgYm94LXNoYWRvdzogMCA0cHggMTVweCAwIHJnYmEoMCwgMCwgMCwgMC4xKTsgfVxuXG4ucGFnZS1jb250ZW50IHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBkaXNwbGF5OiBncmlkO1xuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDMyMHB4IDFmcjtcbiAgZ3JpZC1nYXA6IDMwcHg7XG4gIGdyaWQtdGVtcGxhdGUtYXJlYXM6IFwib3ZlcnZpZXcgb3ZlcnZpZXdcIiBcImNhbml1c2UgY2FuaXVzZVwiIFwic3BlYy1kb2NzIGNvbnRlbnRcIjsgfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gICAgLnBhZ2UtY29udGVudCB7XG4gICAgICBncmlkLXRlbXBsYXRlLWFyZWFzOiBcIm92ZXJ2aWV3XCIgXCJjYW5pdXNlXCIgXCJzcGVjLWRvY3NcIiAgXCJjb250ZW50XCI7XG4gICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IG1pbm1heCgzMjBweCwgOTAlKTtcbiAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyOyB9IH1cblxuLndoYXQtbGlzdCB7XG4gIGNvbG9yOiB2YXIoLS1wcmltYXJ5LW1pZCwgIzNDOTcwMCk7XG4gIGZvbnQtc2l6ZTogMjBweDsgfVxuXG5AbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gICN3aGVuIC5kZXNrdG9wIHtcbiAgICBkaXNwbGF5OiBub25lOyB9IH1cblxuI3doZW4gLm1vYmlsZSB7XG4gIGRpc3BsYXk6IG5vbmU7IH1cbiAgQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA4NTBweCkge1xuICAgICN3aGVuIC5tb2JpbGUge1xuICAgICAgZGlzcGxheTogYmxvY2s7IH0gfVxuXG4jd2hlbiAuYmFjay1idG4ge1xuICB3aWR0aDogMjgwcHg7XG4gIG1hcmdpbjogMTBweCBhdXRvOyB9XG4gICN3aGVuIC5iYWNrLWJ0biBhIHtcbiAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgY29sb3I6IHdoaXRlOyB9XG5cbi5saW5rLXdyYXBwZXIge1xuICBoZWlnaHQ6IGF1dG87XG4gIHRyYW5zaXRpb246IGNvbG9yIDAuM3MsIGJhY2tncm91bmQtY29sb3IgMC4zczsgfVxuICAubGluay13cmFwcGVyOmhvdmVyIHtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMSk7XG4gICAgY29sb3I6IHdoaXRlOyB9XG4gIC5saW5rLXdyYXBwZXIgYSB7XG4gICAgY29sb3I6IHZhcigtLXByaW1hcnktbWlkLCAjM0M5NzAwKTtcbiAgICBwYWRkaW5nOiAxMnB4O1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTsgfVxuXG4ubGVmdC1tZW51IC5sZWZ0LW1lbnUtc2VwYXJhdG9yIHtcbiAgbWFyZ2luOiAwOyB9XG5cbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogODUwcHgpIHtcbiAgLmxlZnQtbWVudSB7XG4gICAgZGlzcGxheTogbm9uZTsgfSB9XG5cbi5vdmVydmlldyB7XG4gIGdyaWQtYXJlYTogb3ZlcnZpZXc7XG4gIG1heC13aWR0aDogMTI4MHB4O1xuICB3aWR0aDogMTAwJTtcbiAgZmxleDogMSAwIGF1dG87XG4gIG1hcmdpbjogMCBhdXRvOyB9XG5cbi5jYW5pdXNlIHtcbiAgZ3JpZC1hcmVhOiBjYW5pdXNlO1xuICB3aWR0aDogMTAwJTtcbiAgZmxleDogMSAwIGF1dG87IH1cblxuLmNhbml1c2UgcCB7XG4gIG1heC13aWR0aDogMTI4MHB4O1xuICBtYXJnaW46IDAgYXV0bzsgfVxuXG4uc3BlYy1kb2NzIHtcbiAgZ3JpZC1hcmVhOiBzcGVjLWRvY3M7XG4gIHBvc2l0aW9uOiBzdGlja3k7XG4gIHRvcDogMDtcbiAgaGVpZ2h0OiAyMDBweDsgfVxuXG4uY29udGVudCB7XG4gIGdyaWQtYXJlYTogY29udGVudDsgfVxuXG5ociB7XG4gIGJvcmRlci1jb2xvcjogdmFyKC0tcHJpbWFyeS1taWQsICMzQzk3MDApO1xuICBtYXJnaW46IDQ1cHggMDtcbiAgb3BhY2l0eTogMC4zOyB9XG5cbi5mb290ZXIge1xuICBmbGV4LXNocmluazogMDsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xuXHRsZXQgZm9vdGVyO1xuXHRsZXQgZG9jbGlua3MgPSBbXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNidXR0b24tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnQnV0dG9uJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNjaGVja2JveC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdDaGVja2JveCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjY29sbGFwc2FibGUtbGlzdC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdDb2xsYXBzYWJsZSBMaXN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNmZWVkYmFjay1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdGZWVkYmFjaydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjZm9vdGVyLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ0Zvb3Rlcidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjaGVhZGVyLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ0hlYWRlcidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjaW5wdXQtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnSW5wdXQnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI2xpbmstZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTGluaydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjbW9kYWwtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTW9kYWwnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI25hdmlnYXRpb24tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTmF2aWdhdGlvbidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjcmFkaW8tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnUmFkaW8nXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI3NlYXJjaGFibGUtc2VsZWN0LWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ1NlYXJjaGFibGUgc2VsZWN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNzZWxlY3QtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnU2VsZWN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyN0b2FzdC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdUb2FzdCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjdG9vbHRpcC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdUb29sdGlwJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyN0aGVtaW5nLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ1RoZW1pbmcnXG5cdFx0fVxuXHRdO1xuXHRvbk1vdW50KCgpID0+IHtcblx0XHRmb290ZXIuZm9vdGVybGlua3MgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdGhyZWY6ICdodHRwczovL2dpdGh1Yi5jb20vem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxuXHRcdFx0XHR0ZXh0OiAnR2l0aHViJyxcblx0XHRcdFx0dHlwZTogJ3N0YW5kYXJkJ1xuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL0B6b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXG5cdFx0XHRcdHRleHQ6ICdOUE0nLFxuXHRcdFx0XHR0eXBlOiAnc3RhbmRhcmQnXG5cdFx0XHR9XG5cdFx0XTtcblx0fSk7XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBbUd3QixJQUFJLDRCQUFDLENBQUMsQUFDNUIsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLENBQ2QsTUFBTSxDQUFFLElBQUksQ0FDWixPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxNQUFNLENBQ3RCLFVBQVUsQ0FBRSxDQUFDLENBQUMsR0FBRyxD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 */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (54:4) {#each doclinks as link}
    function create_each_block(ctx) {
    	let div;
    	let a;
    	let t0_value = /*link*/ ctx[3].text + "";
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
    			attr_dev(a, "href", a_href_value = /*link*/ ctx[3].href);
    			attr_dev(a, "target", a_target_value = /*link*/ ctx[3].target);
    			attr_dev(a, "class", "svelte-2gt4v3");
    			add_location(a, file, 55, 6, 2216);
    			attr_dev(div, "class", "link-wrapper svelte-2gt4v3");
    			add_location(div, file, 54, 5, 2183);
    			attr_dev(hr, "class", "left-menu-separator svelte-2gt4v3");
    			add_location(hr, file, 57, 5, 2294);
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
    		source: "(54:4) {#each doclinks as link}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div11;
    	let app_header;
    	let t0;
    	let app_context0;
    	let t1;
    	let ul;
    	let li0;
    	let t3;
    	let li1;
    	let t5;
    	let div10;
    	let div0;
    	let app_form;
    	let t6;
    	let hr0;
    	let t7;
    	let app_buttons;
    	let t8;
    	let hr1;
    	let t9;
    	let app_tooltip_and_feedback;
    	let t10;
    	let hr2;
    	let t11;
    	let app_grids;
    	let t12;
    	let hr3;
    	let t13;
    	let div6;
    	let app_context1;
    	let app_context1_backbtn_value;
    	let t14;
    	let div1;
    	let p0;
    	let a0;
    	let t16;
    	let t17;
    	let p1;
    	let a1;
    	let t19;
    	let t20;
    	let div5;
    	let div2;
    	let zoo_button0;
    	let span0;
    	let a2;
    	let t22;
    	let div3;
    	let zoo_button1;
    	let span1;
    	let a3;
    	let t24;
    	let div4;
    	let zoo_button2;
    	let span2;
    	let a4;
    	let t26;
    	let div8;
    	let app_context2;
    	let app_context2_backbtn_value;
    	let t27;
    	let div7;
    	let t28;
    	let div9;
    	let docs_button;
    	let t29;
    	let hr4;
    	let t30;
    	let docs_checkbox;
    	let t31;
    	let hr5;
    	let t32;
    	let docs_collapsable_list;
    	let t33;
    	let hr6;
    	let t34;
    	let docs_feedback;
    	let t35;
    	let hr7;
    	let t36;
    	let docs_footer;
    	let t37;
    	let hr8;
    	let t38;
    	let docs_header;
    	let t39;
    	let hr9;
    	let t40;
    	let docs_input;
    	let t41;
    	let hr10;
    	let t42;
    	let docs_link;
    	let t43;
    	let hr11;
    	let t44;
    	let docs_modal;
    	let t45;
    	let hr12;
    	let t46;
    	let docs_navigation;
    	let t47;
    	let hr13;
    	let t48;
    	let docs_radio;
    	let t49;
    	let hr14;
    	let t50;
    	let docs_searchable_select;
    	let t51;
    	let hr15;
    	let t52;
    	let docs_select;
    	let t53;
    	let hr16;
    	let t54;
    	let docs_toast;
    	let t55;
    	let hr17;
    	let t56;
    	let docs_tooltip;
    	let t57;
    	let hr18;
    	let t58;
    	let docs_theming;
    	let t59;
    	let hr19;
    	let t60;
    	let zoo_footer;
    	let each_value = /*doclinks*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			app_header = element("app-header");
    			t0 = space();
    			app_context0 = element("app-context");
    			t1 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Set of web-components which can be used in any modern UI framework (or without any).";
    			t3 = space();
    			li1 = element("li");
    			li1.textContent = "The web-component set implements Z+ shop style guide.";
    			t5 = space();
    			div10 = element("div");
    			div0 = element("div");
    			app_form = element("app-form");
    			t6 = space();
    			hr0 = element("hr");
    			t7 = space();
    			app_buttons = element("app-buttons");
    			t8 = space();
    			hr1 = element("hr");
    			t9 = space();
    			app_tooltip_and_feedback = element("app-tooltip-and-feedback");
    			t10 = space();
    			hr2 = element("hr");
    			t11 = space();
    			app_grids = element("app-grids");
    			t12 = space();
    			hr3 = element("hr");
    			t13 = space();
    			div6 = element("div");
    			app_context1 = element("app-context");
    			t14 = space();
    			div1 = element("div");
    			p0 = element("p");
    			a0 = element("a");
    			a0.textContent = "Can I Use shadowdomv1?";
    			t16 = text(" Data on support for the shadowdomv1 feature across the major browsers from caniuse.com.");
    			t17 = space();
    			p1 = element("p");
    			a1 = element("a");
    			a1.textContent = "Can I Use custom-elementsv1?";
    			t19 = text(" Data on support for the custom-elementsv1 feature across the major browsers from caniuse.com.");
    			t20 = space();
    			div5 = element("div");
    			div2 = element("div");
    			zoo_button0 = element("zoo-button");
    			span0 = element("span");
    			a2 = element("a");
    			a2.textContent = "Can I Use shadowdomv1?";
    			t22 = space();
    			div3 = element("div");
    			zoo_button1 = element("zoo-button");
    			span1 = element("span");
    			a3 = element("a");
    			a3.textContent = "Can I Use custom-elementsv1?";
    			t24 = space();
    			div4 = element("div");
    			zoo_button2 = element("zoo-button");
    			span2 = element("span");
    			a4 = element("a");
    			a4.textContent = "Can I Use template?";
    			t26 = space();
    			div8 = element("div");
    			app_context2 = element("app-context");
    			t27 = space();
    			div7 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t28 = space();
    			div9 = element("div");
    			docs_button = element("docs-button");
    			t29 = space();
    			hr4 = element("hr");
    			t30 = space();
    			docs_checkbox = element("docs-checkbox");
    			t31 = space();
    			hr5 = element("hr");
    			t32 = space();
    			docs_collapsable_list = element("docs-collapsable-list");
    			t33 = space();
    			hr6 = element("hr");
    			t34 = space();
    			docs_feedback = element("docs-feedback");
    			t35 = space();
    			hr7 = element("hr");
    			t36 = space();
    			docs_footer = element("docs-footer");
    			t37 = space();
    			hr8 = element("hr");
    			t38 = space();
    			docs_header = element("docs-header");
    			t39 = space();
    			hr9 = element("hr");
    			t40 = space();
    			docs_input = element("docs-input");
    			t41 = space();
    			hr10 = element("hr");
    			t42 = space();
    			docs_link = element("docs-link");
    			t43 = space();
    			hr11 = element("hr");
    			t44 = space();
    			docs_modal = element("docs-modal");
    			t45 = space();
    			hr12 = element("hr");
    			t46 = space();
    			docs_navigation = element("docs-navigation");
    			t47 = space();
    			hr13 = element("hr");
    			t48 = space();
    			docs_radio = element("docs-radio");
    			t49 = space();
    			hr14 = element("hr");
    			t50 = space();
    			docs_searchable_select = element("docs-searchable-select");
    			t51 = space();
    			hr15 = element("hr");
    			t52 = space();
    			docs_select = element("docs-select");
    			t53 = space();
    			hr16 = element("hr");
    			t54 = space();
    			docs_toast = element("docs-toast");
    			t55 = space();
    			hr17 = element("hr");
    			t56 = space();
    			docs_tooltip = element("docs-tooltip");
    			t57 = space();
    			hr18 = element("hr");
    			t58 = space();
    			docs_theming = element("docs-theming");
    			t59 = space();
    			hr19 = element("hr");
    			t60 = space();
    			zoo_footer = element("zoo-footer");
    			add_location(app_header, file, 1, 1, 19);
    			set_custom_element_data(app_context0, "id", "what");
    			set_custom_element_data(app_context0, "text", "What is this project?");
    			add_location(app_context0, file, 2, 1, 46);
    			add_location(li0, file, 4, 2, 139);
    			add_location(li1, file, 7, 2, 242);
    			attr_dev(ul, "class", "what-list svelte-2gt4v3");
    			add_location(ul, file, 3, 1, 114);
    			add_location(app_form, file, 13, 3, 375);
    			attr_dev(hr0, "class", "svelte-2gt4v3");
    			add_location(hr0, file, 14, 3, 400);
    			add_location(app_buttons, file, 15, 3, 408);
    			attr_dev(hr1, "class", "svelte-2gt4v3");
    			add_location(hr1, file, 16, 3, 439);
    			add_location(app_tooltip_and_feedback, file, 17, 3, 447);
    			attr_dev(hr2, "class", "svelte-2gt4v3");
    			add_location(hr2, file, 18, 3, 504);
    			add_location(app_grids, file, 19, 3, 512);
    			attr_dev(hr3, "class", "svelte-2gt4v3");
    			add_location(hr3, file, 20, 3, 539);
    			attr_dev(div0, "class", "overview svelte-2gt4v3");
    			add_location(div0, file, 12, 2, 349);
    			set_custom_element_data(app_context1, "text", "When can I use it?");
    			set_custom_element_data(app_context1, "backbtn", app_context1_backbtn_value = true);
    			add_location(app_context1, file, 23, 3, 590);
    			attr_dev(a0, "href", "http://caniuse.com/#feat=shadowdomv1");
    			attr_dev(a0, "class", "svelte-2gt4v3");
    			add_location(a0, file, 26, 5, 822);
    			attr_dev(p0, "class", "ciu_embed svelte-2gt4v3");
    			attr_dev(p0, "data-feature", "shadowdomv1");
    			attr_dev(p0, "data-periods", "future_1,current,past_1,past_2");
    			attr_dev(p0, "data-accessible-colours", "false");
    			add_location(p0, file, 25, 4, 690);
    			attr_dev(a1, "href", "http://caniuse.com/#feat=custom-elementsv1");
    			attr_dev(a1, "class", "svelte-2gt4v3");
    			add_location(a1, file, 29, 5, 1135);
    			attr_dev(p1, "class", "ciu_embed svelte-2gt4v3");
    			attr_dev(p1, "data-feature", "custom-elementsv1");
    			attr_dev(p1, "data-periods", "future_1,current,past_1,past_2");
    			attr_dev(p1, "data-accessible-colours", "false");
    			add_location(p1, file, 28, 4, 997);
    			attr_dev(div1, "class", "desktop svelte-2gt4v3");
    			add_location(div1, file, 24, 3, 664);
    			attr_dev(a2, "href", "http://caniuse.com/#feat=shadowdomv1");
    			attr_dev(a2, "target", "about:blank");
    			attr_dev(a2, "class", "svelte-2gt4v3");
    			add_location(a2, file, 35, 33, 1436);
    			attr_dev(span0, "slot", "buttoncontent");
    			add_location(span0, file, 35, 6, 1409);
    			add_location(zoo_button0, file, 34, 5, 1390);
    			attr_dev(div2, "class", "back-btn svelte-2gt4v3");
    			add_location(div2, file, 33, 4, 1362);
    			attr_dev(a3, "href", "http://caniuse.com/#feat=custom-elementsv1");
    			attr_dev(a3, "target", "about:blank");
    			attr_dev(a3, "class", "svelte-2gt4v3");
    			add_location(a3, file, 40, 33, 1646);
    			attr_dev(span1, "slot", "buttoncontent");
    			add_location(span1, file, 40, 6, 1619);
    			add_location(zoo_button1, file, 39, 5, 1600);
    			attr_dev(div3, "class", "back-btn svelte-2gt4v3");
    			add_location(div3, file, 38, 4, 1572);
    			attr_dev(a4, "href", "http://caniuse.com/#feat=template");
    			attr_dev(a4, "target", "about:blank");
    			attr_dev(a4, "class", "svelte-2gt4v3");
    			add_location(a4, file, 45, 33, 1868);
    			attr_dev(span2, "slot", "buttoncontent");
    			add_location(span2, file, 45, 6, 1841);
    			add_location(zoo_button2, file, 44, 5, 1822);
    			attr_dev(div4, "class", "back-btn svelte-2gt4v3");
    			add_location(div4, file, 43, 4, 1794);
    			attr_dev(div5, "class", "mobile svelte-2gt4v3");
    			add_location(div5, file, 32, 3, 1337);
    			attr_dev(div6, "id", "when");
    			attr_dev(div6, "class", "caniuse svelte-2gt4v3");
    			add_location(div6, file, 22, 2, 555);
    			set_custom_element_data(app_context2, "text", "How can I use it?");
    			set_custom_element_data(app_context2, "backbtn", app_context2_backbtn_value = true);
    			add_location(app_context2, file, 51, 3, 2052);
    			attr_dev(div7, "class", "left-menu svelte-2gt4v3");
    			add_location(div7, file, 52, 3, 2125);
    			attr_dev(div8, "id", "how");
    			attr_dev(div8, "class", "spec-docs svelte-2gt4v3");
    			add_location(div8, file, 50, 2, 2016);
    			set_custom_element_data(docs_button, "id", "button-doc");
    			add_location(docs_button, file, 62, 3, 2385);
    			attr_dev(hr4, "class", "svelte-2gt4v3");
    			add_location(hr4, file, 63, 3, 2433);
    			set_custom_element_data(docs_checkbox, "id", "checkbox-doc");
    			add_location(docs_checkbox, file, 64, 3, 2441);
    			attr_dev(hr5, "class", "svelte-2gt4v3");
    			add_location(hr5, file, 65, 3, 2494);
    			set_custom_element_data(docs_collapsable_list, "id", "collapsable-list-doc");
    			add_location(docs_collapsable_list, file, 66, 3, 2502);
    			attr_dev(hr6, "class", "svelte-2gt4v3");
    			add_location(hr6, file, 67, 3, 2579);
    			set_custom_element_data(docs_feedback, "id", "feedback-doc");
    			add_location(docs_feedback, file, 68, 3, 2587);
    			attr_dev(hr7, "class", "svelte-2gt4v3");
    			add_location(hr7, file, 69, 3, 2640);
    			set_custom_element_data(docs_footer, "id", "footer-doc");
    			add_location(docs_footer, file, 70, 3, 2648);
    			attr_dev(hr8, "class", "svelte-2gt4v3");
    			add_location(hr8, file, 71, 3, 2695);
    			set_custom_element_data(docs_header, "id", "header-doc");
    			add_location(docs_header, file, 72, 3, 2703);
    			attr_dev(hr9, "class", "svelte-2gt4v3");
    			add_location(hr9, file, 73, 3, 2750);
    			set_custom_element_data(docs_input, "id", "input-doc");
    			add_location(docs_input, file, 74, 3, 2758);
    			attr_dev(hr10, "class", "svelte-2gt4v3");
    			add_location(hr10, file, 75, 3, 2802);
    			set_custom_element_data(docs_link, "id", "link-doc");
    			add_location(docs_link, file, 76, 3, 2810);
    			attr_dev(hr11, "class", "svelte-2gt4v3");
    			add_location(hr11, file, 77, 3, 2851);
    			set_custom_element_data(docs_modal, "id", "modal-doc");
    			add_location(docs_modal, file, 78, 3, 2859);
    			attr_dev(hr12, "class", "svelte-2gt4v3");
    			add_location(hr12, file, 79, 3, 2903);
    			set_custom_element_data(docs_navigation, "id", "navigation-doc");
    			add_location(docs_navigation, file, 80, 3, 2911);
    			attr_dev(hr13, "class", "svelte-2gt4v3");
    			add_location(hr13, file, 81, 3, 2970);
    			set_custom_element_data(docs_radio, "id", "radio-doc");
    			add_location(docs_radio, file, 82, 3, 2978);
    			attr_dev(hr14, "class", "svelte-2gt4v3");
    			add_location(hr14, file, 83, 3, 3022);
    			set_custom_element_data(docs_searchable_select, "id", "searchable-select-doc");
    			add_location(docs_searchable_select, file, 84, 3, 3030);
    			attr_dev(hr15, "class", "svelte-2gt4v3");
    			add_location(hr15, file, 85, 3, 3110);
    			set_custom_element_data(docs_select, "id", "select-doc");
    			add_location(docs_select, file, 86, 3, 3118);
    			attr_dev(hr16, "class", "svelte-2gt4v3");
    			add_location(hr16, file, 87, 3, 3165);
    			set_custom_element_data(docs_toast, "id", "toast-doc");
    			add_location(docs_toast, file, 88, 3, 3173);
    			attr_dev(hr17, "class", "svelte-2gt4v3");
    			add_location(hr17, file, 89, 3, 3217);
    			set_custom_element_data(docs_tooltip, "id", "tooltip-doc");
    			add_location(docs_tooltip, file, 90, 3, 3225);
    			attr_dev(hr18, "class", "svelte-2gt4v3");
    			add_location(hr18, file, 91, 3, 3275);
    			set_custom_element_data(docs_theming, "id", "theming-doc");
    			add_location(docs_theming, file, 92, 3, 3283);
    			attr_dev(hr19, "class", "svelte-2gt4v3");
    			add_location(hr19, file, 93, 3, 3333);
    			attr_dev(div9, "class", "content svelte-2gt4v3");
    			add_location(div9, file, 61, 2, 2360);
    			attr_dev(div10, "class", "page-content svelte-2gt4v3");
    			add_location(div10, file, 11, 1, 320);
    			set_custom_element_data(zoo_footer, "class", "footer svelte-2gt4v3");
    			set_custom_element_data(zoo_footer, "copyright", "zooplus AG");
    			add_location(zoo_footer, file, 96, 1, 3356);
    			attr_dev(div11, "class", "app svelte-2gt4v3");
    			add_location(div11, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, app_header);
    			append_dev(div11, t0);
    			append_dev(div11, app_context0);
    			append_dev(div11, t1);
    			append_dev(div11, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(div11, t5);
    			append_dev(div11, div10);
    			append_dev(div10, div0);
    			append_dev(div0, app_form);
    			append_dev(div0, t6);
    			append_dev(div0, hr0);
    			append_dev(div0, t7);
    			append_dev(div0, app_buttons);
    			append_dev(div0, t8);
    			append_dev(div0, hr1);
    			append_dev(div0, t9);
    			append_dev(div0, app_tooltip_and_feedback);
    			append_dev(div0, t10);
    			append_dev(div0, hr2);
    			append_dev(div0, t11);
    			append_dev(div0, app_grids);
    			append_dev(div0, t12);
    			append_dev(div0, hr3);
    			append_dev(div10, t13);
    			append_dev(div10, div6);
    			append_dev(div6, app_context1);
    			append_dev(div6, t14);
    			append_dev(div6, div1);
    			append_dev(div1, p0);
    			append_dev(p0, a0);
    			append_dev(p0, t16);
    			append_dev(div1, t17);
    			append_dev(div1, p1);
    			append_dev(p1, a1);
    			append_dev(p1, t19);
    			append_dev(div6, t20);
    			append_dev(div6, div5);
    			append_dev(div5, div2);
    			append_dev(div2, zoo_button0);
    			append_dev(zoo_button0, span0);
    			append_dev(span0, a2);
    			append_dev(div5, t22);
    			append_dev(div5, div3);
    			append_dev(div3, zoo_button1);
    			append_dev(zoo_button1, span1);
    			append_dev(span1, a3);
    			append_dev(div5, t24);
    			append_dev(div5, div4);
    			append_dev(div4, zoo_button2);
    			append_dev(zoo_button2, span2);
    			append_dev(span2, a4);
    			append_dev(div10, t26);
    			append_dev(div10, div8);
    			append_dev(div8, app_context2);
    			append_dev(div8, t27);
    			append_dev(div8, div7);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div7, null);
    			}

    			append_dev(div10, t28);
    			append_dev(div10, div9);
    			append_dev(div9, docs_button);
    			append_dev(div9, t29);
    			append_dev(div9, hr4);
    			append_dev(div9, t30);
    			append_dev(div9, docs_checkbox);
    			append_dev(div9, t31);
    			append_dev(div9, hr5);
    			append_dev(div9, t32);
    			append_dev(div9, docs_collapsable_list);
    			append_dev(div9, t33);
    			append_dev(div9, hr6);
    			append_dev(div9, t34);
    			append_dev(div9, docs_feedback);
    			append_dev(div9, t35);
    			append_dev(div9, hr7);
    			append_dev(div9, t36);
    			append_dev(div9, docs_footer);
    			append_dev(div9, t37);
    			append_dev(div9, hr8);
    			append_dev(div9, t38);
    			append_dev(div9, docs_header);
    			append_dev(div9, t39);
    			append_dev(div9, hr9);
    			append_dev(div9, t40);
    			append_dev(div9, docs_input);
    			append_dev(div9, t41);
    			append_dev(div9, hr10);
    			append_dev(div9, t42);
    			append_dev(div9, docs_link);
    			append_dev(div9, t43);
    			append_dev(div9, hr11);
    			append_dev(div9, t44);
    			append_dev(div9, docs_modal);
    			append_dev(div9, t45);
    			append_dev(div9, hr12);
    			append_dev(div9, t46);
    			append_dev(div9, docs_navigation);
    			append_dev(div9, t47);
    			append_dev(div9, hr13);
    			append_dev(div9, t48);
    			append_dev(div9, docs_radio);
    			append_dev(div9, t49);
    			append_dev(div9, hr14);
    			append_dev(div9, t50);
    			append_dev(div9, docs_searchable_select);
    			append_dev(div9, t51);
    			append_dev(div9, hr15);
    			append_dev(div9, t52);
    			append_dev(div9, docs_select);
    			append_dev(div9, t53);
    			append_dev(div9, hr16);
    			append_dev(div9, t54);
    			append_dev(div9, docs_toast);
    			append_dev(div9, t55);
    			append_dev(div9, hr17);
    			append_dev(div9, t56);
    			append_dev(div9, docs_tooltip);
    			append_dev(div9, t57);
    			append_dev(div9, hr18);
    			append_dev(div9, t58);
    			append_dev(div9, docs_theming);
    			append_dev(div9, t59);
    			append_dev(div9, hr19);
    			append_dev(div11, t60);
    			append_dev(div11, zoo_footer);
    			/*zoo_footer_binding*/ ctx[2](zoo_footer);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*doclinks*/ 2) {
    				each_value = /*doclinks*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div7, null);
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
    			if (detaching) detach_dev(div11);
    			destroy_each(each_blocks, detaching);
    			/*zoo_footer_binding*/ ctx[2](null);
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
    			0,
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

    	function zoo_footer_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, footer = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({ onMount, footer, doclinks });

    	$$self.$inject_state = $$props => {
    		if ("footer" in $$props) $$invalidate(0, footer = $$props.footer);
    		if ("doclinks" in $$props) $$invalidate(1, doclinks = $$props.doclinks);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [footer, doclinks, zoo_footer_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-2gt4v3-style")) add_css();
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
