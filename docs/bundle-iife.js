(function () {
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
    		this.shadowRoot.innerHTML = `<style>:host{display:none;contain:layout}.box{position:fixed;width:100%;height:100%;background:rgba(0, 0, 0, 0.8);opacity:0;transition:opacity 0.3s;z-index:9999;left:0;top:0;display:flex;justify-content:center;align-items:center}.dialog-content{padding:0 20px 20px 20px;box-sizing:border-box;background:white;overflow-y:auto;max-height:95%;border-radius:5px}.dialog-content .heading{display:flex;flex-direction:row;align-items:flex-start}.dialog-content .heading .header-text{font-size:24px;line-height:29px;font-weight:bold;margin:30px 0}.dialog-content .heading .close{cursor:pointer;margin:30px 0 30px auto}.dialog-content .heading .close path{fill:var(--primary-mid, #3C9700)}@media only screen and (max-width: 544px){.dialog-content{padding:25px}}@media only screen and (max-width: 375px){.dialog-content{width:100%;height:100%;top:0;left:0;transform:none}}.show{opacity:1}.hide{opacity:0}.dialog-content{animation-duration:0.3s;animation-fill-mode:forwards}.show .dialog-content{animation-name:anim-show}.hide .dialog-content{animation-name:anim-hide}@keyframes anim-show{0%{opacity:0;transform:scale3d(0.9, 0.9, 1)}100%{opacity:1;transform:scale3d(1, 1, 1)}}@keyframes anim-hide{0%{opacity:1}100%{opacity:0;transform:scale3d(0.9, 0.9, 1)}}</style>`;

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
    		this.shadowRoot.innerHTML = `<style>:host{contain:style}.footer-links{display:flex;background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));justify-content:center;padding:10px 30px;flex-wrap:wrap}.list-holder{position:relative;overflow:hidden}ul{display:flex;flex-direction:row;flex-wrap:wrap;justify-content:center;list-style:none;margin-left:-1px;padding-left:0;margin-top:0;margin-bottom:0}ul li{flex-grow:1;flex-basis:auto;margin:5px 0;padding:0 5px;text-align:center;border-left:1px solid #e6e6e6}.footer-copyright{font-size:12px;line-height:14px;text-align:left;background:#FFFFFF;color:#555555;padding:10px 0 10px 30px}@media only screen and (max-width: 544px){.footer-copyright{text-align:center;padding:10px 0}}</style>`;
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

    function create_fragment$3(ctx) {
    	let div;
    	let zoo_input_label;
    	let t0;
    	let zoo_link;
    	let t1;
    	let span;
    	let slot;
    	let t2;
    	let svg;
    	let path;
    	let span_class_value;
    	let t3;
    	let zoo_input_info;
    	let div_class_value;

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
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t3 = space();
    			zoo_input_info = element("zoo-input-info");
    			this.c = noop;
    			set_custom_element_data(zoo_input_label, "class", "input-label");
    			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
    			add_location(zoo_input_label, file$3, 2, 1, 117);
    			set_custom_element_data(zoo_link, "class", "input-link");
    			set_custom_element_data(zoo_link, "href", /*linkhref*/ ctx[3]);
    			set_custom_element_data(zoo_link, "target", /*linktarget*/ ctx[4]);
    			set_custom_element_data(zoo_link, "type", /*linktype*/ ctx[8]);
    			set_custom_element_data(zoo_link, "text", /*linktext*/ ctx[2]);
    			set_custom_element_data(zoo_link, "textalign", "right");
    			add_location(zoo_link, file$3, 3, 1, 186);
    			attr_dev(slot, "name", "inputelement");
    			add_location(slot, file$3, 5, 2, 373);
    			attr_dev(path, "d", "M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z");
    			add_location(path, file$3, 7, 3, 482);
    			attr_dev(svg, "class", "error-circle");
    			attr_dev(svg, "width", "18");
    			attr_dev(svg, "height", "18");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$3, 6, 2, 409);
    			attr_dev(span, "class", span_class_value = "input-slot " + (/*valid*/ ctx[7] ? "" : "error"));
    			add_location(span, file$3, 4, 1, 322);
    			set_custom_element_data(zoo_input_info, "class", "input-info");
    			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
    			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
    			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
    			add_location(zoo_input_info, file$3, 10, 1, 894);
    			attr_dev(div, "class", div_class_value = "box " + /*labelposition*/ ctx[0] + " " + (/*linktext*/ ctx[2] ? "" : "link-absent"));
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

    			if (dirty & /*linkhref*/ 8) {
    				set_custom_element_data(zoo_link, "href", /*linkhref*/ ctx[3]);
    			}

    			if (dirty & /*linktarget*/ 16) {
    				set_custom_element_data(zoo_link, "target", /*linktarget*/ ctx[4]);
    			}

    			if (dirty & /*linktype*/ 256) {
    				set_custom_element_data(zoo_link, "type", /*linktype*/ ctx[8]);
    			}

    			if (dirty & /*linktext*/ 4) {
    				set_custom_element_data(zoo_link, "text", /*linktext*/ ctx[2]);
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
    	let { linktype = "primary" } = $$props;

    	const writable_props = [
    		"labelposition",
    		"labeltext",
    		"linktext",
    		"linkhref",
    		"linktarget",
    		"inputerrormsg",
    		"infotext",
    		"valid",
    		"linktype"
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
    		if ("linktype" in $$props) $$invalidate(8, linktype = $$props.linktype);
    	};

    	$$self.$capture_state = () => ({
    		labelposition,
    		labeltext,
    		linktext,
    		linkhref,
    		linktarget,
    		inputerrormsg,
    		infotext,
    		valid,
    		linktype
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
    		if ("linktype" in $$props) $$invalidate(8, linktype = $$props.linktype);
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
    		linktype
    	];
    }

    class Input extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.box{box-sizing:border-box;width:100%;display:grid;grid-template-areas:"label label link" "input input input" "info info info";grid-template-columns:1fr 1fr 1fr;grid-gap:3px;position:relative}.link-absent{grid-template-areas:"label label label" "input input input" "info info info";grid-gap:3px 0}@media only screen and (min-width: 500px){.left{grid-template-areas:"label link link" "label input input" "label info info"}}.left .input-label{align-self:center;padding-right:5px}.input-label{grid-area:label;align-self:self-start}.input-link{grid-area:link;align-self:flex-end}.input-slot{grid-area:input;position:relative}.input-info{grid-area:info}:host{contain:layout}.error-circle{position:absolute;right:0;top:14px;padding:0 15px 0 5px;color:var(--warning-mid, #ED1C24);pointer-events:none;opacity:0;transition:opacity 0.2s}.error-circle path{fill:var(--warning-mid, #ED1C24)}.input-slot.error ::slotted(input),.input-slot.error ::slotted(textarea){transition:border-color 0.3s ease;border:2px solid var(--warning-mid, #ED1C24);padding:12px 14px}.input-slot.error .error-circle{opacity:1}::slotted(input),::slotted(textarea){width:100%;font-size:14px;line-height:20px;padding:13px 15px;margin:0;border:1px solid #767676;border-radius:5px;color:#555555;outline:none;box-sizing:border-box;text-overflow:ellipsis;-moz-appearance:textfield}::slotted(input)::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}::slotted(input)::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}::slotted(input::placeholder),::slotted(textarea::placeholder){color:#767676;opacity:1}::slotted(input:disabled),::slotted(textarea:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#767676;cursor:not-allowed}::slotted(input:focus),::slotted(textarea:focus){border:2px solid #555555;padding:12px 14px}::slotted(input[type='date']),::slotted(input[type='time']){-webkit-appearance:none}</style>`;

    		init(this, { target: this.shadowRoot }, instance$3, create_fragment$3, safe_not_equal, {
    			labelposition: 0,
    			labeltext: 1,
    			linktext: 2,
    			linkhref: 3,
    			linktarget: 4,
    			inputerrormsg: 5,
    			infotext: 6,
    			valid: 7,
    			linktype: 8
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

    	get linktype() {
    		return this.$$.ctx[8];
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
    			add_location(slot, file$4, 3, 2, 155);
    			button.disabled = button_disabled_value = /*disabled*/ ctx[2] ? true : null;
    			attr_dev(button, "class", button_class_value = "" + (/*type*/ ctx[0] + " " + /*size*/ ctx[1] + " btn"));
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

    			if (dirty & /*type, size*/ 3 && button_class_value !== (button_class_value = "" + (/*type*/ ctx[0] + " " + /*size*/ ctx[1] + " btn"))) {
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
    		this.shadowRoot.innerHTML = `<style>:host{display:block;max-width:330px;contain:layout}.box{position:relative}.btn{display:flex;flex-direction:row;align-items:center;justify-content:center;color:#FFFFFF;border:0;border-radius:5px;cursor:pointer;width:100%;height:100%;font-size:14px;line-height:20px;font-weight:bold;text-align:center;padding:0 20px}.btn.hollow{border:2px solid var(--primary-mid, #3C9700);color:var(--primary-mid, #3C9700);background:transparent}.btn.hot{background-image:linear-gradient(left, var(--secondary-mid, #FF6200), var(--secondary-light, #FF8800));background-image:-webkit-linear-gradient(left, var(--secondary-mid, #FF6200), var(--secondary-light, #FF8800))}.btn.hot:hover,.btn.hot:focus{background:var(--secondary-mid, #FF6200)}.btn.hot:active{background:var(--secondary-dark, #CC4E00)}.btn.cold{background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100))}.btn.cold:hover,.btn.cold:focus,.btn.hollow:hover,.btn.hollow:focus{background:var(--primary-mid, #3C9700);color:#FFFFFF}.btn.cold:active,.btn.hollow:active{background:var(--primary-dark, #286400);color:#FFFFFF}.btn:disabled{background:#F2F3F4;color:#767676;border:1px solid #E6E6E6}.btn:disabled:hover,.btn:disabled:focus,.btn:disabled:active{cursor:not-allowed;background:#F2F3F4;color:#767676}.btn:active{transform:translateY(1px)}.btn.small{min-height:36px}.btn.medium{min-height:46px}</style>`;
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
    			add_location(slot, file$5, 3, 2, 244);
    			attr_dev(span, "class", "input-label");
    			add_location(span, file$5, 4, 2, 343);
    			attr_dev(label, "class", "input-slot");
    			add_location(label, file$5, 2, 1, 215);
    			set_custom_element_data(zoo_input_info, "class", "input-info");
    			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[2]);
    			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[4]);
    			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[5]);
    			add_location(zoo_input_info, file$5, 8, 1, 406);
    			attr_dev(div, "class", div_class_value = "box " + (/*_clicked*/ ctx[6] ? "clicked" : "") + " " + (/*highlighted*/ ctx[3] ? "highlighted" : ""));
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
    			/*slot_binding*/ ctx[12](slot);
    			append_dev(label, t0);
    			append_dev(label, span);
    			append_dev(span, t1);
    			append_dev(div, t2);
    			append_dev(div, zoo_input_info);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(slot, "click", /*click_handler*/ ctx[11], false, false, false),
    				listen_dev(div, "click", /*click_handler_1*/ ctx[13], false, false, false)
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

    			if (dirty & /*_clicked, highlighted*/ 72 && div_class_value !== (div_class_value = "box " + (/*_clicked*/ ctx[6] ? "clicked" : "") + " " + (/*highlighted*/ ctx[3] ? "highlighted" : ""))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty & /*_clicked, highlighted, valid*/ 76) {
    				toggle_class(div, "error", !/*valid*/ ctx[2]);
    			}

    			if (dirty & /*_clicked, highlighted, disabled*/ 73) {
    				toggle_class(div, "disabled", /*disabled*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*slot_binding*/ ctx[12](null);
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
    	let _inputSlot;

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

    	onMount(() => {
    		_inputSlot.addEventListener("slotchange", () => {
    			_slottedInput = _inputSlot.assignedNodes()[0];

    			if (_slottedInput.checked) {
    				$$invalidate(6, _clicked = true);
    			}

    			if (_slottedInput.disabled) {
    				$$invalidate(0, disabled = true);
    			}
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
    		onMount,
    		labeltext,
    		valid,
    		disabled,
    		highlighted,
    		inputerrormsg,
    		infotext,
    		_clicked,
    		_slottedInput,
    		_inputSlot,
    		handleClick,
    		handleSlotClick
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
    		if ("_inputSlot" in $$props) $$invalidate(7, _inputSlot = $$props._inputSlot);
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
    		handleClick,
    		handleSlotClick,
    		_slottedInput,
    		click_handler,
    		slot_binding,
    		click_handler_1
    	];
    }

    class Checkbox extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{margin-top:21px;contain:layout}.box{width:100%;display:flex;flex-direction:column;position:relative;box-sizing:border-box;cursor:pointer}.box.highlighted{border:1px solid #E6E6E6;border-radius:5px;padding:6px 15px}.box.highlighted.clicked{border:2px solid var(--success-mid, #3C9700);padding:5px 14px}.box.highlighted.clicked .input-slot .input-label{left:8px}.box.highlighted.error{border:2px solid var(--warning-mid, #ED1C24);padding:5px 14px}.box.disabled{cursor:not-allowed}.box.disabled .input-slot{cursor:not-allowed}.input-slot{width:100%;display:flex;flex-direction:row;cursor:pointer;align-items:center;font-size:14px;line-height:20px}.input-label{display:flex;align-items:center;position:relative;left:10px}::slotted(input[type="checkbox"]){position:relative;margin:0;-webkit-appearance:none;-moz-appearance:none;outline:none;cursor:pointer}::slotted(input[type="checkbox"])::before{position:relative;display:inline-block;width:24px;height:24px;content:"";border-radius:3px;border:1px solid #767676;background:transparent}::slotted(input[type="checkbox"]:focus)::before{border:2px solid #767676}::slotted(input[type="checkbox"]:checked)::before{background:transparent;border:2px solid var(--success-mid, #3C9700)}::slotted(input[type="checkbox"]:checked)::after{content:"";position:absolute;top:4px;left:10px;width:6px;height:14px;border-bottom:2px solid;border-right:2px solid;transform:rotate(40deg);color:var(--primary-mid, #3C9700)}::slotted(input[type="checkbox"]:disabled){cursor:not-allowed}::slotted(input[type="checkbox"]:disabled)::before{border-color:#E6E6E6;background-color:#F2F3F4}::slotted(input[type="checkbox"]:disabled)::after{color:#767676}.box.error ::slotted(input[type="checkbox"])::before{border-color:var(--warning-mid, #ED1C24);transition:border-color 0.3s ease}.box.error ::slotted(input[type="checkbox"]:checked)::after{color:var(--warning-mid, #ED1C24)}</style>`;

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
    	let span_class_value;
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
    			add_location(slot, file$6, 5, 2, 194);
    			attr_dev(span, "class", span_class_value = "template-slot " + (/*valid*/ ctx[0] ? "" : "error"));
    			add_location(span, file$6, 4, 1, 140);
    			set_custom_element_data(zoo_input_info, "class", "input-info");
    			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[0]);
    			set_custom_element_data(zoo_input_info, "inputerrormsg", /*errormsg*/ ctx[1]);
    			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[2]);
    			add_location(zoo_input_info, file$6, 7, 1, 244);
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
    			/*slot_binding*/ ctx[6](slot);
    			append_dev(div, t1);
    			append_dev(div, zoo_input_info);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*labeltext*/ 8) {
    				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[3]);
    			}

    			if (dirty & /*valid*/ 1 && span_class_value !== (span_class_value = "template-slot " + (/*valid*/ ctx[0] ? "" : "error"))) {
    				attr_dev(span, "class", span_class_value);
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
    			/*slot_binding*/ ctx[6](null);
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
    	let _templateSlot;
    	let clone;

    	onMount(() => {
    		_templateSlot.addEventListener("slotchange", () => {
    			if (!clone) {
    				const template = _templateSlot.assignedNodes()[0];

    				if (template.content) {
    					clone = template.content.cloneNode(true);
    					_templateSlot.getRootNode().querySelector("slot").assignedNodes()[0].remove();
    					_templateSlot.getRootNode().host.appendChild(clone);
    				}
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
    		onMount,
    		valid,
    		errormsg,
    		infotext,
    		labeltext,
    		_templateSlot,
    		clone
    	});

    	$$self.$inject_state = $$props => {
    		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
    		if ("errormsg" in $$props) $$invalidate(1, errormsg = $$props.errormsg);
    		if ("infotext" in $$props) $$invalidate(2, infotext = $$props.infotext);
    		if ("labeltext" in $$props) $$invalidate(3, labeltext = $$props.labeltext);
    		if ("_templateSlot" in $$props) $$invalidate(4, _templateSlot = $$props._templateSlot);
    		if ("clone" in $$props) clone = $$props.clone;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [valid, errormsg, infotext, labeltext, _templateSlot, clone, slot_binding];
    }

    class Radio extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{display:flex;flex-direction:column;contain:layout}.template-slot{display:flex}::slotted(input[type="radio"]){position:relative;margin:0;-webkit-appearance:none;-moz-appearance:none;outline:none;cursor:pointer}::slotted(input[type="radio"]):focus::before{border-color:#555555}::slotted(input[type="radio"])::before{position:relative;display:inline-block;width:16px;height:16px;content:"";border-radius:50%;border:2px solid var(--primary-mid, #3C9700);background:white}::slotted(input[type="radio"]:checked)::before{background:white}::slotted(input[type="radio"]:checked)::after,::slotted(input[type="radio"]:focus)::after{content:"";position:absolute;top:5px;left:5px;width:6px;height:6px;transform:rotate(40deg);color:var(--primary-mid, #3C9700);border:2px solid;border-radius:50%}::slotted(input[type="radio"]:checked)::after{background:var(--primary-mid, #3C9700)}::slotted(input[type="radio"]:focus)::after{background:#E6E6E6;color:#E6E6E6}::slotted(input:focus)::before{border-color:#555555}::slotted(label){cursor:pointer;margin:0 5px;align-self:center}::slotted(input[type="radio"]:disabled){cursor:not-allowed}::slotted(input[type="radio"]:disabled)::before{border-color:#767676;background-color:#E6E6E6}.template-slot.error ::slotted(input[type="radio"])::before{border-color:var(--warning-mid, #ED1C24)}.template-slot.error ::slotted(label){color:var(--warning-mid, #ED1C24)}</style>`;

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
    		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.box{box-sizing:border-box;font-size:14px;line-height:20px;border-left:3px solid;display:flex;align-items:center;width:100%;height:100%;padding:5px 0}svg{min-width:30px;min-height:30px;padding:0 10px 0 15px}.text{display:flex;flex-direction:row;align-items:center;height:100%;overflow:auto;box-sizing:border-box;padding:5px 5px 5px 0}.info{background:var(--info-ultralight, #ECF5FA);border-color:var(--info-mid, #459FD0)}.info svg{fill:var(--info-mid, #459FD0)}.error{background:var(--warning-ultralight, #FDE8E9);border-color:var(--warning-mid, #ED1C24)}.error svg{fill:var(--warning-mid, #ED1C24)}.success{background:var(--primary-ultralight, #EBF4E5);border-color:var(--primary-mid, #3C9700)}.success svg{fill:var(--primary-mid, #3C9700)}</style>`;
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
    		this.shadowRoot.innerHTML = `<style>:host{display:flex;position:absolute;width:100%;height:100%;z-index:10000;left:0;bottom:0;pointer-events:none;line-height:initial;font-size:initial;font-weight:initial;contain:layout;justify-content:center}.box{pointer-events:initial;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1);border-radius:5px;position:absolute;transform:translate(0%, -50%)}.box.top{bottom:calc(100% + 11px);right:50%;transform:translate3d(50%, 0, 0)}.box.right{left:calc(100% + 10px);top:50%}.box.bottom{top:100%;right:50%;transform:translate3d(50%, 20%, 0)}.box.left{right:calc(100% + 11px);top:50%}.tooltip-content{padding:10px;font-size:12px;line-height:14px;position:relative;z-index:1;background:white;border-radius:5px}.tooltip-content .text{white-space:pre;color:black}.tip{position:absolute}.tip:after{content:"";width:16px;height:16px;position:absolute;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1);top:-8px;transform:rotate(45deg);z-index:0;background:white}.tip.top,.tip.bottom{right:calc(50% + 8px)}.tip.right{bottom:50%;left:-8px}.tip.bottom{top:0}.tip.left{bottom:50%;right:8px}@keyframes fadeTooltipIn{from{opacity:0}to{opacity:1}}</style>`;
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

    // (7:2) {#if _slottedSelect && !_slottedSelect.hasAttribute('multiple')}
    function create_if_block$1(ctx) {
    	let svg;
    	let path;
    	let svg_class_value;
    	let t0;
    	let t1;
    	let if_block1_anchor;
    	let if_block0 = /*loading*/ ctx[8] && create_if_block_2(ctx);
    	let if_block1 = /*_valueSelected*/ ctx[12] && create_if_block_1(ctx);

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
    			add_location(path, file$9, 7, 128, 627);

    			attr_dev(svg, "class", svg_class_value = "arrows " + (/*_slottedSelect*/ ctx[10] && /*_slottedSelect*/ ctx[10].disabled
    			? "disabled"
    			: ""));

    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$9, 7, 3, 502);
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
    			if (dirty & /*_slottedSelect*/ 1024 && svg_class_value !== (svg_class_value = "arrows " + (/*_slottedSelect*/ ctx[10] && /*_slottedSelect*/ ctx[10].disabled
    			? "disabled"
    			: ""))) {
    				attr_dev(svg, "class", svg_class_value);
    			}

    			if (/*loading*/ ctx[8]) {
    				if (if_block0) {
    					
    				} else {
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
    					if_block1 = create_if_block_1(ctx);
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
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(7:2) {#if _slottedSelect && !_slottedSelect.hasAttribute('multiple')}",
    		ctx
    	});

    	return block;
    }

    // (9:3) {#if loading}
    function create_if_block_2(ctx) {
    	let zoo_preloader;

    	const block = {
    		c: function create() {
    			zoo_preloader = element("zoo-preloader");
    			add_location(zoo_preloader, file$9, 9, 4, 722);
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
    		source: "(9:3) {#if loading}",
    		ctx
    	});

    	return block;
    }

    // (12:3) {#if _valueSelected}
    function create_if_block_1(ctx) {
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
    			add_location(path, file$9, 14, 6, 908);
    			attr_dev(svg, "width", "20");
    			attr_dev(svg, "height", "20");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$9, 13, 5, 853);
    			attr_dev(div, "class", "close");
    			add_location(div, file$9, 12, 4, 791);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, path);
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", /*click_handler*/ ctx[15], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(12:3) {#if _valueSelected}",
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
    	let show_if = /*_slottedSelect*/ ctx[10] && !/*_slottedSelect*/ ctx[10].hasAttribute("multiple");
    	let div0_class_value;
    	let t3;
    	let zoo_input_info;
    	let div1_class_value;
    	let if_block = show_if && create_if_block$1(ctx);

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
    			add_location(zoo_input_label, file$9, 2, 1, 118);
    			set_custom_element_data(zoo_link, "class", "input-link");
    			set_custom_element_data(zoo_link, "href", /*linkhref*/ ctx[3]);
    			set_custom_element_data(zoo_link, "target", /*linktarget*/ ctx[4]);
    			set_custom_element_data(zoo_link, "type", /*linktype*/ ctx[9]);
    			set_custom_element_data(zoo_link, "text", /*linktext*/ ctx[2]);
    			set_custom_element_data(zoo_link, "textalign", "right");
    			add_location(zoo_link, file$9, 3, 1, 187);
    			attr_dev(slot, "name", "selectelement");
    			add_location(slot, file$9, 5, 2, 373);
    			attr_dev(div0, "class", div0_class_value = "input-slot " + (/*valid*/ ctx[7] ? "" : "error"));
    			add_location(div0, file$9, 4, 1, 323);
    			set_custom_element_data(zoo_input_info, "class", "input-info");
    			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
    			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
    			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
    			add_location(zoo_input_info, file$9, 20, 1, 1021);
    			attr_dev(div1, "class", div1_class_value = "box " + /*labelposition*/ ctx[0] + " " + (/*linktext*/ ctx[2] ? "" : "link-absent"));
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
    			/*slot_binding*/ ctx[14](slot);
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

    			if (dirty & /*_slottedSelect*/ 1024) show_if = /*_slottedSelect*/ ctx[10] && !/*_slottedSelect*/ ctx[10].hasAttribute("multiple");

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
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
    			/*slot_binding*/ ctx[14](null);
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
    	let _slottedSelect;
    	let _selectSlot;
    	let _valueSelected;

    	onMount(() => {
    		_selectSlot.addEventListener("slotchange", () => {
    			let select = _selectSlot.assignedNodes()[0];
    			$$invalidate(10, _slottedSelect = select);
    			_slottedSelect.addEventListener("change", e => $$invalidate(12, _valueSelected = e.target.value ? true : false));
    		});
    	});

    	const handleCrossClick = () => {
    		$$invalidate(10, _slottedSelect.value = null, _slottedSelect);
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
    		_slottedSelect,
    		_selectSlot,
    		_valueSelected,
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
    		if ("_slottedSelect" in $$props) $$invalidate(10, _slottedSelect = $$props._slottedSelect);
    		if ("_selectSlot" in $$props) $$invalidate(11, _selectSlot = $$props._selectSlot);
    		if ("_valueSelected" in $$props) $$invalidate(12, _valueSelected = $$props._valueSelected);
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
    		_slottedSelect,
    		_selectSlot,
    		_valueSelected,
    		handleCrossClick,
    		slot_binding,
    		click_handler
    	];
    }

    class Select extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.box{box-sizing:border-box;width:100%;display:grid;grid-template-areas:"label label link" "input input input" "info info info";grid-template-columns:1fr 1fr 1fr;grid-gap:3px;position:relative}.link-absent{grid-template-areas:"label label label" "input input input" "info info info";grid-gap:3px 0}@media only screen and (min-width: 500px){.left{grid-template-areas:"label link link" "label input input" "label info info"}}.left .input-label{align-self:center;padding-right:5px}.input-label{grid-area:label;align-self:self-start}.input-link{grid-area:link;align-self:flex-end}.input-slot{grid-area:input;position:relative}.input-info{grid-area:info}:host{contain:layout}.close,.arrows{position:absolute;right:9px;top:12px}.close{cursor:pointer;right:28px;top:14px}.arrows{pointer-events:none}.arrows path{fill:var(--primary-mid, #3C9700)}.arrows.disabled path{fill:#E6E6E6}::slotted(select){-webkit-appearance:none;-moz-appearance:none;width:100%;background:white;font-size:14px;line-height:20px;padding:13px 15px;border:1px solid #767676;border-radius:5px;color:#555555;outline:none;box-sizing:border-box;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}::slotted(select:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#767676}::slotted(select:disabled:hover){cursor:not-allowed}::slotted(select:focus){border:2px solid #555555;padding:12px 14px}.input-slot.error ::slotted(select){border:2px solid var(--warning-mid, #ED1C24);padding:12px 14px;transition:border-color 0.3s ease}</style>`;

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

    // (23:1) {:else}
    function create_else_block(ctx) {
    	let zoo_select;
    	let slot;

    	const block = {
    		c: function create() {
    			zoo_select = element("zoo-select");
    			slot = element("slot");
    			attr_dev(slot, "name", "selectelement");
    			attr_dev(slot, "slot", "selectelement");
    			add_location(slot, file$a, 24, 3, 1193);
    			set_custom_element_data(zoo_select, "labelposition", /*labelposition*/ ctx[0]);
    			set_custom_element_data(zoo_select, "linktext", /*linktext*/ ctx[2]);
    			set_custom_element_data(zoo_select, "linkhref", /*linkhref*/ ctx[3]);
    			set_custom_element_data(zoo_select, "linktarget", /*linktarget*/ ctx[4]);
    			set_custom_element_data(zoo_select, "labeltext", /*labeltext*/ ctx[1]);
    			set_custom_element_data(zoo_select, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
    			set_custom_element_data(zoo_select, "infotext", /*infotext*/ ctx[6]);
    			set_custom_element_data(zoo_select, "valid", /*valid*/ ctx[7]);
    			add_location(zoo_select, file$a, 23, 2, 1071);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, zoo_select, anchor);
    			append_dev(zoo_select, slot);
    			/*slot_binding_1*/ ctx[30](slot);
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
    			/*slot_binding_1*/ ctx[30](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(23:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (3:1) {#if !_isMobile}
    function create_if_block$2(ctx) {
    	let t0;
    	let zoo_input;
    	let input;
    	let input_disabled_value;
    	let t1;
    	let div;
    	let t2;
    	let span;
    	let t3;
    	let slot;
    	let dispose;
    	let if_block0 = /*tooltipText*/ ctx[15] && create_if_block_3(ctx);
    	let if_block1 = /*_valueSelected*/ ctx[14] && create_if_block_2$1(ctx);
    	let if_block2 = /*loading*/ ctx[9] && create_if_block_1$1(ctx);

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
    			input.disabled = input_disabled_value = /*_selectElement*/ ctx[12] && /*_selectElement*/ ctx[12].disabled;
    			attr_dev(input, "slot", "inputelement");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[8]);
    			add_location(input, file$a, 9, 3, 454);
    			attr_dev(div, "slot", "inputelement");
    			attr_dev(div, "class", "close");
    			add_location(div, file$a, 10, 3, 633);
    			attr_dev(span, "slot", "inputelement");
    			add_location(span, file$a, 15, 3, 881);
    			set_custom_element_data(zoo_input, "valid", /*valid*/ ctx[7]);
    			set_custom_element_data(zoo_input, "type", "text");
    			set_custom_element_data(zoo_input, "labeltext", /*labeltext*/ ctx[1]);
    			set_custom_element_data(zoo_input, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
    			set_custom_element_data(zoo_input, "labelposition", /*labelposition*/ ctx[0]);
    			set_custom_element_data(zoo_input, "linktext", /*linktext*/ ctx[2]);
    			set_custom_element_data(zoo_input, "linkhref", /*linkhref*/ ctx[3]);
    			set_custom_element_data(zoo_input, "linktarget", /*linktarget*/ ctx[4]);
    			set_custom_element_data(zoo_input, "infotext", /*infotext*/ ctx[6]);
    			toggle_class(zoo_input, "mobile", /*_isMobile*/ ctx[13]);
    			add_location(zoo_input, file$a, 7, 2, 249);
    			attr_dev(slot, "name", "selectelement");
    			add_location(slot, file$a, 21, 2, 1001);
    		},
    		m: function mount(target, anchor, remount) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, zoo_input, anchor);
    			append_dev(zoo_input, input);
    			/*input_binding*/ ctx[25](input);
    			append_dev(zoo_input, t1);
    			append_dev(zoo_input, div);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(zoo_input, t2);
    			append_dev(zoo_input, span);
    			if (if_block2) if_block2.m(span, null);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, slot, anchor);
    			/*slot_binding*/ ctx[29](slot);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "input", /*input_handler*/ ctx[26], false, false, false),
    				listen_dev(div, "click", /*click_handler*/ ctx[27], false, false, false),
    				listen_dev(zoo_input, "click", /*click_handler_1*/ ctx[28], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (/*tooltipText*/ ctx[15]) {
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

    			if (dirty & /*_selectElement*/ 4096 && input_disabled_value !== (input_disabled_value = /*_selectElement*/ ctx[12] && /*_selectElement*/ ctx[12].disabled)) {
    				prop_dev(input, "disabled", input_disabled_value);
    			}

    			if (dirty & /*placeholder*/ 256) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[8]);
    			}

    			if (/*_valueSelected*/ ctx[14]) {
    				if (if_block1) {
    					
    				} else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*loading*/ ctx[9]) {
    				if (if_block2) {
    					
    				} else {
    					if_block2 = create_if_block_1$1(ctx);
    					if_block2.c();
    					if_block2.m(span, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*valid*/ 128) {
    				set_custom_element_data(zoo_input, "valid", /*valid*/ ctx[7]);
    			}

    			if (dirty & /*labeltext*/ 2) {
    				set_custom_element_data(zoo_input, "labeltext", /*labeltext*/ ctx[1]);
    			}

    			if (dirty & /*inputerrormsg*/ 32) {
    				set_custom_element_data(zoo_input, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
    			}

    			if (dirty & /*labelposition*/ 1) {
    				set_custom_element_data(zoo_input, "labelposition", /*labelposition*/ ctx[0]);
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

    			if (dirty & /*_isMobile*/ 8192) {
    				toggle_class(zoo_input, "mobile", /*_isMobile*/ ctx[13]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(zoo_input);
    			/*input_binding*/ ctx[25](null);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(slot);
    			/*slot_binding*/ ctx[29](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(3:1) {#if !_isMobile}",
    		ctx
    	});

    	return block;
    }

    // (4:2) {#if tooltipText}
    function create_if_block_3(ctx) {
    	let zoo_tooltip;

    	const block = {
    		c: function create() {
    			zoo_tooltip = element("zoo-tooltip");
    			set_custom_element_data(zoo_tooltip, "class", "selected-options");
    			set_custom_element_data(zoo_tooltip, "position", "right");
    			set_custom_element_data(zoo_tooltip, "text", /*tooltipText*/ ctx[15]);
    			add_location(zoo_tooltip, file$a, 4, 3, 144);
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
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(4:2) {#if tooltipText}",
    		ctx
    	});

    	return block;
    }

    // (12:4) {#if _valueSelected}
    function create_if_block_2$1(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
    			add_location(path, file$a, 12, 53, 788);
    			attr_dev(svg, "width", "20");
    			attr_dev(svg, "height", "20");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$a, 12, 5, 740);
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
    		source: "(12:4) {#if _valueSelected}",
    		ctx
    	});

    	return block;
    }

    // (17:4) {#if loading}
    function create_if_block_1$1(ctx) {
    	let zoo_preloader;

    	const block = {
    		c: function create() {
    			zoo_preloader = element("zoo-preloader");
    			add_location(zoo_preloader, file$a, 17, 5, 931);
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
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(17:4) {#if loading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div;
    	let div_class_value;

    	function select_block_type(ctx, dirty) {
    		if (!/*_isMobile*/ ctx[13]) return create_if_block$2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			this.c = noop;
    			attr_dev(div, "class", div_class_value = "box " + (/*valid*/ ctx[7] ? "" : "error"));
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
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}

    			if (dirty & /*valid*/ 128 && div_class_value !== (div_class_value = "box " + (/*valid*/ ctx[7] ? "" : "error"))) {
    				attr_dev(div, "class", div_class_value);
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
    	let options;
    	let _isMobile;
    	let _valueSelected;
    	let tooltipText;

    	onMount(() => {
    		$$invalidate(13, _isMobile = isMobile());

    		_selectSlot.addEventListener("slotchange", () => {
    			let select = _selectSlot.assignedNodes()[0];
    			$$invalidate(12, _selectElement = select);
    			options = _selectElement.options;

    			if (!options || options.length < 1) {
    				$$invalidate(15, tooltipText = null);
    			}

    			_selectElement.addEventListener("blur", () => {
    				_hideSelectOptions();
    			});

    			if (_selectElement.multiple === true) {
    				multiple = true;
    			}

    			_selectElement.addEventListener("change", () => handleOptionChange());
    			_selectElement.addEventListener("keydown", e => handleOptionKeydown(e));
    			_selectElement.classList.add("searchable-zoo-select");
    			_selectElement.addEventListener("change", e => $$invalidate(14, _valueSelected = e.target.value ? true : false));
    			_hideSelectOptions();
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

    	const handleSearchChange = () => {
    		const inputVal = searchableInput.value.toLowerCase();

    		for (const option of options) {
    			if (option.text.toLowerCase().indexOf(inputVal) > -1) option.style.display = "block"; else option.style.display = "none";
    		}
    	};

    	const openSearchableSelect = () => {
    		if (!multiple) {
    			$$invalidate(12, _selectElement.size = 4, _selectElement);
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
    		multiple,
    		searchableInput,
    		_selectSlot,
    		_selectElement,
    		options,
    		_isMobile,
    		_valueSelected,
    		tooltipText,
    		handleSearchChange,
    		openSearchableSelect,
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
    		if ("multiple" in $$props) multiple = $$props.multiple;
    		if ("searchableInput" in $$props) $$invalidate(10, searchableInput = $$props.searchableInput);
    		if ("_selectSlot" in $$props) $$invalidate(11, _selectSlot = $$props._selectSlot);
    		if ("_selectElement" in $$props) $$invalidate(12, _selectElement = $$props._selectElement);
    		if ("options" in $$props) options = $$props.options;
    		if ("_isMobile" in $$props) $$invalidate(13, _isMobile = $$props._isMobile);
    		if ("_valueSelected" in $$props) $$invalidate(14, _valueSelected = $$props._valueSelected);
    		if ("tooltipText" in $$props) $$invalidate(15, tooltipText = $$props.tooltipText);
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
    		handleSearchChange,
    		openSearchableSelect,
    		handleCrossClick,
    		handleOptionChange,
    		multiple,
    		options,
    		handleOptionKeydown,
    		_hideSelectOptions,
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
    		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.close{display:inline-block;position:absolute;top:34%;right:4%;cursor:pointer}:host{position:relative}.box{position:relative}.box:hover .selected-options{display:block;animation:fadeTooltipIn 0.2s}.selected-options{display:none}.selected-options:hover{display:block}::slotted(select.searchable-zoo-select){-webkit-appearance:none;-moz-appearance:none;text-indent:1px;text-overflow:'';width:100%;padding:13px 15px;border:1px solid #767676;border-bottom-left-radius:3px;border-bottom-right-radius:3px;border-top:none;position:absolute;z-index:2;top:60px;font-size:14px}.box.error ::slotted(select){border:2px solid var(--warning-mid, #ED1C24);transition:border-color 0.3s ease}::slotted(select.hidden){display:none}::slotted(select:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#767676}::slotted(select:disabled:hover){cursor:not-allowed}</style>`;

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

    /* zoo-modules/link-module/Link.svelte generated by Svelte v3.22.2 */
    const file$b = "zoo-modules/link-module/Link.svelte";

    // (2:0) {#if text && href}
    function create_if_block$3(ctx) {
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
    			t0 = text(/*text*/ ctx[2]);
    			t1 = space();
    			div0 = element("div");
    			add_location(span, file$b, 4, 3, 208);
    			attr_dev(div0, "class", "bottom-line");
    			add_location(div0, file$b, 5, 3, 231);
    			set_style(a, "text-align", /*textalign*/ ctx[5]);
    			attr_dev(a, "href", /*href*/ ctx[1]);
    			attr_dev(a, "target", /*target*/ ctx[3]);
    			attr_dev(a, "class", /*type*/ ctx[0]);
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
    			if (dirty & /*text*/ 4) set_data_dev(t0, /*text*/ ctx[2]);

    			if (dirty & /*textalign*/ 32) {
    				set_style(a, "text-align", /*textalign*/ ctx[5]);
    			}

    			if (dirty & /*href*/ 2) {
    				attr_dev(a, "href", /*href*/ ctx[1]);
    			}

    			if (dirty & /*target*/ 8) {
    				attr_dev(a, "target", /*target*/ ctx[3]);
    			}

    			if (dirty & /*type*/ 1) {
    				attr_dev(a, "class", /*type*/ ctx[0]);
    			}

    			if (dirty & /*type, disabled*/ 17) {
    				toggle_class(a, "disabled", /*disabled*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(2:0) {#if text && href}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let if_block_anchor;
    	let if_block = /*text*/ ctx[2] && /*href*/ ctx[1] && create_if_block$3(ctx);

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
    			if (/*text*/ ctx[2] && /*href*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
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
    	let { type = "negative" } = $$props; // primary, grey
    	let { disabled = false } = $$props;
    	let { textalign = "center" } = $$props;

    	onMount(() => {
    		if (type != "negative" || type != "primary" || type != "grey") {
    			$$invalidate(0, type = "negative");
    		}
    	});

    	const writable_props = ["href", "text", "target", "type", "disabled", "textalign"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<zoo-link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("zoo-link", $$slots, []);

    	$$self.$set = $$props => {
    		if ("href" in $$props) $$invalidate(1, href = $$props.href);
    		if ("text" in $$props) $$invalidate(2, text = $$props.text);
    		if ("target" in $$props) $$invalidate(3, target = $$props.target);
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
    		if ("textalign" in $$props) $$invalidate(5, textalign = $$props.textalign);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		href,
    		text,
    		target,
    		type,
    		disabled,
    		textalign
    	});

    	$$self.$inject_state = $$props => {
    		if ("href" in $$props) $$invalidate(1, href = $$props.href);
    		if ("text" in $$props) $$invalidate(2, text = $$props.text);
    		if ("target" in $$props) $$invalidate(3, target = $$props.target);
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
    		if ("textalign" in $$props) $$invalidate(5, textalign = $$props.textalign);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [type, href, text, target, disabled, textalign];
    }

    class Link extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.link-box{width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;position:relative}a{text-decoration:none;font-size:12px;line-height:14px}a.disabled{color:#E6E6E6}a.disabled:hover{cursor:not-allowed}a.primary{color:var(--primary-mid, #3C9700)}a.primary:hover,a.primary:focus,a.primary:active{color:var(--primary-dark, #286400)}a.primary:visited{color:var(--primary-light, #66B100)}a.negative{color:white}a.negative:hover,a.negative:focus,a.negative:active{color:#FFFFFF;cursor:pointer}a.negative:visited{color:#FFFFFF}a.negative .bottom-line{position:absolute;bottom:-3px;left:0;overflow:hidden;width:0;border-bottom:1px solid #fff;color:#FFFFFF}a.negative:hover .bottom-line{width:100%}a.grey{color:#767676}a.grey:hover,a.grey:focus,a.grey:active{color:var(--primary-dark, #286400)}a.grey:visited{color:var(--primary-light, #66B100)}</style>`;

    		init(this, { target: this.shadowRoot }, instance$b, create_fragment$b, safe_not_equal, {
    			href: 1,
    			text: 2,
    			target: 3,
    			type: 0,
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
    		return this.$$.ctx[1];
    	}

    	set href(href) {
    		this.$set({ href });
    		flush();
    	}

    	get text() {
    		return this.$$.ctx[2];
    	}

    	set text(text) {
    		this.$set({ text });
    		flush();
    	}

    	get target() {
    		return this.$$.ctx[3];
    	}

    	set target(target) {
    		this.$set({ target });
    		flush();
    	}

    	get type() {
    		return this.$$.ctx[0];
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
    		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.box{height:56px;background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100))}::slotted(*:first-child){display:flex;flex-direction:row;height:100%;overflow:auto;overflow-y:hidden;padding:0 20px}</style>`;
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
    function create_if_block$4(ctx) {
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
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(2:0) {#if labeltext}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let if_block_anchor;
    	let if_block = /*labeltext*/ ctx[0] && create_if_block$4(ctx);

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
    			attr_dev(span, "class", "text");
    			add_location(span, file$f, 6, 2, 606);
    			attr_dev(path1, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
    			add_location(path1, file$f, 8, 3, 742);
    			attr_dev(svg1, "class", "close");
    			attr_dev(svg1, "width", "24");
    			attr_dev(svg1, "height", "24");
    			attr_dev(svg1, "viewBox", "0 0 24 24");
    			add_location(svg1, file$f, 7, 2, 641);
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
    	const click_handler = event => close(event);

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
    		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.item ::slotted(*){display:none}.item.active ::slotted(*){display:initial}ul{padding:0}.item{position:relative;color:#767676;list-style-type:none;padding:0 10px;border:0}.item.active{border:1px solid rgba(0, 0, 0, 0.2)}.item.active .header{color:var(--primary-dark, #286400)}.item.active .header svg{fill:var(--primary-dark, #286400);transform:rotateX(180deg)}.header{display:flex;align-items:center;height:8px;padding:20px 0;font-size:14px;line-height:20px;color:var(--primary-mid, #3C9700);font-weight:bold;cursor:pointer}.header svg{display:flex;margin-left:auto;fill:var(--primary-mid, #3C9700);transition:transform 0.3s}</style>`;
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
    		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.spinner{position:absolute;left:calc(50% - 60px);top:calc(50% - 60px);right:0;bottom:0;height:120px;width:120px;transform-origin:center center;animation:rotate 2s linear infinite;z-index:100000}.spinner .path{animation:dash 1.5s ease-in-out infinite;stroke:var(--primary-mid, #3C9700);stroke-dasharray:1, 200;stroke-dashoffset:0;stroke-linecap:round}@keyframes rotate{100%{transform:rotate(360deg)}}@keyframes dash{0%{stroke-dasharray:1, 200;stroke-dashoffset:0}50%{stroke-dasharray:89, 200;stroke-dashoffset:-35px}100%{stroke-dasharray:89, 200;stroke-dashoffset:-124px}}</style>`;
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

    // (3:1) {#if loading}
    function create_if_block$5(ctx) {
    	let zoo_spinner;

    	const block = {
    		c: function create() {
    			zoo_spinner = element("zoo-spinner");
    			add_location(zoo_spinner, file$k, 3, 2, 105);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, zoo_spinner, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(zoo_spinner);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
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
    	let if_block = /*loading*/ ctx[2] && create_if_block$5(ctx);

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
    			add_location(slot0, file$k, 6, 2, 168);
    			attr_dev(div0, "class", "header-row");
    			add_location(div0, file$k, 5, 1, 141);
    			attr_dev(slot1, "name", "row");
    			add_location(slot1, file$k, 8, 1, 236);
    			attr_dev(slot2, "name", "norecords");
    			add_location(slot2, file$k, 9, 1, 282);
    			attr_dev(slot3, "name", "pagesizeselector");
    			attr_dev(slot3, "slot", "pagesizeselector");
    			add_location(slot3, file$k, 12, 3, 451);
    			set_custom_element_data(zoo_grid_paginator, "class", "paginator");
    			set_custom_element_data(zoo_grid_paginator, "currentpage", /*currentpage*/ ctx[0]);
    			set_custom_element_data(zoo_grid_paginator, "maxpages", /*maxpages*/ ctx[1]);
    			add_location(zoo_grid_paginator, file$k, 11, 2, 340);
    			attr_dev(slot4, "name", "paginator");
    			add_location(slot4, file$k, 10, 1, 314);
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
    			/*slot0_binding*/ ctx[14](slot0);
    			append_dev(div1, t1);
    			append_dev(div1, slot1);
    			/*slot1_binding*/ ctx[15](slot1);
    			append_dev(div1, t2);
    			append_dev(div1, slot2);
    			append_dev(div1, t3);
    			append_dev(div1, slot4);
    			append_dev(slot4, zoo_grid_paginator);
    			append_dev(zoo_grid_paginator, slot3);
    			/*div1_binding*/ ctx[17](div1);
    			if (remount) dispose();
    			dispose = listen_dev(zoo_grid_paginator, "pageChange", /*pageChange_handler*/ ctx[16], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*loading*/ ctx[2]) {
    				if (if_block) {
    					
    				} else {
    					if_block = create_if_block$5(ctx);
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
    			/*slot0_binding*/ ctx[14](null);
    			/*slot1_binding*/ ctx[15](null);
    			/*div1_binding*/ ctx[17](null);
    			dispose();
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
    	let sortableHeaders = [];
    	let host;
    	let rowSlot;
    	let resizeObserver;

    	onMount(() => {
    		headerCellSlot.addEventListener("slotchange", () => {
    			host = gridRoot.getRootNode().host;
    			const headers = headerCellSlot.assignedNodes();
    			gridRoot.style.setProperty("--grid-columns-num", headers.length);
    			handleHeaders(headers, host, host.hasAttribute("resizable"));
    		});

    		rowSlot.addEventListener("slotchange", () => {
    			const exampleRow = rowSlot.assignedNodes()[0];
    			const minWidth = window.getComputedStyle(exampleRow).getPropertyValue("min-width");
    			const allRows = rowSlot.assignedNodes();

    			for (const row of allRows) {
    				let i = 1;

    				for (const child of row.children) {
    					child.setAttribute("column", i);
    					child.style.flexGrow = 1;
    					i++;
    				}
    			}
    		});
    	});

    	const handleHeaders = (headers, host, applyResizeLogic) => {
    		let i = 1;

    		for (let header of headers) {
    			header.classList.add("header-cell");
    			header.style.flexGrow = 1;
    			header.setAttribute("column", i);

    			if (header.hasAttribute("sortable")) {
    				handleSortableHeader(header);
    			}

    			i++;
    		}

    		if (applyResizeLogic) handleResizableHeaders(headers);
    	};

    	const handleSortableHeader = header => {
    		header.innerHTML = "<zoo-grid-header>" + header.innerHTML + "</zoo-grid-header>";

    		header.addEventListener("sortChange", e => {
    			e.stopPropagation();
    			const sortState = e.detail.sortState;
    			sortableHeaders.forEach(h => h.discardSort());
    			header.children[0].setSort(sortState);

    			const detail = sortState
    			? {
    					property: header.getAttribute("sortableproperty"),
    					direction: sortState
    				}
    			: undefined;

    			host.dispatchEvent(new CustomEvent("sortChange", { detail, bubbles: true }));
    		});

    		sortableHeaders.push(header.children[0]);
    	};

    	const handleResizableHeaders = headers => {
    		// only first run will iterate over whole grid
    		resizeObserver = new ResizeObserver(debounce(
    				entries => {
    					for (const entry of entries) {
    						const columnElements = host.querySelectorAll("[column=\"" + entry.target.getAttribute("column") + "\"]");

    						for (const columnEl of columnElements) {
    							columnEl.style.width = entry.contentRect.width + "px";
    						}
    					}
    				},
    				200
    			));

    		for (let header of headers) {
    			resizeObserver.observe(header);
    		}
    	};

    	const debounce = (func, wait, immediate) => {
    		let timeout;

    		return function () {
    			const context = this, args = arguments;

    			const later = function () {
    				timeout = null;
    				if (!immediate) func.apply(context, args);
    			};

    			const callNow = immediate && !timeout;
    			clearTimeout(timeout);
    			timeout = setTimeout(later, wait);
    			if (callNow) func.apply(context, args);
    		};
    	};

    	const dispatchPageEvent = e => {
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
    		sortableHeaders,
    		host,
    		rowSlot,
    		resizeObserver,
    		handleHeaders,
    		handleSortableHeader,
    		handleResizableHeaders,
    		debounce,
    		dispatchPageEvent
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentpage" in $$props) $$invalidate(0, currentpage = $$props.currentpage);
    		if ("maxpages" in $$props) $$invalidate(1, maxpages = $$props.maxpages);
    		if ("loading" in $$props) $$invalidate(2, loading = $$props.loading);
    		if ("gridRoot" in $$props) $$invalidate(3, gridRoot = $$props.gridRoot);
    		if ("headerCellSlot" in $$props) $$invalidate(4, headerCellSlot = $$props.headerCellSlot);
    		if ("sortableHeaders" in $$props) sortableHeaders = $$props.sortableHeaders;
    		if ("host" in $$props) host = $$props.host;
    		if ("rowSlot" in $$props) $$invalidate(5, rowSlot = $$props.rowSlot);
    		if ("resizeObserver" in $$props) resizeObserver = $$props.resizeObserver;
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
    		dispatchPageEvent,
    		host,
    		resizeObserver,
    		sortableHeaders,
    		handleHeaders,
    		handleSortableHeader,
    		handleResizableHeaders,
    		debounce,
    		slot0_binding,
    		slot1_binding,
    		pageChange_handler,
    		div1_binding
    	];
    }

    class Grid extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.box{position:relative;max-height:inherit;max-width:inherit;min-height:inherit;min-width:inherit;overflow:auto}::slotted(*[slot="row"]){overflow:visible}.header-row{min-width:inherit;font-size:12px;line-height:14px;font-weight:600;color:#555555;box-sizing:border-box}.header-row,::slotted(*[slot="row"]){display:grid;grid-template-columns:repeat(var(--grid-columns-num), minmax(50px, 1fr));padding:10px;border-bottom:1px solid rgba(0, 0, 0, 0.2);min-height:40px;font-size:14px;line-height:20px}:host([resizable]) .header-row,:host([resizable]) ::slotted(*[slot="row"]){display:flex;padding:10px;border-bottom:1px solid rgba(0, 0, 0, 0.2);min-height:50px}:host([resizable]) ::slotted(.header-cell){overflow:auto;resize:horizontal}::slotted(*[slot="row"]){align-items:center;box-sizing:border-box}::slotted(*[slot="row"] *[column]){align-items:center}:host([stickyheader]) .header-row{top:0;position:sticky;background:white}.header-row{z-index:1}::slotted(.header-cell){display:flex;align-items:center;padding-right:5px}::slotted(*[slot="row"]:nth-child(odd)){background:#f2f3f4}::slotted(*[slot="row"]:hover){background:#e6e6e6}::slotted(*[slot="norecords"]){color:var(--warning-mid, #ed1c24);grid-column:span var(--grid-columns-num);text-align:center;padding:10px 0}.paginator{display:none;position:sticky;grid-column:span var(--grid-columns-num);bottom:0;background:#ffffff}:host([paginator]) zoo-grid-paginator{display:block}</style>`;
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
    			add_location(path, file$l, 3, 122, 238);
    			attr_dev(svg, "class", "arrow");
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
    		this.shadowRoot.innerHTML = `<style>:host{display:flex;align-items:center;width:100%;height:100%}.box{display:flex;align-items:center;width:100%;height:100%}.box:hover .arrow{opacity:1;background:#F2F3F4}.arrow{width:20px;opacity:0;transform:rotate(0deg);transition:opacity 0.1s;cursor:pointer;margin-left:5px;border-radius:5px}.arrow[sortstate='asc']{transform:rotate(180deg)}.arrow[sortstate='desc'],.arrow[sortstate='asc']{opacity:1;background:#F2F3F4}.arrow:active,.arrow[sortstate='desc']:active,.arrow[sortstate='asc']:active{opacity:0.5}</style>`;
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
    function create_if_block$6(ctx) {
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
    		id: create_if_block$6.name,
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
    		if (/*page*/ ctx[14] == 1 || /*page*/ ctx[14] == /*currentpage*/ ctx[0] || /*i*/ ctx[16] == /*currentpage*/ ctx[0] - 2 || /*i*/ ctx[16] == /*currentpage*/ ctx[0] || /*page*/ ctx[14] == /*maxpages*/ ctx[1]) return create_if_block$6;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx, -1);
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
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
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
    	let style;
    	let t5;
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
    			style = element("style");
    			style.textContent = ".btn.next svg {transform: rotate(-90deg);}\n\t\t\t\t.btn.prev svg {transform: rotate(90deg);}";
    			t5 = space();
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
    			add_location(style, file$m, 15, 3, 866);
    			attr_dev(path, "d", "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
    			add_location(path, file$m, 19, 65, 1044);
    			attr_dev(svg, "class", "arrow");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$m, 19, 3, 982);
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
    			append_dev(template.content, style);
    			append_dev(template.content, t5);
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
    		host.dispatchEvent(new CustomEvent("pageChange", { detail: { pageNumber }, bubbles: true }));
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
    		this.shadowRoot.innerHTML = `<style>:host{padding:10px;min-width:inherit;border-top:1px solid #E6E6E6}.box{display:flex;justify-content:flex-end;font-size:14px}.paging{display:flex;align-items:center;border:1px solid #E6E6E6;border-radius:5px;margin:3px 0 3px 20px;padding:0 15px}.paging.hidden{opacity:0}.btn{display:flex;cursor:pointer;opacity:1;transition:opacity 0.1s}.btn:active{opacity:0.5}.btn.hidden{display:none}.btn.next{margin-left:5px}.btn.prev{margin-right:10px}svg{fill:#555555}.arrow path{fill:var(--primary-mid, #3C9700)}.page-element{cursor:pointer}.page-element:hover{background:#F2F3F4}.page-element.active{background:var(--primary-ultralight, #EBF4E5);color:var(--primary-mid, #3C9700)}.page-element,.page-element-dots{display:flex;align-items:center;justify-content:center;border-radius:5px;width:24px;height:24px;margin-right:5px}.page-element-dots{display:none}.page-element+.page-element-dots{display:flex}</style>`;
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
