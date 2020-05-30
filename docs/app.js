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

/* src/App.svelte generated by Svelte v3.23.0 */

const file = "src/App.svelte";

function add_css() {
	var style = element("style");
	style.id = "svelte-kbf7ld-style";
	style.textContent = ".external-docs.svelte-kbf7ld.svelte-kbf7ld{width:100%;display:flex;align-items:center;justify-content:center}.app.svelte-kbf7ld.svelte-kbf7ld{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1)}.page-content.svelte-kbf7ld.svelte-kbf7ld{position:relative;display:grid;grid-template-columns:1fr;grid-gap:30px;grid-template-areas:\"overview\" \"caniuse\" \"spec-docs\"}@media only screen and (max-width: 850px){.page-content.svelte-kbf7ld.svelte-kbf7ld{grid-template-columns:minmax(320px, 90%);justify-content:center}}.what-list.svelte-kbf7ld.svelte-kbf7ld{color:var(--primary-mid, #3C9700);font-size:20px}#when.svelte-kbf7ld aside.svelte-kbf7ld{color:var(--primary-dark, #286400);text-align:center}@media only screen and (max-width: 850px){#when.svelte-kbf7ld .desktop.svelte-kbf7ld{display:none}}#when.svelte-kbf7ld .mobile.svelte-kbf7ld{display:none}@media only screen and (max-width: 850px){#when.svelte-kbf7ld .mobile.svelte-kbf7ld{display:block}}#when.svelte-kbf7ld .back-btn.svelte-kbf7ld{width:280px;margin:10px auto}#when.svelte-kbf7ld .back-btn a.svelte-kbf7ld{text-decoration:none;color:white}.overview.svelte-kbf7ld.svelte-kbf7ld{grid-area:overview;max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}.caniuse.svelte-kbf7ld.svelte-kbf7ld{grid-area:caniuse;width:100%;flex:1 0 auto}.caniuse.svelte-kbf7ld p.svelte-kbf7ld{max-width:1280px;margin:0 auto}.spec-docs.svelte-kbf7ld.svelte-kbf7ld{grid-area:spec-docs;margin-bottom:50px}hr.svelte-kbf7ld.svelte-kbf7ld{border-color:var(--primary-mid, #3C9700);margin:45px 0;opacity:0.3}.footer.svelte-kbf7ld.svelte-kbf7ld{flex-shrink:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwiYXBwXCI+XG5cdDxhcHAtaGVhZGVyPjwvYXBwLWhlYWRlcj5cblx0PG1haW4+XG5cdFx0PGFwcC1jb250ZXh0IGlkPVwid2hhdFwiIHRleHQ9XCJXaGF0IGlzIHRoaXMgcHJvamVjdD9cIj48L2FwcC1jb250ZXh0PlxuXHRcdDx1bCBjbGFzcz1cIndoYXQtbGlzdFwiPlxuXHRcdFx0PGxpPlxuXHRcdFx0XHRTZXQgb2Ygd2ViLWNvbXBvbmVudHMgd2hpY2ggY2FuIGJlIHVzZWQgaW4gYW55IG1vZGVybiBVSSBmcmFtZXdvcmsgKG9yIHdpdGhvdXQgYW55KS5cblx0XHRcdDwvbGk+XG5cdFx0XHQ8bGk+XG5cdFx0XHRcdFRoZSB3ZWItY29tcG9uZW50IHNldCBpbXBsZW1lbnRzIForIHNob3Agc3R5bGUgZ3VpZGUuXG5cdFx0XHQ8L2xpPlxuXHRcdDwvdWw+XG5cdFx0PGRpdiBjbGFzcz1cInBhZ2UtY29udGVudFwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cIm92ZXJ2aWV3XCI+XG5cdFx0XHRcdDxhcHAtZm9ybT48L2FwcC1mb3JtPlxuXHRcdFx0XHQ8aHI+XG5cdFx0XHRcdDxhcHAtYnV0dG9ucz48L2FwcC1idXR0b25zPlxuXHRcdFx0XHQ8aHI+XG5cdFx0XHRcdDxhcHAtZ3JpZHM+PC9hcHAtZ3JpZHM+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgaWQ9XCJ3aGVuXCIgY2xhc3M9XCJjYW5pdXNlXCI+XG5cdFx0XHRcdDxhcHAtY29udGV4dCB0ZXh0PVwiV2hlbiBjYW4gSSB1c2UgaXQ/XCIgYmFja2J0bj1cInt0cnVlfVwiPjwvYXBwLWNvbnRleHQ+XG5cdFx0XHRcdDxhc2lkZT5BbHRob3VnaCBzYWZhcmkgaXMgbWFya2VkIGFzIHBhcnRpYWxseSBzdXBwb3J0aW5nIHRoZXNlIGZlYXR1cmVzLCB0aGlzIHByb2plY3QgZG9lcyBub3QgdXNlIGFueSBmZWF0dXJlcyB0aGF0IGRvIG5vdCB3b3JrIGluIFNhZmFyaS48L2FzaWRlPlxuXHRcdFx0XHQ8YnI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJkZXNrdG9wXCI+XG5cdFx0XHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJzaGFkb3dkb212MVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0XHRcdDxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9c2hhZG93ZG9tdjFcIj5DYW4gSSBVc2Ugc2hhZG93ZG9tdjE/PC9hPiBEYXRhIG9uIHN1cHBvcnQgZm9yIHRoZSBzaGFkb3dkb212MSBmZWF0dXJlIGFjcm9zcyB0aGUgbWFqb3IgYnJvd3NlcnMgZnJvbSBjYW5pdXNlLmNvbS5cblx0XHRcdFx0XHQ8L3A+XG5cdFx0XHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJjdXN0b20tZWxlbWVudHN2MVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0XHRcdDxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9Y3VzdG9tLWVsZW1lbnRzdjFcIj5DYW4gSSBVc2UgY3VzdG9tLWVsZW1lbnRzdjE/PC9hPiBEYXRhIG9uIHN1cHBvcnQgZm9yIHRoZSBjdXN0b20tZWxlbWVudHN2MSBmZWF0dXJlIGFjcm9zcyB0aGUgbWFqb3IgYnJvd3NlcnMgZnJvbSBjYW5pdXNlLmNvbS5cblx0XHRcdFx0XHQ8L3A+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwibW9iaWxlXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImJhY2stYnRuXCI+XG5cdFx0XHRcdFx0XHQ8em9vLWJ1dHRvbj5cblx0XHRcdFx0XHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj48YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PXNoYWRvd2RvbXYxXCIgdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIj5DYW4gSSBVc2Ugc2hhZG93ZG9tdjE/PC9hPjwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvem9vLWJ1dHRvbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYmFjay1idG5cIj5cblx0XHRcdFx0XHRcdDx6b28tYnV0dG9uPlxuXHRcdFx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPjxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9Y3VzdG9tLWVsZW1lbnRzdjFcIiB0YXJnZXQ9XCJhYm91dDpibGFua1wiPkNhbiBJIFVzZSBjdXN0b20tZWxlbWVudHN2MT88L2E+PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC96b28tYnV0dG9uPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBpZD1cImhvd1wiIGNsYXNzPVwic3BlYy1kb2NzXCI+XG5cdFx0XHRcdDxhcHAtY29udGV4dCB0ZXh0PVwiSG93IGNhbiBJIHVzZSBpdD9cIiBiYWNrYnRuPVwie3RydWV9XCI+PC9hcHAtY29udGV4dD5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImV4dGVybmFsLWRvY3NcIj5cblx0XHRcdFx0XHREb2N1bWVudGF0aW9uIGZvciBlYWNoIGNvbXBvbmVudCBpcyBhdmFpbGFibGUgYXRcblx0XHRcdFx0XHQ8em9vLWxpbmsgaHJlZj1cImh0dHBzOi8vem9vcGx1cy5naXRodWIuaW8vem9vLXdlYi1jb21wb25lbnRzLWRvY3MvaW5kZXguaHRtbFwiIHRleHQ9XCJEb2NzIHBhZ2VcIiBzaXplPVwibGFyZ2VcIiB0eXBlPVwicHJpbWFyeVwiPjwvem9vLWxpbms+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdDwvbWFpbj5cblx0PHpvby1mb290ZXIgY2xhc3M9XCJmb290ZXJcIiBjb3B5cmlnaHQ9XCJ6b29wbHVzIEFHXCI+XG5cdFx0eyNlYWNoIGZvb3RlcmxpbmtzIGFzIGZvb3Rlcmxpbmt9XG5cdFx0XHQ8em9vLWxpbmsgaHJlZj1cIntmb290ZXJsaW5rLmhyZWZ9XCIgdGFyZ2V0PVwie2Zvb3RlcmxpbmsudGFyZ2V0fVwiIHR5cGU9XCJ7Zm9vdGVybGluay50eXBlfVwiXG5cdFx0XHRcdGRpc2FibGVkPVwie2Zvb3RlcmxpbmsuZGlzYWJsZWR9XCIgdGV4dD1cIntmb290ZXJsaW5rLnRleHR9XCI+XG5cdFx0XHQ8L3pvby1saW5rPlxuXHRcdHsvZWFjaH1cblx0PC96b28tZm9vdGVyPiBcbjwvZGl2PlxuXG48c3R5bGUgdHlwZT1cInRleHQvc2Nzc1wiPi5leHRlcm5hbC1kb2NzIHtcbiAgd2lkdGg6IDEwMCU7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGp1c3RpZnktY29udGVudDogY2VudGVyOyB9XG5cbi5hcHAge1xuICBtYXJnaW46IDAgYXV0bztcbiAgaGVpZ2h0OiAxMDAlO1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBib3gtc2hhZG93OiAwIDRweCAxNXB4IDAgcmdiYSgwLCAwLCAwLCAwLjEpOyB9XG5cbi5wYWdlLWNvbnRlbnQge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGRpc3BsYXk6IGdyaWQ7XG4gIGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyO1xuICBncmlkLWdhcDogMzBweDtcbiAgZ3JpZC10ZW1wbGF0ZS1hcmVhczogXCJvdmVydmlld1wiIFwiY2FuaXVzZVwiIFwic3BlYy1kb2NzXCI7IH1cbiAgQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA4NTBweCkge1xuICAgIC5wYWdlLWNvbnRlbnQge1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiBtaW5tYXgoMzIwcHgsIDkwJSk7XG4gICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgfSB9XG5cbi53aGF0LWxpc3Qge1xuICBjb2xvcjogdmFyKC0tcHJpbWFyeS1taWQsICMzQzk3MDApO1xuICBmb250LXNpemU6IDIwcHg7IH1cblxuI3doZW4gYXNpZGUge1xuICBjb2xvcjogdmFyKC0tcHJpbWFyeS1kYXJrLCAjMjg2NDAwKTtcbiAgdGV4dC1hbGlnbjogY2VudGVyOyB9XG5cbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogODUwcHgpIHtcbiAgI3doZW4gLmRlc2t0b3Age1xuICAgIGRpc3BsYXk6IG5vbmU7IH0gfVxuXG4jd2hlbiAubW9iaWxlIHtcbiAgZGlzcGxheTogbm9uZTsgfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gICAgI3doZW4gLm1vYmlsZSB7XG4gICAgICBkaXNwbGF5OiBibG9jazsgfSB9XG5cbiN3aGVuIC5iYWNrLWJ0biB7XG4gIHdpZHRoOiAyODBweDtcbiAgbWFyZ2luOiAxMHB4IGF1dG87IH1cbiAgI3doZW4gLmJhY2stYnRuIGEge1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICBjb2xvcjogd2hpdGU7IH1cblxuLmxpbmstd3JhcHBlciB7XG4gIGhlaWdodDogYXV0bztcbiAgdHJhbnNpdGlvbjogY29sb3IgMC4zcywgYmFja2dyb3VuZC1jb2xvciAwLjNzOyB9XG4gIC5saW5rLXdyYXBwZXI6aG92ZXIge1xuICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwgMCwgMCwgMC4xKTtcbiAgICBjb2xvcjogd2hpdGU7IH1cbiAgLmxpbmstd3JhcHBlciBhIHtcbiAgICBjb2xvcjogdmFyKC0tcHJpbWFyeS1taWQsICMzQzk3MDApO1xuICAgIHBhZGRpbmc6IDEycHg7XG4gICAgZGlzcGxheTogYmxvY2s7XG4gICAgdGV4dC1kZWNvcmF0aW9uOiBub25lOyB9XG5cbi5vdmVydmlldyB7XG4gIGdyaWQtYXJlYTogb3ZlcnZpZXc7XG4gIG1heC13aWR0aDogMTI4MHB4O1xuICB3aWR0aDogMTAwJTtcbiAgZmxleDogMSAwIGF1dG87XG4gIG1hcmdpbjogMCBhdXRvOyB9XG5cbi5jYW5pdXNlIHtcbiAgZ3JpZC1hcmVhOiBjYW5pdXNlO1xuICB3aWR0aDogMTAwJTtcbiAgZmxleDogMSAwIGF1dG87IH1cblxuLmNhbml1c2UgcCB7XG4gIG1heC13aWR0aDogMTI4MHB4O1xuICBtYXJnaW46IDAgYXV0bzsgfVxuXG4uc3BlYy1kb2NzIHtcbiAgZ3JpZC1hcmVhOiBzcGVjLWRvY3M7XG4gIG1hcmdpbi1ib3R0b206IDUwcHg7IH1cblxuaHIge1xuICBib3JkZXItY29sb3I6IHZhcigtLXByaW1hcnktbWlkLCAjM0M5NzAwKTtcbiAgbWFyZ2luOiA0NXB4IDA7XG4gIG9wYWNpdHk6IDAuMzsgfVxuXG4uZm9vdGVyIHtcbiAgZmxleC1zaHJpbms6IDA7IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRsZXQgZm9vdGVybGlua3MgPSBbXG5cdFx0e1xuXHRcdFx0aHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS96b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXG5cdFx0XHR0ZXh0OiAnR2l0aHViJyxcblx0XHRcdHR5cGU6ICduZWdhdGl2ZSdcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICdodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9Aem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxuXHRcdFx0dGV4dDogJ05QTScsXG5cdFx0XHR0eXBlOiAnbmVnYXRpdmUnXG5cdFx0fVxuXHRdO1xuXHRsZXQgZG9jbGlua3MgPSBbXG5cdFx0e1xuXHRcdFx0aHJlZjogJyN0aGVtaW5nLWRvYycsXG5cdFx0XHR0ZXh0OiAnVGhlbWluZydcblx0XHR9XG5cdF07XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJt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 */";
	append_dev(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[2] = list[i];
	return child_ctx;
}

// (56:2) {#each footerlinks as footerlink}
function create_each_block(ctx) {
	let zoo_link;
	let zoo_link_href_value;
	let zoo_link_target_value;
	let zoo_link_type_value;
	let zoo_link_disabled_value;
	let zoo_link_text_value;

	const block = {
		c: function create() {
			zoo_link = element("zoo-link");
			set_custom_element_data(zoo_link, "href", zoo_link_href_value = /*footerlink*/ ctx[2].href);
			set_custom_element_data(zoo_link, "target", zoo_link_target_value = /*footerlink*/ ctx[2].target);
			set_custom_element_data(zoo_link, "type", zoo_link_type_value = /*footerlink*/ ctx[2].type);
			set_custom_element_data(zoo_link, "disabled", zoo_link_disabled_value = /*footerlink*/ ctx[2].disabled);
			set_custom_element_data(zoo_link, "text", zoo_link_text_value = /*footerlink*/ ctx[2].text);
			add_location(zoo_link, file, 56, 3, 2411);
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
		id: create_each_block.name,
		type: "each",
		source: "(56:2) {#each footerlinks as footerlink}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let div9;
	let app_header;
	let t0;
	let main;
	let app_context0;
	let t1;
	let ul;
	let li0;
	let t3;
	let li1;
	let t5;
	let div8;
	let div0;
	let app_form;
	let t6;
	let hr0;
	let t7;
	let app_buttons;
	let t8;
	let hr1;
	let t9;
	let app_grids;
	let t10;
	let div5;
	let app_context1;
	let app_context1_backbtn_value;
	let t11;
	let aside;
	let t13;
	let br;
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
	let div4;
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
	let div7;
	let app_context2;
	let app_context2_backbtn_value;
	let t25;
	let div6;
	let t26;
	let zoo_link;
	let t27;
	let zoo_footer;
	let each_value = /*footerlinks*/ ctx[0];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			div9 = element("div");
			app_header = element("app-header");
			t0 = space();
			main = element("main");
			app_context0 = element("app-context");
			t1 = space();
			ul = element("ul");
			li0 = element("li");
			li0.textContent = "Set of web-components which can be used in any modern UI framework (or without any).";
			t3 = space();
			li1 = element("li");
			li1.textContent = "The web-component set implements Z+ shop style guide.";
			t5 = space();
			div8 = element("div");
			div0 = element("div");
			app_form = element("app-form");
			t6 = space();
			hr0 = element("hr");
			t7 = space();
			app_buttons = element("app-buttons");
			t8 = space();
			hr1 = element("hr");
			t9 = space();
			app_grids = element("app-grids");
			t10 = space();
			div5 = element("div");
			app_context1 = element("app-context");
			t11 = space();
			aside = element("aside");
			aside.textContent = "Although safari is marked as partially supporting these features, this project does not use any features that do not work in Safari.";
			t13 = space();
			br = element("br");
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
			div4 = element("div");
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
			div7 = element("div");
			app_context2 = element("app-context");
			t25 = space();
			div6 = element("div");
			t26 = text("Documentation for each component is available at\n\t\t\t\t\t");
			zoo_link = element("zoo-link");
			t27 = space();
			zoo_footer = element("zoo-footer");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			add_location(app_header, file, 1, 1, 19);
			set_custom_element_data(app_context0, "id", "what");
			set_custom_element_data(app_context0, "text", "What is this project?");
			add_location(app_context0, file, 3, 2, 55);
			add_location(li0, file, 5, 3, 150);
			add_location(li1, file, 8, 3, 256);
			attr_dev(ul, "class", "what-list svelte-kbf7ld");
			add_location(ul, file, 4, 2, 124);
			add_location(app_form, file, 14, 4, 395);
			attr_dev(hr0, "class", "svelte-kbf7ld");
			add_location(hr0, file, 15, 4, 421);
			add_location(app_buttons, file, 16, 4, 430);
			attr_dev(hr1, "class", "svelte-kbf7ld");
			add_location(hr1, file, 17, 4, 462);
			add_location(app_grids, file, 18, 4, 471);
			attr_dev(div0, "class", "overview svelte-kbf7ld");
			add_location(div0, file, 13, 3, 368);
			set_custom_element_data(app_context1, "text", "When can I use it?");
			set_custom_element_data(app_context1, "backbtn", app_context1_backbtn_value = true);
			add_location(app_context1, file, 21, 4, 544);
			attr_dev(aside, "class", "svelte-kbf7ld");
			add_location(aside, file, 22, 4, 619);
			add_location(br, file, 23, 4, 771);
			attr_dev(a0, "href", "http://caniuse.com/#feat=shadowdomv1");
			attr_dev(a0, "class", "svelte-kbf7ld");
			add_location(a0, file, 26, 6, 940);
			attr_dev(p0, "class", "ciu_embed svelte-kbf7ld");
			attr_dev(p0, "data-feature", "shadowdomv1");
			attr_dev(p0, "data-periods", "future_1,current,past_1,past_2");
			attr_dev(p0, "data-accessible-colours", "false");
			add_location(p0, file, 25, 5, 807);
			attr_dev(a1, "href", "http://caniuse.com/#feat=custom-elementsv1");
			attr_dev(a1, "class", "svelte-kbf7ld");
			add_location(a1, file, 29, 6, 1256);
			attr_dev(p1, "class", "ciu_embed svelte-kbf7ld");
			attr_dev(p1, "data-feature", "custom-elementsv1");
			attr_dev(p1, "data-periods", "future_1,current,past_1,past_2");
			attr_dev(p1, "data-accessible-colours", "false");
			add_location(p1, file, 28, 5, 1117);
			attr_dev(div1, "class", "desktop svelte-kbf7ld");
			add_location(div1, file, 24, 4, 780);
			attr_dev(a2, "href", "http://caniuse.com/#feat=shadowdomv1");
			attr_dev(a2, "target", "about:blank");
			attr_dev(a2, "class", "svelte-kbf7ld");
			add_location(a2, file, 35, 34, 1563);
			attr_dev(span0, "slot", "buttoncontent");
			add_location(span0, file, 35, 7, 1536);
			add_location(zoo_button0, file, 34, 6, 1516);
			attr_dev(div2, "class", "back-btn svelte-kbf7ld");
			add_location(div2, file, 33, 5, 1487);
			attr_dev(a3, "href", "http://caniuse.com/#feat=custom-elementsv1");
			attr_dev(a3, "target", "about:blank");
			attr_dev(a3, "class", "svelte-kbf7ld");
			add_location(a3, file, 40, 34, 1778);
			attr_dev(span1, "slot", "buttoncontent");
			add_location(span1, file, 40, 7, 1751);
			add_location(zoo_button1, file, 39, 6, 1731);
			attr_dev(div3, "class", "back-btn svelte-kbf7ld");
			add_location(div3, file, 38, 5, 1702);
			attr_dev(div4, "class", "mobile svelte-kbf7ld");
			add_location(div4, file, 32, 4, 1461);
			attr_dev(div5, "id", "when");
			attr_dev(div5, "class", "caniuse svelte-kbf7ld");
			add_location(div5, file, 20, 3, 508);
			set_custom_element_data(app_context2, "text", "How can I use it?");
			set_custom_element_data(app_context2, "backbtn", app_context2_backbtn_value = true);
			add_location(app_context2, file, 46, 4, 1985);
			set_custom_element_data(zoo_link, "href", "https://zooplus.github.io/zoo-web-components-docs/index.html");
			set_custom_element_data(zoo_link, "text", "Docs page");
			set_custom_element_data(zoo_link, "size", "large");
			set_custom_element_data(zoo_link, "type", "primary");
			add_location(zoo_link, file, 49, 5, 2146);
			attr_dev(div6, "class", "external-docs svelte-kbf7ld");
			add_location(div6, file, 47, 4, 2059);
			attr_dev(div7, "id", "how");
			attr_dev(div7, "class", "spec-docs svelte-kbf7ld");
			add_location(div7, file, 45, 3, 1948);
			attr_dev(div8, "class", "page-content svelte-kbf7ld");
			add_location(div8, file, 12, 2, 338);
			add_location(main, file, 2, 1, 46);
			set_custom_element_data(zoo_footer, "class", "footer svelte-kbf7ld");
			set_custom_element_data(zoo_footer, "copyright", "zooplus AG");
			add_location(zoo_footer, file, 54, 1, 2321);
			attr_dev(div9, "class", "app svelte-kbf7ld");
			add_location(div9, file, 0, 0, 0);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div9, anchor);
			append_dev(div9, app_header);
			append_dev(div9, t0);
			append_dev(div9, main);
			append_dev(main, app_context0);
			append_dev(main, t1);
			append_dev(main, ul);
			append_dev(ul, li0);
			append_dev(ul, t3);
			append_dev(ul, li1);
			append_dev(main, t5);
			append_dev(main, div8);
			append_dev(div8, div0);
			append_dev(div0, app_form);
			append_dev(div0, t6);
			append_dev(div0, hr0);
			append_dev(div0, t7);
			append_dev(div0, app_buttons);
			append_dev(div0, t8);
			append_dev(div0, hr1);
			append_dev(div0, t9);
			append_dev(div0, app_grids);
			append_dev(div8, t10);
			append_dev(div8, div5);
			append_dev(div5, app_context1);
			append_dev(div5, t11);
			append_dev(div5, aside);
			append_dev(div5, t13);
			append_dev(div5, br);
			append_dev(div5, t14);
			append_dev(div5, div1);
			append_dev(div1, p0);
			append_dev(p0, a0);
			append_dev(p0, t16);
			append_dev(div1, t17);
			append_dev(div1, p1);
			append_dev(p1, a1);
			append_dev(p1, t19);
			append_dev(div5, t20);
			append_dev(div5, div4);
			append_dev(div4, div2);
			append_dev(div2, zoo_button0);
			append_dev(zoo_button0, span0);
			append_dev(span0, a2);
			append_dev(div4, t22);
			append_dev(div4, div3);
			append_dev(div3, zoo_button1);
			append_dev(zoo_button1, span1);
			append_dev(span1, a3);
			append_dev(div8, t24);
			append_dev(div8, div7);
			append_dev(div7, app_context2);
			append_dev(div7, t25);
			append_dev(div7, div6);
			append_dev(div6, t26);
			append_dev(div6, zoo_link);
			append_dev(div9, t27);
			append_dev(div9, zoo_footer);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(zoo_footer, null);
			}
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
						each_blocks[i].m(zoo_footer, null);
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
			if (detaching) detach_dev(div9);
			destroy_each(each_blocks, detaching);
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
	let footerlinks = [
		{
			href: "https://github.com/zooplus/zoo-web-components",
			text: "Github",
			type: "negative"
		},
		{
			href: "https://www.npmjs.com/package/@zooplus/zoo-web-components",
			text: "NPM",
			type: "negative"
		}
	];

	let doclinks = [{ href: "#theming-doc", text: "Theming" }];
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("App", $$slots, []);
	$$self.$capture_state = () => ({ footerlinks, doclinks });

	$$self.$inject_state = $$props => {
		if ("footerlinks" in $$props) $$invalidate(0, footerlinks = $$props.footerlinks);
		if ("doclinks" in $$props) doclinks = $$props.doclinks;
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [footerlinks];
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document.getElementById("svelte-kbf7ld-style")) add_css();
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

export default app;
