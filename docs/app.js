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
let outros;
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function create_component(block) {
    block && block.c();
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

/* src/Header.svelte generated by Svelte v3.23.0 */

const { document: document_1 } = globals;
const file = "src/Header.svelte";

function add_css() {
	var style = element("style");
	style.id = "svelte-13yuy3a-style";
	style.textContent = "header.svelte-13yuy3a.svelte-13yuy3a{position:relative}.buttons-holder.svelte-13yuy3a.svelte-13yuy3a{display:flex;justify-content:flex-end;flex-direction:row;flex-grow:1;padding:0 25px 0 0}@media only screen and (max-width: 900px){.buttons-holder.svelte-13yuy3a.svelte-13yuy3a{justify-content:initial;overflow:scroll;max-width:250px}}@media only screen and (max-width: 544px){.buttons-holder.svelte-13yuy3a.svelte-13yuy3a{justify-content:initial;overflow:scroll;max-width:250px}}.header-button.svelte-13yuy3a.svelte-13yuy3a{display:flex;max-width:250px;min-width:140px;margin-left:15px}.header-button.svelte-13yuy3a zoo-button.svelte-13yuy3a{align-self:center}.nav.svelte-13yuy3a.svelte-13yuy3a{position:sticky;top:0;color:white;font-size:14px;line-height:20px;font-weight:bold;cursor:pointer}.nav.svelte-13yuy3a .nav-link.svelte-13yuy3a{cursor:pointer;display:flex;align-items:center}.nav.svelte-13yuy3a .nav-link.svelte-13yuy3a:hover{background:rgba(255, 255, 255, 0.3)}.nav.svelte-13yuy3a .nav-link a.svelte-13yuy3a{color:white;text-decoration:none;padding:0 15px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSGVhZGVyLnN2ZWx0ZSIsInNvdXJjZXMiOlsiSGVhZGVyLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8aGVhZGVyPlxuXHQ8em9vLWhlYWRlciBoZWFkZXJ0ZXh0PVwiWm9vcGx1cyB3ZWIgY29tcG9uZW50c1wiPlxuXHRcdDxpbWcgc2xvdD1cImltZ1wiIGFsdD1cIlpvb3BsdXMgbG9nb1wiIHNyYz1cImxvZ28ucG5nXCIvPlxuXHRcdDxkaXYgY2xhc3M9XCJidXR0b25zLWhvbGRlclwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImhlYWRlci1idXR0b25cIj5cblx0XHRcdFx0PHpvby1idXR0b24gdHlwZT1cInt0aGVtZSA9PT0gJ3pvbycgPyAnc2Vjb25kYXJ5JyA6ICdwcmltYXJ5J31cIiBzaXplPVwibWVkaXVtXCIgb246Y2xpY2s9eygpID0+IGNoYW5nZVRoZW1lKCd6b28nKX0+XG5cdFx0XHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIiBjbGFzcz1cInNsb3R0ZWQtc3BhblwiPlpvbysgdGhlbWU8L3NwYW4+XG5cdFx0XHRcdDwvem9vLWJ1dHRvbj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cImhlYWRlci1idXR0b25cIj5cblx0XHRcdFx0PHpvby1idXR0b24gdHlwZT1cInt0aGVtZSA9PT0gJ2dyZXknID8gJ3NlY29uZGFyeScgOiAncHJpbWFyeSd9XCIgc2l6ZT1cIm1lZGl1bVwiIG9uOmNsaWNrPXsoKSA9PiBjaGFuZ2VUaGVtZSgnZ3JleScpfT5cblx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiIGNsYXNzPVwic2xvdHRlZC1zcGFuXCI+R3JleSB0aGVtZTwvc3Bhbj5cblx0XHRcdFx0PC96b28tYnV0dG9uPlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiaGVhZGVyLWJ1dHRvblwiPlxuXHRcdFx0XHQ8em9vLWJ1dHRvbiB0eXBlPVwie3RoZW1lID09PSAncmFuZG9tJyA/ICdzZWNvbmRhcnknIDogJ3ByaW1hcnknfVwiIHNpemU9XCJtZWRpdW1cIiBvbjpjbGljaz17KCkgPT4gZ2VuZXJhdGVSYW5kb21UaGVtZSgpfT5cblx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiIGNsYXNzPVwic2xvdHRlZC1zcGFuXCI+UmFuZG9tIHRoZW1lPC9zcGFuPlxuXHRcdFx0XHQ8L3pvby1idXR0b24+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC96b28taGVhZGVyPlxuXHQ8em9vLW5hdmlnYXRpb24gY2xhc3M9XCJuYXZcIj5cblx0XHQ8ZGl2PlxuXHRcdFx0eyNlYWNoIG5hdmxpbmtzIGFzIGxpbmt9XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJuYXYtbGlua1wiPlxuXHRcdFx0XHRcdDxhIGhyZWY9XCJ7bGluay5ocmVmfVwiPntsaW5rLnRleHR9PC9hPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdHsvZWFjaH1cblx0XHQ8L2Rpdj5cblx0PC96b28tbmF2aWdhdGlvbj5cbjwvaGVhZGVyPlxuXG48c3R5bGUgdHlwZT0ndGV4dC9zY3NzJz5oZWFkZXIge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7IH1cblxuLmJ1dHRvbnMtaG9sZGVyIHtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDtcbiAgZmxleC1kaXJlY3Rpb246IHJvdztcbiAgZmxleC1ncm93OiAxO1xuICBwYWRkaW5nOiAwIDI1cHggMCAwOyB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogOTAwcHgpIHtcbiAgICAuYnV0dG9ucy1ob2xkZXIge1xuICAgICAganVzdGlmeS1jb250ZW50OiBpbml0aWFsO1xuICAgICAgb3ZlcmZsb3c6IHNjcm9sbDtcbiAgICAgIG1heC13aWR0aDogMjUwcHg7IH0gfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDU0NHB4KSB7XG4gICAgLmJ1dHRvbnMtaG9sZGVyIHtcbiAgICAgIGp1c3RpZnktY29udGVudDogaW5pdGlhbDtcbiAgICAgIG92ZXJmbG93OiBzY3JvbGw7XG4gICAgICBtYXgtd2lkdGg6IDI1MHB4OyB9IH1cblxuLmhlYWRlci1idXR0b24ge1xuICBkaXNwbGF5OiBmbGV4O1xuICBtYXgtd2lkdGg6IDI1MHB4O1xuICBtaW4td2lkdGg6IDE0MHB4O1xuICBtYXJnaW4tbGVmdDogMTVweDsgfVxuICAuaGVhZGVyLWJ1dHRvbiB6b28tYnV0dG9uIHtcbiAgICBhbGlnbi1zZWxmOiBjZW50ZXI7IH1cblxuLm5hdiB7XG4gIHBvc2l0aW9uOiBzdGlja3k7XG4gIHRvcDogMDtcbiAgY29sb3I6IHdoaXRlO1xuICBmb250LXNpemU6IDE0cHg7XG4gIGxpbmUtaGVpZ2h0OiAyMHB4O1xuICBmb250LXdlaWdodDogYm9sZDtcbiAgY3Vyc29yOiBwb2ludGVyOyB9XG4gIC5uYXYgLm5hdi1saW5rIHtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyOyB9XG4gICAgLm5hdiAubmF2LWxpbms6aG92ZXIge1xuICAgICAgYmFja2dyb3VuZDogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjMpOyB9XG4gICAgLm5hdiAubmF2LWxpbmsgYSB7XG4gICAgICBjb2xvcjogd2hpdGU7XG4gICAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgICBwYWRkaW5nOiAwIDE1cHg7IH1cblxuLyojIHNvdXJjZU1hcHBpbmdVUkw9eC5tYXAgKi88L3N0eWxlPlxuXG48c2NyaXB0PlxuXHRsZXQgdGhlbWUgPSAnem9vJztcblx0bGV0IG5hdmxpbmtzID0gW1xuXHRcdHtcblx0XHRcdGhyZWY6ICcjd2hhdCcsXG5cdFx0XHR0ZXh0OiAnV2hhdCBpcyB0aGlzIHByb2plY3Q/J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyN3aGVuJyxcblx0XHRcdHRleHQ6ICdXaGVuIGNhbiBJIHVzZSBpdD8nXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI2hvdycsXG5cdFx0XHR0ZXh0OiAnSG93IGNhbiBJIHVzZSBpdD8nXG5cdFx0fVxuXHRdO1xuXG5cdGNvbnN0IGNoYW5nZVRoZW1lID0gKHBhbGxldGUpID0+IHtcblx0XHR0aGVtZSA9IHBhbGxldGU7XG5cdFx0c3dpdGNoIChwYWxsZXRlKSB7XG5cdFx0XHRjYXNlICd6b28nOlxuXHRcdFx0XHRzZXRDb2xvclZhcignLS1wcmltYXJ5LW1pZCcsICcjM0M5NzAwJyk7XG5cdFx0XHRcdHNldENvbG9yVmFyKCctLXByaW1hcnktbGlnaHQnLCAnIzY2QjEwMCcpO1xuXHRcdFx0XHRzZXRDb2xvclZhcignLS1wcmltYXJ5LWRhcmsnLCAnIzI4NjQwMCcpO1xuXHRcdFx0XHRzZXRDb2xvclZhcignLS1wcmltYXJ5LXVsdHJhbGlnaHQnLCAnI0VCRjRFNScpO1xuXHRcdFx0XHRzZXRDb2xvclZhcignLS1zZWNvbmRhcnktbWlkJywgJyNGRjYyMDAnKTtcblx0XHRcdFx0c2V0Q29sb3JWYXIoJy0tc2Vjb25kYXJ5LWxpZ2h0JywgJyNGRjg4MDAnKTtcblx0XHRcdFx0c2V0Q29sb3JWYXIoJy0tc2Vjb25kYXJ5LWRhcmsnLCAnI0NDNEUwMCcpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2dyZXknOlxuXHRcdFx0XHRzZXRDb2xvclZhcignLS1wcmltYXJ5LW1pZCcsICcjNjc2Nzc4Jyk7XG5cdFx0XHRcdHNldENvbG9yVmFyKCctLXByaW1hcnktbGlnaHQnLCAnIzgzODM5OScpO1xuXHRcdFx0XHRzZXRDb2xvclZhcignLS1wcmltYXJ5LWRhcmsnLCAnIzU2NTY2NCcpO1xuXHRcdFx0XHRzZXRDb2xvclZhcignLS1wcmltYXJ5LXVsdHJhbGlnaHQnLCAnIzgzODM5OScpO1xuXHRcdFx0XHRzZXRDb2xvclZhcignLS1zZWNvbmRhcnktbWlkJywgJyNmZjNlMDAnKTtcblx0XHRcdFx0c2V0Q29sb3JWYXIoJy0tc2Vjb25kYXJ5LWxpZ2h0JywgJyNmZjc5NGQnKTtcblx0XHRcdFx0c2V0Q29sb3JWYXIoJy0tc2Vjb25kYXJ5LWRhcmsnLCAnI2M1MzEwMCcpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdGNvbnN0IHNldENvbG9yVmFyID0gKG5hbWUsIHZhbHVlKSA9PiB7XG5cdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIHZhbHVlKTtcblx0fVxuXG5cdGNvbnN0IGdlbmVyYXRlUmFuZG9tVGhlbWUgPSAoKSA9PiB7XG5cdFx0dGhlbWUgPSAncmFuZG9tJztcblx0XHRjb25zdCBtYWluID0gcmFuZG9tUmdiYVN0cmluZygpO1xuXHRcdGNvbnN0IG1haW5IZXggPSByZ2JUb0hleChtYWluLnIsIG1haW4uZywgbWFpbi5iKTtcblx0XHRzZXRDb2xvclZhcignLS1wcmltYXJ5LW1pZCcsIG1haW5IZXgpO1xuXHRcdHNldENvbG9yVmFyKCctLXByaW1hcnktbGlnaHQnLCBsaWdodGVuRGFya2VuQ29sb3IobWFpbkhleCwgMzApKTtcblx0XHRzZXRDb2xvclZhcignLS1wcmltYXJ5LWRhcmsnLCBsaWdodGVuRGFya2VuQ29sb3IobWFpbkhleCwgLTMwKSk7XG5cdFx0c2V0Q29sb3JWYXIoJy0tcHJpbWFyeS11bHRyYWxpZ2h0JywgbGlnaHRlbkRhcmtlbkNvbG9yKG1haW5IZXgsIDYwKSk7XG5cdFx0Y29uc3Qgc2Vjb25kID0gcmFuZG9tUmdiYVN0cmluZygpO1xuXHRcdGNvbnN0IHNlY29uZEhleCA9IHJnYlRvSGV4KHNlY29uZC5yLCBzZWNvbmQuZywgc2Vjb25kLmIpO1xuXHRcdHNldENvbG9yVmFyKCctLXNlY29uZGFyeS1taWQnLCByZ2JUb0hleChzZWNvbmQuciwgc2Vjb25kLmcsIHNlY29uZC5iKSk7XG5cdFx0c2V0Q29sb3JWYXIoJy0tc2Vjb25kYXJ5LWxpZ2h0JywgbGlnaHRlbkRhcmtlbkNvbG9yKHNlY29uZEhleCwgMzApKTtcblx0XHRzZXRDb2xvclZhcignLS1zZWNvbmRhcnktZGFyaycsIGxpZ2h0ZW5EYXJrZW5Db2xvcihzZWNvbmRIZXgsIC0zMCkpO1xuXHR9XG5cblx0Y29uc3QgcmFuZG9tUmdiYVN0cmluZyA9ICgpID0+IHtcblx0XHRsZXQgciA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDI1NSk7XG5cdFx0bGV0IGcgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAyNTUpO1xuXHRcdGxldCBiID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMjU1KTtcblx0XHRyZXR1cm4ge3I6IHIsIGc6IGcsIGI6IGJ9O1xuXHR9XG5cblx0Y29uc3QgcmdiVG9IZXggPSAociwgZywgYikgPT4ge1xuICAgIFx0cmV0dXJuIFwiI1wiICsgY29tcG9uZW50VG9IZXgocikgKyBjb21wb25lbnRUb0hleChnKSArIGNvbXBvbmVudFRvSGV4KGIpO1xuXHR9XG5cblx0Y29uc3QgY29tcG9uZW50VG9IZXggPSAoYykgPT4ge1xuXHRcdGxldCBoZXggPSBjLnRvU3RyaW5nKDE2KTtcblx0XHRyZXR1cm4gaGV4Lmxlbmd0aCA9PSAxID8gXCIwXCIgKyBoZXggOiBoZXg7XG5cdH1cblxuXHRjb25zdCBsaWdodGVuRGFya2VuQ29sb3IgPSAoY29sLCBhbXQpID0+IHtcblx0XG5cdFx0dmFyIHVzZVBvdW5kID0gZmFsc2U7XG5cdFxuXHRcdGlmIChjb2xbMF0gPT0gXCIjXCIpIHtcblx0XHRcdGNvbCA9IGNvbC5zbGljZSgxKTtcblx0XHRcdHVzZVBvdW5kID0gdHJ1ZTtcblx0XHR9XG5cdFxuXHRcdHZhciBudW0gPSBwYXJzZUludChjb2wsMTYpO1xuXHRcblx0XHR2YXIgciA9IChudW0gPj4gMTYpICsgYW10O1xuXHRcblx0XHRpZiAociA+IDI1NSkgciA9IDI1NTtcblx0XHRlbHNlIGlmICAociA8IDApIHIgPSAwO1xuXHRcblx0XHR2YXIgYiA9ICgobnVtID4+IDgpICYgMHgwMEZGKSArIGFtdDtcblx0XG5cdFx0aWYgKGIgPiAyNTUpIGIgPSAyNTU7XG5cdFx0ZWxzZSBpZiAgKGIgPCAwKSBiID0gMDtcblx0XG5cdFx0dmFyIGcgPSAobnVtICYgMHgwMDAwRkYpICsgYW10O1xuXHRcblx0XHRpZiAoZyA+IDI1NSkgZyA9IDI1NTtcblx0XHRlbHNlIGlmIChnIDwgMCkgZyA9IDA7XG5cdFxuXHRcdHJldHVybiAodXNlUG91bmQ/XCIjXCI6XCJcIikgKyAoZyB8IChiIDw8IDgpIHwgKHIgPDwgMTYpKS50b1N0cmluZygxNik7XG5cdFxuXHR9XG48L3NjcmlwdD5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFnQ3dCLE1BQU0sOEJBQUMsQ0FBQyxBQUM5QixRQUFRLENBQUUsUUFBUSxBQUFFLENBQUMsQUFFdkIsZUFBZSw4QkFBQyxDQUFDLEFBQ2YsT0FBTyxDQUFFLElBQUksQ0FDYixlQUFlLENBQUUsUUFBUSxDQUN6QixjQUFjLENBQUUsR0FBRyxDQUNuQixTQUFTLENBQUUsQ0FBQyxDQUNaLE9BQU8sQ0FBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEFBQUUsQ0FBQyxBQUN0QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxDQUFDLEFBQUMsQ0FBQyxBQUN6QyxlQUFlLDhCQUFDLENBQUMsQUFDZixlQUFlLENBQUUsT0FBTyxDQUN4QixRQUFRLENBQUUsTUFBTSxDQUNoQixTQUFTLENBQUUsS0FBSyxBQUFFLENBQUMsQUFBQyxDQUFDLEFBQ3pCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pDLGVBQWUsOEJBQUMsQ0FBQyxBQUNmLGVBQWUsQ0FBRSxPQUFPLENBQ3hCLFFBQVEsQ0FBRSxNQUFNLENBQ2hCLFNBQVMsQ0FBRSxLQUFLLEFBQUUsQ0FBQyxBQUFDLENBQUMsQUFFM0IsY0FBYyw4QkFBQyxDQUFDLEFBQ2QsT0FBTyxDQUFFLElBQUksQ0FDYixTQUFTLENBQUUsS0FBSyxDQUNoQixTQUFTLENBQUUsS0FBSyxDQUNoQixXQUFXLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDcEIsNkJBQWMsQ0FBQyxVQUFVLGVBQUMsQ0FBQyxBQUN6QixVQUFVLENBQUUsTUFBTSxBQUFFLENBQUMsQUFFekIsSUFBSSw4QkFBQyxDQUFDLEFBQ0osUUFBUSxDQUFFLE1BQU0sQ0FDaEIsR0FBRyxDQUFFLENBQUMsQ0FDTixLQUFLLENBQUUsS0FBSyxDQUNaLFNBQVMsQ0FBRSxJQUFJLENBQ2YsV0FBVyxDQUFFLElBQUksQ0FDakIsV0FBVyxDQUFFLElBQUksQ0FDakIsTUFBTSxDQUFFLE9BQU8sQUFBRSxDQUFDLEFBQ2xCLG1CQUFJLENBQUMsU0FBUyxlQUFDLENBQUMsQUFDZCxNQUFNLENBQUUsT0FBTyxDQUNmLE9BQU8sQ0FBRSxJQUFJLENBQ2IsV0FBVyxDQUFFLE1BQU0sQUFBRSxDQUFDLEFBQ3RCLG1CQUFJLENBQUMsd0JBQVMsTUFBTSxBQUFDLENBQUMsQUFDcEIsVUFBVSxDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEFBQUUsQ0FBQyxBQUN6QyxtQkFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLGVBQUMsQ0FBQyxBQUNoQixLQUFLLENBQUUsS0FBSyxDQUNaLGVBQWUsQ0FBRSxJQUFJLENBQ3JCLE9BQU8sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMifQ== */";
	append_dev(document_1.head, style);
}

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
			attr_dev(a, "class", "svelte-13yuy3a");
			add_location(a, file, 25, 5, 1020);
			attr_dev(div, "class", "nav-link svelte-13yuy3a");
			add_location(div, file, 24, 4, 992);
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

function create_fragment(ctx) {
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

			attr_dev(img, "slot", "img");
			attr_dev(img, "alt", "Zooplus logo");
			if (img.src !== (img_src_value = "logo.png")) attr_dev(img, "src", img_src_value);
			add_location(img, file, 2, 2, 61);
			attr_dev(span0, "slot", "buttoncontent");
			attr_dev(span0, "class", "slotted-span");
			add_location(span0, file, 6, 5, 298);
			set_custom_element_data(zoo_button0, "type", zoo_button0_type_value = /*theme*/ ctx[0] === "zoo" ? "secondary" : "primary");
			set_custom_element_data(zoo_button0, "size", "medium");
			set_custom_element_data(zoo_button0, "class", "svelte-13yuy3a");
			add_location(zoo_button0, file, 5, 4, 179);
			attr_dev(div0, "class", "header-button svelte-13yuy3a");
			add_location(div0, file, 4, 3, 147);
			attr_dev(span1, "slot", "buttoncontent");
			attr_dev(span1, "class", "slotted-span");
			add_location(span1, file, 11, 5, 548);
			set_custom_element_data(zoo_button1, "type", zoo_button1_type_value = /*theme*/ ctx[0] === "grey" ? "secondary" : "primary");
			set_custom_element_data(zoo_button1, "size", "medium");
			set_custom_element_data(zoo_button1, "class", "svelte-13yuy3a");
			add_location(zoo_button1, file, 10, 4, 427);
			attr_dev(div1, "class", "header-button svelte-13yuy3a");
			add_location(div1, file, 9, 3, 395);
			attr_dev(span2, "slot", "buttoncontent");
			attr_dev(span2, "class", "slotted-span");
			add_location(span2, file, 16, 5, 802);
			set_custom_element_data(zoo_button2, "type", zoo_button2_type_value = /*theme*/ ctx[0] === "random" ? "secondary" : "primary");
			set_custom_element_data(zoo_button2, "size", "medium");
			set_custom_element_data(zoo_button2, "class", "svelte-13yuy3a");
			add_location(zoo_button2, file, 15, 4, 677);
			attr_dev(div2, "class", "header-button svelte-13yuy3a");
			add_location(div2, file, 14, 3, 645);
			attr_dev(div3, "class", "buttons-holder svelte-13yuy3a");
			add_location(div3, file, 3, 2, 115);
			set_custom_element_data(zoo_header, "headertext", "Zooplus web components");
			add_location(zoo_header, file, 1, 1, 10);
			add_location(div4, file, 22, 2, 954);
			set_custom_element_data(zoo_navigation, "class", "nav svelte-13yuy3a");
			add_location(zoo_navigation, file, 21, 1, 923);
			attr_dev(header, "class", "svelte-13yuy3a");
			add_location(header, file, 0, 0, 0);
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
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props, $$invalidate) {
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
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Header", $$slots, []);
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

class Header extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document_1.getElementById("svelte-13yuy3a-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Header",
			options,
			id: create_fragment.name
		});
	}
}

/* src/Context.svelte generated by Svelte v3.23.0 */

const file$1 = "src/Context.svelte";

function add_css$1() {
	var style = element("style");
	style.id = "svelte-1lqhecf-style";
	style.textContent = "section.svelte-1lqhecf.svelte-1lqhecf{min-height:80px;display:flex;align-items:center;margin-left:20px;background:white}.back-btn.svelte-1lqhecf.svelte-1lqhecf{margin-left:5px}.back-btn.svelte-1lqhecf a.svelte-1lqhecf{text-decoration:none;color:white}h2.svelte-1lqhecf.svelte-1lqhecf{color:var(--primary-mid, #3C9700);font-size:23px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udGV4dC5zdmVsdGUiLCJzb3VyY2VzIjpbIkNvbnRleHQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzZWN0aW9uPlxuXHQ8aDI+e3RleHR9PC9oMj5cblx0eyNpZiBiYWNrYnRufVxuXHRcdDxkaXYgY2xhc3M9XCJiYWNrLWJ0blwiPlxuXHRcdFx0PHpvby1idXR0b24+XG5cdFx0XHRcdDwhLS0gc3ZlbHRlLWlnbm9yZSBhMTF5LWludmFsaWQtYXR0cmlidXRlIC0tPlxuXHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPjxhIGhyZWY9XCIjXCI+R28gdG8gdG9wPC9hPjwvc3Bhbj5cblx0XHRcdDwvem9vLWJ1dHRvbj5cblx0XHQ8L2Rpdj5cblx0ey9pZn1cbjwvc2VjdGlvbj5cblxuPHN0eWxlPlxuXHRzZWN0aW9uIHtcblx0XHRtaW4taGVpZ2h0OiA4MHB4O1xuXHRcdGRpc3BsYXk6IGZsZXg7XG5cdFx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0XHRtYXJnaW4tbGVmdDogMjBweDtcblx0XHRiYWNrZ3JvdW5kOiB3aGl0ZTtcblx0fVxuXG5cdC5iYWNrLWJ0biB7XG5cdFx0bWFyZ2luLWxlZnQ6IDVweDtcblx0fVxuXHRcblx0LmJhY2stYnRuIGEge1xuXHRcdHRleHQtZGVjb3JhdGlvbjogbm9uZTtcblx0XHRjb2xvcjogd2hpdGU7XG5cdH1cblxuXHRoMiB7XG5cdFx0Y29sb3I6IHZhcigtLXByaW1hcnktbWlkLCAjM0M5NzAwKTtcblx0XHRmb250LXNpemU6IDIzcHg7XG5cdH1cbjwvc3R5bGU+XG5cbjxzY3JpcHQ+IFxuXHRleHBvcnQgbGV0IHRleHQgPSAnJztcblx0ZXhwb3J0IGxldCBiYWNrYnRuID0gZmFsc2U7XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBYUMsT0FBTyw4QkFBQyxDQUFDLEFBQ1IsVUFBVSxDQUFFLElBQUksQ0FDaEIsT0FBTyxDQUFFLElBQUksQ0FDYixXQUFXLENBQUUsTUFBTSxDQUNuQixXQUFXLENBQUUsSUFBSSxDQUNqQixVQUFVLENBQUUsS0FBSyxBQUNsQixDQUFDLEFBRUQsU0FBUyw4QkFBQyxDQUFDLEFBQ1YsV0FBVyxDQUFFLEdBQUcsQUFDakIsQ0FBQyxBQUVELHdCQUFTLENBQUMsQ0FBQyxlQUFDLENBQUMsQUFDWixlQUFlLENBQUUsSUFBSSxDQUNyQixLQUFLLENBQUUsS0FBSyxBQUNiLENBQUMsQUFFRCxFQUFFLDhCQUFDLENBQUMsQUFDSCxLQUFLLENBQUUsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQ2xDLFNBQVMsQ0FBRSxJQUFJLEFBQ2hCLENBQUMifQ== */";
	append_dev(document.head, style);
}

// (3:1) {#if backbtn}
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
			attr_dev(a, "class", "svelte-1lqhecf");
			add_location(a, file$1, 6, 31, 164);
			attr_dev(span, "slot", "buttoncontent");
			add_location(span, file$1, 6, 4, 137);
			add_location(zoo_button, file$1, 4, 3, 70);
			attr_dev(div, "class", "back-btn svelte-1lqhecf");
			add_location(div, file$1, 3, 2, 44);
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
		source: "(3:1) {#if backbtn}",
		ctx
	});

	return block;
}

function create_fragment$1(ctx) {
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
			attr_dev(h2, "class", "svelte-1lqhecf");
			add_location(h2, file$1, 1, 1, 11);
			attr_dev(section, "class", "svelte-1lqhecf");
			add_location(section, file$1, 0, 0, 0);
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
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props, $$invalidate) {
	let { text = "" } = $$props;
	let { backbtn = false } = $$props;
	const writable_props = ["text", "backbtn"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Context> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Context", $$slots, []);

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

class Context extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document.getElementById("svelte-1lqhecf-style")) add_css$1();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { text: 0, backbtn: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Context",
			options,
			id: create_fragment$1.name
		});
	}

	get text() {
		throw new Error("<Context>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set text(value) {
		throw new Error("<Context>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get backbtn() {
		throw new Error("<Context>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set backbtn(value) {
		throw new Error("<Context>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* src/Buttons.svelte generated by Svelte v3.23.0 */
const file$2 = "src/Buttons.svelte";

function add_css$2() {
	var style = element("style");
	style.id = "svelte-1jbblec-style";
	style.textContent = ".buttons.svelte-1jbblec.svelte-1jbblec{max-width:1280px;margin:20px auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(330px, 1fr));grid-gap:15px;width:90%;justify-content:center}zoo-tooltip.svelte-1jbblec.svelte-1jbblec{display:none}.top-tooltip.svelte-1jbblec.svelte-1jbblec{position:relative;display:inline-block}.top-tooltip.svelte-1jbblec:hover zoo-tooltip.svelte-1jbblec{display:block}.icon-btn.svelte-1jbblec.svelte-1jbblec{width:40px}.btn-svg.svelte-1jbblec.svelte-1jbblec{padding:0}.btn-svg.svelte-1jbblec path.svelte-1jbblec{fill:white}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQnV0dG9ucy5zdmVsdGUiLCJzb3VyY2VzIjpbIkJ1dHRvbnMuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjx6b28tdG9hc3QgdGV4dD1cIlNlYXJjaCBmb3IgbW9yZSB0aGFuIDguMDAwIHByb2R1Y3RzLlwiIGJpbmQ6dGhpcz17dG9hc3R9Pjwvem9vLXRvYXN0PlxuPHpvby10b2FzdCB0ZXh0PVwiQWRkZWQgdG8gY2FydCFcIiBiaW5kOnRoaXM9e21vZGFsVG9hc3R9Pjwvem9vLXRvYXN0PlxuPENvbnRleHQgdGV4dD1cIkJ1dHRvbnMsIHRvb2x0aXBzLCBtb2RhbCB3aW5kb3dzXCIvPlxuPGRpdiBjbGFzcz1cImJ1dHRvbnNcIj5cblx0PHpvby1idXR0b24gc2l6ZT1cInNtYWxsXCIgb246Y2xpY2s9XCJ7KCkgPT4gdG9hc3Quc2hvdygpfVwiPlxuXHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+U3VtbW9uIHRvYXN0ITwvc3Bhbj5cblx0PC96b28tYnV0dG9uPlxuXHQ8em9vLWJ1dHRvbiBzaXplPVwic21hbGxcIiBkaXNhYmxlZD1cInt0cnVlfVwiIGNsYXNzPVwidG9wLXRvb2x0aXBcIj5cblx0XHQ8ZGl2IHNsb3Q9XCJidXR0b25jb250ZW50XCI+XG5cdFx0XHREaXNhYmxlZCA6KFxuXHRcdFx0PHpvby10b29sdGlwIHBvc2l0aW9uPVwiYm90dG9tXCIgdGV4dD1cIkp1c3Qgc2V0IGRpc2FibGVkIGF0dHJpYnV0ZSBvbiBgem9vLWJ1dHRvbmBcIj48L3pvby10b29sdGlwPlxuXHRcdDwvZGl2PlxuXHQ8L3pvby1idXR0b24+XG5cdDx6b28tYnV0dG9uIHR5cGU9XCJzZWNvbmRhcnlcIiBzaXplPVwic21hbGxcIiBvbjpjbGljaz1cInsoKSA9PiBtb2RhbC5vcGVuTW9kYWwoKX1cIj5cblx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPlNob3cgbW9kYWw8L3NwYW4+XG5cdDwvem9vLWJ1dHRvbj5cblx0PHpvby1idXR0b24gdHlwZT1cImhvbGxvd1wiIHNpemU9XCJzbWFsbFwiPlxuXHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+RHVtbXkgYnV0dG9uIHRoYXQgZG9lcyBub3RoaW5nPC9zcGFuPlxuXHQ8L3pvby1idXR0b24+XG5cdDx6b28tYnV0dG9uIHNpemU9XCJzbWFsbFwiIGNsYXNzPVwiaWNvbi1idG5cIj5cblx0XHQ8c3ZnIHRpdGxlPVwiRXhhbXBsZSB0aXRsZVwiIGNsYXNzPVwiYnRuLXN2Z1wiIHNsb3Q9XCJidXR0b25jb250ZW50XCIgd2lkdGg9XCIyNFwiIGhlaWdodD1cIjI0XCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPjxnIGZpbGw9XCIjNTU1XCIgZmlsbC1ydWxlPVwiZXZlbm9kZFwiPjxwYXRoIGQ9XCJNOSAxNC45OThhMyAzIDAgMDEwIDZ2Mi4yNTJhLjc1Ljc1IDAgMTEtMS41IDB2LTcuNDM0YS43NS43NSAwIDAxLjc0Ny0uODE4aC43NTN6bTMuODc1LTE1Yy41OTcgMCAxLjE3LjIzOCAxLjU5MS42Nmw1Ljg3MSA1Ljg3Yy40MjIuNDIzLjY2Ljk5NS42NTkgMS41OTJ2NC42MjhhLjc1Ljc1IDAgMTEtMS41IDBWOC4xMmEuNzUuNzUgMCAwMC0uMjItLjUzbC01Ljg3LTUuODcyYS43NS43NSAwIDAwLS41MzEtLjIySDIuMjQ2YS43NS43NSAwIDAwLS43NS43NXYxOS41YzAgLjQxNC4zMzYuNzUuNzUuNzVoM2EuNzUuNzUgMCAxMTAgMS41aC0zYTIuMjUgMi4yNSAwIDAxLTIuMjUtMi4yNXYtMTkuNWEyLjI1IDIuMjUgMCAwMTIuMjUtMi4yNWgxMC42M3ptMTAuMzcxIDE1YS43NS43NSAwIDAxMCAxLjVoLTEuNWEuNzUuNzUgMCAwMC0uNzUuNzV2Mi4yNTFsMS41MDQuMDAxYS43NS43NSAwIDExMCAxLjVsLTEuNTA0LS4wMDF2Mi4yNDlhLjc1Ljc1IDAgMTEtMS41IDB2LTZhMi4yNSAyLjI1IDAgMDEyLjI1LTIuMjVoMS41em0tOSAwYTMuNzUgMy43NSAwIDAxMy43NSAzLjc1djEuNWEzLjc1IDMuNzUgMCAwMS0zLjc1IDMuNzUuNzUuNzUgMCAwMS0uNzUtLjc1di03LjVhLjc1Ljc1IDAgMDEuNzUtLjc1em0uNzUgMS42Mjh2NS43NDRhMi4yNSAyLjI1IDAgMDAxLjUtMi4xMjJ2LTEuNWEyLjI1IDIuMjUgMCAwMC0xLjUtMi4xMjJ6TTkgMTYuNDk4djNhMS41IDEuNSAwIDAwMC0zelwiLz48cGF0aCBkPVwiTTIwLjI0NiA3LjQ5OGEuNzUuNzUgMCAxMTAgMS41aC02YTIuMjUgMi4yNSAwIDAxLTIuMjUtMi4yNXYtNmEuNzUuNzUgMCAwMTEuNSAwdjZjMCAuNDE0LjMzNi43NS43NS43NWg2elwiLz48L2c+PC9zdmc+XG5cdDwvem9vLWJ1dHRvbj5cblx0PHpvby1idXR0b24gdHlwZT1cInNlY29uZGFyeVwiIHNpemU9XCJzbWFsbFwiIGNsYXNzPVwiaWNvbi1idG5cIj5cblx0XHQ8c3ZnIHRpdGxlPVwiRXhhbXBsZSB0aXRsZVwiIGNsYXNzPVwiYnRuLXN2Z1wiIHNsb3Q9XCJidXR0b25jb250ZW50XCIgd2lkdGg9XCIyNFwiIGhlaWdodD1cIjI0XCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPjxwYXRoIGQ9XCJNMTIgNC4zMjRsMS4wMzYtMS4wMzVhNi40MjMgNi40MjMgMCAwMTkuMDk0IDkuMDcxbC05LjU4OSAxMC4wMDNhLjc1Ljc1IDAgMDEtMS4wODIgMGwtOS41NzctOS45ODhBNi40MjIgNi40MjIgMCAwMTUuMzk0IDEuNDlhNi40MjMgNi40MjMgMCAwMTUuNTcgMS43OThMMTIgNC4zMjR6XCIgZmlsbD1cIiM1NTVcIiBmaWxsLXJ1bGU9XCJldmVub2RkXCIvPjwvc3ZnPlxuXHQ8L3pvby1idXR0b24+XG48L2Rpdj4gXG48em9vLW1vZGFsIHN0eWxlPVwiZGlzcGxheTogbm9uZVwiIGhlYWRlcnRleHQ9XCJZb3VyIGJhc2tldCBjb250YWlucyBsaWNlbnNlZCBpdGVtc1wiIGJpbmQ6dGhpcz17bW9kYWx9PlxuXHQ8ZGl2PlxuXHRcdDx6b28tZmVlZGJhY2sgXG5cdFx0dHlwZT1cImluZm9cIiBcblx0XHR0ZXh0PVwiVGhpcyBpcyBhbiBpbmZvIG1lc3NhZ2UuIE9ubHkgb25lIGNvdXBvbiBjYW4gYmUgYWNjZXB0ZWQgd2l0aCBlYWNoIG9yZGVyLiBQbGVhc2UgY2hvb3NlIG9uZSBjb3Vwb24gdGhhdCB5b3UganVzdCBlbnRlcmVkLlwiPlxuXHRcdDwvem9vLWZlZWRiYWNrPlxuXHRcdDxicj5cblx0XHQ8em9vLXNlbGVjdCBsYWJlbHRleHQ9XCJUaGlzIHByb2R1Y3QgaXMgZm9yXCIgXG5cdFx0XHR2YWxpZD1cInt0cnVlfVwiPlxuXHRcdFx0PHNlbGVjdCBzbG90PVwic2VsZWN0ZWxlbWVudFwiPlxuXHRcdFx0XHQ8b3B0aW9uIGNsYXNzPVwicGxhY2Vob2xkZXJcIiB2YWx1ZT1cIlwiIGRpc2FibGVkIHNlbGVjdGVkPkRvZ2U8L29wdGlvbj5cblx0XHRcdFx0PG9wdGlvbj5Eb2dlPC9vcHRpb24+XG5cdFx0XHRcdDxvcHRpb24+Q2F0ejwvb3B0aW9uPlxuXHRcdFx0XHQ8b3B0aW9uPlNuZWs8L29wdGlvbj5cblx0XHRcdDwvc2VsZWN0PlxuXHRcdDwvem9vLXNlbGVjdD5cblx0XHQ8YnI+XG5cdFx0PHpvby1jaGVja2JveCBoaWdobGlnaHRlZFxuXHRcdFx0bGFiZWx0ZXh0PVwiSSB1bmRlcnN0YW5kIGFuZCBjb25maXJtIHRoYXQgQUxMIG9mIHRoZSBhYm92ZSBzdGF0ZW1lbnRzIGFyZSB0cnVlXCI+XG5cdFx0XHQ8aW5wdXQgc2xvdD1cImNoZWNrYm94ZWxlbWVudFwiIHR5cGU9XCJjaGVja2JveFwiLz5cblx0XHQ8L3pvby1jaGVja2JveD5cblx0XHQ8YnI+XG5cdFx0PHpvby1idXR0b24gc3R5bGU9XCJtYXJnaW46IDAgYXV0b1wiIHR5cGU9XCJob2xsb3dcIiBzaXplPVwibWVkaXVtXCIgb246Y2xpY2s9XCJ7KCkgPT4gY2xvc2VNb2RhbCgpfVwiPlxuXHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj5BZGQgdG8gY2FydDwvc3Bhbj5cblx0XHQ8L3pvby1idXR0b24+XG5cdDwvZGl2PlxuPC96b28tbW9kYWw+XG48c3R5bGU+XG5cdC5idXR0b25zIHtcblx0XHRtYXgtd2lkdGg6IDEyODBweDtcblx0XHRtYXJnaW46IDIwcHggYXV0bztcblx0XHRkaXNwbGF5OiBncmlkO1xuXHRcdGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KGF1dG8tZmlsbCwgbWlubWF4KDMzMHB4LCAxZnIpKTtcblx0XHRncmlkLWdhcDogMTVweDtcblx0XHR3aWR0aDogOTAlO1xuXHRcdGp1c3RpZnktY29udGVudDogY2VudGVyO1xuXHR9XG5cblx0em9vLXRvb2x0aXAge1xuXHRcdGRpc3BsYXk6IG5vbmU7XG5cdH1cblxuXHQudG9wLXRvb2x0aXAge1xuXHRcdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0XHRkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG5cdH1cblxuXHQudG9wLXRvb2x0aXA6aG92ZXIgem9vLXRvb2x0aXAge1xuXHRcdGRpc3BsYXk6IGJsb2NrO1xuXHR9XG5cblx0Lmljb24tYnRuIHtcblx0XHR3aWR0aDogNDBweDtcblx0fVxuXG5cdC5idG4tc3ZnIHtcblx0XHRwYWRkaW5nOiAwO1xuXHR9XG5cblx0LmJ0bi1zdmcgcGF0aCB7XG5cdFx0ZmlsbDogd2hpdGU7XG5cdH1cbjwvc3R5bGU+XG48c2NyaXB0PlxuXHRpbXBvcnQgQ29udGV4dCBmcm9tICcuL0NvbnRleHQuc3ZlbHRlJztcblx0bGV0IHRvYXN0O1xuXHRsZXQgbW9kYWw7XG5cdGxldCBtb2RhbFRvYXN0O1xuXG5cdGNvbnN0IHNob3dNb2RhbCA9ICgpID0+IHtcblx0XHRtb2RhbC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcblx0fTtcblx0Y29uc3QgY2xvc2VNb2RhbCA9ICgpID0+IHtcblx0XHRtb2RhbC5jbG9zZU1vZGFsKCk7XG5cdFx0bW9kYWxUb2FzdC5zaG93KCk7XG5cdH1cbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFzREMsUUFBUSw4QkFBQyxDQUFDLEFBQ1QsU0FBUyxDQUFFLE1BQU0sQ0FDakIsTUFBTSxDQUFFLElBQUksQ0FBQyxJQUFJLENBQ2pCLE9BQU8sQ0FBRSxJQUFJLENBQ2IscUJBQXFCLENBQUUsT0FBTyxTQUFTLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQzVELFFBQVEsQ0FBRSxJQUFJLENBQ2QsS0FBSyxDQUFFLEdBQUcsQ0FDVixlQUFlLENBQUUsTUFBTSxBQUN4QixDQUFDLEFBRUQsV0FBVyw4QkFBQyxDQUFDLEFBQ1osT0FBTyxDQUFFLElBQUksQUFDZCxDQUFDLEFBRUQsWUFBWSw4QkFBQyxDQUFDLEFBQ2IsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsT0FBTyxDQUFFLFlBQVksQUFDdEIsQ0FBQyxBQUVELDJCQUFZLE1BQU0sQ0FBQyxXQUFXLGVBQUMsQ0FBQyxBQUMvQixPQUFPLENBQUUsS0FBSyxBQUNmLENBQUMsQUFFRCxTQUFTLDhCQUFDLENBQUMsQUFDVixLQUFLLENBQUUsSUFBSSxBQUNaLENBQUMsQUFFRCxRQUFRLDhCQUFDLENBQUMsQUFDVCxPQUFPLENBQUUsQ0FBQyxBQUNYLENBQUMsQUFFRCx1QkFBUSxDQUFDLElBQUksZUFBQyxDQUFDLEFBQ2QsSUFBSSxDQUFFLEtBQUssQUFDWixDQUFDIn0= */";
	append_dev(document.head, style);
}

function create_fragment$2(ctx) {
	let zoo_toast0;
	let t0;
	let zoo_toast1;
	let t1;
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
	let current;
	let mounted;
	let dispose;

	const context = new Context({
			props: { text: "Buttons, tooltips, modal windows" },
			$$inline: true
		});

	const block = {
		c: function create() {
			zoo_toast0 = element("zoo-toast");
			t0 = space();
			zoo_toast1 = element("zoo-toast");
			t1 = space();
			create_component(context.$$.fragment);
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
			set_custom_element_data(zoo_toast0, "text", "Search for more than 8.000 products.");
			add_location(zoo_toast0, file$2, 0, 0, 0);
			set_custom_element_data(zoo_toast1, "text", "Added to cart!");
			add_location(zoo_toast1, file$2, 1, 0, 86);
			attr_dev(span0, "slot", "buttoncontent");
			add_location(span0, file$2, 5, 2, 289);
			set_custom_element_data(zoo_button0, "size", "small");
			add_location(zoo_button0, file$2, 4, 1, 229);
			set_custom_element_data(zoo_tooltip, "position", "bottom");
			set_custom_element_data(zoo_tooltip, "text", "Just set disabled attribute on `zoo-button`");
			set_custom_element_data(zoo_tooltip, "class", "svelte-1jbblec");
			add_location(zoo_tooltip, file$2, 10, 3, 464);
			attr_dev(div0, "slot", "buttoncontent");
			add_location(div0, file$2, 8, 2, 419);
			set_custom_element_data(zoo_button1, "size", "small");
			set_custom_element_data(zoo_button1, "disabled", zoo_button1_disabled_value = true);
			set_custom_element_data(zoo_button1, "class", "top-tooltip svelte-1jbblec");
			add_location(zoo_button1, file$2, 7, 1, 353);
			attr_dev(span1, "slot", "buttoncontent");
			add_location(span1, file$2, 14, 2, 668);
			set_custom_element_data(zoo_button2, "type", "secondary");
			set_custom_element_data(zoo_button2, "size", "small");
			add_location(zoo_button2, file$2, 13, 1, 586);
			attr_dev(span2, "slot", "buttoncontent");
			add_location(span2, file$2, 17, 2, 771);
			set_custom_element_data(zoo_button3, "type", "hollow");
			set_custom_element_data(zoo_button3, "size", "small");
			add_location(zoo_button3, file$2, 16, 1, 729);
			attr_dev(path0, "d", "M9 14.998a3 3 0 010 6v2.252a.75.75 0 11-1.5 0v-7.434a.75.75 0 01.747-.818h.753zm3.875-15c.597 0 1.17.238 1.591.66l5.871 5.87c.422.423.66.995.659 1.592v4.628a.75.75 0 11-1.5 0V8.12a.75.75 0 00-.22-.53l-5.87-5.872a.75.75 0 00-.531-.22H2.246a.75.75 0 00-.75.75v19.5c0 .414.336.75.75.75h3a.75.75 0 110 1.5h-3a2.25 2.25 0 01-2.25-2.25v-19.5a2.25 2.25 0 012.25-2.25h10.63zm10.371 15a.75.75 0 010 1.5h-1.5a.75.75 0 00-.75.75v2.251l1.504.001a.75.75 0 110 1.5l-1.504-.001v2.249a.75.75 0 11-1.5 0v-6a2.25 2.25 0 012.25-2.25h1.5zm-9 0a3.75 3.75 0 013.75 3.75v1.5a3.75 3.75 0 01-3.75 3.75.75.75 0 01-.75-.75v-7.5a.75.75 0 01.75-.75zm.75 1.628v5.744a2.25 2.25 0 001.5-2.122v-1.5a2.25 2.25 0 00-1.5-2.122zM9 16.498v3a1.5 1.5 0 000-3z");
			attr_dev(path0, "class", "svelte-1jbblec");
			add_location(path0, file$2, 20, 159, 1054);
			attr_dev(path1, "d", "M20.246 7.498a.75.75 0 110 1.5h-6a2.25 2.25 0 01-2.25-2.25v-6a.75.75 0 011.5 0v6c0 .414.336.75.75.75h6z");
			attr_dev(path1, "class", "svelte-1jbblec");
			add_location(path1, file$2, 20, 890, 1785);
			attr_dev(g, "fill", "#555");
			attr_dev(g, "fill-rule", "evenodd");
			add_location(g, file$2, 20, 124, 1019);
			attr_dev(svg0, "title", "Example title");
			attr_dev(svg0, "class", "btn-svg svelte-1jbblec");
			attr_dev(svg0, "slot", "buttoncontent");
			attr_dev(svg0, "width", "24");
			attr_dev(svg0, "height", "24");
			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
			add_location(svg0, file$2, 20, 2, 897);
			set_custom_element_data(zoo_button4, "size", "small");
			set_custom_element_data(zoo_button4, "class", "icon-btn svelte-1jbblec");
			add_location(zoo_button4, file$2, 19, 1, 852);
			attr_dev(path2, "d", "M12 4.324l1.036-1.035a6.423 6.423 0 019.094 9.071l-9.589 10.003a.75.75 0 01-1.082 0l-9.577-9.988A6.422 6.422 0 015.394 1.49a6.423 6.423 0 015.57 1.798L12 4.324z");
			attr_dev(path2, "fill", "#555");
			attr_dev(path2, "fill-rule", "evenodd");
			attr_dev(path2, "class", "svelte-1jbblec");
			add_location(path2, file$2, 23, 124, 2111);
			attr_dev(svg1, "title", "Example title");
			attr_dev(svg1, "class", "btn-svg svelte-1jbblec");
			attr_dev(svg1, "slot", "buttoncontent");
			attr_dev(svg1, "width", "24");
			attr_dev(svg1, "height", "24");
			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
			add_location(svg1, file$2, 23, 2, 1989);
			set_custom_element_data(zoo_button5, "type", "secondary");
			set_custom_element_data(zoo_button5, "size", "small");
			set_custom_element_data(zoo_button5, "class", "icon-btn svelte-1jbblec");
			add_location(zoo_button5, file$2, 22, 1, 1927);
			attr_dev(div1, "class", "buttons svelte-1jbblec");
			add_location(div1, file$2, 3, 0, 206);
			set_custom_element_data(zoo_feedback, "type", "info");
			set_custom_element_data(zoo_feedback, "text", "This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered.");
			add_location(zoo_feedback, file$2, 28, 2, 2455);
			add_location(br0, file$2, 32, 2, 2637);
			attr_dev(option0, "class", "placeholder");
			option0.__value = "";
			option0.value = option0.__value;
			option0.disabled = true;
			option0.selected = true;
			add_location(option0, file$2, 36, 4, 2745);
			option1.__value = "Doge";
			option1.value = option1.__value;
			add_location(option1, file$2, 37, 4, 2818);
			option2.__value = "Catz";
			option2.value = option2.__value;
			add_location(option2, file$2, 38, 4, 2844);
			option3.__value = "Snek";
			option3.value = option3.__value;
			add_location(option3, file$2, 39, 4, 2870);
			attr_dev(select, "slot", "selectelement");
			add_location(select, file$2, 35, 3, 2711);
			set_custom_element_data(zoo_select, "labeltext", "This product is for");
			set_custom_element_data(zoo_select, "valid", zoo_select_valid_value = true);
			add_location(zoo_select, file$2, 33, 2, 2644);
			add_location(br1, file$2, 42, 2, 2923);
			attr_dev(input, "slot", "checkboxelement");
			attr_dev(input, "type", "checkbox");
			add_location(input, file$2, 45, 3, 3042);
			set_custom_element_data(zoo_checkbox, "highlighted", "");
			set_custom_element_data(zoo_checkbox, "labeltext", "I understand and confirm that ALL of the above statements are true");
			add_location(zoo_checkbox, file$2, 43, 2, 2930);
			add_location(br2, file$2, 47, 2, 3110);
			attr_dev(span3, "slot", "buttoncontent");
			add_location(span3, file$2, 49, 3, 3216);
			set_style(zoo_button6, "margin", "0 auto");
			set_custom_element_data(zoo_button6, "type", "hollow");
			set_custom_element_data(zoo_button6, "size", "medium");
			add_location(zoo_button6, file$2, 48, 2, 3117);
			add_location(div2, file$2, 27, 1, 2447);
			set_style(zoo_modal, "display", "none");
			set_custom_element_data(zoo_modal, "headertext", "Your basket contains licensed items");
			add_location(zoo_modal, file$2, 26, 0, 2345);
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
			mount_component(context, target, anchor);
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
			current = true;

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
		i: function intro(local) {
			if (current) return;
			transition_in(context.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(context.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(zoo_toast0);
			/*zoo_toast0_binding*/ ctx[5](null);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(zoo_toast1);
			/*zoo_toast1_binding*/ ctx[6](null);
			if (detaching) detach_dev(t1);
			destroy_component(context, detaching);
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
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$2($$self, $$props, $$invalidate) {
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
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Buttons> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Buttons", $$slots, []);

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
		Context,
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

class Buttons extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document.getElementById("svelte-1jbblec-style")) add_css$2();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Buttons",
			options,
			id: create_fragment$2.name
		});
	}
}

/* src/Form.svelte generated by Svelte v3.23.0 */
const file$3 = "src/Form.svelte";

function add_css$3() {
	var style = element("style");
	style.id = "svelte-lyt1nm-style";
	style.textContent = ".form.svelte-lyt1nm{flex:1 0 auto;margin:20px auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));grid-template-rows:120px 150px 150px 100px;grid-gap:20px}@media only screen and (max-width: 544px){.form.svelte-lyt1nm{width:300px;grid-template-columns:auto}}@media only screen and (max-width: 812px){.form.svelte-lyt1nm{grid-template-rows:120px 150px 120px 120px}}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9ybS5zdmVsdGUiLCJzb3VyY2VzIjpbIkZvcm0uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxDb250ZXh0IHRleHQ9XCJGb3JtIGVsZW1lbnRzXCIvPlxuPGZvcm0gY2xhc3M9XCJmb3JtXCI+XG5cdDx6b28taW5wdXQgbGlua3RleHQ9XCJGb3Jnb3R0ZW4geW91ciBwYXNzd29yZD9cIiBsaW5raHJlZj1cImh0dHBzOi8vZ29vZ2xlLmNvbVwiIGxpbmt0YXJnZXQ9XCJhYm91dDpibGFua1wiXG5cdFx0XHQgICBpbmZvdGV4dD1cIkFkZGl0aW9uYWwgaGVscGZ1bCBpbmZvcm1hdGlvbiBmb3Igb3VyIHVzZXJzXCI+XG5cdFx0PGlucHV0IGlkPVwiaW5wdXQtdHlwZS10ZXh0XCIgc2xvdD1cImlucHV0ZWxlbWVudFwiIHR5cGU9XCJ0ZXh0XCIgcGxhY2Vob2xkZXI9XCJpbnB1dFwiIC8+XG5cdFx0PGxhYmVsIGZvcj1cImlucHV0LXR5cGUtdGV4dFwiIHNsb3Q9XCJpbnB1dGxhYmVsXCI+SW5wdXQgdHlwZSB0ZXh0PC9sYWJlbD5cblx0PC96b28taW5wdXQ+XG5cdDx6b28taW5wdXQgbGlua3RleHQ9XCJMZWFybiB5b3VyIEhUTUwgYW5kIGRvbid0IG92ZXJjb21wbGljYXRlXCIgbGlua3RhcmdldD1cImFib3V0OmJsYW5rXCJcblx0XHRcdCAgIGxpbmtocmVmPVwiaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSFRNTC9FbGVtZW50L2RhdGFsaXN0XCJcblx0XHRcdCAgIGluZm90ZXh0PVwiUG9zc2libGUgdmFsdWVzOiBEb2csIENhdCwgU21hbGwgUGV0LCBCaXJkLCBBcXVhdGljXCI+XG5cdFx0PGlucHV0IGlkPVwiaW5wdXQtdHlwZS1udW1iZXJcIiBzbG90PVwiaW5wdXRlbGVtZW50XCIgcGxhY2Vob2xkZXI9XCJpbnB1dFwiIGxpc3Q9XCJhbmltYWxzXCIvPlxuXHRcdDxsYWJlbCBmb3I9XCJpbnB1dC10eXBlLW51bWJlclwiIHNsb3Q9XCJpbnB1dGxhYmVsXCI+QXV0b2NvbXBsZXRlPC9sYWJlbD5cblx0PC96b28taW5wdXQ+XG5cdDxkYXRhbGlzdCBpZD1cImFuaW1hbHNcIj5cblx0XHQ8b3B0aW9uIHZhbHVlPVwiRG9nXCI+XG5cdFx0PG9wdGlvbiB2YWx1ZT1cIkNhdFwiPlxuXHRcdDxvcHRpb24gdmFsdWU9XCJTbWFsbCBQZXRcIj5cblx0XHQ8b3B0aW9uIHZhbHVlPVwiQmlyZFwiPlxuXHRcdDxvcHRpb24gdmFsdWU9XCJBcXVhdGljXCI+XG5cdDwvZGF0YWxpc3Q+XG5cdDx6b28taW5wdXQgbGlua3RleHQ9XCJOYXRpdmUgZGF0ZSBwaWNrZXIgcG9seWZpbGwgb24gR2l0aHViXCIgbGlua2hyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vamNnZXJ0aWcvZGF0ZS1pbnB1dC1wb2x5ZmlsbFwiXG5cdFx0XHQgICBsaW5rdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIiBpbmZvdGV4dD1cIkNsaWNrIG9uIGlucHV0IHRvIHNob3cgY29udGV4dCBtZW51IHdpdGggZGF0ZSBzZWxlY3Rpb25cIj5cblx0XHQ8aW5wdXQgaWQ9XCJpbnB1dC10eXBlLWRhdGVcIiBzbG90PVwiaW5wdXRlbGVtZW50XCIgdHlwZT1cImRhdGVcIiBwbGFjZWhvbGRlcj1cIkVudGVyIGRhdGVcIiAvPlxuXHRcdDxsYWJlbCBmb3I9XCJpbnB1dC10eXBlLWRhdGVcIiBzbG90PVwiaW5wdXRsYWJlbFwiPklucHV0IHR5cGUgZGF0ZTwvbGFiZWw+XG5cdDwvem9vLWlucHV0PlxuXHQ8em9vLWlucHV0IGluZm90ZXh0PVwiU2VsZWN0IHRpbWVcIj5cblx0XHQ8aW5wdXQgaWQ9XCJpbnB1dC10eXBlLXRpbWVcIiBzbG90PVwiaW5wdXRlbGVtZW50XCIgdHlwZT1cInRpbWVcIiBwbGFjZWhvbGRlcj1cIkVudGVyIHRpbWVcIiAvPlxuXHRcdDxsYWJlbCBmb3I9XCJpbnB1dC10eXBlLXRpbWVcIiBzbG90PVwiaW5wdXRsYWJlbFwiPklucHV0IHR5cGUgdGltZTwvbGFiZWw+XG5cdDwvem9vLWlucHV0PlxuXHQ8em9vLWlucHV0PlxuXHRcdDx0ZXh0YXJlYSBpZD1cInRleHRhcmVhXCIgc2xvdD1cImlucHV0ZWxlbWVudFwiIHBsYWNlaG9sZGVyPVwiVGV4dGFyZWFcIj48L3RleHRhcmVhPlxuXHRcdDxsYWJlbCBmb3I9XCJ0ZXh0YXJlYVwiIHNsb3Q9XCJpbnB1dGxhYmVsXCI+VGV4dGFyZWE8L2xhYmVsPlxuXHQ8L3pvby1pbnB1dD5cblx0PHpvby1zZWxlY3QgbGlua3RleHQ9XCJEb2N1bWVudGF0aW9uIGxpbmtcIiBsaW5raHJlZj1cImh0dHBzOi8vZ29vZ2xlLmNvbVwiIGxpbmt0YXJnZXQ9XCJhYm91dDpibGFua1wiIGluZm90ZXh0PVwiQWRkaXRpb25hbCBoZWxwZnVsIGluZm9ybWF0aW9uIGZvciBvdXIgdXNlcnNcIj5cblx0XHQ8c2VsZWN0IGlkPVwibXVsdGlzZWxlY3RcIiBzbG90PVwic2VsZWN0ZWxlbWVudFwiIG11bHRpcGxlPlxuXHRcdFx0PG9wdGlvbiBjbGFzcz1cInBsYWNlaG9sZGVyXCIgdmFsdWU9XCJcIiBkaXNhYmxlZCBzZWxlY3RlZD5QbGFjZWhvbGRlcjwvb3B0aW9uPlxuXHRcdFx0PG9wdGlvbj4xPC9vcHRpb24+XG5cdFx0XHQ8b3B0aW9uPjI8L29wdGlvbj5cblx0XHRcdDxvcHRpb24+Mzwvb3B0aW9uPlxuXHRcdDwvc2VsZWN0PlxuXHRcdDxsYWJlbCBmb3I9XCJtdWx0aXNlbGVjdFwiIHNsb3Q9XCJzZWxlY3RsYWJlbFwiPk11bHRpc2VsZWN0PC9sYWJlbD5cblx0PC96b28tc2VsZWN0PlxuXHQ8em9vLXNlbGVjdCBpbmZvdGV4dD1cIkFkZGl0aW9uYWwgaGVscGZ1bCBpbmZvcm1hdGlvbiBmb3Igb3VyIHVzZXJzXCI+XG5cdFx0PHNlbGVjdCBpZD1cInN0YW5kYXJkLXNlbGVjdFwiIHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XG5cdFx0XHQ8b3B0aW9uIGNsYXNzPVwicGxhY2Vob2xkZXJcIiB2YWx1ZT1cIlwiIGRpc2FibGVkIHNlbGVjdGVkPlBsYWNlaG9sZGVyPC9vcHRpb24+XG5cdFx0XHQ8b3B0aW9uPjE8L29wdGlvbj5cblx0XHRcdDxvcHRpb24+Mjwvb3B0aW9uPlxuXHRcdFx0PG9wdGlvbj4zPC9vcHRpb24+XG5cdFx0PC9zZWxlY3Q+XG5cdFx0PGxhYmVsIGZvcj1cInN0YW5kYXJkLXNlbGVjdFwiIHNsb3Q9XCJzZWxlY3RsYWJlbFwiPlN0YW5kYXJkIHNlbGVjdDwvbGFiZWw+XG5cdDwvem9vLXNlbGVjdD5cblx0PHpvby1zZWFyY2hhYmxlLXNlbGVjdCBsYWJlbHRleHQ9XCJTZWFyY2hhYmxlIG11bHRpcGxlIHNlbGVjdFwiIHBsYWNlaG9sZGVyPVwiUGxhY2Vob2xkZXJcIiBpbmZvdGV4dD1cIkFkZGl0aW9uYWwgaGVscGZ1bCBpbmZvcm1hdGlvbiBmb3Igb3VyIHVzZXJzIHdoaWNoIGlzIGEgbG9uZyB0ZXh0LlwiPlxuXHRcdDxzZWxlY3QgbXVsdGlwbGUgc2xvdD1cInNlbGVjdGVsZW1lbnRcIj5cblx0XHRcdHsjZWFjaCBvcHRpb25zIGFzIG9wdGlvbn1cblx0XHRcdFx0PG9wdGlvbiB2YWx1ZT1cIntvcHRpb24udmFsdWV9XCI+XG5cdFx0XHRcdFx0e29wdGlvbi50ZXh0fVxuXHRcdFx0XHQ8L29wdGlvbj5cblx0XHRcdHsvZWFjaH1cblx0XHQ8L3NlbGVjdD5cblx0PC96b28tc2VhcmNoYWJsZS1zZWxlY3Q+XG5cdDx6b28tc2VhcmNoYWJsZS1zZWxlY3QgbGFiZWx0ZXh0PVwiU2VhcmNoYWJsZSBzZWxlY3RcIiBwbGFjZWhvbGRlcj1cIlBsYWNlaG9sZGVyXCIgaW5mb3RleHQ9XCJBZGRpdGlvbmFsIGhlbHBmdWwgaW5mb3JtYXRpb24gZm9yIG91ciB1c2Vycy5cIj5cblx0XHQ8c2VsZWN0IHNsb3Q9XCJzZWxlY3RlbGVtZW50XCI+XG5cdFx0XHR7I2VhY2ggb3B0aW9ucyBhcyBvcHRpb259XG5cdFx0XHRcdDxvcHRpb24gdmFsdWU9XCJ7b3B0aW9uLnZhbHVlfVwiPlxuXHRcdFx0XHRcdHtvcHRpb24udGV4dH1cblx0XHRcdFx0PC9vcHRpb24+XG5cdFx0XHR7L2VhY2h9XG5cdFx0PC9zZWxlY3Q+XG5cdDwvem9vLXNlYXJjaGFibGUtc2VsZWN0PlxuXHQ8em9vLWNoZWNrYm94IGhpZ2hsaWdodGVkPVwie3RydWV9XCIgaW5wdXRlcnJvcm1zZz1cImVycm9yXCI+XG5cdFx0PGlucHV0IGlkPVwiY2hlY2tib3hcIiBzbG90PVwiY2hlY2tib3hlbGVtZW50XCIgdHlwZT1cImNoZWNrYm94XCIvPlxuXHRcdDxsYWJlbCBmb3I9XCJjaGVja2JveFwiIHNsb3Q9XCJjaGVja2JveGxhYmVsXCI+QW4gZXhhbXBsZSBjaGVja2JveDwvbGFiZWw+XG5cdDwvem9vLWNoZWNrYm94PlxuXHQ8em9vLWNoZWNrYm94IGhpZ2hsaWdodGVkPVwie3RydWV9XCI+XG5cdFx0PGlucHV0IGlkPVwiZGlzYWJsZWQtY2hlY2tib3hcIiBkaXNhYmxlZCBzbG90PVwiY2hlY2tib3hlbGVtZW50XCIgdHlwZT1cImNoZWNrYm94XCIvPlxuXHRcdDxsYWJlbCBmb3I9XCJkaXNhYmxlZC1jaGVja2JveFwiIHNsb3Q9XCJjaGVja2JveGxhYmVsXCI+RGlzYWJsZWQgY2hlY2tib3g8L2xhYmVsPlxuXHQ8L3pvby1jaGVja2JveD5cblx0PHpvby1yYWRpbyBpbmZvdGV4dD1cImluZm90ZXh0XCIgbGFiZWx0ZXh0PVwiTGFiZWwgdGV4dFwiPlxuXHRcdDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2UxXCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cImVtYWlsXCIgZGlzYWJsZWQ+XG5cdFx0PGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2UxXCI+RW1haWw8L2xhYmVsPlxuXHRcdDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2UyXCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cInBob25lXCI+XG5cdFx0PGxhYmVsIGZvcj1cImNvbnRhY3RDaG9pY2UyXCI+UGhvbmU8L2xhYmVsPlxuXHRcdDxpbnB1dCB0eXBlPVwicmFkaW9cIiBpZD1cImNvbnRhY3RDaG9pY2UzXCIgbmFtZT1cImNvbnRhY3RcIiB2YWx1ZT1cIm1haWxcIj5cblx0XHQ8bGFiZWwgZm9yPVwiY29udGFjdENob2ljZTNcIj5NYWlsPC9sYWJlbD5cblx0PC96b28tcmFkaW8+XG48L2Zvcm0+XG5cbjxzdHlsZSB0eXBlPSd0ZXh0L3Njc3MnPi5mb3JtIHtcbiAgZmxleDogMSAwIGF1dG87XG4gIG1hcmdpbjogMjBweCBhdXRvO1xuICBkaXNwbGF5OiBncmlkO1xuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdChhdXRvLWZpbGwsIG1pbm1heCgzMjBweCwgMWZyKSk7XG4gIGdyaWQtdGVtcGxhdGUtcm93czogMTIwcHggMTUwcHggMTUwcHggMTAwcHg7XG4gIGdyaWQtZ2FwOiAyMHB4OyB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogNTQ0cHgpIHtcbiAgICAuZm9ybSB7XG4gICAgICB3aWR0aDogMzAwcHg7XG4gICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IGF1dG87IH0gfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDgxMnB4KSB7XG4gICAgLmZvcm0ge1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiAxMjBweCAxNTBweCAxMjBweCAxMjBweDsgfSB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cblxuPHNjcmlwdD5cblx0aW1wb3J0IENvbnRleHQgZnJvbSAnLi9Db250ZXh0LnN2ZWx0ZSc7XG5cdGxldCBvcHRpb25zID0gW1xuXHRcdHtcblx0XHRcdHRleHQ6ICd0ZXh0Jyxcblx0XHRcdHZhbHVlOiAndmFsdWUnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHR0ZXh0OiAncmFOZE9tJyxcblx0XHRcdHZhbHVlOiAncmFuZG9tJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0dGV4dDogJ3JhbmRvbTEnLFxuXHRcdFx0dmFsdWU6ICdyYW5kb20xJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0dGV4dDogJ3JhbmRvbTInLFxuXHRcdFx0dmFsdWU6ICdyYW5kb20yJ1xuXHRcdH1cblx0XTtcbjwvc2NyaXB0PlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXVGd0IsS0FBSyxjQUFDLENBQUMsQUFDN0IsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNkLE1BQU0sQ0FBRSxJQUFJLENBQUMsSUFBSSxDQUNqQixPQUFPLENBQUUsSUFBSSxDQUNiLHFCQUFxQixDQUFFLE9BQU8sU0FBUyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUM1RCxrQkFBa0IsQ0FBRSxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQzNDLFFBQVEsQ0FBRSxJQUFJLEFBQUUsQ0FBQyxBQUNqQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxDQUFDLEFBQUMsQ0FBQyxBQUN6QyxLQUFLLGNBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxLQUFLLENBQ1oscUJBQXFCLENBQUUsSUFBSSxBQUFFLENBQUMsQUFBQyxDQUFDLEFBQ3BDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pDLEtBQUssY0FBQyxDQUFDLEFBQ0wsa0JBQWtCLENBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxBQUFFLENBQUMsQUFBQyxDQUFDIn0= */";
	append_dev(document.head, style);
}

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

// (54:3) {#each options as option}
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
			add_location(option, file$3, 54, 4, 2810);
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
		source: "(54:3) {#each options as option}",
		ctx
	});

	return block;
}

// (63:3) {#each options as option}
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
			add_location(option, file$3, 63, 4, 3127);
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
		source: "(63:3) {#each options as option}",
		ctx
	});

	return block;
}

function create_fragment$3(ctx) {
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
	let current;

	const context = new Context({
			props: { text: "Form elements" },
			$$inline: true
		});

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
			create_component(context.$$.fragment);
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
			attr_dev(input0, "id", "input-type-text");
			attr_dev(input0, "slot", "inputelement");
			attr_dev(input0, "type", "text");
			attr_dev(input0, "placeholder", "input");
			add_location(input0, file$3, 4, 2, 220);
			attr_dev(label0, "for", "input-type-text");
			attr_dev(label0, "slot", "inputlabel");
			add_location(label0, file$3, 5, 2, 305);
			set_custom_element_data(zoo_input0, "linktext", "Forgotten your password?");
			set_custom_element_data(zoo_input0, "linkhref", "https://google.com");
			set_custom_element_data(zoo_input0, "linktarget", "about:blank");
			set_custom_element_data(zoo_input0, "infotext", "Additional helpful information for our users");
			add_location(zoo_input0, file$3, 2, 1, 53);
			attr_dev(input1, "id", "input-type-number");
			attr_dev(input1, "slot", "inputelement");
			attr_dev(input1, "placeholder", "input");
			attr_dev(input1, "list", "animals");
			add_location(input1, file$3, 10, 2, 635);
			attr_dev(label1, "for", "input-type-number");
			attr_dev(label1, "slot", "inputlabel");
			add_location(label1, file$3, 11, 2, 724);
			set_custom_element_data(zoo_input1, "linktext", "Learn your HTML and don't overcomplicate");
			set_custom_element_data(zoo_input1, "linktarget", "about:blank");
			set_custom_element_data(zoo_input1, "linkhref", "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist");
			set_custom_element_data(zoo_input1, "infotext", "Possible values: Dog, Cat, Small Pet, Bird, Aquatic");
			add_location(zoo_input1, file$3, 7, 1, 391);
			option0.__value = "Dog";
			option0.value = option0.__value;
			add_location(option0, file$3, 14, 2, 835);
			option1.__value = "Cat";
			option1.value = option1.__value;
			add_location(option1, file$3, 15, 2, 858);
			option2.__value = "Small Pet";
			option2.value = option2.__value;
			add_location(option2, file$3, 16, 2, 881);
			option3.__value = "Bird";
			option3.value = option3.__value;
			add_location(option3, file$3, 17, 2, 910);
			option4.__value = "Aquatic";
			option4.value = option4.__value;
			add_location(option4, file$3, 18, 2, 934);
			attr_dev(datalist, "id", "animals");
			add_location(datalist, file$3, 13, 1, 809);
			attr_dev(input2, "id", "input-type-date");
			attr_dev(input2, "slot", "inputelement");
			attr_dev(input2, "type", "date");
			attr_dev(input2, "placeholder", "Enter date");
			add_location(input2, file$3, 22, 2, 1193);
			attr_dev(label2, "for", "input-type-date");
			attr_dev(label2, "slot", "inputlabel");
			add_location(label2, file$3, 23, 2, 1283);
			set_custom_element_data(zoo_input2, "linktext", "Native date picker polyfill on Github");
			set_custom_element_data(zoo_input2, "linkhref", "https://github.com/jcgertig/date-input-polyfill");
			set_custom_element_data(zoo_input2, "linktarget", "about:blank");
			set_custom_element_data(zoo_input2, "infotext", "Click on input to show context menu with date selection");
			add_location(zoo_input2, file$3, 20, 1, 973);
			attr_dev(input3, "id", "input-type-time");
			attr_dev(input3, "slot", "inputelement");
			attr_dev(input3, "type", "time");
			attr_dev(input3, "placeholder", "Enter time");
			add_location(input3, file$3, 26, 2, 1406);
			attr_dev(label3, "for", "input-type-time");
			attr_dev(label3, "slot", "inputlabel");
			add_location(label3, file$3, 27, 2, 1496);
			set_custom_element_data(zoo_input3, "infotext", "Select time");
			add_location(zoo_input3, file$3, 25, 1, 1369);
			attr_dev(textarea, "id", "textarea");
			attr_dev(textarea, "slot", "inputelement");
			attr_dev(textarea, "placeholder", "Textarea");
			add_location(textarea, file$3, 30, 2, 1596);
			attr_dev(label4, "for", "textarea");
			attr_dev(label4, "slot", "inputlabel");
			add_location(label4, file$3, 31, 2, 1677);
			add_location(zoo_input4, file$3, 29, 1, 1582);
			attr_dev(option5, "class", "placeholder");
			option5.__value = "";
			option5.value = option5.__value;
			option5.disabled = true;
			option5.selected = true;
			add_location(option5, file$3, 35, 3, 1964);
			option6.__value = "1";
			option6.value = option6.__value;
			add_location(option6, file$3, 36, 3, 2043);
			option7.__value = "2";
			option7.value = option7.__value;
			add_location(option7, file$3, 37, 3, 2065);
			option8.__value = "3";
			option8.value = option8.__value;
			add_location(option8, file$3, 38, 3, 2087);
			attr_dev(select0, "id", "multiselect");
			attr_dev(select0, "slot", "selectelement");
			select0.multiple = true;
			add_location(select0, file$3, 34, 2, 1905);
			attr_dev(label5, "for", "multiselect");
			attr_dev(label5, "slot", "selectlabel");
			add_location(label5, file$3, 40, 2, 2120);
			set_custom_element_data(zoo_select0, "linktext", "Documentation link");
			set_custom_element_data(zoo_select0, "linkhref", "https://google.com");
			set_custom_element_data(zoo_select0, "linktarget", "about:blank");
			set_custom_element_data(zoo_select0, "infotext", "Additional helpful information for our users");
			add_location(zoo_select0, file$3, 33, 1, 1749);
			attr_dev(option9, "class", "placeholder");
			option9.__value = "";
			option9.value = option9.__value;
			option9.disabled = true;
			option9.selected = true;
			add_location(option9, file$3, 44, 3, 2325);
			option10.__value = "1";
			option10.value = option10.__value;
			add_location(option10, file$3, 45, 3, 2404);
			option11.__value = "2";
			option11.value = option11.__value;
			add_location(option11, file$3, 46, 3, 2426);
			option12.__value = "3";
			option12.value = option12.__value;
			add_location(option12, file$3, 47, 3, 2448);
			attr_dev(select1, "id", "standard-select");
			attr_dev(select1, "slot", "selectelement");
			add_location(select1, file$3, 43, 2, 2271);
			attr_dev(label6, "for", "standard-select");
			attr_dev(label6, "slot", "selectlabel");
			add_location(label6, file$3, 49, 2, 2481);
			set_custom_element_data(zoo_select1, "infotext", "Additional helpful information for our users");
			add_location(zoo_select1, file$3, 42, 1, 2200);
			select2.multiple = true;
			attr_dev(select2, "slot", "selectelement");
			add_location(select2, file$3, 52, 2, 2738);
			set_custom_element_data(zoo_searchable_select0, "labeltext", "Searchable multiple select");
			set_custom_element_data(zoo_searchable_select0, "placeholder", "Placeholder");
			set_custom_element_data(zoo_searchable_select0, "infotext", "Additional helpful information for our users which is a long text.");
			add_location(zoo_searchable_select0, file$3, 51, 1, 2569);
			attr_dev(select3, "slot", "selectelement");
			add_location(select3, file$3, 61, 2, 3064);
			set_custom_element_data(zoo_searchable_select1, "labeltext", "Searchable select");
			set_custom_element_data(zoo_searchable_select1, "placeholder", "Placeholder");
			set_custom_element_data(zoo_searchable_select1, "infotext", "Additional helpful information for our users.");
			add_location(zoo_searchable_select1, file$3, 60, 1, 2925);
			attr_dev(input4, "id", "checkbox");
			attr_dev(input4, "slot", "checkboxelement");
			attr_dev(input4, "type", "checkbox");
			add_location(input4, file$3, 70, 2, 3302);
			attr_dev(label7, "for", "checkbox");
			attr_dev(label7, "slot", "checkboxlabel");
			add_location(label7, file$3, 71, 2, 3366);
			set_custom_element_data(zoo_checkbox0, "highlighted", zoo_checkbox0_highlighted_value = true);
			set_custom_element_data(zoo_checkbox0, "inputerrormsg", "error");
			add_location(zoo_checkbox0, file$3, 69, 1, 3242);
			attr_dev(input5, "id", "disabled-checkbox");
			input5.disabled = true;
			attr_dev(input5, "slot", "checkboxelement");
			attr_dev(input5, "type", "checkbox");
			add_location(input5, file$3, 74, 2, 3493);
			attr_dev(label8, "for", "disabled-checkbox");
			attr_dev(label8, "slot", "checkboxlabel");
			add_location(label8, file$3, 75, 2, 3575);
			set_custom_element_data(zoo_checkbox1, "highlighted", zoo_checkbox1_highlighted_value = true);
			add_location(zoo_checkbox1, file$3, 73, 1, 3455);
			attr_dev(input6, "type", "radio");
			attr_dev(input6, "id", "contactChoice1");
			attr_dev(input6, "name", "contact");
			input6.value = "email";
			input6.disabled = true;
			add_location(input6, file$3, 78, 2, 3728);
			attr_dev(label9, "for", "contactChoice1");
			add_location(label9, file$3, 79, 2, 3809);
			attr_dev(input7, "type", "radio");
			attr_dev(input7, "id", "contactChoice2");
			attr_dev(input7, "name", "contact");
			input7.value = "phone";
			add_location(input7, file$3, 80, 2, 3853);
			attr_dev(label10, "for", "contactChoice2");
			add_location(label10, file$3, 81, 2, 3925);
			attr_dev(input8, "type", "radio");
			attr_dev(input8, "id", "contactChoice3");
			attr_dev(input8, "name", "contact");
			input8.value = "mail";
			add_location(input8, file$3, 82, 2, 3969);
			attr_dev(label11, "for", "contactChoice3");
			add_location(label11, file$3, 83, 2, 4040);
			set_custom_element_data(zoo_radio, "infotext", "infotext");
			set_custom_element_data(zoo_radio, "labeltext", "Label text");
			add_location(zoo_radio, file$3, 77, 1, 3671);
			attr_dev(form, "class", "form svelte-lyt1nm");
			add_location(form, file$3, 1, 0, 32);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(context, target, anchor);
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
			current = true;
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
		i: function intro(local) {
			if (current) return;
			transition_in(context.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(context.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(context, detaching);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(form);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
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
	let options = [
		{ text: "text", value: "value" },
		{ text: "raNdOm", value: "random" },
		{ text: "random1", value: "random1" },
		{ text: "random2", value: "random2" }
	];

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Form> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Form", $$slots, []);
	$$self.$capture_state = () => ({ Context, options });

	$$self.$inject_state = $$props => {
		if ("options" in $$props) $$invalidate(0, options = $$props.options);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [options];
}

class Form extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document.getElementById("svelte-lyt1nm-style")) add_css$3();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Form",
			options,
			id: create_fragment$3.name
		});
	}
}

/* src/Grids.svelte generated by Svelte v3.23.0 */

const { Object: Object_1, document: document_1$1 } = globals;
const file$4 = "src/Grids.svelte";

function add_css$4() {
	var style = element("style");
	style.id = "svelte-1rl0sr-style";
	style.textContent = "h3.svelte-1rl0sr.svelte-1rl0sr{color:var(--primary-mid, #3C9700)}.grids-holder.svelte-1rl0sr.svelte-1rl0sr{display:flex;flex-direction:column;align-items:center}.grid-1.svelte-1rl0sr.svelte-1rl0sr{--grid-column-sizes:150px repeat(7, minmax(50px, 1fr)) !important}.grid-2.svelte-1rl0sr.svelte-1rl0sr{--grid-column-sizes:150px repeat(9, minmax(50px, 1fr)) !important}.grid-holder.svelte-1rl0sr.svelte-1rl0sr{max-width:1280px;overflow:auto;box-shadow:0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);width:95%}.status.svelte-1rl0sr.svelte-1rl0sr,.delivery-date.svelte-1rl0sr.svelte-1rl0sr{margin-right:10px}.limited-width.svelte-1rl0sr.svelte-1rl0sr{min-width:1024px}.example-row.svelte-1rl0sr>div.svelte-1rl0sr{word-break:break-word;flex-grow:1}.item-per-page-selector-holder.svelte-1rl0sr.svelte-1rl0sr{max-width:150px}.item-per-page-selector-holder.svelte-1rl0sr .item-per-page-selector.svelte-1rl0sr{border:1px solid #E6E6E6}.item-per-page-selector-holder.svelte-1rl0sr .item-per-page-selector.svelte-1rl0sr:focus{border:2px solid #555555}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR3JpZHMuc3ZlbHRlIiwic291cmNlcyI6WyJHcmlkcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPENvbnRleHQgdGV4dD1cIkRhdGEgZ3JpZHNcIi8+XG48ZGl2IGNsYXNzPVwiZ3JpZHMtaG9sZGVyXCIgYmluZDp0aGlzPVwie2dyaWRIb2xkZXJ9XCI+XG5cdDxoMz5BIGdyaWQgd2l0aCBwYWdpbmF0aW9uLCByZXNpemluZywgcmVvcmRlciBhbmQgc29ydGluZy48L2gzPlxuXG5cdDxkaXYgY2xhc3M9XCJncmlkLWhvbGRlclwiPlxuXHQ8em9vLWdyaWQgY2xhc3M9XCJsaW1pdGVkLXdpZHRoIGdyaWQtMVwiIHN0aWNreWhlYWRlciBjdXJyZW50cGFnZT1cIjVcIiBtYXhwYWdlcz1cIjIwXCIgcmVzaXphYmxlIHJlb3JkZXJhYmxlXG5cdFx0XHRvbjpzb3J0Q2hhbmdlPVwie2UgPT4gaGFuZGxlU29ydENoYW5nZShlLmRldGFpbCl9XCIgb246cGFnZUNoYW5nZT1cIntlID0+IGhhbmRsZVBhZ2VDaGFuZ2UoZS5kZXRhaWwpfVwiPlxuXG5cdFx0eyNlYWNoIGhlYWRlcnMgYXMgaGVhZGVyLCBpZHh9XG5cdFx0XHQ8em9vLWdyaWQtaGVhZGVyIGNsYXNzPVwiaGVhZGVyLWNlbGxcIiBzbG90PVwiaGVhZGVyY2VsbFwiIHNvcnRhYmxlPXtoZWFkZXIuc29ydGFibGV9IHNvcnRhYmxlcHJvcGVydHk9J3toZWFkZXIuc29ydFByb3BlcnR5fSc+e2hlYWRlci50aXRsZX08L3pvby1ncmlkLWhlYWRlcj5cblx0XHR7L2VhY2h9XG5cdFx0eyNlYWNoIGRhdGEgYXMgcm93LCBpfSBcblx0XHRcdDxkaXYgY2xhc3M9XCJleGFtcGxlLXJvdyBsaW1pdGVkLXdpZHRoXCIgc2xvdD1cInJvd1wiPlxuXHRcdFx0XHQ8em9vLWNoZWNrYm94PlxuXHRcdFx0XHRcdDxpbnB1dCBpZD1cIntpfS1maXJzdC1ncmlkLWNoZWNrYm94XCIgZGlzYWJsZWQ9XCJ7cm93LnN0YXR1cyAhPSAnREVMSVZFUkVEJyA/IG51bGwgOiB0cnVlfVwiIGNoZWNrZWQ9XCJ7cm93LnZhbGlkfVwiIHNsb3Q9XCJjaGVja2JveGVsZW1lbnRcIiB0eXBlPVwiY2hlY2tib3hcIi8+XG5cdFx0XHRcdFx0PGxhYmVsIGZvcj1cIntpfS1maXJzdC1ncmlkLWNoZWNrYm94XCIgc2xvdD1cImNoZWNrYm94bGFiZWxcIj5WYWxpZDwvbGFiZWw+XG5cdFx0XHRcdDwvem9vLWNoZWNrYm94PlxuXHRcdFx0XHQ8ZGl2Pntyb3cuY3JlYXRlZERhdGV9PC9kaXY+XG5cdFx0XHRcdDx6b28tc2VsZWN0IGNsYXNzPVwic3RhdHVzXCI+XG5cdFx0XHRcdFx0PHNlbGVjdCB0aXRsZT1cIkRlbGl2ZXJ5IFN0YXR1c1wiIGRpc2FibGVkPVwie3Jvdy5zdGF0dXMgPT0gJ0RFTElWRVJFRCcgPyB0cnVlIDogbnVsbH1cIiBzbG90PVwic2VsZWN0ZWxlbWVudFwiIGNsYXNzPVwiaXRlbS1wZXItcGFnZS1zZWxlY3RvclwiPlxuXHRcdFx0XHRcdFx0eyNlYWNoIHN0YXR1c2VzIGFzIHN0YXR1c31cblx0XHRcdFx0XHRcdFx0PG9wdGlvbiBzZWxlY3RlZD1cIntzdGF0dXMgPT0gcm93LnN0YXR1c31cIj57c3RhdHVzfTwvb3B0aW9uPlxuXHRcdFx0XHRcdFx0ey9lYWNofVxuXHRcdFx0XHRcdDwvc2VsZWN0PlxuXHRcdFx0XHQ8L3pvby1zZWxlY3Q+XG5cdFx0XHRcdDxkaXY+e3Jvdy5taW5XZWlnaHR9PC9kaXY+XG5cdFx0XHRcdDxkaXY+e3Jvdy5tYXhXZWlnaHR9PC9kaXY+XG5cdFx0XHRcdDx6b28taW5wdXQgY2xhc3M9XCJkZWxpdmVyeS1kYXRlXCI+XG5cdFx0XHRcdFx0PGlucHV0IHRpdGxlPVwiRGVsaXZlcnkgRGF0ZVwiIGRpc2FibGVkPVwie3Jvdy5zdGF0dXMgPT0gJ0RFTElWRVJFRCcgPyB0cnVlIDogbnVsbH1cIiB2YWx1ZT1cIntyb3cuZGVsaXZlcnlEYXRlfVwiIHNsb3Q9XCJpbnB1dGVsZW1lbnRcIiB0eXBlPVwiZGF0ZVwiIHBsYWNlaG9sZGVyPVwiRW50ZXIgZGF0ZVwiIC8+XG5cdFx0XHRcdDwvem9vLWlucHV0PlxuXHRcdFx0XHQ8ZGl2Pntyb3cubm9PZlBpZWNlc308L2Rpdj5cblx0XHRcdFx0PGRpdj57cm93LnByaWNlfTwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0ey9lYWNofVxuXG5cdFx0PGRpdiBjbGFzcz1cIml0ZW0tcGVyLXBhZ2Utc2VsZWN0b3ItaG9sZGVyXCIgc2xvdD1cInBhZ2VzaXplc2VsZWN0b3JcIj5cblx0XHRcdDx6b28tc2VsZWN0IGxhYmVscG9zaXRpb249XCJsZWZ0XCIgPlxuXHRcdFx0XHQ8c2VsZWN0IGlkPVwiZmlyc3QtZ3JpZC1wYWdlLXNpemVcIiBzbG90PVwic2VsZWN0ZWxlbWVudFwiIGNsYXNzPVwiaXRlbS1wZXItcGFnZS1zZWxlY3RvclwiPlxuXHRcdFx0XHRcdHsjZWFjaCBwb3NzaWJsZU51bWJlck9mSXRlbXMgYXMgbnVtYmVyLCBpZHh9XG5cdFx0XHRcdFx0XHQ8b3B0aW9uIHNlbGVjdGVkPVwie2lkeCA9PSAwfVwiPntudW1iZXJ9PC9vcHRpb24+XG5cdFx0XHRcdFx0ey9lYWNofVxuXHRcdFx0XHQ8L3NlbGVjdD5cblx0XHRcdFx0PGxhYmVsIGZvcj1cImZpcnN0LWdyaWQtcGFnZS1zaXplXCIgc2xvdD1cInNlbGVjdGxhYmVsXCI+UGFnZSBzaXplPC9sYWJlbD5cblx0XHRcdDwvem9vLXNlbGVjdD5cblx0XHQ8L2Rpdj5cblx0PC96b28tZ3JpZD5cblx0PC9kaXY+XG5cblx0PGgzPkdyaWQgd2l0aCBzdGlja3kgaGVhZGVyIGFuZCBwYWdpbmF0aW9uLiBHcmlkIGhlaWdodCBhbmQgd2lkdGggYXJlIGxpbWl0ZWQgb24gdGhlIGNsaWVudCBzaWRlLjwvaDM+XG5cblx0PGRpdiBjbGFzcz1cImdyaWQtaG9sZGVyXCIgc3R5bGU9XCJtYXgtd2lkdGg6IDg1MHB4OyBtYXgtaGVpZ2h0OiAzMDBweDtcIj5cblx0XHQ8em9vLWdyaWQgY2xhc3M9XCJsaW1pdGVkLXdpZHRoIGdyaWQtMlwiIHN0eWxlPVwibWluLXdpZHRoOiAxMDI0cHg7IG1hcmdpbjogMCBhdXRvOyBkaXNwbGF5OiBibG9jaztcIiBzdGlja3loZWFkZXJcblx0XHRcdGN1cnJlbnRwYWdlPVwiMVwiIG1heHBhZ2VzPVwiNFwiIG9uOnNvcnRDaGFuZ2U9XCJ7ZSA9PiBoYW5kbGVTb3J0Q2hhbmdlKGUuZGV0YWlsKX1cIiBvbjpwYWdlQ2hhbmdlPVwie2UgPT4gaGFuZGxlUGFnZUNoYW5nZShlLmRldGFpbCl9XCI+XG5cdFx0XHR7I2VhY2ggZXh0ZW5kZWRIZWFkZXJzIGFzIGhlYWRlciwgaX1cblx0XHRcdFx0PHpvby1ncmlkLWhlYWRlciBzbG90PVwiaGVhZGVyY2VsbFwiIHNvcnRhYmxlPXtoZWFkZXIuc29ydGFibGUgPyAnc29ydGFibGUnIDogbnVsbH0gc29ydGFibGVwcm9wZXJ0eT0ne2hlYWRlci5zb3J0UHJvcGVydHl9Jz57aGVhZGVyLnRpdGxlfTwvem9vLWdyaWQtaGVhZGVyPlxuXHRcdFx0ey9lYWNofVxuXG5cdFx0XHR7I2VhY2ggZXh0ZW5kZWREYXRhIGFzIHJvdywgaX0gXG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJleGFtcGxlLXJvdyBsaW1pdGVkLXdpZHRoXCIgc2xvdD1cInJvd1wiPlxuXHRcdFx0XHRcdDx6b28tY2hlY2tib3ggbGFiZWx0ZXh0PVwiVmFsaWRcIj5cblx0XHRcdFx0XHRcdDxpbnB1dCBpZD1cIntpfS1zZWNvbmQtZ3JpZC1jaGVja2JveFwiIGRpc2FibGVkPVwie3Jvdy5zdGF0dXMgIT0gJ0RFTElWRVJFRCcgPyBudWxsIDogdHJ1ZX1cIiBjaGVja2VkPVwie3Jvdy52YWxpZH1cIiBzbG90PVwiY2hlY2tib3hlbGVtZW50XCIgdHlwZT1cImNoZWNrYm94XCIvPlxuXHRcdFx0XHRcdFx0PGxhYmVsIGZvcj1cIntpfS1zZWNvbmQtZ3JpZC1jaGVja2JveFwiIHNsb3Q9XCJjaGVja2JveGxhYmVsXCI+VmFsaWQ8L2xhYmVsPlxuXHRcdFx0XHRcdDwvem9vLWNoZWNrYm94PlxuXHRcdFx0XHRcdDxkaXY+e3Jvdy5jcmVhdGVkRGF0ZX08L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2Pntyb3cuc3RhdHVzfTwvZGl2PlxuXHRcdFx0XHRcdDxkaXY+e3Jvdy5taW5XZWlnaHR9PC9kaXY+XG5cdFx0XHRcdFx0PGRpdj57cm93Lm1heFdlaWdodH08L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2Pntyb3cuZGVsaXZlcnlEYXRlfTwvZGl2PlxuXHRcdFx0XHRcdDxkaXY+e3Jvdy5ub09mUGllY2VzfTwvZGl2PlxuXHRcdFx0XHRcdDxkaXY+e3Jvdy5wcmljZX08L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2Pntyb3cucmF0aW5nfTwvZGl2PlxuXHRcdFx0XHRcdDx6b28tY2hlY2tib3g+XG5cdFx0XHRcdFx0XHQ8aW5wdXQgaWQ9XCJ7aX0tc2Vjb25kLWdyaWQtcHJvbW8tY2hlY2tib3hcIiBjaGVja2VkPVwie3Jvdy5wcm9tb3Rpb259XCIgc2xvdD1cImNoZWNrYm94ZWxlbWVudFwiIHR5cGU9XCJjaGVja2JveFwiLz5cblx0XHRcdFx0XHRcdDxsYWJlbCBmb3I9XCJ7aX0tc2Vjb25kLWdyaWQtcHJvbW8tY2hlY2tib3hcIiBzbG90PVwiY2hlY2tib3hsYWJlbFwiPlByb21vdGlvbjwvbGFiZWw+XG5cdFx0XHRcdFx0PC96b28tY2hlY2tib3g+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0ey9lYWNofVxuXG5cdFx0XHQ8ZGl2IGNsYXNzPVwiaXRlbS1wZXItcGFnZS1zZWxlY3Rvci1ob2xkZXJcIiBzbG90PVwicGFnZXNpemVzZWxlY3RvclwiPlxuXHRcdFx0XHQ8em9vLXNlbGVjdCBsYWJlbHBvc2l0aW9uPVwibGVmdFwiID5cblx0XHRcdFx0XHQ8c2VsZWN0IGlkPVwic2Vjb25kLWdyaWQtcGFnZS1zaXplXCIgc2xvdD1cInNlbGVjdGVsZW1lbnRcIiBjbGFzcz1cIml0ZW0tcGVyLXBhZ2Utc2VsZWN0b3JcIj5cblx0XHRcdFx0XHRcdHsjZWFjaCBwb3NzaWJsZU51bWJlck9mSXRlbXMgYXMgbnVtYmVyLCBpZHh9XG5cdFx0XHRcdFx0XHRcdDxvcHRpb24gc2VsZWN0ZWQ9XCJ7aWR4ID09IDB9XCI+e251bWJlcn08L29wdGlvbj5cblx0XHRcdFx0XHRcdHsvZWFjaH1cblx0XHRcdFx0XHQ8L3NlbGVjdD5cblx0XHRcdFx0XHQ8bGFiZWwgZm9yPVwic2Vjb25kLWdyaWQtcGFnZS1zaXplXCIgc2xvdD1cInNlbGVjdGxhYmVsXCI+UGFnZSBzaXplPC9sYWJlbD5cblx0XHRcdFx0PC96b28tc2VsZWN0PlxuXHRcdFx0PC9kaXY+XG5cdFx0PC96b28tZ3JpZD5cblx0PC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9J3RleHQvc2Nzcyc+aDMge1xuICBjb2xvcjogdmFyKC0tcHJpbWFyeS1taWQsICMzQzk3MDApOyB9XG5cbi5ncmlkcy1ob2xkZXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBhbGlnbi1pdGVtczogY2VudGVyOyB9XG5cbi5ncmlkLTEge1xuICAtLWdyaWQtY29sdW1uLXNpemVzOiAxNTBweCByZXBlYXQoNywgbWlubWF4KDUwcHgsIDFmcikpICFpbXBvcnRhbnQ7IH1cblxuLmdyaWQtMiB7XG4gIC0tZ3JpZC1jb2x1bW4tc2l6ZXM6IDE1MHB4IHJlcGVhdCg5LCBtaW5tYXgoNTBweCwgMWZyKSkgIWltcG9ydGFudDsgfVxuXG4uZ3JpZC1ob2xkZXIge1xuICBtYXgtd2lkdGg6IDEyODBweDtcbiAgb3ZlcmZsb3c6IGF1dG87XG4gIGJveC1zaGFkb3c6IDAgNXB4IDVweCAtM3B4IHJnYmEoMCwgMCwgMCwgMC4yKSwgMCA4cHggMTBweCAxcHggcmdiYSgwLCAwLCAwLCAwLjE0KSwgMCAzcHggMTRweCAycHggcmdiYSgwLCAwLCAwLCAwLjEyKTtcbiAgd2lkdGg6IDk1JTsgfVxuXG4uc3RhdHVzLCAuZGVsaXZlcnktZGF0ZSB7XG4gIG1hcmdpbi1yaWdodDogMTBweDsgfVxuXG4ubGltaXRlZC13aWR0aCB7XG4gIG1pbi13aWR0aDogMTAyNHB4OyB9XG5cbi5leGFtcGxlLXJvdyA+IGRpdiB7XG4gIHdvcmQtYnJlYWs6IGJyZWFrLXdvcmQ7XG4gIGZsZXgtZ3JvdzogMTsgfVxuXG4uaXRlbS1wZXItcGFnZS1zZWxlY3Rvci1ob2xkZXIge1xuICBtYXgtd2lkdGg6IDE1MHB4OyB9XG4gIC5pdGVtLXBlci1wYWdlLXNlbGVjdG9yLWhvbGRlciAuaXRlbS1wZXItcGFnZS1zZWxlY3RvciB7XG4gICAgYm9yZGVyOiAxcHggc29saWQgI0U2RTZFNjsgfVxuICAgIC5pdGVtLXBlci1wYWdlLXNlbGVjdG9yLWhvbGRlciAuaXRlbS1wZXItcGFnZS1zZWxlY3Rvcjpmb2N1cyB7XG4gICAgICBib3JkZXI6IDJweCBzb2xpZCAjNTU1NTU1OyB9XG5cbi5sb2FkaW5nLXRvZ2dsZXIge1xuICB3aWR0aDogODBweDsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCBDb250ZXh0IGZyb20gJy4vQ29udGV4dC5zdmVsdGUnO1xuXHRsZXQgdG9hc3Q7XG5cdGxldCBwb3NzaWJsZU51bWJlck9mSXRlbXMgPSBbNSwgMTAsIDI1LCAxMDBdO1xuXHRsZXQgZ3JpZEhvbGRlcjtcblx0bGV0IGxvYWRpbmcgPSBmYWxzZTtcblx0bGV0IGhlYWRlcnMgPSBbXG5cdFx0e1xuXHRcdFx0dGl0bGU6ICdWYWxpZCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdHRpdGxlOiAnQ3JlYXRlZCBkYXRlJyxcblx0XHRcdHNvcnRhYmxlOiB0cnVlLFxuXHRcdFx0c29ydFByb3BlcnR5OiAnY3JlYXRlZERhdGUnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHR0aXRsZTogJ1N0YXR1cycsXG5cdFx0XHRzb3J0YWJsZTogdHJ1ZSxcblx0XHRcdHNvcnRQcm9wZXJ0eTogJ3N0YXR1cydcblx0XHR9LFxuXHRcdHtcblx0XHRcdHRpdGxlOiAnTWluIHdlaWdodCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdHRpdGxlOiAnTWF4IHdlaWdodCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdHRpdGxlOiAnRGVsaXZlcnkgZGF0ZScsXG5cdFx0XHRzb3J0YWJsZTogdHJ1ZSxcblx0XHRcdHNvcnRQcm9wZXJ0eTogJ2RlbGl2ZXJ5RGF0ZSdcblx0XHR9LFxuXHRcdHtcblx0XHRcdHRpdGxlOiAnIyBvZiBwaWVjZXMnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHR0aXRsZTogJ1ByaWNlJ1xuXHRcdH1cblx0XTtcblxuXHRsZXQgc3RhdHVzZXMgPSBbJ0RFTElWRVJFRCcsICdSRUFEWScsICdQQUNLSU5HJ107XG5cblx0bGV0IGV4dGVuZGVkSGVhZGVycyA9IFsuLi5oZWFkZXJzLCB7dGl0bGU6ICdSYXRpbmcnfSwge3RpdGxlOiAnUHJvbW90aW9uJ31dXG5cblx0bGV0IHRvZGF5ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnN1YnN0cigwLCAxMCk7XG5cblx0bGV0IGRhdGEgPSBbXG5cdFx0e3ZhbGlkOiB0cnVlLCBjcmVhdGVkRGF0ZTogdG9kYXksIHN0YXR1czogJ1JFQURZJywgbWluV2VpZ2h0OiAnMSBrZycsIG1heFdlaWdodDogJzEwIGtnJywgZGVsaXZlcnlEYXRlOiAnJywgbm9PZlBpZWNlczogNSwgcHJpY2U6ICcxMiBFVVInfSxcblx0XHR7dmFsaWQ6IHRydWUsIGNyZWF0ZWREYXRlOiB0b2RheSwgc3RhdHVzOiAnREVMSVZFUkVEJywgbWluV2VpZ2h0OiAnMSBrZycsIG1heFdlaWdodDogJzEwIGtnJywgZGVsaXZlcnlEYXRlOiB0b2RheSwgbm9PZlBpZWNlczogNSwgcHJpY2U6ICcxMiBFVVInfSxcblx0XHR7dmFsaWQ6IHRydWUsIGNyZWF0ZWREYXRlOiB0b2RheSwgc3RhdHVzOiAnUkVBRFknLCBtaW5XZWlnaHQ6ICcxIGtnJywgbWF4V2VpZ2h0OiAnMTAga2cnLCBkZWxpdmVyeURhdGU6ICcnLCBub09mUGllY2VzOiA1LCBwcmljZTogJzEyIEVVUid9LFxuXHRcdHt2YWxpZDogdHJ1ZSwgY3JlYXRlZERhdGU6IHRvZGF5LCBzdGF0dXM6ICdERUxJVkVSRUQnLCBtaW5XZWlnaHQ6ICcxIGtnJywgbWF4V2VpZ2h0OiAnMTAga2cnLCBkZWxpdmVyeURhdGU6IHRvZGF5LCBub09mUGllY2VzOiA1LCBwcmljZTogJzEyIEVVUid9LFxuXHRcdHt2YWxpZDogdHJ1ZSwgY3JlYXRlZERhdGU6IHRvZGF5LCBzdGF0dXM6ICdSRUFEWScsIG1pbldlaWdodDogJzEga2cnLCBtYXhXZWlnaHQ6ICcxMCBrZycsIGRlbGl2ZXJ5RGF0ZTogJycsIG5vT2ZQaWVjZXM6IDUsIHByaWNlOiAnMTIgRVVSJ31cblx0XTtcblxuXHRsZXQgZXh0ZW5kZWREYXRhID0gWy4uLmRhdGFdLm1hcChlbCA9PiBPYmplY3QuYXNzaWduKGVsLCB7cmF0aW5nOiAzLCBwcm9tb3Rpb246IGZhbHNlfSkpO1xuXG5cdGNvbnN0IGhhbmRsZVNvcnRDaGFuZ2UgPSBzb3J0U3RhdGUgPT4ge1xuXHRcdGNvbnN0IHRvYXN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnem9vLXRvYXN0Jyk7XG5cdFx0dG9hc3QudGV4dCA9IHNvcnRTdGF0ZSBcblx0XHRcdD8gJ1NvcnQgc3RhdGUgd2FzIGNoYW5nZWQuIFByb3BlcnR5OiAnICsgc29ydFN0YXRlLnByb3BlcnR5ICsgJywgZGlyZWN0aW9uOiAnICsgc29ydFN0YXRlLmRpcmVjdGlvblxuXHRcdFx0OiAnU29ydCBzdGF0ZSB3YXMgY2hhbmdlZC4gU29ydCBvYmplY3QgaXMgdW5kZWZpbmVkLic7XG5cdFx0Z3JpZEhvbGRlci5hcHBlbmRDaGlsZCh0b2FzdCk7XG5cdFx0dG9hc3Quc2hvdygpO1xuXHR9O1xuXG5cdGNvbnN0IGhhbmRsZVBhZ2VDaGFuZ2UgPSBwYWdlID0+IHtcblx0XHRjb25zdCB0b2FzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3pvby10b2FzdCcpO1xuXHRcdHRvYXN0LnRleHQgPSAnUGFnZSB3YXMgY2hhbmdlZCB0bzogJyArIHBhZ2UucGFnZU51bWJlcjtcblx0XHRncmlkSG9sZGVyLmFwcGVuZENoaWxkKHRvYXN0KTtcblx0XHR0b2FzdC5zaG93KCk7XG5cdH1cbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUE0RndCLEVBQUUsNEJBQUMsQ0FBQyxBQUMxQixLQUFLLENBQUUsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLEFBQUUsQ0FBQyxBQUV2QyxhQUFhLDRCQUFDLENBQUMsQUFDYixPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxNQUFNLENBQ3RCLFdBQVcsQ0FBRSxNQUFNLEFBQUUsQ0FBQyxBQUV4QixPQUFPLDRCQUFDLENBQUMsQUFDUCxtQkFBbUIsQ0FBRSxtQ0FBbUMsVUFBVSxBQUFFLENBQUMsQUFFdkUsT0FBTyw0QkFBQyxDQUFDLEFBQ1AsbUJBQW1CLENBQUUsbUNBQW1DLFVBQVUsQUFBRSxDQUFDLEFBRXZFLFlBQVksNEJBQUMsQ0FBQyxBQUNaLFNBQVMsQ0FBRSxNQUFNLENBQ2pCLFFBQVEsQ0FBRSxJQUFJLENBQ2QsVUFBVSxDQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDckgsS0FBSyxDQUFFLEdBQUcsQUFBRSxDQUFDLEFBRWYsbUNBQU8sQ0FBRSxjQUFjLDRCQUFDLENBQUMsQUFDdkIsWUFBWSxDQUFFLElBQUksQUFBRSxDQUFDLEFBRXZCLGNBQWMsNEJBQUMsQ0FBQyxBQUNkLFNBQVMsQ0FBRSxNQUFNLEFBQUUsQ0FBQyxBQUV0QiwwQkFBWSxDQUFHLEdBQUcsY0FBQyxDQUFDLEFBQ2xCLFVBQVUsQ0FBRSxVQUFVLENBQ3RCLFNBQVMsQ0FBRSxDQUFDLEFBQUUsQ0FBQyxBQUVqQiw4QkFBOEIsNEJBQUMsQ0FBQyxBQUM5QixTQUFTLENBQUUsS0FBSyxBQUFFLENBQUMsQUFDbkIsNENBQThCLENBQUMsdUJBQXVCLGNBQUMsQ0FBQyxBQUN0RCxNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEFBQUUsQ0FBQyxBQUM1Qiw0Q0FBOEIsQ0FBQyxxQ0FBdUIsTUFBTSxBQUFDLENBQUMsQUFDNUQsTUFBTSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxBQUFFLENBQUMifQ== */";
	append_dev(document_1$1.head, style);
}

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

// (9:2) {#each headers as header, idx}
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
			add_location(zoo_grid_header, file$4, 9, 3, 420);
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
		source: "(9:2) {#each headers as header, idx}",
		ctx
	});

	return block;
}

// (21:6) {#each statuses as status}
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
			add_location(option, file$4, 21, 7, 1187);
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
		source: "(21:6) {#each statuses as status}",
		ctx
	});

	return block;
}

// (12:2) {#each data as row, i}
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
			add_location(input0, file$4, 14, 5, 690);
			attr_dev(label, "for", label_for_value = "" + (/*i*/ ctx[22] + "-first-grid-checkbox"));
			attr_dev(label, "slot", "checkboxlabel");
			add_location(label, file$4, 15, 5, 847);
			add_location(zoo_checkbox, file$4, 13, 4, 670);
			attr_dev(div0, "class", "svelte-1rl0sr");
			add_location(div0, file$4, 17, 4, 943);
			attr_dev(select, "title", "Delivery Status");
			select.disabled = select_disabled_value = /*row*/ ctx[20].status == "DELIVERED" ? true : null;
			attr_dev(select, "slot", "selectelement");
			attr_dev(select, "class", "item-per-page-selector");
			add_location(select, file$4, 19, 5, 1009);
			set_custom_element_data(zoo_select, "class", "status svelte-1rl0sr");
			add_location(zoo_select, file$4, 18, 4, 976);
			attr_dev(div1, "class", "svelte-1rl0sr");
			add_location(div1, file$4, 25, 4, 1298);
			attr_dev(div2, "class", "svelte-1rl0sr");
			add_location(div2, file$4, 26, 4, 1329);
			attr_dev(input1, "title", "Delivery Date");
			input1.disabled = input1_disabled_value = /*row*/ ctx[20].status == "DELIVERED" ? true : null;
			input1.value = input1_value_value = /*row*/ ctx[20].deliveryDate;
			attr_dev(input1, "slot", "inputelement");
			attr_dev(input1, "type", "date");
			attr_dev(input1, "placeholder", "Enter date");
			add_location(input1, file$4, 28, 5, 1399);
			set_custom_element_data(zoo_input, "class", "delivery-date svelte-1rl0sr");
			add_location(zoo_input, file$4, 27, 4, 1360);
			attr_dev(div3, "class", "svelte-1rl0sr");
			add_location(div3, file$4, 30, 4, 1589);
			attr_dev(div4, "class", "svelte-1rl0sr");
			add_location(div4, file$4, 31, 4, 1621);
			attr_dev(div5, "class", "example-row limited-width svelte-1rl0sr");
			attr_dev(div5, "slot", "row");
			add_location(div5, file$4, 12, 3, 615);
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
		source: "(12:2) {#each data as row, i}",
		ctx
	});

	return block;
}

// (39:5) {#each possibleNumberOfItems as number, idx}
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
			add_location(option, file$4, 39, 6, 1920);
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
		source: "(39:5) {#each possibleNumberOfItems as number, idx}",
		ctx
	});

	return block;
}

// (54:3) {#each extendedHeaders as header, i}
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
			add_location(zoo_grid_header, file$4, 54, 4, 2585);
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
		source: "(54:3) {#each extendedHeaders as header, i}",
		ctx
	});

	return block;
}

// (58:3) {#each extendedData as row, i}
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
			add_location(input0, file$4, 60, 6, 2887);
			attr_dev(label0, "for", label0_for_value = "" + (/*i*/ ctx[22] + "-second-grid-checkbox"));
			attr_dev(label0, "slot", "checkboxlabel");
			add_location(label0, file$4, 61, 6, 3046);
			set_custom_element_data(zoo_checkbox0, "labeltext", "Valid");
			add_location(zoo_checkbox0, file$4, 59, 5, 2848);
			attr_dev(div0, "class", "svelte-1rl0sr");
			add_location(div0, file$4, 63, 5, 3145);
			attr_dev(div1, "class", "svelte-1rl0sr");
			add_location(div1, file$4, 64, 5, 3179);
			attr_dev(div2, "class", "svelte-1rl0sr");
			add_location(div2, file$4, 65, 5, 3208);
			attr_dev(div3, "class", "svelte-1rl0sr");
			add_location(div3, file$4, 66, 5, 3240);
			attr_dev(div4, "class", "svelte-1rl0sr");
			add_location(div4, file$4, 67, 5, 3272);
			attr_dev(div5, "class", "svelte-1rl0sr");
			add_location(div5, file$4, 68, 5, 3307);
			attr_dev(div6, "class", "svelte-1rl0sr");
			add_location(div6, file$4, 69, 5, 3340);
			attr_dev(div7, "class", "svelte-1rl0sr");
			add_location(div7, file$4, 70, 5, 3368);
			attr_dev(input1, "id", input1_id_value = "" + (/*i*/ ctx[22] + "-second-grid-promo-checkbox"));
			input1.checked = input1_checked_value = /*row*/ ctx[20].promotion;
			attr_dev(input1, "slot", "checkboxelement");
			attr_dev(input1, "type", "checkbox");
			add_location(input1, file$4, 72, 6, 3418);
			attr_dev(label1, "for", label1_for_value = "" + (/*i*/ ctx[22] + "-second-grid-promo-checkbox"));
			attr_dev(label1, "slot", "checkboxlabel");
			add_location(label1, file$4, 73, 6, 3534);
			add_location(zoo_checkbox1, file$4, 71, 5, 3397);
			attr_dev(div8, "class", "example-row limited-width svelte-1rl0sr");
			attr_dev(div8, "slot", "row");
			add_location(div8, file$4, 58, 4, 2792);
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
		source: "(58:3) {#each extendedData as row, i}",
		ctx
	});

	return block;
}

// (82:6) {#each possibleNumberOfItems as number, idx}
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
			add_location(option, file$4, 82, 7, 3922);
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
		source: "(82:6) {#each possibleNumberOfItems as number, idx}",
		ctx
	});

	return block;
}

function create_fragment$4(ctx) {
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
	let current;
	let mounted;
	let dispose;

	const context = new Context({
			props: { text: "Data grids" },
			$$inline: true
		});

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
			create_component(context.$$.fragment);
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
			attr_dev(h30, "class", "svelte-1rl0sr");
			add_location(h30, file$4, 2, 1, 82);
			attr_dev(select0, "id", "first-grid-page-size");
			attr_dev(select0, "slot", "selectelement");
			attr_dev(select0, "class", "item-per-page-selector svelte-1rl0sr");
			add_location(select0, file$4, 37, 4, 1777);
			attr_dev(label0, "for", "first-grid-page-size");
			attr_dev(label0, "slot", "selectlabel");
			add_location(label0, file$4, 42, 4, 1999);
			set_custom_element_data(zoo_select0, "labelposition", "left");
			add_location(zoo_select0, file$4, 36, 3, 1738);
			attr_dev(div0, "class", "item-per-page-selector-holder svelte-1rl0sr");
			attr_dev(div0, "slot", "pagesizeselector");
			add_location(div0, file$4, 35, 2, 1667);
			set_custom_element_data(zoo_grid0, "class", "limited-width grid-1 svelte-1rl0sr");
			set_custom_element_data(zoo_grid0, "stickyheader", "");
			set_custom_element_data(zoo_grid0, "currentpage", "5");
			set_custom_element_data(zoo_grid0, "maxpages", "20");
			set_custom_element_data(zoo_grid0, "resizable", "");
			set_custom_element_data(zoo_grid0, "reorderable", "");
			add_location(zoo_grid0, file$4, 5, 1, 175);
			attr_dev(div1, "class", "grid-holder svelte-1rl0sr");
			add_location(div1, file$4, 4, 1, 148);
			attr_dev(h31, "class", "svelte-1rl0sr");
			add_location(h31, file$4, 48, 1, 2119);
			attr_dev(select1, "id", "second-grid-page-size");
			attr_dev(select1, "slot", "selectelement");
			attr_dev(select1, "class", "item-per-page-selector svelte-1rl0sr");
			add_location(select1, file$4, 80, 5, 3776);
			attr_dev(label1, "for", "second-grid-page-size");
			attr_dev(label1, "slot", "selectlabel");
			add_location(label1, file$4, 85, 5, 4004);
			set_custom_element_data(zoo_select1, "labelposition", "left");
			add_location(zoo_select1, file$4, 79, 4, 3736);
			attr_dev(div2, "class", "item-per-page-selector-holder svelte-1rl0sr");
			attr_dev(div2, "slot", "pagesizeselector");
			add_location(div2, file$4, 78, 3, 3664);
			set_custom_element_data(zoo_grid1, "class", "limited-width grid-2 svelte-1rl0sr");
			set_style(zoo_grid1, "min-width", "1024px");
			set_style(zoo_grid1, "margin", "0 auto");
			set_style(zoo_grid1, "display", "block");
			set_custom_element_data(zoo_grid1, "stickyheader", "");
			set_custom_element_data(zoo_grid1, "currentpage", "1");
			set_custom_element_data(zoo_grid1, "maxpages", "4");
			add_location(zoo_grid1, file$4, 51, 2, 2297);
			attr_dev(div3, "class", "grid-holder svelte-1rl0sr");
			set_style(div3, "max-width", "850px");
			set_style(div3, "max-height", "300px");
			add_location(div3, file$4, 50, 1, 2224);
			attr_dev(div4, "class", "grids-holder svelte-1rl0sr");
			add_location(div4, file$4, 1, 0, 29);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(context, target, anchor);
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
			current = true;

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
		i: function intro(local) {
			if (current) return;
			transition_in(context.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(context.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(context, detaching);
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
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Grids> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Grids", $$slots, []);
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
		Context,
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

class Grids extends SvelteComponentDev {
	constructor(options) {
		super(options);
		if (!document_1$1.getElementById("svelte-1rl0sr-style")) add_css$4();
		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Grids",
			options,
			id: create_fragment$4.name
		});
	}
}

/* src/App.svelte generated by Svelte v3.23.0 */
const file$5 = "src/App.svelte";

function add_css$5() {
	var style = element("style");
	style.id = "svelte-kbf7ld-style";
	style.textContent = ".external-docs.svelte-kbf7ld.svelte-kbf7ld{width:100%;display:flex;align-items:center;justify-content:center}.app.svelte-kbf7ld.svelte-kbf7ld{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1)}.page-content.svelte-kbf7ld.svelte-kbf7ld{position:relative;display:grid;grid-template-columns:1fr;grid-gap:30px;grid-template-areas:\"overview\" \"caniuse\" \"spec-docs\"}@media only screen and (max-width: 850px){.page-content.svelte-kbf7ld.svelte-kbf7ld{grid-template-columns:minmax(320px, 90%);justify-content:center}}.what-list.svelte-kbf7ld.svelte-kbf7ld{color:var(--primary-mid, #3C9700);font-size:20px}#when.svelte-kbf7ld aside.svelte-kbf7ld{color:var(--primary-dark, #286400);text-align:center}@media only screen and (max-width: 850px){#when.svelte-kbf7ld .desktop.svelte-kbf7ld{display:none}}#when.svelte-kbf7ld .mobile.svelte-kbf7ld{display:none}@media only screen and (max-width: 850px){#when.svelte-kbf7ld .mobile.svelte-kbf7ld{display:block}}#when.svelte-kbf7ld .back-btn.svelte-kbf7ld{width:280px;margin:10px auto}#when.svelte-kbf7ld .back-btn a.svelte-kbf7ld{text-decoration:none;color:white}.overview.svelte-kbf7ld.svelte-kbf7ld{grid-area:overview;max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}.caniuse.svelte-kbf7ld.svelte-kbf7ld{grid-area:caniuse;width:100%;flex:1 0 auto}.caniuse.svelte-kbf7ld p.svelte-kbf7ld{max-width:1280px;margin:0 auto}.spec-docs.svelte-kbf7ld.svelte-kbf7ld{grid-area:spec-docs;margin-bottom:50px}hr.svelte-kbf7ld.svelte-kbf7ld{border-color:var(--primary-mid, #3C9700);margin:45px 0;opacity:0.3}.footer.svelte-kbf7ld.svelte-kbf7ld{flex-shrink:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwiYXBwXCI+XG5cdDxIZWFkZXIvPlxuXHQ8bWFpbj5cblx0XHQ8Q29udGV4dCBpZD1cIndoYXRcIiB0ZXh0PVwiV2hhdCBpcyB0aGlzIHByb2plY3Q/XCIvPlxuXHRcdDx1bCBjbGFzcz1cIndoYXQtbGlzdFwiPlxuXHRcdFx0PGxpPlxuXHRcdFx0XHRTZXQgb2Ygd2ViLWNvbXBvbmVudHMgd2hpY2ggY2FuIGJlIHVzZWQgaW4gYW55IG1vZGVybiBVSSBmcmFtZXdvcmsgKG9yIHdpdGhvdXQgYW55KS5cblx0XHRcdDwvbGk+XG5cdFx0XHQ8bGk+XG5cdFx0XHRcdFRoZSB3ZWItY29tcG9uZW50IHNldCBpbXBsZW1lbnRzIForIHNob3Agc3R5bGUgZ3VpZGUuXG5cdFx0XHQ8L2xpPlxuXHRcdDwvdWw+XG5cdFx0PGRpdiBjbGFzcz1cInBhZ2UtY29udGVudFwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cIm92ZXJ2aWV3XCI+XG5cdFx0XHRcdDxGb3JtLz5cblx0XHRcdFx0PGhyPlxuXHRcdFx0XHQ8QnV0dG9ucy8+XG5cdFx0XHRcdDxocj5cblx0XHRcdFx0PEdyaWRzLz5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBpZD1cIndoZW5cIiBjbGFzcz1cImNhbml1c2VcIj5cblx0XHRcdFx0PENvbnRleHQgdGV4dD1cIldoZW4gY2FuIEkgdXNlIGl0P1wiIGJhY2tidG49XCJ7dHJ1ZX1cIi8+XG5cdFx0XHRcdDxhc2lkZT5BbHRob3VnaCBzYWZhcmkgaXMgbWFya2VkIGFzIHBhcnRpYWxseSBzdXBwb3J0aW5nIHRoZXNlIGZlYXR1cmVzLCB0aGlzIHByb2plY3QgZG9lcyBub3QgdXNlIGFueSBmZWF0dXJlcyB0aGF0IGRvIG5vdCB3b3JrIGluIFNhZmFyaS48L2FzaWRlPlxuXHRcdFx0XHQ8YnI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJkZXNrdG9wXCI+XG5cdFx0XHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJzaGFkb3dkb212MVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0XHRcdDxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9c2hhZG93ZG9tdjFcIj5DYW4gSSBVc2Ugc2hhZG93ZG9tdjE/PC9hPiBEYXRhIG9uIHN1cHBvcnQgZm9yIHRoZSBzaGFkb3dkb212MSBmZWF0dXJlIGFjcm9zcyB0aGUgbWFqb3IgYnJvd3NlcnMgZnJvbSBjYW5pdXNlLmNvbS5cblx0XHRcdFx0XHQ8L3A+XG5cdFx0XHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJjdXN0b20tZWxlbWVudHN2MVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0XHRcdDxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9Y3VzdG9tLWVsZW1lbnRzdjFcIj5DYW4gSSBVc2UgY3VzdG9tLWVsZW1lbnRzdjE/PC9hPiBEYXRhIG9uIHN1cHBvcnQgZm9yIHRoZSBjdXN0b20tZWxlbWVudHN2MSBmZWF0dXJlIGFjcm9zcyB0aGUgbWFqb3IgYnJvd3NlcnMgZnJvbSBjYW5pdXNlLmNvbS5cblx0XHRcdFx0XHQ8L3A+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwibW9iaWxlXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImJhY2stYnRuXCI+XG5cdFx0XHRcdFx0XHQ8em9vLWJ1dHRvbj5cblx0XHRcdFx0XHRcdFx0PHNwYW4gc2xvdD1cImJ1dHRvbmNvbnRlbnRcIj48YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PXNoYWRvd2RvbXYxXCIgdGFyZ2V0PVwiYWJvdXQ6YmxhbmtcIj5DYW4gSSBVc2Ugc2hhZG93ZG9tdjE/PC9hPjwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvem9vLWJ1dHRvbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYmFjay1idG5cIj5cblx0XHRcdFx0XHRcdDx6b28tYnV0dG9uPlxuXHRcdFx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPjxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9Y3VzdG9tLWVsZW1lbnRzdjFcIiB0YXJnZXQ9XCJhYm91dDpibGFua1wiPkNhbiBJIFVzZSBjdXN0b20tZWxlbWVudHN2MT88L2E+PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC96b28tYnV0dG9uPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBpZD1cImhvd1wiIGNsYXNzPVwic3BlYy1kb2NzXCI+XG5cdFx0XHRcdDxDb250ZXh0IHRleHQ9XCJIb3cgY2FuIEkgdXNlIGl0P1wiIGJhY2tidG49XCJ7dHJ1ZX1cIi8+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJleHRlcm5hbC1kb2NzXCI+XG5cdFx0XHRcdFx0RG9jdW1lbnRhdGlvbiBmb3IgZWFjaCBjb21wb25lbnQgaXMgYXZhaWxhYmxlIGF0XG5cdFx0XHRcdFx0PHpvby1saW5rIGhyZWY9XCJodHRwczovL3pvb3BsdXMuZ2l0aHViLmlvL3pvby13ZWItY29tcG9uZW50cy1kb2NzL2luZGV4Lmh0bWxcIiB0ZXh0PVwiRG9jcyBwYWdlXCIgc2l6ZT1cImxhcmdlXCIgdHlwZT1cInByaW1hcnlcIj48L3pvby1saW5rPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHQ8L21haW4+XG5cdDx6b28tZm9vdGVyIGNsYXNzPVwiZm9vdGVyXCIgY29weXJpZ2h0PVwiem9vcGx1cyBBR1wiPlxuXHRcdHsjZWFjaCBmb290ZXJsaW5rcyBhcyBmb290ZXJsaW5rfVxuXHRcdFx0PHpvby1saW5rIGhyZWY9XCJ7Zm9vdGVybGluay5ocmVmfVwiIHRhcmdldD1cIntmb290ZXJsaW5rLnRhcmdldH1cIiB0eXBlPVwie2Zvb3RlcmxpbmsudHlwZX1cIlxuXHRcdFx0XHRkaXNhYmxlZD1cIntmb290ZXJsaW5rLmRpc2FibGVkfVwiIHRleHQ9XCJ7Zm9vdGVybGluay50ZXh0fVwiPlxuXHRcdFx0PC96b28tbGluaz5cblx0XHR7L2VhY2h9XG5cdDwvem9vLWZvb3Rlcj4gXG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uZXh0ZXJuYWwtZG9jcyB7XG4gIHdpZHRoOiAxMDAlO1xuICBkaXNwbGF5OiBmbGV4O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgfVxuXG4uYXBwIHtcbiAgbWFyZ2luOiAwIGF1dG87XG4gIGhlaWdodDogMTAwJTtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgYm94LXNoYWRvdzogMCA0cHggMTVweCAwIHJnYmEoMCwgMCwgMCwgMC4xKTsgfVxuXG4ucGFnZS1jb250ZW50IHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBkaXNwbGF5OiBncmlkO1xuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmcjtcbiAgZ3JpZC1nYXA6IDMwcHg7XG4gIGdyaWQtdGVtcGxhdGUtYXJlYXM6IFwib3ZlcnZpZXdcIiBcImNhbml1c2VcIiBcInNwZWMtZG9jc1wiOyB9XG4gIEBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogODUwcHgpIHtcbiAgICAucGFnZS1jb250ZW50IHtcbiAgICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogbWlubWF4KDMyMHB4LCA5MCUpO1xuICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IH0gfVxuXG4ud2hhdC1saXN0IHtcbiAgY29sb3I6IHZhcigtLXByaW1hcnktbWlkLCAjM0M5NzAwKTtcbiAgZm9udC1zaXplOiAyMHB4OyB9XG5cbiN3aGVuIGFzaWRlIHtcbiAgY29sb3I6IHZhcigtLXByaW1hcnktZGFyaywgIzI4NjQwMCk7XG4gIHRleHQtYWxpZ246IGNlbnRlcjsgfVxuXG5AbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gICN3aGVuIC5kZXNrdG9wIHtcbiAgICBkaXNwbGF5OiBub25lOyB9IH1cblxuI3doZW4gLm1vYmlsZSB7XG4gIGRpc3BsYXk6IG5vbmU7IH1cbiAgQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA4NTBweCkge1xuICAgICN3aGVuIC5tb2JpbGUge1xuICAgICAgZGlzcGxheTogYmxvY2s7IH0gfVxuXG4jd2hlbiAuYmFjay1idG4ge1xuICB3aWR0aDogMjgwcHg7XG4gIG1hcmdpbjogMTBweCBhdXRvOyB9XG4gICN3aGVuIC5iYWNrLWJ0biBhIHtcbiAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgY29sb3I6IHdoaXRlOyB9XG5cbi5saW5rLXdyYXBwZXIge1xuICBoZWlnaHQ6IGF1dG87XG4gIHRyYW5zaXRpb246IGNvbG9yIDAuM3MsIGJhY2tncm91bmQtY29sb3IgMC4zczsgfVxuICAubGluay13cmFwcGVyOmhvdmVyIHtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMSk7XG4gICAgY29sb3I6IHdoaXRlOyB9XG4gIC5saW5rLXdyYXBwZXIgYSB7XG4gICAgY29sb3I6IHZhcigtLXByaW1hcnktbWlkLCAjM0M5NzAwKTtcbiAgICBwYWRkaW5nOiAxMnB4O1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTsgfVxuXG4ub3ZlcnZpZXcge1xuICBncmlkLWFyZWE6IG92ZXJ2aWV3O1xuICBtYXgtd2lkdGg6IDEyODBweDtcbiAgd2lkdGg6IDEwMCU7XG4gIGZsZXg6IDEgMCBhdXRvO1xuICBtYXJnaW46IDAgYXV0bzsgfVxuXG4uY2FuaXVzZSB7XG4gIGdyaWQtYXJlYTogY2FuaXVzZTtcbiAgd2lkdGg6IDEwMCU7XG4gIGZsZXg6IDEgMCBhdXRvOyB9XG5cbi5jYW5pdXNlIHAge1xuICBtYXgtd2lkdGg6IDEyODBweDtcbiAgbWFyZ2luOiAwIGF1dG87IH1cblxuLnNwZWMtZG9jcyB7XG4gIGdyaWQtYXJlYTogc3BlYy1kb2NzO1xuICBtYXJnaW4tYm90dG9tOiA1MHB4OyB9XG5cbmhyIHtcbiAgYm9yZGVyLWNvbG9yOiB2YXIoLS1wcmltYXJ5LW1pZCwgIzNDOTcwMCk7XG4gIG1hcmdpbjogNDVweCAwO1xuICBvcGFjaXR5OiAwLjM7IH1cblxuLmZvb3RlciB7XG4gIGZsZXgtc2hyaW5rOiAwOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPXgubWFwICovPC9zdHlsZT5cblxuPHNjcmlwdD5cblx0aW1wb3J0IEhlYWRlciBmcm9tICcuL0hlYWRlci5zdmVsdGUnO1xuXHRpbXBvcnQgQnV0dG9ucyBmcm9tICcuL0J1dHRvbnMuc3ZlbHRlJztcblx0aW1wb3J0IEZvcm0gZnJvbSAnLi9Gb3JtLnN2ZWx0ZSc7XG5cdGltcG9ydCBHcmlkcyBmcm9tICcuL0dyaWRzLnN2ZWx0ZSc7XG5cdGltcG9ydCBDb250ZXh0IGZyb20gJy4vQ29udGV4dC5zdmVsdGUnO1xuXHRsZXQgZm9vdGVybGlua3MgPSBbXG5cdFx0e1xuXHRcdFx0aHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS96b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXG5cdFx0XHR0ZXh0OiAnR2l0aHViJyxcblx0XHRcdHR5cGU6ICduZWdhdGl2ZSdcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICdodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9Aem9vcGx1cy96b28td2ViLWNvbXBvbmVudHMnLFxuXHRcdFx0dGV4dDogJ05QTScsXG5cdFx0XHR0eXBlOiAnbmVnYXRpdmUnXG5cdFx0fVxuXHRdO1xuXHRsZXQgZG9jbGlua3MgPSBbXG5cdFx0e1xuXHRcdFx0aHJlZjogJyN0aGVtaW5nLWRvYycsXG5cdFx0XHR0ZXh0OiAnVGhlbWluZydcblx0XHR9XG5cdF07XG48L3NjcmlwdD4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBK0R3QixjQUFjLDRCQUFDLENBQUMsQUFDdEMsS0FBSyxDQUFFLElBQUksQ0FDWCxPQUFPLENBQUUsSUFBSSxDQUNiLFdBQVcsQ0FBRSxNQUFNLENBQ25CLGVBQWUsQ0FBRSxNQUFNLEFBQUUsQ0FBQyxBQUU1QixJQUFJLDRCQUFDLENBQUMsQUFDSixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FDZCxNQUFNLENBQUUsSUFBSSxDQUNaLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLE1BQU0sQ0FDdEIsVUFBVSxDQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUFFLENBQUMsQUFFaEQsYUFBYSw0QkFBQyxDQUFDLEFBQ2IsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsT0FBTyxDQUFFLElBQUksQ0FDYixxQkFBcUIsQ0FBRSxHQUFHLENBQzFCLFFBQVEsQ0FBRSxJQUFJLENBQ2QsbUJBQW1CLENBQUUsVUFBVSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEFBQUUsQ0FBQyxBQUN4RCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxDQUFDLEFBQUMsQ0FBQyxBQUN6QyxhQUFhLDRCQUFDLENBQUMsQUFDYixxQkFBcUIsQ0FBRSxPQUFPLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUN6QyxlQUFlLENBQUUsTUFBTSxBQUFFLENBQUMsQUFBQyxDQUFDLEFBRWxDLFVBQVUsNEJBQUMsQ0FBQyxBQUNWLEtBQUssQ0FBRSxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FDbEMsU0FBUyxDQUFFLElBQUksQUFBRSxDQUFDLEFBRXBCLG1CQUFLLENBQUMsS0FBSyxjQUFDLENBQUMsQUFDWCxLQUFLLENBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLENBQ25DLFVBQVUsQ0FBRSxNQUFNLEFBQUUsQ0FBQyxBQUV2QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxDQUFDLEFBQUMsQ0FBQyxBQUN6QyxtQkFBSyxDQUFDLFFBQVEsY0FBQyxDQUFDLEFBQ2QsT0FBTyxDQUFFLElBQUksQUFBRSxDQUFDLEFBQUMsQ0FBQyxBQUV0QixtQkFBSyxDQUFDLE9BQU8sY0FBQyxDQUFDLEFBQ2IsT0FBTyxDQUFFLElBQUksQUFBRSxDQUFDLEFBQ2hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pDLG1CQUFLLENBQUMsT0FBTyxjQUFDLENBQUMsQUFDYixPQUFPLENBQUUsS0FBSyxBQUFFLENBQUMsQUFBQyxDQUFDLEFBRXpCLG1CQUFLLENBQUMsU0FBUyxjQUFDLENBQUMsQUFDZixLQUFLLENBQUUsS0FBSyxDQUNaLE1BQU0sQ0FBRSxJQUFJLENBQUMsSUFBSSxBQUFFLENBQUMsQUFDcEIsbUJBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxjQUFDLENBQUMsQUFDakIsZUFBZSxDQUFFLElBQUksQ0FDckIsS0FBSyxDQUFFLEtBQUssQUFBRSxDQUFDLEFBY25CLFNBQVMsNEJBQUMsQ0FBQyxBQUNULFNBQVMsQ0FBRSxRQUFRLENBQ25CLFNBQVMsQ0FBRSxNQUFNLENBQ2pCLEtBQUssQ0FBRSxJQUFJLENBQ1gsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNkLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSw0QkFBQyxDQUFDLEFBQ1IsU0FBUyxDQUFFLE9BQU8sQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixzQkFBUSxDQUFDLENBQUMsY0FBQyxDQUFDLEFBQ1YsU0FBUyxDQUFFLE1BQU0sQ0FDakIsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixVQUFVLDRCQUFDLENBQUMsQUFDVixTQUFTLENBQUUsU0FBUyxDQUNwQixhQUFhLENBQUUsSUFBSSxBQUFFLENBQUMsQUFFeEIsRUFBRSw0QkFBQyxDQUFDLEFBQ0YsWUFBWSxDQUFFLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUN6QyxNQUFNLENBQUUsSUFBSSxDQUFDLENBQUMsQ0FDZCxPQUFPLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFakIsT0FBTyw0QkFBQyxDQUFDLEFBQ1AsV0FBVyxDQUFFLENBQUMsQUFBRSxDQUFDIn0= */";
	append_dev(document.head, style);
}

function get_each_context$3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[2] = list[i];
	return child_ctx;
}

// (56:2) {#each footerlinks as footerlink}
function create_each_block$3(ctx) {
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
			add_location(zoo_link, file$5, 56, 3, 2298);
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
		id: create_each_block$3.name,
		type: "each",
		source: "(56:2) {#each footerlinks as footerlink}",
		ctx
	});

	return block;
}

function create_fragment$5(ctx) {
	let div9;
	let t0;
	let main;
	let t1;
	let ul;
	let li0;
	let t3;
	let li1;
	let t5;
	let div8;
	let div0;
	let t6;
	let hr0;
	let t7;
	let t8;
	let hr1;
	let t9;
	let t10;
	let div5;
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
	let t25;
	let div6;
	let t26;
	let zoo_link;
	let t27;
	let zoo_footer;
	let current;
	const header = new Header({ $$inline: true });

	const context0 = new Context({
			props: {
				id: "what",
				text: "What is this project?"
			},
			$$inline: true
		});

	const form = new Form({ $$inline: true });
	const buttons = new Buttons({ $$inline: true });
	const grids = new Grids({ $$inline: true });

	const context1 = new Context({
			props: {
				text: "When can I use it?",
				backbtn: true
			},
			$$inline: true
		});

	const context2 = new Context({
			props: { text: "How can I use it?", backbtn: true },
			$$inline: true
		});

	let each_value = /*footerlinks*/ ctx[0];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			div9 = element("div");
			create_component(header.$$.fragment);
			t0 = space();
			main = element("main");
			create_component(context0.$$.fragment);
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
			create_component(form.$$.fragment);
			t6 = space();
			hr0 = element("hr");
			t7 = space();
			create_component(buttons.$$.fragment);
			t8 = space();
			hr1 = element("hr");
			t9 = space();
			create_component(grids.$$.fragment);
			t10 = space();
			div5 = element("div");
			create_component(context1.$$.fragment);
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
			create_component(context2.$$.fragment);
			t25 = space();
			div6 = element("div");
			t26 = text("Documentation for each component is available at\n\t\t\t\t\t");
			zoo_link = element("zoo-link");
			t27 = space();
			zoo_footer = element("zoo-footer");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			add_location(li0, file$5, 5, 3, 117);
			add_location(li1, file$5, 8, 3, 223);
			attr_dev(ul, "class", "what-list svelte-kbf7ld");
			add_location(ul, file$5, 4, 2, 91);
			attr_dev(hr0, "class", "svelte-kbf7ld");
			add_location(hr0, file$5, 15, 4, 374);
			attr_dev(hr1, "class", "svelte-kbf7ld");
			add_location(hr1, file$5, 17, 4, 398);
			attr_dev(div0, "class", "overview svelte-kbf7ld");
			add_location(div0, file$5, 13, 3, 335);
			attr_dev(aside, "class", "svelte-kbf7ld");
			add_location(aside, file$5, 22, 4, 523);
			add_location(br, file$5, 23, 4, 675);
			attr_dev(a0, "href", "http://caniuse.com/#feat=shadowdomv1");
			attr_dev(a0, "class", "svelte-kbf7ld");
			add_location(a0, file$5, 26, 6, 844);
			attr_dev(p0, "class", "ciu_embed svelte-kbf7ld");
			attr_dev(p0, "data-feature", "shadowdomv1");
			attr_dev(p0, "data-periods", "future_1,current,past_1,past_2");
			attr_dev(p0, "data-accessible-colours", "false");
			add_location(p0, file$5, 25, 5, 711);
			attr_dev(a1, "href", "http://caniuse.com/#feat=custom-elementsv1");
			attr_dev(a1, "class", "svelte-kbf7ld");
			add_location(a1, file$5, 29, 6, 1160);
			attr_dev(p1, "class", "ciu_embed svelte-kbf7ld");
			attr_dev(p1, "data-feature", "custom-elementsv1");
			attr_dev(p1, "data-periods", "future_1,current,past_1,past_2");
			attr_dev(p1, "data-accessible-colours", "false");
			add_location(p1, file$5, 28, 5, 1021);
			attr_dev(div1, "class", "desktop svelte-kbf7ld");
			add_location(div1, file$5, 24, 4, 684);
			attr_dev(a2, "href", "http://caniuse.com/#feat=shadowdomv1");
			attr_dev(a2, "target", "about:blank");
			attr_dev(a2, "class", "svelte-kbf7ld");
			add_location(a2, file$5, 35, 34, 1467);
			attr_dev(span0, "slot", "buttoncontent");
			add_location(span0, file$5, 35, 7, 1440);
			add_location(zoo_button0, file$5, 34, 6, 1420);
			attr_dev(div2, "class", "back-btn svelte-kbf7ld");
			add_location(div2, file$5, 33, 5, 1391);
			attr_dev(a3, "href", "http://caniuse.com/#feat=custom-elementsv1");
			attr_dev(a3, "target", "about:blank");
			attr_dev(a3, "class", "svelte-kbf7ld");
			add_location(a3, file$5, 40, 34, 1682);
			attr_dev(span1, "slot", "buttoncontent");
			add_location(span1, file$5, 40, 7, 1655);
			add_location(zoo_button1, file$5, 39, 6, 1635);
			attr_dev(div3, "class", "back-btn svelte-kbf7ld");
			add_location(div3, file$5, 38, 5, 1606);
			attr_dev(div4, "class", "mobile svelte-kbf7ld");
			add_location(div4, file$5, 32, 4, 1365);
			attr_dev(div5, "id", "when");
			attr_dev(div5, "class", "caniuse svelte-kbf7ld");
			add_location(div5, file$5, 20, 3, 429);
			set_custom_element_data(zoo_link, "href", "https://zooplus.github.io/zoo-web-components-docs/index.html");
			set_custom_element_data(zoo_link, "text", "Docs page");
			set_custom_element_data(zoo_link, "size", "large");
			set_custom_element_data(zoo_link, "type", "primary");
			add_location(zoo_link, file$5, 49, 5, 2033);
			attr_dev(div6, "class", "external-docs svelte-kbf7ld");
			add_location(div6, file$5, 47, 4, 1946);
			attr_dev(div7, "id", "how");
			attr_dev(div7, "class", "spec-docs svelte-kbf7ld");
			add_location(div7, file$5, 45, 3, 1852);
			attr_dev(div8, "class", "page-content svelte-kbf7ld");
			add_location(div8, file$5, 12, 2, 305);
			add_location(main, file$5, 2, 1, 30);
			set_custom_element_data(zoo_footer, "class", "footer svelte-kbf7ld");
			set_custom_element_data(zoo_footer, "copyright", "zooplus AG");
			add_location(zoo_footer, file$5, 54, 1, 2208);
			attr_dev(div9, "class", "app svelte-kbf7ld");
			add_location(div9, file$5, 0, 0, 0);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div9, anchor);
			mount_component(header, div9, null);
			append_dev(div9, t0);
			append_dev(div9, main);
			mount_component(context0, main, null);
			append_dev(main, t1);
			append_dev(main, ul);
			append_dev(ul, li0);
			append_dev(ul, t3);
			append_dev(ul, li1);
			append_dev(main, t5);
			append_dev(main, div8);
			append_dev(div8, div0);
			mount_component(form, div0, null);
			append_dev(div0, t6);
			append_dev(div0, hr0);
			append_dev(div0, t7);
			mount_component(buttons, div0, null);
			append_dev(div0, t8);
			append_dev(div0, hr1);
			append_dev(div0, t9);
			mount_component(grids, div0, null);
			append_dev(div8, t10);
			append_dev(div8, div5);
			mount_component(context1, div5, null);
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
			mount_component(context2, div7, null);
			append_dev(div7, t25);
			append_dev(div7, div6);
			append_dev(div6, t26);
			append_dev(div6, zoo_link);
			append_dev(div9, t27);
			append_dev(div9, zoo_footer);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(zoo_footer, null);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*footerlinks*/ 1) {
				each_value = /*footerlinks*/ ctx[0];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$3(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$3(child_ctx);
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
		i: function intro(local) {
			if (current) return;
			transition_in(header.$$.fragment, local);
			transition_in(context0.$$.fragment, local);
			transition_in(form.$$.fragment, local);
			transition_in(buttons.$$.fragment, local);
			transition_in(grids.$$.fragment, local);
			transition_in(context1.$$.fragment, local);
			transition_in(context2.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(header.$$.fragment, local);
			transition_out(context0.$$.fragment, local);
			transition_out(form.$$.fragment, local);
			transition_out(buttons.$$.fragment, local);
			transition_out(grids.$$.fragment, local);
			transition_out(context1.$$.fragment, local);
			transition_out(context2.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div9);
			destroy_component(header);
			destroy_component(context0);
			destroy_component(form);
			destroy_component(buttons);
			destroy_component(grids);
			destroy_component(context1);
			destroy_component(context2);
			destroy_each(each_blocks, detaching);
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

	$$self.$capture_state = () => ({
		Header,
		Buttons,
		Form,
		Grids,
		Context,
		footerlinks,
		doclinks
	});

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
		if (!document.getElementById("svelte-kbf7ld-style")) add_css$5();
		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "App",
			options,
			id: create_fragment$5.name
		});
	}
}

const app = new App({
	target: document.body
});

export default app;
//# sourceMappingURL=app.js.map
