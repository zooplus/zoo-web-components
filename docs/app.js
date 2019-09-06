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
    }

    /* src\App.svelte generated by Svelte v3.9.0 */

    const file = "src\\App.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = 'svelte-1uvrh83-style';
    	style.textContent = ".app.svelte-1uvrh83{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:15px 0px 40px 0px rgba(85, 85, 85, 0.3), -15px 0px 40px 0px rgba(85, 85, 85, 0.3)}.page-content.svelte-1uvrh83{position:relative;display:grid;grid-template-columns:320px 1fr;grid-gap:30px;grid-template-areas:\"overview overview\"\r \"caniuse caniuse\"\r \"spec-docs content\"}@media only screen and (max-width: 850px){.page-content.svelte-1uvrh83{grid-template-areas:\"overview\"\r \"caniuse\"\r \"spec-docs\" \r \"content\";grid-template-columns:minmax(320px, 90%);justify-content:center}}.what-list.svelte-1uvrh83{color:var(--main-color, #3C9700);font-size:20px}@media only screen and (max-width: 850px){#when.svelte-1uvrh83 .desktop.svelte-1uvrh83{display:none}}#when.svelte-1uvrh83 .mobile.svelte-1uvrh83{display:none}@media only screen and (max-width: 850px){#when.svelte-1uvrh83 .mobile.svelte-1uvrh83{display:block}}#when.svelte-1uvrh83 .back-btn.svelte-1uvrh83{width:280px;margin:10px auto}#when.svelte-1uvrh83 .back-btn a.svelte-1uvrh83{text-decoration:none;color:white}.link-wrapper.svelte-1uvrh83{height:auto;transition:color 0.3s, background-color 0.3s}.link-wrapper.svelte-1uvrh83:hover{background-color:rgba(0, 0, 0, 0.1);color:white}.link-wrapper.svelte-1uvrh83 a.svelte-1uvrh83{color:var(--main-color, #3C9700);padding:12px;display:block;text-decoration:none}.left-menu.svelte-1uvrh83 .left-menu-separator.svelte-1uvrh83{margin:0}@media only screen and (max-width: 850px){.left-menu.svelte-1uvrh83{display:none}}.overview.svelte-1uvrh83{grid-area:overview;max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}.caniuse.svelte-1uvrh83{grid-area:caniuse;width:100%;flex:1 0 auto}.caniuse.svelte-1uvrh83 p.svelte-1uvrh83{max-width:1280px;margin:0 auto}.spec-docs.svelte-1uvrh83{grid-area:spec-docs;position:sticky;top:0;height:200px}.content.svelte-1uvrh83{grid-area:content}hr.svelte-1uvrh83{border-color:var(--main-color, #3C9700);margin:45px 0;opacity:0.3}.footer.svelte-1uvrh83{flex-shrink:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwiYXBwXCI+XHJcblx0PGFwcC1oZWFkZXI+PC9hcHAtaGVhZGVyPlxyXG5cdDxhcHAtY29udGV4dCBpZD1cIndoYXRcIiB0ZXh0PVwiV2hhdCBpcyB0aGlzIHByb2plY3Q/XCI+PC9hcHAtY29udGV4dD5cclxuXHQ8dWwgY2xhc3M9XCJ3aGF0LWxpc3RcIj5cclxuXHRcdDxsaT5cclxuXHRcdFx0U2V0IG9mIHdlYi1jb21wb25lbnRzIHdoaWNoIGNhbiBiZSB1c2VkIGluIGFueSBtb2Rlcm4gVUkgZnJhbWV3b3JrIChvciB3aXRob3V0IGFueSkuXHJcblx0XHQ8L2xpPlxyXG5cdFx0PGxpPlxyXG5cdFx0XHRUaGUgd2ViLWNvbXBvbmVudCBzZXQgaW1wbGVtZW50cyBaKyBzaG9wIHN0eWxlIGd1aWRlLlxyXG5cdFx0PC9saT5cclxuXHQ8L3VsPlxyXG5cdDxkaXYgY2xhc3M9XCJwYWdlLWNvbnRlbnRcIj5cclxuXHRcdDxkaXYgY2xhc3M9XCJvdmVydmlld1wiPlxyXG5cdFx0XHQ8YXBwLWZvcm0gaWQ9XCJhcHAtZm9ybVwiPjwvYXBwLWZvcm0+XHJcblx0XHRcdDxocj5cclxuXHRcdFx0PGFwcC1idXR0b25zIGlkPVwiYXBwLWJ1dHRvbnNcIj48L2FwcC1idXR0b25zPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxhcHAtdG9vbHRpcC1hbmQtZmVlZGJhY2sgaWQ9XCJhcHAtdG9vbHRpcC1hbmQtZmVlZGJhY2tcIj48L2FwcC10b29sdGlwLWFuZC1mZWVkYmFjaz5cclxuXHRcdFx0PGhyPlxyXG5cdFx0PC9kaXY+XHJcblx0XHQ8ZGl2IGlkPVwid2hlblwiIGNsYXNzPVwiY2FuaXVzZVwiPlxyXG5cdFx0XHQ8YXBwLWNvbnRleHQgdGV4dD1cIldoZW4gY2FuIEkgdXNlIGl0P1wiIGJhY2tidG49XCJ7dHJ1ZX1cIj48L2FwcC1jb250ZXh0PlxyXG5cdFx0XHQ8ZGl2IGNsYXNzPVwiZGVza3RvcFwiPlxyXG5cdFx0XHRcdDxwIGNsYXNzPVwiY2l1X2VtYmVkXCIgZGF0YS1mZWF0dXJlPVwic2hhZG93ZG9tdjFcIiBkYXRhLXBlcmlvZHM9XCJmdXR1cmVfMSxjdXJyZW50LHBhc3RfMSxwYXN0XzJcIiBkYXRhLWFjY2Vzc2libGUtY29sb3Vycz1cImZhbHNlXCI+XHJcblx0XHRcdFx0XHQ8YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PXNoYWRvd2RvbXYxXCI+Q2FuIEkgVXNlIHNoYWRvd2RvbXYxPzwvYT4gRGF0YSBvbiBzdXBwb3J0IGZvciB0aGUgc2hhZG93ZG9tdjEgZmVhdHVyZSBhY3Jvc3MgdGhlIG1ham9yIGJyb3dzZXJzIGZyb20gY2FuaXVzZS5jb20uXHJcblx0XHRcdFx0PC9wPlxyXG5cdFx0XHRcdDxwIGNsYXNzPVwiY2l1X2VtYmVkXCIgZGF0YS1mZWF0dXJlPVwiY3VzdG9tLWVsZW1lbnRzdjFcIiBkYXRhLXBlcmlvZHM9XCJmdXR1cmVfMSxjdXJyZW50LHBhc3RfMSxwYXN0XzJcIiBkYXRhLWFjY2Vzc2libGUtY29sb3Vycz1cImZhbHNlXCI+XHJcblx0XHRcdFx0XHQ8YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PWN1c3RvbS1lbGVtZW50c3YxXCI+Q2FuIEkgVXNlIGN1c3RvbS1lbGVtZW50c3YxPzwvYT4gRGF0YSBvbiBzdXBwb3J0IGZvciB0aGUgY3VzdG9tLWVsZW1lbnRzdjEgZmVhdHVyZSBhY3Jvc3MgdGhlIG1ham9yIGJyb3dzZXJzIGZyb20gY2FuaXVzZS5jb20uXHJcblx0XHRcdFx0PC9wPlxyXG5cdFx0XHRcdDxwIGNsYXNzPVwiY2l1X2VtYmVkXCIgZGF0YS1mZWF0dXJlPVwidGVtcGxhdGVcIiBkYXRhLXBlcmlvZHM9XCJmdXR1cmVfMSxjdXJyZW50LHBhc3RfMSxwYXN0XzJcIiBkYXRhLWFjY2Vzc2libGUtY29sb3Vycz1cImZhbHNlXCI+XHJcblx0XHRcdFx0XHQ8YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PXRlbXBsYXRlXCI+Q2FuIEkgVXNlIHRlbXBsYXRlPzwvYT4gRGF0YSBvbiBzdXBwb3J0IGZvciB0aGUgdGVtcGxhdGUgZmVhdHVyZSBhY3Jvc3MgdGhlIG1ham9yIGJyb3dzZXJzIGZyb20gY2FuaXVzZS5jb20uXHJcblx0XHRcdFx0PC9wPlxyXG5cdFx0XHQ8L2Rpdj5cclxuXHRcdFx0PGRpdiBjbGFzcz1cIm1vYmlsZVwiPlxyXG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJiYWNrLWJ0blwiPlxyXG5cdFx0XHRcdFx0PHpvby1idXR0b24+XHJcblx0XHRcdFx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1zaGFkb3dkb212MVwiIHRhcmdldD1cImFib3V0OmJsYW5rXCI+Q2FuIEkgVXNlIHNoYWRvd2RvbXYxPzwvYT48L3NwYW4+XHJcblx0XHRcdFx0XHQ8L3pvby1idXR0b24+XHJcblx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0PGRpdiBjbGFzcz1cImJhY2stYnRuXCI+XHJcblx0XHRcdFx0XHQ8em9vLWJ1dHRvbj5cclxuXHRcdFx0XHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj48YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PWN1c3RvbS1lbGVtZW50c3YxXCIgdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIj5DYW4gSSBVc2UgY3VzdG9tLWVsZW1lbnRzdjE/PC9hPjwvc3Bhbj5cclxuXHRcdFx0XHRcdDwvem9vLWJ1dHRvbj5cclxuXHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYmFjay1idG5cIj5cclxuXHRcdFx0XHRcdDx6b28tYnV0dG9uPlxyXG5cdFx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPjxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9dGVtcGxhdGVcIiB0YXJnZXQ9XCJhYm91dDpibGFua1wiPkNhbiBJIFVzZSB0ZW1wbGF0ZT88L2E+IDwvc3Bhbj5cclxuXHRcdFx0XHRcdDwvem9vLWJ1dHRvbj5cclxuXHRcdFx0XHQ8L2Rpdj5cclxuXHRcdFx0PC9kaXY+XHJcblx0XHQ8L2Rpdj5cclxuXHRcdDxkaXYgaWQ9XCJob3dcIiBjbGFzcz1cInNwZWMtZG9jc1wiPlxyXG5cdFx0XHQ8YXBwLWNvbnRleHQgdGV4dD1cIkhvdyBjYW4gSSB1c2UgaXQ/XCIgYmFja2J0bj1cInt0cnVlfVwiPjwvYXBwLWNvbnRleHQ+XHJcblx0XHRcdDxkaXYgY2xhc3M9XCJsZWZ0LW1lbnVcIj5cclxuXHRcdFx0XHR7I2VhY2ggZG9jbGlua3MgYXMgbGlua31cclxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJsaW5rLXdyYXBwZXJcIj5cclxuXHRcdFx0XHRcdFx0PGEgaHJlZj1cIntsaW5rLmhyZWZ9XCIgdGFyZ2V0PVwie2xpbmsudGFyZ2V0fVwiPntsaW5rLnRleHR9PC9hPlxyXG5cdFx0XHRcdFx0PC9kaXY+XHJcblx0XHRcdFx0XHQ8aHIgY2xhc3M9XCJsZWZ0LW1lbnUtc2VwYXJhdG9yXCI+XHJcblx0XHRcdFx0ey9lYWNofVxyXG5cdFx0XHQ8L2Rpdj5cclxuXHRcdDwvZGl2PlxyXG5cdFx0PGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cclxuXHRcdFx0PGRvY3MtYnV0dG9uICBpZD1cImJ1dHRvbi1kb2NcIj48L2RvY3MtYnV0dG9uPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLWNoZWNrYm94IGlkPVwiY2hlY2tib3gtZG9jXCI+PC9kb2NzLWNoZWNrYm94PlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLWNvbGxhcHNhYmxlLWxpc3QgaWQ9XCJjb2xsYXBzYWJsZS1saXN0LWRvY1wiPjwvZG9jcy1jb2xsYXBzYWJsZS1saXN0PlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLWZlZWRiYWNrIGlkPVwiZmVlZGJhY2stZG9jXCI+PC9kb2NzLWZlZWRiYWNrPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLWZvb3RlciBpZD1cImZvb3Rlci1kb2NcIj48L2RvY3MtZm9vdGVyPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLWhlYWRlciBpZD1cImhlYWRlci1kb2NcIj48L2RvY3MtaGVhZGVyPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLWlucHV0IGlkPVwiaW5wdXQtZG9jXCI+PC9kb2NzLWlucHV0PlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLWxpbmsgaWQ9XCJsaW5rLWRvY1wiPjwvZG9jcy1saW5rPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLW1vZGFsIGlkPVwibW9kYWwtZG9jXCI+PC9kb2NzLW1vZGFsPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLW5hdmlnYXRpb24gaWQ9XCJuYXZpZ2F0aW9uLWRvY1wiPjwvZG9jcy1uYXZpZ2F0aW9uPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLXJhZGlvIGlkPVwicmFkaW8tZG9jXCI+PC9kb2NzLXJhZGlvPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLXNlYXJjaGFibGUtc2VsZWN0IGlkPVwic2VhcmNoYWJsZS1zZWxlY3QtZG9jXCI+PC9kb2NzLXNlYXJjaGFibGUtc2VsZWN0PlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLXNlbGVjdCBpZD1cInNlbGVjdC1kb2NcIj48L2RvY3Mtc2VsZWN0PlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLXRvYXN0IGlkPVwidG9hc3QtZG9jXCI+PC9kb2NzLXRvYXN0PlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLXRvb2x0aXAgaWQ9XCJ0b29sdGlwLWRvY1wiPjwvZG9jcy10b29sdGlwPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHRcdDxkb2NzLXRoZW1pbmcgaWQ9XCJ0aGVtaW5nLWRvY1wiPjwvZG9jcy10aGVtaW5nPlxyXG5cdFx0XHQ8aHI+XHJcblx0XHQ8L2Rpdj5cclxuXHQ8L2Rpdj5cclxuXHQ8em9vLWZvb3RlciBjbGFzcz1cImZvb3RlclwiIGJpbmQ6dGhpcz17Zm9vdGVyfSBjb3B5cmlnaHQ9XCJ6b29wbHVzIEFHXCI+PC96b28tZm9vdGVyPiBcclxuPC9kaXY+XHJcblxyXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5hcHAge1xuICBtYXJnaW46IDAgYXV0bztcbiAgaGVpZ2h0OiAxMDAlO1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBib3gtc2hhZG93OiAxNXB4IDBweCA0MHB4IDBweCByZ2JhKDg1LCA4NSwgODUsIDAuMyksIC0xNXB4IDBweCA0MHB4IDBweCByZ2JhKDg1LCA4NSwgODUsIDAuMyk7IH1cblxuLnBhZ2UtY29udGVudCB7XG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgZGlzcGxheTogZ3JpZDtcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAzMjBweCAxZnI7XG4gIGdyaWQtZ2FwOiAzMHB4O1xuICBncmlkLXRlbXBsYXRlLWFyZWFzOiBcIm92ZXJ2aWV3IG92ZXJ2aWV3XCJcciBcImNhbml1c2UgY2FuaXVzZVwiXHIgXCJzcGVjLWRvY3MgY29udGVudFwiOyB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogODUwcHgpIHtcbiAgICAucGFnZS1jb250ZW50IHtcbiAgICAgIGdyaWQtdGVtcGxhdGUtYXJlYXM6IFwib3ZlcnZpZXdcIlxyIFwiY2FuaXVzZVwiXHIgXCJzcGVjLWRvY3NcIiBcciBcImNvbnRlbnRcIjtcbiAgICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogbWlubWF4KDMyMHB4LCA5MCUpO1xuICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IH0gfVxuXG4ud2hhdC1saXN0IHtcbiAgY29sb3I6IHZhcigtLW1haW4tY29sb3IsICMzQzk3MDApO1xuICBmb250LXNpemU6IDIwcHg7IH1cblxuQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA4NTBweCkge1xuICAjd2hlbiAuZGVza3RvcCB7XG4gICAgZGlzcGxheTogbm9uZTsgfSB9XG5cbiN3aGVuIC5tb2JpbGUge1xuICBkaXNwbGF5OiBub25lOyB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogODUwcHgpIHtcbiAgICAjd2hlbiAubW9iaWxlIHtcbiAgICAgIGRpc3BsYXk6IGJsb2NrOyB9IH1cblxuI3doZW4gLmJhY2stYnRuIHtcbiAgd2lkdGg6IDI4MHB4O1xuICBtYXJnaW46IDEwcHggYXV0bzsgfVxuICAjd2hlbiAuYmFjay1idG4gYSB7XG4gICAgdGV4dC1kZWNvcmF0aW9uOiBub25lO1xuICAgIGNvbG9yOiB3aGl0ZTsgfVxuXG4ubGluay13cmFwcGVyIHtcbiAgaGVpZ2h0OiBhdXRvO1xuICB0cmFuc2l0aW9uOiBjb2xvciAwLjNzLCBiYWNrZ3JvdW5kLWNvbG9yIDAuM3M7IH1cbiAgLmxpbmstd3JhcHBlcjpob3ZlciB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjEpO1xuICAgIGNvbG9yOiB3aGl0ZTsgfVxuICAubGluay13cmFwcGVyIGEge1xuICAgIGNvbG9yOiB2YXIoLS1tYWluLWNvbG9yLCAjM0M5NzAwKTtcbiAgICBwYWRkaW5nOiAxMnB4O1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTsgfVxuXG4ubGVmdC1tZW51IC5sZWZ0LW1lbnUtc2VwYXJhdG9yIHtcbiAgbWFyZ2luOiAwOyB9XG5cbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogODUwcHgpIHtcbiAgLmxlZnQtbWVudSB7XG4gICAgZGlzcGxheTogbm9uZTsgfSB9XG5cbi5vdmVydmlldyB7XG4gIGdyaWQtYXJlYTogb3ZlcnZpZXc7XG4gIG1heC13aWR0aDogMTI4MHB4O1xuICB3aWR0aDogMTAwJTtcbiAgZmxleDogMSAwIGF1dG87XG4gIG1hcmdpbjogMCBhdXRvOyB9XG5cbi5jYW5pdXNlIHtcbiAgZ3JpZC1hcmVhOiBjYW5pdXNlO1xuICB3aWR0aDogMTAwJTtcbiAgZmxleDogMSAwIGF1dG87IH1cblxuLmNhbml1c2UgcCB7XG4gIG1heC13aWR0aDogMTI4MHB4O1xuICBtYXJnaW46IDAgYXV0bzsgfVxuXG4uc3BlYy1kb2NzIHtcbiAgZ3JpZC1hcmVhOiBzcGVjLWRvY3M7XG4gIHBvc2l0aW9uOiBzdGlja3k7XG4gIHRvcDogMDtcbiAgaGVpZ2h0OiAyMDBweDsgfVxuXG4uY29udGVudCB7XG4gIGdyaWQtYXJlYTogY29udGVudDsgfVxuXG5ociB7XG4gIGJvcmRlci1jb2xvcjogdmFyKC0tbWFpbi1jb2xvciwgIzNDOTcwMCk7XG4gIG1hcmdpbjogNDVweCAwO1xuICBvcGFjaXR5OiAwLjM7IH1cblxuLmZvb3RlciB7XG4gIGZsZXgtc2hyaW5rOiAwOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cclxuXHJcbjxzY3JpcHQ+XHJcblx0aW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XHJcblx0bGV0IGZvb3RlcjtcclxuXHRsZXQgZG9jbGlua3MgPSBbXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjYnV0dG9uLWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdCdXR0b24nXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI2NoZWNrYm94LWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdDaGVja2JveCdcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjY29sbGFwc2FibGUtbGlzdC1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnQ29sbGFwc2FibGUgTGlzdCdcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjZmVlZGJhY2stZG9jJyxcclxuXHRcdFx0dGFyZ2V0OiAnJyxcclxuXHRcdFx0dGV4dDogJ0ZlZWRiYWNrJ1xyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aHJlZjogJyNmb290ZXItZG9jJyxcclxuXHRcdFx0dGFyZ2V0OiAnJyxcclxuXHRcdFx0dGV4dDogJ0Zvb3RlcidcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjaGVhZGVyLWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdIZWFkZXInXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI2lucHV0LWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdJbnB1dCdcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjbGluay1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnTGluaydcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjbW9kYWwtZG9jJyxcclxuXHRcdFx0dGFyZ2V0OiAnJyxcclxuXHRcdFx0dGV4dDogJ01vZGFsJ1xyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aHJlZjogJyNuYXZpZ2F0aW9uLWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdOYXZpZ2F0aW9uJ1xyXG5cdFx0fSxcclxuXHRcdHtcclxuXHRcdFx0aHJlZjogJyNyYWRpby1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnUmFkaW8nXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI3NlYXJjaGFibGUtc2VsZWN0LWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdTZWFyY2hhYmxlIHNlbGVjdCdcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjc2VsZWN0LWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdTZWxlY3QnXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRocmVmOiAnI3RvYXN0LWRvYycsXHJcblx0XHRcdHRhcmdldDogJycsXHJcblx0XHRcdHRleHQ6ICdUb2FzdCdcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjdG9vbHRpcC1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnVG9vbHRpcCdcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdGhyZWY6ICcjdGhlbWluZy1kb2MnLFxyXG5cdFx0XHR0YXJnZXQ6ICcnLFxyXG5cdFx0XHR0ZXh0OiAnVGhlbWluZydcclxuXHRcdH1cclxuXHRdO1xyXG5cdG9uTW91bnQoKCkgPT4ge1xyXG5cdFx0Zm9vdGVyLmZvb3RlcmxpbmtzID0gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS96b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXHJcblx0XHRcdFx0dGV4dDogJ0dpdGh1YicsXHJcblx0XHRcdFx0dHlwZTogJ3N0YW5kYXJkJ1xyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL0B6b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXHJcblx0XHRcdFx0dGV4dDogJ05QTScsXHJcblx0XHRcdFx0dHlwZTogJ3N0YW5kYXJkJ1xyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdH0pO1xyXG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBb0d3QixJQUFJLGVBQUMsQ0FBQyxBQUM1QixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FDZCxNQUFNLENBQUUsSUFBSSxDQUNaLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLE1BQU0sQ0FDdEIsVUFBVSxDQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FB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 */";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.link = list[i];
    	return child_ctx;
    }

    // (55:4) {#each doclinks as link}
    function create_each_block(ctx) {
    	var div, a, t0_value = ctx.link.text + "", t0, a_href_value, a_target_value, t1, hr;

    	return {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			hr = element("hr");
    			attr(a, "href", a_href_value = ctx.link.href);
    			attr(a, "target", a_target_value = ctx.link.target);
    			attr(a, "class", "svelte-1uvrh83");
    			add_location(a, file, 56, 6, 2593);
    			attr(div, "class", "link-wrapper svelte-1uvrh83");
    			add_location(div, file, 55, 5, 2559);
    			attr(hr, "class", "left-menu-separator svelte-1uvrh83");
    			add_location(hr, file, 58, 5, 2673);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, a);
    			append(a, t0);
    			insert(target, t1, anchor);
    			insert(target, hr, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    				detach(t1);
    				detach(hr);
    			}
    		}
    	};
    }

    function create_fragment(ctx) {
    	var div11, app_header, t0, app_context0, t1, ul, li0, t3, li1, t5, div10, div0, app_form, t6, hr0, t7, app_buttons, t8, hr1, t9, app_tooltip_and_feedback, t10, hr2, t11, div6, app_context1, t12, div1, p0, a0, t14, t15, p1, a1, t17, t18, p2, a2, t20, t21, div5, div2, zoo_button0, span0, a3, t23, div3, zoo_button1, span1, a4, t25, div4, zoo_button2, span2, a5, t27, div8, app_context2, t28, div7, t29, div9, docs_button, t30, hr3, t31, docs_checkbox, t32, hr4, t33, docs_collapsable_list, t34, hr5, t35, docs_feedback, t36, hr6, t37, docs_footer, t38, hr7, t39, docs_header, t40, hr8, t41, docs_input, t42, hr9, t43, docs_link, t44, hr10, t45, docs_modal, t46, hr11, t47, docs_navigation, t48, hr12, t49, docs_radio, t50, hr13, t51, docs_searchable_select, t52, hr14, t53, docs_select, t54, hr15, t55, docs_toast, t56, hr16, t57, docs_tooltip, t58, hr17, t59, docs_theming, t60, hr18, t61, zoo_footer;

    	var each_value = ctx.doclinks;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
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
    			div6 = element("div");
    			app_context1 = element("app-context");
    			t12 = space();
    			div1 = element("div");
    			p0 = element("p");
    			a0 = element("a");
    			a0.textContent = "Can I Use shadowdomv1?";
    			t14 = text(" Data on support for the shadowdomv1 feature across the major browsers from caniuse.com.");
    			t15 = space();
    			p1 = element("p");
    			a1 = element("a");
    			a1.textContent = "Can I Use custom-elementsv1?";
    			t17 = text(" Data on support for the custom-elementsv1 feature across the major browsers from caniuse.com.");
    			t18 = space();
    			p2 = element("p");
    			a2 = element("a");
    			a2.textContent = "Can I Use template?";
    			t20 = text(" Data on support for the template feature across the major browsers from caniuse.com.");
    			t21 = space();
    			div5 = element("div");
    			div2 = element("div");
    			zoo_button0 = element("zoo-button");
    			span0 = element("span");
    			a3 = element("a");
    			a3.textContent = "Can I Use shadowdomv1?";
    			t23 = space();
    			div3 = element("div");
    			zoo_button1 = element("zoo-button");
    			span1 = element("span");
    			a4 = element("a");
    			a4.textContent = "Can I Use custom-elementsv1?";
    			t25 = space();
    			div4 = element("div");
    			zoo_button2 = element("zoo-button");
    			span2 = element("span");
    			a5 = element("a");
    			a5.textContent = "Can I Use template?";
    			t27 = space();
    			div8 = element("div");
    			app_context2 = element("app-context");
    			t28 = space();
    			div7 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t29 = space();
    			div9 = element("div");
    			docs_button = element("docs-button");
    			t30 = space();
    			hr3 = element("hr");
    			t31 = space();
    			docs_checkbox = element("docs-checkbox");
    			t32 = space();
    			hr4 = element("hr");
    			t33 = space();
    			docs_collapsable_list = element("docs-collapsable-list");
    			t34 = space();
    			hr5 = element("hr");
    			t35 = space();
    			docs_feedback = element("docs-feedback");
    			t36 = space();
    			hr6 = element("hr");
    			t37 = space();
    			docs_footer = element("docs-footer");
    			t38 = space();
    			hr7 = element("hr");
    			t39 = space();
    			docs_header = element("docs-header");
    			t40 = space();
    			hr8 = element("hr");
    			t41 = space();
    			docs_input = element("docs-input");
    			t42 = space();
    			hr9 = element("hr");
    			t43 = space();
    			docs_link = element("docs-link");
    			t44 = space();
    			hr10 = element("hr");
    			t45 = space();
    			docs_modal = element("docs-modal");
    			t46 = space();
    			hr11 = element("hr");
    			t47 = space();
    			docs_navigation = element("docs-navigation");
    			t48 = space();
    			hr12 = element("hr");
    			t49 = space();
    			docs_radio = element("docs-radio");
    			t50 = space();
    			hr13 = element("hr");
    			t51 = space();
    			docs_searchable_select = element("docs-searchable-select");
    			t52 = space();
    			hr14 = element("hr");
    			t53 = space();
    			docs_select = element("docs-select");
    			t54 = space();
    			hr15 = element("hr");
    			t55 = space();
    			docs_toast = element("docs-toast");
    			t56 = space();
    			hr16 = element("hr");
    			t57 = space();
    			docs_tooltip = element("docs-tooltip");
    			t58 = space();
    			hr17 = element("hr");
    			t59 = space();
    			docs_theming = element("docs-theming");
    			t60 = space();
    			hr18 = element("hr");
    			t61 = space();
    			zoo_footer = element("zoo-footer");
    			add_location(app_header, file, 1, 1, 20);
    			set_custom_element_data(app_context0, "id", "what");
    			set_custom_element_data(app_context0, "text", "What is this project?");
    			add_location(app_context0, file, 2, 1, 48);
    			add_location(li0, file, 4, 2, 143);
    			add_location(li1, file, 7, 2, 249);
    			attr(ul, "class", "what-list svelte-1uvrh83");
    			add_location(ul, file, 3, 1, 117);
    			set_custom_element_data(app_form, "id", "app-form");
    			add_location(app_form, file, 13, 3, 388);
    			attr(hr0, "class", "svelte-1uvrh83");
    			add_location(hr0, file, 14, 3, 428);
    			set_custom_element_data(app_buttons, "id", "app-buttons");
    			add_location(app_buttons, file, 15, 3, 437);
    			attr(hr1, "class", "svelte-1uvrh83");
    			add_location(hr1, file, 16, 3, 486);
    			set_custom_element_data(app_tooltip_and_feedback, "id", "app-tooltip-and-feedback");
    			add_location(app_tooltip_and_feedback, file, 17, 3, 495);
    			attr(hr2, "class", "svelte-1uvrh83");
    			add_location(hr2, file, 18, 3, 583);
    			attr(div0, "class", "overview svelte-1uvrh83");
    			add_location(div0, file, 12, 2, 361);
    			set_custom_element_data(app_context1, "text", "When can I use it?");
    			set_custom_element_data(app_context1, "backbtn", true);
    			add_location(app_context1, file, 21, 3, 637);
    			attr(a0, "href", "http://caniuse.com/#feat=shadowdomv1");
    			add_location(a0, file, 24, 5, 872);
    			attr(p0, "class", "ciu_embed svelte-1uvrh83");
    			attr(p0, "data-feature", "shadowdomv1");
    			attr(p0, "data-periods", "future_1,current,past_1,past_2");
    			attr(p0, "data-accessible-colours", "false");
    			add_location(p0, file, 23, 4, 739);
    			attr(a1, "href", "http://caniuse.com/#feat=custom-elementsv1");
    			add_location(a1, file, 27, 5, 1188);
    			attr(p1, "class", "ciu_embed svelte-1uvrh83");
    			attr(p1, "data-feature", "custom-elementsv1");
    			attr(p1, "data-periods", "future_1,current,past_1,past_2");
    			attr(p1, "data-accessible-colours", "false");
    			add_location(p1, file, 26, 4, 1049);
    			attr(a2, "href", "http://caniuse.com/#feat=template");
    			add_location(a2, file, 30, 5, 1513);
    			attr(p2, "class", "ciu_embed svelte-1uvrh83");
    			attr(p2, "data-feature", "template");
    			attr(p2, "data-periods", "future_1,current,past_1,past_2");
    			attr(p2, "data-accessible-colours", "false");
    			add_location(p2, file, 29, 4, 1383);
    			attr(div1, "class", "desktop svelte-1uvrh83");
    			add_location(div1, file, 22, 3, 712);
    			attr(a3, "href", "http://caniuse.com/#feat=shadowdomv1");
    			attr(a3, "target", "about:blank");
    			attr(a3, "class", "svelte-1uvrh83");
    			add_location(a3, file, 36, 33, 1793);
    			attr(span0, "slot", "buttoncontent");
    			add_location(span0, file, 36, 6, 1766);
    			add_location(zoo_button0, file, 35, 5, 1746);
    			attr(div2, "class", "back-btn svelte-1uvrh83");
    			add_location(div2, file, 34, 4, 1717);
    			attr(a4, "href", "http://caniuse.com/#feat=custom-elementsv1");
    			attr(a4, "target", "about:blank");
    			attr(a4, "class", "svelte-1uvrh83");
    			add_location(a4, file, 41, 33, 2008);
    			attr(span1, "slot", "buttoncontent");
    			add_location(span1, file, 41, 6, 1981);
    			add_location(zoo_button1, file, 40, 5, 1961);
    			attr(div3, "class", "back-btn svelte-1uvrh83");
    			add_location(div3, file, 39, 4, 1932);
    			attr(a5, "href", "http://caniuse.com/#feat=template");
    			attr(a5, "target", "about:blank");
    			attr(a5, "class", "svelte-1uvrh83");
    			add_location(a5, file, 46, 33, 2235);
    			attr(span2, "slot", "buttoncontent");
    			add_location(span2, file, 46, 6, 2208);
    			add_location(zoo_button2, file, 45, 5, 2188);
    			attr(div4, "class", "back-btn svelte-1uvrh83");
    			add_location(div4, file, 44, 4, 2159);
    			attr(div5, "class", "mobile svelte-1uvrh83");
    			add_location(div5, file, 33, 3, 1691);
    			attr(div6, "id", "when");
    			attr(div6, "class", "caniuse svelte-1uvrh83");
    			add_location(div6, file, 20, 2, 601);
    			set_custom_element_data(app_context2, "text", "How can I use it?");
    			set_custom_element_data(app_context2, "backbtn", true);
    			add_location(app_context2, file, 52, 3, 2425);
    			attr(div7, "class", "left-menu svelte-1uvrh83");
    			add_location(div7, file, 53, 3, 2499);
    			attr(div8, "id", "how");
    			attr(div8, "class", "spec-docs svelte-1uvrh83");
    			add_location(div8, file, 51, 2, 2388);
    			set_custom_element_data(docs_button, "id", "button-doc");
    			add_location(docs_button, file, 63, 3, 2769);
    			attr(hr3, "class", "svelte-1uvrh83");
    			add_location(hr3, file, 64, 3, 2818);
    			set_custom_element_data(docs_checkbox, "id", "checkbox-doc");
    			add_location(docs_checkbox, file, 65, 3, 2827);
    			attr(hr4, "class", "svelte-1uvrh83");
    			add_location(hr4, file, 66, 3, 2881);
    			set_custom_element_data(docs_collapsable_list, "id", "collapsable-list-doc");
    			add_location(docs_collapsable_list, file, 67, 3, 2890);
    			attr(hr5, "class", "svelte-1uvrh83");
    			add_location(hr5, file, 68, 3, 2968);
    			set_custom_element_data(docs_feedback, "id", "feedback-doc");
    			add_location(docs_feedback, file, 69, 3, 2977);
    			attr(hr6, "class", "svelte-1uvrh83");
    			add_location(hr6, file, 70, 3, 3031);
    			set_custom_element_data(docs_footer, "id", "footer-doc");
    			add_location(docs_footer, file, 71, 3, 3040);
    			attr(hr7, "class", "svelte-1uvrh83");
    			add_location(hr7, file, 72, 3, 3088);
    			set_custom_element_data(docs_header, "id", "header-doc");
    			add_location(docs_header, file, 73, 3, 3097);
    			attr(hr8, "class", "svelte-1uvrh83");
    			add_location(hr8, file, 74, 3, 3145);
    			set_custom_element_data(docs_input, "id", "input-doc");
    			add_location(docs_input, file, 75, 3, 3154);
    			attr(hr9, "class", "svelte-1uvrh83");
    			add_location(hr9, file, 76, 3, 3199);
    			set_custom_element_data(docs_link, "id", "link-doc");
    			add_location(docs_link, file, 77, 3, 3208);
    			attr(hr10, "class", "svelte-1uvrh83");
    			add_location(hr10, file, 78, 3, 3250);
    			set_custom_element_data(docs_modal, "id", "modal-doc");
    			add_location(docs_modal, file, 79, 3, 3259);
    			attr(hr11, "class", "svelte-1uvrh83");
    			add_location(hr11, file, 80, 3, 3304);
    			set_custom_element_data(docs_navigation, "id", "navigation-doc");
    			add_location(docs_navigation, file, 81, 3, 3313);
    			attr(hr12, "class", "svelte-1uvrh83");
    			add_location(hr12, file, 82, 3, 3373);
    			set_custom_element_data(docs_radio, "id", "radio-doc");
    			add_location(docs_radio, file, 83, 3, 3382);
    			attr(hr13, "class", "svelte-1uvrh83");
    			add_location(hr13, file, 84, 3, 3427);
    			set_custom_element_data(docs_searchable_select, "id", "searchable-select-doc");
    			add_location(docs_searchable_select, file, 85, 3, 3436);
    			attr(hr14, "class", "svelte-1uvrh83");
    			add_location(hr14, file, 86, 3, 3517);
    			set_custom_element_data(docs_select, "id", "select-doc");
    			add_location(docs_select, file, 87, 3, 3526);
    			attr(hr15, "class", "svelte-1uvrh83");
    			add_location(hr15, file, 88, 3, 3574);
    			set_custom_element_data(docs_toast, "id", "toast-doc");
    			add_location(docs_toast, file, 89, 3, 3583);
    			attr(hr16, "class", "svelte-1uvrh83");
    			add_location(hr16, file, 90, 3, 3628);
    			set_custom_element_data(docs_tooltip, "id", "tooltip-doc");
    			add_location(docs_tooltip, file, 91, 3, 3637);
    			attr(hr17, "class", "svelte-1uvrh83");
    			add_location(hr17, file, 92, 3, 3688);
    			set_custom_element_data(docs_theming, "id", "theming-doc");
    			add_location(docs_theming, file, 93, 3, 3697);
    			attr(hr18, "class", "svelte-1uvrh83");
    			add_location(hr18, file, 94, 3, 3748);
    			attr(div9, "class", "content svelte-1uvrh83");
    			add_location(div9, file, 62, 2, 2743);
    			attr(div10, "class", "page-content svelte-1uvrh83");
    			add_location(div10, file, 11, 1, 331);
    			set_custom_element_data(zoo_footer, "class", "footer svelte-1uvrh83");
    			set_custom_element_data(zoo_footer, "copyright", "zooplus AG");
    			add_location(zoo_footer, file, 97, 1, 3774);
    			attr(div11, "class", "app svelte-1uvrh83");
    			add_location(div11, file, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div11, anchor);
    			append(div11, app_header);
    			append(div11, t0);
    			append(div11, app_context0);
    			append(div11, t1);
    			append(div11, ul);
    			append(ul, li0);
    			append(ul, t3);
    			append(ul, li1);
    			append(div11, t5);
    			append(div11, div10);
    			append(div10, div0);
    			append(div0, app_form);
    			append(div0, t6);
    			append(div0, hr0);
    			append(div0, t7);
    			append(div0, app_buttons);
    			append(div0, t8);
    			append(div0, hr1);
    			append(div0, t9);
    			append(div0, app_tooltip_and_feedback);
    			append(div0, t10);
    			append(div0, hr2);
    			append(div10, t11);
    			append(div10, div6);
    			append(div6, app_context1);
    			append(div6, t12);
    			append(div6, div1);
    			append(div1, p0);
    			append(p0, a0);
    			append(p0, t14);
    			append(div1, t15);
    			append(div1, p1);
    			append(p1, a1);
    			append(p1, t17);
    			append(div1, t18);
    			append(div1, p2);
    			append(p2, a2);
    			append(p2, t20);
    			append(div6, t21);
    			append(div6, div5);
    			append(div5, div2);
    			append(div2, zoo_button0);
    			append(zoo_button0, span0);
    			append(span0, a3);
    			append(div5, t23);
    			append(div5, div3);
    			append(div3, zoo_button1);
    			append(zoo_button1, span1);
    			append(span1, a4);
    			append(div5, t25);
    			append(div5, div4);
    			append(div4, zoo_button2);
    			append(zoo_button2, span2);
    			append(span2, a5);
    			append(div10, t27);
    			append(div10, div8);
    			append(div8, app_context2);
    			append(div8, t28);
    			append(div8, div7);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div7, null);
    			}

    			append(div10, t29);
    			append(div10, div9);
    			append(div9, docs_button);
    			append(div9, t30);
    			append(div9, hr3);
    			append(div9, t31);
    			append(div9, docs_checkbox);
    			append(div9, t32);
    			append(div9, hr4);
    			append(div9, t33);
    			append(div9, docs_collapsable_list);
    			append(div9, t34);
    			append(div9, hr5);
    			append(div9, t35);
    			append(div9, docs_feedback);
    			append(div9, t36);
    			append(div9, hr6);
    			append(div9, t37);
    			append(div9, docs_footer);
    			append(div9, t38);
    			append(div9, hr7);
    			append(div9, t39);
    			append(div9, docs_header);
    			append(div9, t40);
    			append(div9, hr8);
    			append(div9, t41);
    			append(div9, docs_input);
    			append(div9, t42);
    			append(div9, hr9);
    			append(div9, t43);
    			append(div9, docs_link);
    			append(div9, t44);
    			append(div9, hr10);
    			append(div9, t45);
    			append(div9, docs_modal);
    			append(div9, t46);
    			append(div9, hr11);
    			append(div9, t47);
    			append(div9, docs_navigation);
    			append(div9, t48);
    			append(div9, hr12);
    			append(div9, t49);
    			append(div9, docs_radio);
    			append(div9, t50);
    			append(div9, hr13);
    			append(div9, t51);
    			append(div9, docs_searchable_select);
    			append(div9, t52);
    			append(div9, hr14);
    			append(div9, t53);
    			append(div9, docs_select);
    			append(div9, t54);
    			append(div9, hr15);
    			append(div9, t55);
    			append(div9, docs_toast);
    			append(div9, t56);
    			append(div9, hr16);
    			append(div9, t57);
    			append(div9, docs_tooltip);
    			append(div9, t58);
    			append(div9, hr17);
    			append(div9, t59);
    			append(div9, docs_theming);
    			append(div9, t60);
    			append(div9, hr18);
    			append(div11, t61);
    			append(div11, zoo_footer);
    			ctx.zoo_footer_binding(zoo_footer);
    		},

    		p: function update(changed, ctx) {
    			if (changed.doclinks) {
    				each_value = ctx.doclinks;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
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
    			if (detaching) {
    				detach(div11);
    			}

    			destroy_each(each_blocks, detaching);

    			ctx.zoo_footer_binding(null);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let footer;
    	let doclinks = [
    		{
    			href: '#button-doc',
    			target: '',
    			text: 'Button'
    		},
    		{
    			href: '#checkbox-doc',
    			target: '',
    			text: 'Checkbox'
    		},
    		{
    			href: '#collapsable-list-doc',
    			target: '',
    			text: 'Collapsable List'
    		},
    		{
    			href: '#feedback-doc',
    			target: '',
    			text: 'Feedback'
    		},
    		{
    			href: '#footer-doc',
    			target: '',
    			text: 'Footer'
    		},
    		{
    			href: '#header-doc',
    			target: '',
    			text: 'Header'
    		},
    		{
    			href: '#input-doc',
    			target: '',
    			text: 'Input'
    		},
    		{
    			href: '#link-doc',
    			target: '',
    			text: 'Link'
    		},
    		{
    			href: '#modal-doc',
    			target: '',
    			text: 'Modal'
    		},
    		{
    			href: '#navigation-doc',
    			target: '',
    			text: 'Navigation'
    		},
    		{
    			href: '#radio-doc',
    			target: '',
    			text: 'Radio'
    		},
    		{
    			href: '#searchable-select-doc',
    			target: '',
    			text: 'Searchable select'
    		},
    		{
    			href: '#select-doc',
    			target: '',
    			text: 'Select'
    		},
    		{
    			href: '#toast-doc',
    			target: '',
    			text: 'Toast'
    		},
    		{
    			href: '#tooltip-doc',
    			target: '',
    			text: 'Tooltip'
    		},
    		{
    			href: '#theming-doc',
    			target: '',
    			text: 'Theming'
    		}
    	];
    	onMount(() => {
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
    			}
    		]; $$invalidate('footer', footer);
    	});

    	function zoo_footer_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('footer', footer = $$value);
    		});
    	}

    	return { footer, doclinks, zoo_footer_binding };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1uvrh83-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
