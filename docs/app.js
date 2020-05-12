var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
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
    function not_equal(a, b) {
        return a != a ? b == b : a !== b;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function once(fn) {
        let ran = false;
        return function (...args) {
            if (ran)
                return;
            ran = true;
            fn.call(this, ...args);
        };
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }
    const has_prop = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;
    // used internally for testing
    function set_now(fn) {
        now = fn;
    }
    function set_raf(fn) {
        raf = fn;
    }

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * For testing purposes only!
     */
    function clear_loops() {
        tasks.clear();
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function element_is(name, is) {
        return document.createElement(name, { is });
    }
    function object_without_properties(obj, exclude) {
        const target = {};
        for (const k in obj) {
            if (has_prop(obj, k)
                // @ts-ignore
                && exclude.indexOf(k) === -1) {
                // @ts-ignore
                target[k] = obj[k];
            }
        }
        return target;
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function self(fn) {
        return function (event) {
            // @ts-ignore
            if (event.target === this)
                fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value' || descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function set_svg_attributes(node, attributes) {
        for (const key in attributes) {
            attr(node, key, attributes[key]);
        }
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function xlink_attr(node, attribute, value) {
        node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
    }
    function get_binding_group_value(group) {
        const value = [];
        for (let i = 0; i < group.length; i += 1) {
            if (group[i].checked)
                value.push(group[i].__value);
        }
        return value;
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function time_ranges_to_array(ranges) {
        const array = [];
        for (let i = 0; i < ranges.length; i += 1) {
            array.push({ start: ranges.start(i), end: ranges.end(i) });
        }
        return array;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function claim_element(nodes, name, attributes, svg) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeName === name) {
                let j = 0;
                while (j < node.attributes.length) {
                    const attribute = node.attributes[j];
                    if (attributes[attribute.name]) {
                        j++;
                    }
                    else {
                        node.removeAttribute(attribute.name);
                    }
                }
                return nodes.splice(i, 1)[0];
            }
        }
        return svg ? svg_element(name) : element(name);
    }
    function claim_text(nodes, data) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeType === 3) {
                node.data = '' + data;
                return nodes.splice(i, 1)[0];
            }
        }
        return text(data);
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_input_type(input, type) {
        try {
            input.type = type;
        }
        catch (e) {
            // do nothing
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_options(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            option.selected = ~value.indexOf(option.__value);
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function select_multiple_value(select) {
        return [].map.call(select.querySelectorAll(':checked'), option => option.__value);
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        const z_index = (parseInt(computed_style.zIndex) || 0) - 1;
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', `display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ` +
            `overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: ${z_index};`);
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        let unsubscribe;
        if (is_crossorigin()) {
            iframe.src = `data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>`;
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            detach(iframe);
            if (unsubscribe)
                unsubscribe();
        };
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    function query_selector_all(selector, parent = document.body) {
        return Array.from(parent.querySelectorAll(selector));
    }
    class HtmlTag {
        constructor(html, anchor = null) {
            this.e = element('div');
            this.a = anchor;
            this.u(html);
        }
        m(target, anchor = null) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(target, this.n[i], anchor);
            }
            this.t = target;
        }
        u(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        p(html) {
            this.d();
            this.u(html);
            this.m(this.t, this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
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
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const intros = { enabled: false };
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
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_destroy_block(block, lookup) {
        block.f();
        destroy_block(block, lookup);
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next, lookup.has(block.key));
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    // source: https://html.spec.whatwg.org/multipage/indices.html
    const boolean_attributes = new Set([
        'allowfullscreen',
        'allowpaymentrequest',
        'async',
        'autofocus',
        'autoplay',
        'checked',
        'controls',
        'default',
        'defer',
        'disabled',
        'formnovalidate',
        'hidden',
        'ismap',
        'loop',
        'multiple',
        'muted',
        'nomodule',
        'novalidate',
        'open',
        'playsinline',
        'readonly',
        'required',
        'reversed',
        'selected'
    ]);

    const invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
    // https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
    // https://infra.spec.whatwg.org/#noncharacter
    function spread(args, classes_to_add) {
        const attributes = Object.assign({}, ...args);
        if (classes_to_add) {
            if (attributes.class == null) {
                attributes.class = classes_to_add;
            }
            else {
                attributes.class += ' ' + classes_to_add;
            }
        }
        let str = '';
        Object.keys(attributes).forEach(name => {
            if (invalid_attribute_name_character.test(name))
                return;
            const value = attributes[name];
            if (value === true)
                str += " " + name;
            else if (boolean_attributes.has(name.toLowerCase())) {
                if (value)
                    str += " " + name;
            }
            else if (value != null) {
                str += ` ${name}="${String(value).replace(/"/g, '&#34;').replace(/'/g, '&#39;')}"`;
            }
        });
        return str;
    }
    const escaped = {
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    function escape(html) {
        return String(html).replace(/["'&<>]/g, match => escaped[match]);
    }
    function each(items, fn) {
        let str = '';
        for (let i = 0; i < items.length; i += 1) {
            str += fn(items[i], i);
        }
        return str;
    }
    const missing_component = {
        $$render: () => ''
    };
    function validate_component(component, name) {
        if (!component || !component.$$render) {
            if (name === 'svelte:component')
                name += ' this={...}';
            throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
        }
        return component;
    }
    function debug(file, line, column, values) {
        console.log(`{@debug} ${file ? file + ' ' : ''}(${line}:${column})`); // eslint-disable-line no-console
        console.log(values); // eslint-disable-line no-console
        return '';
    }
    let on_destroy;
    function create_ssr_component(fn) {
        function $$render(result, props, bindings, slots) {
            const parent_component = current_component;
            const $$ = {
                on_destroy,
                context: new Map(parent_component ? parent_component.$$.context : []),
                // these will be immediately discarded
                on_mount: [],
                before_update: [],
                after_update: [],
                callbacks: blank_object()
            };
            set_current_component({ $$ });
            const html = fn(result, props, bindings, slots);
            set_current_component(parent_component);
            return html;
        }
        return {
            render: (props = {}, options = {}) => {
                on_destroy = [];
                const result = { title: '', head: '', css: new Set() };
                const html = $$render(result, props, {}, options);
                run_all(on_destroy);
                return {
                    html,
                    css: {
                        code: Array.from(result.css).map(css => css.code).join('\n'),
                        map: null // TODO
                    },
                    head: result.title + result.head
                };
            },
            $$render
        };
    }
    function add_attribute(name, value, boolean) {
        if (value == null || (boolean && !value))
            return '';
        return ` ${name}${value === true ? '' : `=${typeof value === 'string' ? JSON.stringify(escape(value)) : `"${value}"`}`}`;
    }
    function add_classes(classes) {
        return classes ? ` class="${classes}"` : ``;
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function claim_component(block, parent_nodes) {
        block && block.l(parent_nodes);
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
    function detach_between_dev(before, after) {
        while (before.nextSibling && before.nextSibling !== after) {
            detach_dev(before.nextSibling);
        }
    }
    function detach_before_dev(after) {
        while (after.previousSibling) {
            detach_dev(after.previousSibling);
        }
    }
    function detach_after_dev(before) {
        while (before.nextSibling) {
            detach_dev(before.nextSibling);
        }
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
    function dataset_dev(node, property, value) {
        node.dataset[property] = value;
        dispatch_dev("SvelteDOMSetDataset", { node, property, value });
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
    function loop_guard(timeout) {
        const start = Date.now();
        return () => {
            if (Date.now() - start > timeout) {
                throw new Error(`Infinite loop detected`);
            }
        };
    }

    /* src/App.svelte generated by Svelte v3.22.2 */
    const file = "src/App.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-2gt4v3-style";
    	style.textContent = ".app.svelte-2gt4v3.svelte-2gt4v3{margin:0 auto;height:100%;display:flex;flex-direction:column;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1)}.page-content.svelte-2gt4v3.svelte-2gt4v3{position:relative;display:grid;grid-template-columns:320px 1fr;grid-gap:30px;grid-template-areas:\"overview overview\" \"caniuse caniuse\" \"spec-docs content\"}@media only screen and (max-width: 850px){.page-content.svelte-2gt4v3.svelte-2gt4v3{grid-template-areas:\"overview\" \"caniuse\" \"spec-docs\"  \"content\";grid-template-columns:minmax(320px, 90%);justify-content:center}}.what-list.svelte-2gt4v3.svelte-2gt4v3{color:var(--primary-mid, #3C9700);font-size:20px}@media only screen and (max-width: 850px){#when.svelte-2gt4v3 .desktop.svelte-2gt4v3{display:none}}#when.svelte-2gt4v3 .mobile.svelte-2gt4v3{display:none}@media only screen and (max-width: 850px){#when.svelte-2gt4v3 .mobile.svelte-2gt4v3{display:block}}#when.svelte-2gt4v3 .back-btn.svelte-2gt4v3{width:280px;margin:10px auto}#when.svelte-2gt4v3 .back-btn a.svelte-2gt4v3{text-decoration:none;color:white}.link-wrapper.svelte-2gt4v3.svelte-2gt4v3{height:auto;transition:color 0.3s, background-color 0.3s}.link-wrapper.svelte-2gt4v3.svelte-2gt4v3:hover{background-color:rgba(0, 0, 0, 0.1);color:white}.link-wrapper.svelte-2gt4v3 a.svelte-2gt4v3{color:var(--primary-mid, #3C9700);padding:12px;display:block;text-decoration:none}.left-menu.svelte-2gt4v3 .left-menu-separator.svelte-2gt4v3{margin:0}@media only screen and (max-width: 850px){.left-menu.svelte-2gt4v3.svelte-2gt4v3{display:none}}.overview.svelte-2gt4v3.svelte-2gt4v3{grid-area:overview;max-width:1280px;width:100%;flex:1 0 auto;margin:0 auto}.caniuse.svelte-2gt4v3.svelte-2gt4v3{grid-area:caniuse;width:100%;flex:1 0 auto}.caniuse.svelte-2gt4v3 p.svelte-2gt4v3{max-width:1280px;margin:0 auto}.spec-docs.svelte-2gt4v3.svelte-2gt4v3{grid-area:spec-docs;position:sticky;top:0;height:200px}.content.svelte-2gt4v3.svelte-2gt4v3{grid-area:content}hr.svelte-2gt4v3.svelte-2gt4v3{border-color:var(--primary-mid, #3C9700);margin:45px 0;opacity:0.3}.footer.svelte-2gt4v3.svelte-2gt4v3{flex-shrink:0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8ZGl2IGNsYXNzPVwiYXBwXCI+XG5cdDxhcHAtaGVhZGVyPjwvYXBwLWhlYWRlcj5cblx0PGFwcC1jb250ZXh0IGlkPVwid2hhdFwiIHRleHQ9XCJXaGF0IGlzIHRoaXMgcHJvamVjdD9cIj48L2FwcC1jb250ZXh0PlxuXHQ8dWwgY2xhc3M9XCJ3aGF0LWxpc3RcIj5cblx0XHQ8bGk+XG5cdFx0XHRTZXQgb2Ygd2ViLWNvbXBvbmVudHMgd2hpY2ggY2FuIGJlIHVzZWQgaW4gYW55IG1vZGVybiBVSSBmcmFtZXdvcmsgKG9yIHdpdGhvdXQgYW55KS5cblx0XHQ8L2xpPlxuXHRcdDxsaT5cblx0XHRcdFRoZSB3ZWItY29tcG9uZW50IHNldCBpbXBsZW1lbnRzIForIHNob3Agc3R5bGUgZ3VpZGUuXG5cdFx0PC9saT5cblx0PC91bD5cblx0PGRpdiBjbGFzcz1cInBhZ2UtY29udGVudFwiPlxuXHRcdDxkaXYgY2xhc3M9XCJvdmVydmlld1wiPlxuXHRcdFx0PGFwcC1mb3JtPjwvYXBwLWZvcm0+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8YXBwLWJ1dHRvbnM+PC9hcHAtYnV0dG9ucz5cblx0XHRcdDxocj5cblx0XHRcdDxhcHAtdG9vbHRpcC1hbmQtZmVlZGJhY2s+PC9hcHAtdG9vbHRpcC1hbmQtZmVlZGJhY2s+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8YXBwLWdyaWRzPjwvYXBwLWdyaWRzPlxuXHRcdFx0PGhyPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgaWQ9XCJ3aGVuXCIgY2xhc3M9XCJjYW5pdXNlXCI+XG5cdFx0XHQ8YXBwLWNvbnRleHQgdGV4dD1cIldoZW4gY2FuIEkgdXNlIGl0P1wiIGJhY2tidG49XCJ7dHJ1ZX1cIj48L2FwcC1jb250ZXh0PlxuXHRcdFx0PGRpdiBjbGFzcz1cImRlc2t0b3BcIj5cblx0XHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJzaGFkb3dkb212MVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0XHQ8YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PXNoYWRvd2RvbXYxXCI+Q2FuIEkgVXNlIHNoYWRvd2RvbXYxPzwvYT4gRGF0YSBvbiBzdXBwb3J0IGZvciB0aGUgc2hhZG93ZG9tdjEgZmVhdHVyZSBhY3Jvc3MgdGhlIG1ham9yIGJyb3dzZXJzIGZyb20gY2FuaXVzZS5jb20uXG5cdFx0XHRcdDwvcD5cblx0XHRcdFx0PHAgY2xhc3M9XCJjaXVfZW1iZWRcIiBkYXRhLWZlYXR1cmU9XCJjdXN0b20tZWxlbWVudHN2MVwiIGRhdGEtcGVyaW9kcz1cImZ1dHVyZV8xLGN1cnJlbnQscGFzdF8xLHBhc3RfMlwiIGRhdGEtYWNjZXNzaWJsZS1jb2xvdXJzPVwiZmFsc2VcIj5cblx0XHRcdFx0XHQ8YSBocmVmPVwiaHR0cDovL2Nhbml1c2UuY29tLyNmZWF0PWN1c3RvbS1lbGVtZW50c3YxXCI+Q2FuIEkgVXNlIGN1c3RvbS1lbGVtZW50c3YxPzwvYT4gRGF0YSBvbiBzdXBwb3J0IGZvciB0aGUgY3VzdG9tLWVsZW1lbnRzdjEgZmVhdHVyZSBhY3Jvc3MgdGhlIG1ham9yIGJyb3dzZXJzIGZyb20gY2FuaXVzZS5jb20uXG5cdFx0XHRcdDwvcD5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cIm1vYmlsZVwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYmFjay1idG5cIj5cblx0XHRcdFx0XHQ8em9vLWJ1dHRvbj5cblx0XHRcdFx0XHRcdDxzcGFuIHNsb3Q9XCJidXR0b25jb250ZW50XCI+PGEgaHJlZj1cImh0dHA6Ly9jYW5pdXNlLmNvbS8jZmVhdD1zaGFkb3dkb212MVwiIHRhcmdldD1cImFib3V0OmJsYW5rXCI+Q2FuIEkgVXNlIHNoYWRvd2RvbXYxPzwvYT48L3NwYW4+XG5cdFx0XHRcdFx0PC96b28tYnV0dG9uPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImJhY2stYnRuXCI+XG5cdFx0XHRcdFx0PHpvby1idXR0b24+XG5cdFx0XHRcdFx0XHQ8c3BhbiBzbG90PVwiYnV0dG9uY29udGVudFwiPjxhIGhyZWY9XCJodHRwOi8vY2FuaXVzZS5jb20vI2ZlYXQ9Y3VzdG9tLWVsZW1lbnRzdjFcIiB0YXJnZXQ9XCJhYm91dDpibGFua1wiPkNhbiBJIFVzZSBjdXN0b20tZWxlbWVudHN2MT88L2E+PC9zcGFuPlxuXHRcdFx0XHRcdDwvem9vLWJ1dHRvbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGlkPVwiaG93XCIgY2xhc3M9XCJzcGVjLWRvY3NcIj5cblx0XHRcdDxhcHAtY29udGV4dCB0ZXh0PVwiSG93IGNhbiBJIHVzZSBpdD9cIiBiYWNrYnRuPVwie3RydWV9XCI+PC9hcHAtY29udGV4dD5cblx0XHRcdDxkaXYgY2xhc3M9XCJsZWZ0LW1lbnVcIj5cblx0XHRcdFx0eyNlYWNoIGRvY2xpbmtzIGFzIGxpbmt9XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImxpbmstd3JhcHBlclwiPlxuXHRcdFx0XHRcdFx0PGEgaHJlZj1cIntsaW5rLmhyZWZ9XCIgdGFyZ2V0PVwie2xpbmsudGFyZ2V0fVwiPntsaW5rLnRleHR9PC9hPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxociBjbGFzcz1cImxlZnQtbWVudS1zZXBhcmF0b3JcIj5cblx0XHRcdFx0ey9lYWNofVxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cblx0XHRcdDxkb2NzLWJ1dHRvbiAgaWQ9XCJidXR0b24tZG9jXCI+PC9kb2NzLWJ1dHRvbj5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWNoZWNrYm94IGlkPVwiY2hlY2tib3gtZG9jXCI+PC9kb2NzLWNoZWNrYm94PlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtY29sbGFwc2FibGUtbGlzdCBpZD1cImNvbGxhcHNhYmxlLWxpc3QtZG9jXCI+PC9kb2NzLWNvbGxhcHNhYmxlLWxpc3Q+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1mZWVkYmFjayBpZD1cImZlZWRiYWNrLWRvY1wiPjwvZG9jcy1mZWVkYmFjaz5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWZvb3RlciBpZD1cImZvb3Rlci1kb2NcIj48L2RvY3MtZm9vdGVyPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtaGVhZGVyIGlkPVwiaGVhZGVyLWRvY1wiPjwvZG9jcy1oZWFkZXI+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1pbnB1dCBpZD1cImlucHV0LWRvY1wiPjwvZG9jcy1pbnB1dD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLWxpbmsgaWQ9XCJsaW5rLWRvY1wiPjwvZG9jcy1saW5rPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtbW9kYWwgaWQ9XCJtb2RhbC1kb2NcIj48L2RvY3MtbW9kYWw+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1uYXZpZ2F0aW9uIGlkPVwibmF2aWdhdGlvbi1kb2NcIj48L2RvY3MtbmF2aWdhdGlvbj5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLXJhZGlvIGlkPVwicmFkaW8tZG9jXCI+PC9kb2NzLXJhZGlvPlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3Mtc2VhcmNoYWJsZS1zZWxlY3QgaWQ9XCJzZWFyY2hhYmxlLXNlbGVjdC1kb2NcIj48L2RvY3Mtc2VhcmNoYWJsZS1zZWxlY3Q+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1zZWxlY3QgaWQ9XCJzZWxlY3QtZG9jXCI+PC9kb2NzLXNlbGVjdD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLXRvYXN0IGlkPVwidG9hc3QtZG9jXCI+PC9kb2NzLXRvYXN0PlxuXHRcdFx0PGhyPlxuXHRcdFx0PGRvY3MtdG9vbHRpcCBpZD1cInRvb2x0aXAtZG9jXCI+PC9kb2NzLXRvb2x0aXA+XG5cdFx0XHQ8aHI+XG5cdFx0XHQ8ZG9jcy1ncmlkIGlkPVwiZ3JpZC1kb2NcIj48L2RvY3MtZ3JpZD5cblx0XHRcdDxocj5cblx0XHRcdDxkb2NzLXRoZW1pbmcgaWQ9XCJ0aGVtaW5nLWRvY1wiPjwvZG9jcy10aGVtaW5nPlxuXHRcdFx0PGhyPlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5cblx0PHpvby1mb290ZXIgY2xhc3M9XCJmb290ZXJcIiBiaW5kOnRoaXM9e2Zvb3Rlcn0gY29weXJpZ2h0PVwiem9vcGx1cyBBR1wiPjwvem9vLWZvb3Rlcj4gXG48L2Rpdj5cblxuPHN0eWxlIHR5cGU9XCJ0ZXh0L3Njc3NcIj4uYXBwIHtcbiAgbWFyZ2luOiAwIGF1dG87XG4gIGhlaWdodDogMTAwJTtcbiAgZGlzcGxheTogZmxleDtcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgYm94LXNoYWRvdzogMCA0cHggMTVweCAwIHJnYmEoMCwgMCwgMCwgMC4xKTsgfVxuXG4ucGFnZS1jb250ZW50IHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBkaXNwbGF5OiBncmlkO1xuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDMyMHB4IDFmcjtcbiAgZ3JpZC1nYXA6IDMwcHg7XG4gIGdyaWQtdGVtcGxhdGUtYXJlYXM6IFwib3ZlcnZpZXcgb3ZlcnZpZXdcIiBcImNhbml1c2UgY2FuaXVzZVwiIFwic3BlYy1kb2NzIGNvbnRlbnRcIjsgfVxuICBAbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gICAgLnBhZ2UtY29udGVudCB7XG4gICAgICBncmlkLXRlbXBsYXRlLWFyZWFzOiBcIm92ZXJ2aWV3XCIgXCJjYW5pdXNlXCIgXCJzcGVjLWRvY3NcIiAgXCJjb250ZW50XCI7XG4gICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IG1pbm1heCgzMjBweCwgOTAlKTtcbiAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyOyB9IH1cblxuLndoYXQtbGlzdCB7XG4gIGNvbG9yOiB2YXIoLS1wcmltYXJ5LW1pZCwgIzNDOTcwMCk7XG4gIGZvbnQtc2l6ZTogMjBweDsgfVxuXG5AbWVkaWEgb25seSBzY3JlZW4gYW5kIChtYXgtd2lkdGg6IDg1MHB4KSB7XG4gICN3aGVuIC5kZXNrdG9wIHtcbiAgICBkaXNwbGF5OiBub25lOyB9IH1cblxuI3doZW4gLm1vYmlsZSB7XG4gIGRpc3BsYXk6IG5vbmU7IH1cbiAgQG1lZGlhIG9ubHkgc2NyZWVuIGFuZCAobWF4LXdpZHRoOiA4NTBweCkge1xuICAgICN3aGVuIC5tb2JpbGUge1xuICAgICAgZGlzcGxheTogYmxvY2s7IH0gfVxuXG4jd2hlbiAuYmFjay1idG4ge1xuICB3aWR0aDogMjgwcHg7XG4gIG1hcmdpbjogMTBweCBhdXRvOyB9XG4gICN3aGVuIC5iYWNrLWJ0biBhIHtcbiAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgY29sb3I6IHdoaXRlOyB9XG5cbi5saW5rLXdyYXBwZXIge1xuICBoZWlnaHQ6IGF1dG87XG4gIHRyYW5zaXRpb246IGNvbG9yIDAuM3MsIGJhY2tncm91bmQtY29sb3IgMC4zczsgfVxuICAubGluay13cmFwcGVyOmhvdmVyIHtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsIDAsIDAsIDAuMSk7XG4gICAgY29sb3I6IHdoaXRlOyB9XG4gIC5saW5rLXdyYXBwZXIgYSB7XG4gICAgY29sb3I6IHZhcigtLXByaW1hcnktbWlkLCAjM0M5NzAwKTtcbiAgICBwYWRkaW5nOiAxMnB4O1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTsgfVxuXG4ubGVmdC1tZW51IC5sZWZ0LW1lbnUtc2VwYXJhdG9yIHtcbiAgbWFyZ2luOiAwOyB9XG5cbkBtZWRpYSBvbmx5IHNjcmVlbiBhbmQgKG1heC13aWR0aDogODUwcHgpIHtcbiAgLmxlZnQtbWVudSB7XG4gICAgZGlzcGxheTogbm9uZTsgfSB9XG5cbi5vdmVydmlldyB7XG4gIGdyaWQtYXJlYTogb3ZlcnZpZXc7XG4gIG1heC13aWR0aDogMTI4MHB4O1xuICB3aWR0aDogMTAwJTtcbiAgZmxleDogMSAwIGF1dG87XG4gIG1hcmdpbjogMCBhdXRvOyB9XG5cbi5jYW5pdXNlIHtcbiAgZ3JpZC1hcmVhOiBjYW5pdXNlO1xuICB3aWR0aDogMTAwJTtcbiAgZmxleDogMSAwIGF1dG87IH1cblxuLmNhbml1c2UgcCB7XG4gIG1heC13aWR0aDogMTI4MHB4O1xuICBtYXJnaW46IDAgYXV0bzsgfVxuXG4uc3BlYy1kb2NzIHtcbiAgZ3JpZC1hcmVhOiBzcGVjLWRvY3M7XG4gIHBvc2l0aW9uOiBzdGlja3k7XG4gIHRvcDogMDtcbiAgaGVpZ2h0OiAyMDBweDsgfVxuXG4uY29udGVudCB7XG4gIGdyaWQtYXJlYTogY29udGVudDsgfVxuXG5ociB7XG4gIGJvcmRlci1jb2xvcjogdmFyKC0tcHJpbWFyeS1taWQsICMzQzk3MDApO1xuICBtYXJnaW46IDQ1cHggMDtcbiAgb3BhY2l0eTogMC4zOyB9XG5cbi5mb290ZXIge1xuICBmbGV4LXNocmluazogMDsgfVxuXG4vKiMgc291cmNlTWFwcGluZ1VSTD14Lm1hcCAqLzwvc3R5bGU+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IG9uTW91bnQgfSBmcm9tICdzdmVsdGUnO1xuXHRsZXQgZm9vdGVyO1xuXHRsZXQgZG9jbGlua3MgPSBbXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNidXR0b24tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnQnV0dG9uJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNjaGVja2JveC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdDaGVja2JveCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjY29sbGFwc2FibGUtbGlzdC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdDb2xsYXBzYWJsZSBMaXN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNmZWVkYmFjay1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdGZWVkYmFjaydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjZm9vdGVyLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ0Zvb3Rlcidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjaGVhZGVyLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ0hlYWRlcidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjaW5wdXQtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnSW5wdXQnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI2xpbmstZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTGluaydcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjbW9kYWwtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTW9kYWwnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI25hdmlnYXRpb24tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnTmF2aWdhdGlvbidcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjcmFkaW8tZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnUmFkaW8nXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI3NlYXJjaGFibGUtc2VsZWN0LWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ1NlYXJjaGFibGUgc2VsZWN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNzZWxlY3QtZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnU2VsZWN0J1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyN0b2FzdC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdUb2FzdCdcblx0XHR9LFxuXHRcdHtcblx0XHRcdGhyZWY6ICcjdG9vbHRpcC1kb2MnLFxuXHRcdFx0dGFyZ2V0OiAnJyxcblx0XHRcdHRleHQ6ICdUb29sdGlwJ1xuXHRcdH0sXG5cdFx0e1xuXHRcdFx0aHJlZjogJyNncmlkLWRvYycsXG5cdFx0XHR0YXJnZXQ6ICcnLFxuXHRcdFx0dGV4dDogJ0dyaWQnXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRocmVmOiAnI3RoZW1pbmctZG9jJyxcblx0XHRcdHRhcmdldDogJycsXG5cdFx0XHR0ZXh0OiAnVGhlbWluZydcblx0XHR9XG5cdF07XG5cdG9uTW91bnQoKCkgPT4ge1xuXHRcdGZvb3Rlci5mb290ZXJsaW5rcyA9IFtcblx0XHRcdHtcblx0XHRcdFx0aHJlZjogJ2h0dHBzOi8vZ2l0aHViLmNvbS96b29wbHVzL3pvby13ZWItY29tcG9uZW50cycsXG5cdFx0XHRcdHRleHQ6ICdHaXRodWInLFxuXHRcdFx0XHR0eXBlOiAnbmVnYXRpdmUnXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHRocmVmOiAnaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvQHpvb3BsdXMvem9vLXdlYi1jb21wb25lbnRzJyxcblx0XHRcdFx0dGV4dDogJ05QTScsXG5cdFx0XHRcdHR5cGU6ICduZWdhdGl2ZSdcblx0XHRcdH1cblx0XHRdO1xuXHR9KTtcbjwvc2NyaXB0PiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFnR3dCLElBQUksNEJBQUMsQ0FBQyxBQUM1QixNQUFNLENBQUUsQ0FBQyxDQUFDLElBQUksQ0FDZCxNQUFNLENBQUUsSUFBSSxDQUNaLE9BQU8sQ0FBRSxJQUFJLENBQ2IsY0FBYyxDQUFFLE1BQU0sQ0FDdEIsVUFBVSxDQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxBQUFFLENBQUMsQUFFaEQsYUFBYSw0QkFBQyxDQUFDLEFBQ2IsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsT0FBTyxDQUFFLElBQUksQ0FDYixxQkFBcUIsQ0FBRSxLQUFLLENBQUMsR0FBRyxDQUNoQyxRQUFRLENBQUUsSUFBSSxDQUNkLG1CQUFtQixDQUFFLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixBQUFFLENBQUMsQUFDakYsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekMsYUFBYSw0QkFBQyxDQUFDLEFBQ2IsbUJBQW1CLENBQUUsVUFBVSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUNoRSxxQkFBcUIsQ0FBRSxPQUFPLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUN6QyxlQUFlLENBQUUsTUFBTSxBQUFFLENBQUMsQUFBQyxDQUFDLEFBRWxDLFVBQVUsNEJBQUMsQ0FBQyxBQUNWLEtBQUssQ0FBRSxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FDbEMsU0FBUyxDQUFFLElBQUksQUFBRSxDQUFDLEFBRXBCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxLQUFLLENBQUMsQUFBQyxDQUFDLEFBQ3pDLG1CQUFLLENBQUMsUUFBUSxjQUFDLENBQUMsQUFDZCxPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMsQUFBQyxDQUFDLEFBRXRCLG1CQUFLLENBQUMsT0FBTyxjQUFDLENBQUMsQUFDYixPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDaEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssQ0FBQyxBQUFDLENBQUMsQUFDekMsbUJBQUssQ0FBQyxPQUFPLGNBQUMsQ0FBQyxBQUNiLE9BQU8sQ0FBRSxLQUFLLEFBQUUsQ0FBQyxBQUFDLENBQUMsQUFFekIsbUJBQUssQ0FBQyxTQUFTLGNBQUMsQ0FBQyxBQUNmLEtBQUssQ0FBRSxLQUFLLENBQ1osTUFBTSxDQUFFLElBQUksQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUNwQixtQkFBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLGNBQUMsQ0FBQyxBQUNqQixlQUFlLENBQUUsSUFBSSxDQUNyQixLQUFLLENBQUUsS0FBSyxBQUFFLENBQUMsQUFFbkIsYUFBYSw0QkFBQyxDQUFDLEFBQ2IsTUFBTSxDQUFFLElBQUksQ0FDWixVQUFVLENBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQUFBRSxDQUFDLEFBQ2hELHlDQUFhLE1BQU0sQUFBQyxDQUFDLEFBQ25CLGdCQUFnQixDQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQ3BDLEtBQUssQ0FBRSxLQUFLLEFBQUUsQ0FBQyxBQUNqQiwyQkFBYSxDQUFDLENBQUMsY0FBQyxDQUFDLEFBQ2YsS0FBSyxDQUFFLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUNsQyxPQUFPLENBQUUsSUFBSSxDQUNiLE9BQU8sQ0FBRSxLQUFLLENBQ2QsZUFBZSxDQUFFLElBQUksQUFBRSxDQUFDLEFBRTVCLHdCQUFVLENBQUMsb0JBQW9CLGNBQUMsQ0FBQyxBQUMvQixNQUFNLENBQUUsQ0FBQyxBQUFFLENBQUMsQUFFZCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksS0FBSyxDQUFDLEFBQUMsQ0FBQyxBQUN6QyxVQUFVLDRCQUFDLENBQUMsQUFDVixPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMsQUFBQyxDQUFDLEFBRXRCLFNBQVMsNEJBQUMsQ0FBQyxBQUNULFNBQVMsQ0FBRSxRQUFRLENBQ25CLFNBQVMsQ0FBRSxNQUFNLENBQ2pCLEtBQUssQ0FBRSxJQUFJLENBQ1gsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNkLE1BQU0sQ0FBRSxDQUFDLENBQUMsSUFBSSxBQUFFLENBQUMsQUFFbkIsUUFBUSw0QkFBQyxDQUFDLEFBQ1IsU0FBUyxDQUFFLE9BQU8sQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixzQkFBUSxDQUFDLENBQUMsY0FBQyxDQUFDLEFBQ1YsU0FBUyxDQUFFLE1BQU0sQ0FDakIsTUFBTSxDQUFFLENBQUMsQ0FBQyxJQUFJLEFBQUUsQ0FBQyxBQUVuQixVQUFVLDRCQUFDLENBQUMsQUFDVixTQUFTLENBQUUsU0FBUyxDQUNwQixRQUFRLENBQUUsTUFBTSxDQUNoQixHQUFHLENBQUUsQ0FBQyxDQUNOLE1BQU0sQ0FBRSxLQUFLLEFBQUUsQ0FBQyxBQUVsQixRQUFRLDRCQUFDLENBQUMsQUFDUixTQUFTLENBQUUsT0FBTyxBQUFFLENBQUMsQUFFdkIsRUFBRSw0QkFBQyxDQUFDLEFBQ0YsWUFBWSxDQUFFLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUN6QyxNQUFNLENBQUUsSUFBSSxDQUFDLENBQUMsQ0FDZCxPQUFPLENBQUUsR0FBRyxBQUFFLENBQUMsQUFFakIsT0FBTyw0QkFBQyxDQUFDLEFBQ1AsV0FBVyxDQUFFLENBQUMsQUFBRSxDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (49:4) {#each doclinks as link}
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
    			add_location(a, file, 50, 6, 2011);
    			attr_dev(div, "class", "link-wrapper svelte-2gt4v3");
    			add_location(div, file, 49, 5, 1978);
    			attr_dev(hr, "class", "left-menu-separator svelte-2gt4v3");
    			add_location(hr, file, 52, 5, 2089);
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
    		source: "(49:4) {#each doclinks as link}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div10;
    	let app_header;
    	let t0;
    	let app_context0;
    	let t1;
    	let ul;
    	let li0;
    	let t3;
    	let li1;
    	let t5;
    	let div9;
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
    	let div5;
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
    	let div8;
    	let docs_button;
    	let t27;
    	let hr4;
    	let t28;
    	let docs_checkbox;
    	let t29;
    	let hr5;
    	let t30;
    	let docs_collapsable_list;
    	let t31;
    	let hr6;
    	let t32;
    	let docs_feedback;
    	let t33;
    	let hr7;
    	let t34;
    	let docs_footer;
    	let t35;
    	let hr8;
    	let t36;
    	let docs_header;
    	let t37;
    	let hr9;
    	let t38;
    	let docs_input;
    	let t39;
    	let hr10;
    	let t40;
    	let docs_link;
    	let t41;
    	let hr11;
    	let t42;
    	let docs_modal;
    	let t43;
    	let hr12;
    	let t44;
    	let docs_navigation;
    	let t45;
    	let hr13;
    	let t46;
    	let docs_radio;
    	let t47;
    	let hr14;
    	let t48;
    	let docs_searchable_select;
    	let t49;
    	let hr15;
    	let t50;
    	let docs_select;
    	let t51;
    	let hr16;
    	let t52;
    	let docs_toast;
    	let t53;
    	let hr17;
    	let t54;
    	let docs_tooltip;
    	let t55;
    	let hr18;
    	let t56;
    	let docs_grid;
    	let t57;
    	let hr19;
    	let t58;
    	let docs_theming;
    	let t59;
    	let hr20;
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
    			div10 = element("div");
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
    			div9 = element("div");
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
    			div5 = element("div");
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

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t26 = space();
    			div8 = element("div");
    			docs_button = element("docs-button");
    			t27 = space();
    			hr4 = element("hr");
    			t28 = space();
    			docs_checkbox = element("docs-checkbox");
    			t29 = space();
    			hr5 = element("hr");
    			t30 = space();
    			docs_collapsable_list = element("docs-collapsable-list");
    			t31 = space();
    			hr6 = element("hr");
    			t32 = space();
    			docs_feedback = element("docs-feedback");
    			t33 = space();
    			hr7 = element("hr");
    			t34 = space();
    			docs_footer = element("docs-footer");
    			t35 = space();
    			hr8 = element("hr");
    			t36 = space();
    			docs_header = element("docs-header");
    			t37 = space();
    			hr9 = element("hr");
    			t38 = space();
    			docs_input = element("docs-input");
    			t39 = space();
    			hr10 = element("hr");
    			t40 = space();
    			docs_link = element("docs-link");
    			t41 = space();
    			hr11 = element("hr");
    			t42 = space();
    			docs_modal = element("docs-modal");
    			t43 = space();
    			hr12 = element("hr");
    			t44 = space();
    			docs_navigation = element("docs-navigation");
    			t45 = space();
    			hr13 = element("hr");
    			t46 = space();
    			docs_radio = element("docs-radio");
    			t47 = space();
    			hr14 = element("hr");
    			t48 = space();
    			docs_searchable_select = element("docs-searchable-select");
    			t49 = space();
    			hr15 = element("hr");
    			t50 = space();
    			docs_select = element("docs-select");
    			t51 = space();
    			hr16 = element("hr");
    			t52 = space();
    			docs_toast = element("docs-toast");
    			t53 = space();
    			hr17 = element("hr");
    			t54 = space();
    			docs_tooltip = element("docs-tooltip");
    			t55 = space();
    			hr18 = element("hr");
    			t56 = space();
    			docs_grid = element("docs-grid");
    			t57 = space();
    			hr19 = element("hr");
    			t58 = space();
    			docs_theming = element("docs-theming");
    			t59 = space();
    			hr20 = element("hr");
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
    			attr_dev(div4, "class", "mobile svelte-2gt4v3");
    			add_location(div4, file, 32, 3, 1337);
    			attr_dev(div5, "id", "when");
    			attr_dev(div5, "class", "caniuse svelte-2gt4v3");
    			add_location(div5, file, 22, 2, 555);
    			set_custom_element_data(app_context2, "text", "How can I use it?");
    			set_custom_element_data(app_context2, "backbtn", app_context2_backbtn_value = true);
    			add_location(app_context2, file, 46, 3, 1847);
    			attr_dev(div6, "class", "left-menu svelte-2gt4v3");
    			add_location(div6, file, 47, 3, 1920);
    			attr_dev(div7, "id", "how");
    			attr_dev(div7, "class", "spec-docs svelte-2gt4v3");
    			add_location(div7, file, 45, 2, 1811);
    			set_custom_element_data(docs_button, "id", "button-doc");
    			add_location(docs_button, file, 57, 3, 2180);
    			attr_dev(hr4, "class", "svelte-2gt4v3");
    			add_location(hr4, file, 58, 3, 2228);
    			set_custom_element_data(docs_checkbox, "id", "checkbox-doc");
    			add_location(docs_checkbox, file, 59, 3, 2236);
    			attr_dev(hr5, "class", "svelte-2gt4v3");
    			add_location(hr5, file, 60, 3, 2289);
    			set_custom_element_data(docs_collapsable_list, "id", "collapsable-list-doc");
    			add_location(docs_collapsable_list, file, 61, 3, 2297);
    			attr_dev(hr6, "class", "svelte-2gt4v3");
    			add_location(hr6, file, 62, 3, 2374);
    			set_custom_element_data(docs_feedback, "id", "feedback-doc");
    			add_location(docs_feedback, file, 63, 3, 2382);
    			attr_dev(hr7, "class", "svelte-2gt4v3");
    			add_location(hr7, file, 64, 3, 2435);
    			set_custom_element_data(docs_footer, "id", "footer-doc");
    			add_location(docs_footer, file, 65, 3, 2443);
    			attr_dev(hr8, "class", "svelte-2gt4v3");
    			add_location(hr8, file, 66, 3, 2490);
    			set_custom_element_data(docs_header, "id", "header-doc");
    			add_location(docs_header, file, 67, 3, 2498);
    			attr_dev(hr9, "class", "svelte-2gt4v3");
    			add_location(hr9, file, 68, 3, 2545);
    			set_custom_element_data(docs_input, "id", "input-doc");
    			add_location(docs_input, file, 69, 3, 2553);
    			attr_dev(hr10, "class", "svelte-2gt4v3");
    			add_location(hr10, file, 70, 3, 2597);
    			set_custom_element_data(docs_link, "id", "link-doc");
    			add_location(docs_link, file, 71, 3, 2605);
    			attr_dev(hr11, "class", "svelte-2gt4v3");
    			add_location(hr11, file, 72, 3, 2646);
    			set_custom_element_data(docs_modal, "id", "modal-doc");
    			add_location(docs_modal, file, 73, 3, 2654);
    			attr_dev(hr12, "class", "svelte-2gt4v3");
    			add_location(hr12, file, 74, 3, 2698);
    			set_custom_element_data(docs_navigation, "id", "navigation-doc");
    			add_location(docs_navigation, file, 75, 3, 2706);
    			attr_dev(hr13, "class", "svelte-2gt4v3");
    			add_location(hr13, file, 76, 3, 2765);
    			set_custom_element_data(docs_radio, "id", "radio-doc");
    			add_location(docs_radio, file, 77, 3, 2773);
    			attr_dev(hr14, "class", "svelte-2gt4v3");
    			add_location(hr14, file, 78, 3, 2817);
    			set_custom_element_data(docs_searchable_select, "id", "searchable-select-doc");
    			add_location(docs_searchable_select, file, 79, 3, 2825);
    			attr_dev(hr15, "class", "svelte-2gt4v3");
    			add_location(hr15, file, 80, 3, 2905);
    			set_custom_element_data(docs_select, "id", "select-doc");
    			add_location(docs_select, file, 81, 3, 2913);
    			attr_dev(hr16, "class", "svelte-2gt4v3");
    			add_location(hr16, file, 82, 3, 2960);
    			set_custom_element_data(docs_toast, "id", "toast-doc");
    			add_location(docs_toast, file, 83, 3, 2968);
    			attr_dev(hr17, "class", "svelte-2gt4v3");
    			add_location(hr17, file, 84, 3, 3012);
    			set_custom_element_data(docs_tooltip, "id", "tooltip-doc");
    			add_location(docs_tooltip, file, 85, 3, 3020);
    			attr_dev(hr18, "class", "svelte-2gt4v3");
    			add_location(hr18, file, 86, 3, 3070);
    			set_custom_element_data(docs_grid, "id", "grid-doc");
    			add_location(docs_grid, file, 87, 3, 3078);
    			attr_dev(hr19, "class", "svelte-2gt4v3");
    			add_location(hr19, file, 88, 3, 3119);
    			set_custom_element_data(docs_theming, "id", "theming-doc");
    			add_location(docs_theming, file, 89, 3, 3127);
    			attr_dev(hr20, "class", "svelte-2gt4v3");
    			add_location(hr20, file, 90, 3, 3177);
    			attr_dev(div8, "class", "content svelte-2gt4v3");
    			add_location(div8, file, 56, 2, 2155);
    			attr_dev(div9, "class", "page-content svelte-2gt4v3");
    			add_location(div9, file, 11, 1, 320);
    			set_custom_element_data(zoo_footer, "class", "footer svelte-2gt4v3");
    			set_custom_element_data(zoo_footer, "copyright", "zooplus AG");
    			add_location(zoo_footer, file, 93, 1, 3200);
    			attr_dev(div10, "class", "app svelte-2gt4v3");
    			add_location(div10, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			append_dev(div10, app_header);
    			append_dev(div10, t0);
    			append_dev(div10, app_context0);
    			append_dev(div10, t1);
    			append_dev(div10, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(div10, t5);
    			append_dev(div10, div9);
    			append_dev(div9, div0);
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
    			append_dev(div9, t13);
    			append_dev(div9, div5);
    			append_dev(div5, app_context1);
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
    			append_dev(div9, t24);
    			append_dev(div9, div7);
    			append_dev(div7, app_context2);
    			append_dev(div7, t25);
    			append_dev(div7, div6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div6, null);
    			}

    			append_dev(div9, t26);
    			append_dev(div9, div8);
    			append_dev(div8, docs_button);
    			append_dev(div8, t27);
    			append_dev(div8, hr4);
    			append_dev(div8, t28);
    			append_dev(div8, docs_checkbox);
    			append_dev(div8, t29);
    			append_dev(div8, hr5);
    			append_dev(div8, t30);
    			append_dev(div8, docs_collapsable_list);
    			append_dev(div8, t31);
    			append_dev(div8, hr6);
    			append_dev(div8, t32);
    			append_dev(div8, docs_feedback);
    			append_dev(div8, t33);
    			append_dev(div8, hr7);
    			append_dev(div8, t34);
    			append_dev(div8, docs_footer);
    			append_dev(div8, t35);
    			append_dev(div8, hr8);
    			append_dev(div8, t36);
    			append_dev(div8, docs_header);
    			append_dev(div8, t37);
    			append_dev(div8, hr9);
    			append_dev(div8, t38);
    			append_dev(div8, docs_input);
    			append_dev(div8, t39);
    			append_dev(div8, hr10);
    			append_dev(div8, t40);
    			append_dev(div8, docs_link);
    			append_dev(div8, t41);
    			append_dev(div8, hr11);
    			append_dev(div8, t42);
    			append_dev(div8, docs_modal);
    			append_dev(div8, t43);
    			append_dev(div8, hr12);
    			append_dev(div8, t44);
    			append_dev(div8, docs_navigation);
    			append_dev(div8, t45);
    			append_dev(div8, hr13);
    			append_dev(div8, t46);
    			append_dev(div8, docs_radio);
    			append_dev(div8, t47);
    			append_dev(div8, hr14);
    			append_dev(div8, t48);
    			append_dev(div8, docs_searchable_select);
    			append_dev(div8, t49);
    			append_dev(div8, hr15);
    			append_dev(div8, t50);
    			append_dev(div8, docs_select);
    			append_dev(div8, t51);
    			append_dev(div8, hr16);
    			append_dev(div8, t52);
    			append_dev(div8, docs_toast);
    			append_dev(div8, t53);
    			append_dev(div8, hr17);
    			append_dev(div8, t54);
    			append_dev(div8, docs_tooltip);
    			append_dev(div8, t55);
    			append_dev(div8, hr18);
    			append_dev(div8, t56);
    			append_dev(div8, docs_grid);
    			append_dev(div8, t57);
    			append_dev(div8, hr19);
    			append_dev(div8, t58);
    			append_dev(div8, docs_theming);
    			append_dev(div8, t59);
    			append_dev(div8, hr20);
    			append_dev(div10, t60);
    			append_dev(div10, zoo_footer);
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
    						each_blocks[i].m(div6, null);
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
    			if (detaching) detach_dev(div10);
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
    			href: "#grid-doc",
    			target: "",
    			text: "Grid"
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
    					type: "negative"
    				},
    				{
    					href: "https://www.npmjs.com/package/@zooplus/zoo-web-components",
    					text: "NPM",
    					type: "negative"
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
