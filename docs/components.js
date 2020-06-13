function noop() { }
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
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
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

/* zoo-modules/input-info-module/InputInfo.svelte generated by Svelte v3.23.2 */

function create_fragment(ctx) {
	let div0;
	let t0;
	let t1;
	let div1;
	let t2;
	let t3;
	let template_1;

	return {
		c() {
			div0 = element("div");
			t0 = text(/*infotext*/ ctx[2]);
			t1 = space();
			div1 = element("div");
			t2 = text(/*inputerrormsg*/ ctx[1]);
			t3 = space();
			template_1 = element("template");

			template_1.innerHTML = `<style>svg {padding-right: 5px;}</style> 
	<svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"></path></svg>`;

			this.c = noop;
			attr(div0, "class", "info");
			toggle_class(div0, "hidden", !/*infotext*/ ctx[2]);
			attr(div1, "class", "error");
			toggle_class(div1, "hidden", /*valid*/ ctx[0] || !/*inputerrormsg*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			append(div0, t0);
			insert(target, t1, anchor);
			insert(target, div1, anchor);
			append(div1, t2);
			insert(target, t3, anchor);
			insert(target, template_1, anchor);
			/*template_1_binding*/ ctx[4](template_1);
		},
		p(ctx, [dirty]) {
			if (dirty & /*infotext*/ 4) set_data(t0, /*infotext*/ ctx[2]);

			if (dirty & /*infotext*/ 4) {
				toggle_class(div0, "hidden", !/*infotext*/ ctx[2]);
			}

			if (dirty & /*inputerrormsg*/ 2) set_data(t2, /*inputerrormsg*/ ctx[1]);

			if (dirty & /*valid, inputerrormsg*/ 3) {
				toggle_class(div1, "hidden", /*valid*/ ctx[0] || !/*inputerrormsg*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div0);
			if (detaching) detach(t1);
			if (detaching) detach(div1);
			if (detaching) detach(t3);
			if (detaching) detach(template_1);
			/*template_1_binding*/ ctx[4](null);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { valid = true } = $$props;
	let { inputerrormsg = "" } = $$props;
	let { infotext = "" } = $$props;
	let template;

	onMount(() => {
		const iconContent = template.content;
		const root = template.getRootNode();
		root.querySelector(".info").prepend(iconContent.cloneNode(true));
		root.querySelector(".error").prepend(iconContent.cloneNode(true));
	});

	function template_1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			template = $$value;
			$$invalidate(3, template);
		});
	}

	$$self.$set = $$props => {
		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
		if ("inputerrormsg" in $$props) $$invalidate(1, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(2, infotext = $$props.infotext);
	};

	return [valid, inputerrormsg, infotext, template, template_1_binding];
}

class InputInfo extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>.info,.error{padding:0 2px 2px 0;font-size:12px;line-height:14px;color:#555555;display:flex;align-items:center}.info.hidden,.error.hidden{display:none}.info svg path{fill:var(--info-mid, #459FD0)}.error svg path{fill:var(--warning-mid, #ED1C24)}</style>`;
		init(this, { target: this.shadowRoot }, instance, create_fragment, safe_not_equal, { valid: 0, inputerrormsg: 1, infotext: 2 });

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

/* zoo-modules/input-label-module/InputLabel.svelte generated by Svelte v3.23.2 */

function create_fragment$1(ctx) {
	let label;
	let t;

	return {
		c() {
			label = element("label");
			t = text(/*labeltext*/ ctx[0]);
			this.c = noop;
		},
		m(target, anchor) {
			insert(target, label, anchor);
			append(label, t);
		},
		p(ctx, [dirty]) {
			if (dirty & /*labeltext*/ 1) set_data(t, /*labeltext*/ ctx[0]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(label);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { labeltext = "" } = $$props;

	$$self.$set = $$props => {
		if ("labeltext" in $$props) $$invalidate(0, labeltext = $$props.labeltext);
	};

	return [labeltext];
}

class InputLabel extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>label{font-size:14px;line-height:20px;font-weight:800;color:#555555;text-align:left}</style>`;
		init(this, { target: this.shadowRoot }, instance$1, create_fragment$1, safe_not_equal, { labeltext: 0 });

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

/* zoo-modules/input-module/Input.svelte generated by Svelte v3.23.2 */

function create_if_block_2(ctx) {
	let zoo_input_label;

	return {
		c() {
			zoo_input_label = element("zoo-input-label");
			set_custom_element_data(zoo_input_label, "class", "input-label");
			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, zoo_input_label, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*labeltext*/ 2) {
				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_input_label);
		}
	};
}

// (8:1) {#if linktext}
function create_if_block_1(ctx) {
	let a;
	let t;

	return {
		c() {
			a = element("a");
			t = text(/*linktext*/ ctx[2]);
			attr(a, "class", "input-link");
			attr(a, "href", /*linkhref*/ ctx[3]);
			attr(a, "target", /*linktarget*/ ctx[4]);
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*linktext*/ 4) set_data(t, /*linktext*/ ctx[2]);

			if (dirty & /*linkhref*/ 8) {
				attr(a, "href", /*linkhref*/ ctx[3]);
			}

			if (dirty & /*linktarget*/ 16) {
				attr(a, "target", /*linktarget*/ ctx[4]);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

// (15:1) {#if infotext || !valid}
function create_if_block(ctx) {
	let zoo_input_info;

	return {
		c() {
			zoo_input_info = element("zoo-input-info");
			set_custom_element_data(zoo_input_info, "class", "input-info");
			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
		},
		m(target, anchor) {
			insert(target, zoo_input_info, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*valid*/ 128) {
				set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
			}

			if (dirty & /*inputerrormsg*/ 32) {
				set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			}

			if (dirty & /*infotext*/ 64) {
				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_input_info);
		}
	};
}

function create_fragment$2(ctx) {
	let div;
	let slot0;
	let t0;
	let t1;
	let span;
	let slot1;
	let t2;
	let svg;
	let path;
	let span_class_value;
	let t3;
	let div_class_value;
	let if_block0 = /*labeltext*/ ctx[1] && create_if_block_2(ctx);
	let if_block1 = /*linktext*/ ctx[2] && create_if_block_1(ctx);
	let if_block2 = (/*infotext*/ ctx[6] || !/*valid*/ ctx[7]) && create_if_block(ctx);

	return {
		c() {
			div = element("div");
			slot0 = element("slot");
			if (if_block0) if_block0.c();
			t0 = space();
			if (if_block1) if_block1.c();
			t1 = space();
			span = element("span");
			slot1 = element("slot");
			t2 = space();
			svg = svg_element("svg");
			path = svg_element("path");
			t3 = space();
			if (if_block2) if_block2.c();
			this.c = noop;
			attr(slot0, "name", "inputlabel");
			attr(slot1, "name", "inputelement");
			attr(path, "d", "M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z");
			attr(svg, "class", "error-circle");
			attr(svg, "width", "18");
			attr(svg, "height", "18");
			attr(svg, "viewBox", "0 0 24 24");
			attr(span, "class", span_class_value = "input-slot " + (/*valid*/ ctx[7] ? "" : "error"));
			attr(div, "class", div_class_value = "box " + /*labelposition*/ ctx[0] + " " + (/*linktext*/ ctx[2] ? "" : "link-absent"));
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, slot0);
			if (if_block0) if_block0.m(slot0, null);
			append(div, t0);
			if (if_block1) if_block1.m(div, null);
			append(div, t1);
			append(div, span);
			append(span, slot1);
			append(span, t2);
			append(span, svg);
			append(svg, path);
			append(div, t3);
			if (if_block2) if_block2.m(div, null);
		},
		p(ctx, [dirty]) {
			if (/*labeltext*/ ctx[1]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_2(ctx);
					if_block0.c();
					if_block0.m(slot0, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*linktext*/ ctx[2]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_1(ctx);
					if_block1.c();
					if_block1.m(div, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (dirty & /*valid*/ 128 && span_class_value !== (span_class_value = "input-slot " + (/*valid*/ ctx[7] ? "" : "error"))) {
				attr(span, "class", span_class_value);
			}

			if (/*infotext*/ ctx[6] || !/*valid*/ ctx[7]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block(ctx);
					if_block2.c();
					if_block2.m(div, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (dirty & /*labelposition, linktext*/ 5 && div_class_value !== (div_class_value = "box " + /*labelposition*/ ctx[0] + " " + (/*linktext*/ ctx[2] ? "" : "link-absent"))) {
				attr(div, "class", div_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let { labelposition = "top" } = $$props;
	let { labeltext = "" } = $$props;
	let { linktext = "" } = $$props;
	let { linkhref = "" } = $$props;
	let { linktarget = "about:blank" } = $$props;
	let { inputerrormsg = "" } = $$props;
	let { infotext = "" } = $$props;
	let { valid = true } = $$props;

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
		this.shadowRoot.innerHTML = `<style>.box{box-sizing:border-box;width:100%;display:grid;grid-template-areas:"label label link" "input input input" "info info info";grid-template-columns:1fr 1fr 1fr;grid-gap:3px;position:relative}.link-absent{grid-template-areas:"label label label" "input input input" "info info info";grid-gap:3px 0}@media only screen and (min-width: 500px){.left{grid-template-areas:"label link link" "label input input" "label info info"}}.left .input-label{align-self:center;padding-right:5px}.input-label{grid-area:label;align-self:self-start}.input-link{grid-area:link;align-self:flex-end}.input-slot{grid-area:input;position:relative}.input-info{grid-area:info}a{text-align:right;text-decoration:none;font-size:12px;line-height:14px;color:var(--primary-dark, #286400)}a:visited{color:var(--primary-mid, #3C9700)}a:hover,a:focus,a:active{color:var(--primary-dark, #286400)}.error-circle{position:absolute;right:15px;top:15px;color:var(--warning-mid, #ED1C24);pointer-events:none;opacity:0;transition:opacity 0.2s}.error-circle path{fill:var(--warning-mid, #ED1C24)}.error .error-circle{opacity:1}.error ::slotted(input),.error ::slotted(textarea){border:2px solid var(--warning-mid, #ED1C24);padding:12px 14px}::slotted(input),::slotted(textarea){width:100%;font-size:14px;line-height:20px;padding:13px 15px;margin:0;border:1px solid #767676;border-radius:5px;color:#555555;outline:none;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;background:#FFFFFF}::slotted(input[type="date"]),::slotted(input[type="time"]){-webkit-min-logical-height:48px}::slotted(input::placeholder),::slotted(textarea::placeholder){color:#767676;opacity:1}::slotted(input:disabled),::slotted(textarea:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#767676;cursor:not-allowed}::slotted(input:focus),::slotted(textarea:focus){border:2px solid #555555;padding:12px 14px}::slotted(label){grid-area:label;align-self:self-start;font-size:14px;line-height:20px;font-weight:800;color:#555555;text-align:left}</style>`;

		init(this, { target: this.shadowRoot }, instance$2, create_fragment$2, safe_not_equal, {
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
				insert(options.target, this, options.anchor);
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

/* zoo-modules/checkbox-module/Checkbox.svelte generated by Svelte v3.23.2 */

function create_if_block$1(ctx) {
	let zoo_input_info;

	return {
		c() {
			zoo_input_info = element("zoo-input-info");
			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[1]);
			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[3]);
			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[4]);
		},
		m(target, anchor) {
			insert(target, zoo_input_info, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*valid*/ 2) {
				set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[1]);
			}

			if (dirty & /*inputerrormsg*/ 8) {
				set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[3]);
			}

			if (dirty & /*infotext*/ 16) {
				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[4]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_input_info);
		}
	};
}

function create_fragment$3(ctx) {
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
	let mounted;
	let dispose;
	let if_block = (/*infotext*/ ctx[4] || !/*valid*/ ctx[1]) && create_if_block$1(ctx);

	return {
		c() {
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
			if (if_block) if_block.c();
			this.c = noop;
			attr(slot0, "name", "checkboxelement");
			attr(path0, "d", "M0 0h24v24H0V0z");
			attr(path0, "fill", "none");
			attr(path1, "d", "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z");
			attr(svg, "class", "check");
			attr(svg, "viewBox", "0 0 24 24");
			attr(svg, "width", "22");
			attr(svg, "height", "22");
			attr(slot1, "name", "checkboxlabel");
			attr(div0, "class", "checkbox");
			toggle_class(div0, "clicked", /*_clicked*/ ctx[5]);
			toggle_class(div0, "highlighted", /*highlighted*/ ctx[2]);
			toggle_class(div0, "error", !/*valid*/ ctx[1]);
			attr(div1, "class", "box");
			toggle_class(div1, "disabled", /*_slottedInput*/ ctx[6] && /*_slottedInput*/ ctx[6].disabled);
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, slot0);
			/*slot0_binding*/ ctx[10](slot0);
			append(div0, t0);
			append(div0, svg);
			append(svg, path0);
			append(svg, path1);
			append(div0, t1);
			append(div0, slot1);
			append(slot1, label);
			append(label, t2);
			/*slot1_binding*/ ctx[11](slot1);
			append(div1, t3);
			if (if_block) if_block.m(div1, null);

			if (!mounted) {
				dispose = listen(div1, "click", /*click_handler*/ ctx[12]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*labeltext*/ 1) set_data(t2, /*labeltext*/ ctx[0]);

			if (dirty & /*_clicked*/ 32) {
				toggle_class(div0, "clicked", /*_clicked*/ ctx[5]);
			}

			if (dirty & /*highlighted*/ 4) {
				toggle_class(div0, "highlighted", /*highlighted*/ ctx[2]);
			}

			if (dirty & /*valid*/ 2) {
				toggle_class(div0, "error", !/*valid*/ ctx[1]);
			}

			if (/*infotext*/ ctx[4] || !/*valid*/ ctx[1]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$1(ctx);
					if_block.c();
					if_block.m(div1, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*_slottedInput*/ 64) {
				toggle_class(div1, "disabled", /*_slottedInput*/ ctx[6] && /*_slottedInput*/ ctx[6].disabled);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			/*slot0_binding*/ ctx[10](null);
			/*slot1_binding*/ ctx[11](null);
			if (if_block) if_block.d();
			mounted = false;
			dispose();
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
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

	function slot0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			_inputSlot = $$value;
			$$invalidate(7, _inputSlot);
		});
	}

	function slot1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			_labelSlot = $$value;
			$$invalidate(8, _labelSlot);
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
		this.shadowRoot.innerHTML = `<style>:host{display:flex;flex-direction:column}.box{width:100%;display:flex;flex-direction:column;cursor:pointer;font-size:14px;line-height:20px}.checkbox{display:flex;width:100%;box-sizing:border-box}.highlighted{border:1px solid #E6E6E6;border-radius:5px;padding:11px 15px}.highlighted.clicked{border:2px solid var(--primary-mid, #3C9700)}.highlighted.error{border:2px solid var(--warning-mid, #ED1C24)}label{display:flex;align-items:center}zoo-input-info{display:flex;align-self:flex-start;margin-top:2px}::slotted(input[type="checkbox"]){position:relative;display:flex;min-width:24px;height:24px;border-radius:3px;border:1px solid #767676;margin:0 10px 0 0;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:none;cursor:pointer}::slotted(input[type="checkbox"]:checked){border:1px solid var(--primary-mid, #3C9700)}::slotted(input[type="checkbox"]:focus){border-width:2px}::slotted(input[type="checkbox"]:disabled){border-color:#E6E6E6;background-color:#F2F3F4;cursor:not-allowed}.check{display:none;position:absolute;margin:1px}.clicked .check{display:flex;fill:var(--primary-mid, #3C9700)}.disabled .check{fill:#767676}.error .check{fill:var(--warning-mid, #ED1C24)}.error ::slotted(input[type="checkbox"]),.error ::slotted(input[type="checkbox"]:checked){border-color:var(--warning-mid, #ED1C24)}::slotted(label){display:flex;align-items:center;cursor:pointer}.disabled,.disabled ::slotted(label){cursor:not-allowed}</style>`;

		init(this, { target: this.shadowRoot }, instance$3, create_fragment$3, safe_not_equal, {
			labeltext: 0,
			valid: 1,
			highlighted: 2,
			inputerrormsg: 3,
			infotext: 4
		});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

/* zoo-modules/radio-module/Radio.svelte generated by Svelte v3.23.2 */

function create_if_block_1$1(ctx) {
	let zoo_input_label;

	return {
		c() {
			zoo_input_label = element("zoo-input-label");
			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, zoo_input_label, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*labeltext*/ 8) {
				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[3]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_input_label);
		}
	};
}

// (8:0) {#if infotext || !valid}
function create_if_block$2(ctx) {
	let zoo_input_info;

	return {
		c() {
			zoo_input_info = element("zoo-input-info");
			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[0]);
			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[1]);
			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, zoo_input_info, anchor);
		},
		p(ctx, dirty) {
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
		d(detaching) {
			if (detaching) detach(zoo_input_info);
		}
	};
}

function create_fragment$4(ctx) {
	let t0;
	let div;
	let t1;
	let if_block1_anchor;
	let if_block0 = /*labeltext*/ ctx[3] && create_if_block_1$1(ctx);
	let if_block1 = (/*infotext*/ ctx[2] || !/*valid*/ ctx[0]) && create_if_block$2(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t0 = space();
			div = element("div");
			div.innerHTML = `<slot></slot>`;
			t1 = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
			this.c = noop;
			toggle_class(div, "error", !/*valid*/ ctx[0]);
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t0, anchor);
			insert(target, div, anchor);
			insert(target, t1, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (/*labeltext*/ ctx[3]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_1$1(ctx);
					if_block0.c();
					if_block0.m(t0.parentNode, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (dirty & /*valid*/ 1) {
				toggle_class(div, "error", !/*valid*/ ctx[0]);
			}

			if (/*infotext*/ ctx[2] || !/*valid*/ ctx[0]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block$2(ctx);
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach(t0);
			if (detaching) detach(div);
			if (detaching) detach(t1);
			if (if_block1) if_block1.d(detaching);
			if (detaching) detach(if_block1_anchor);
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	let { valid = true } = $$props;
	let { inputerrormsg = "" } = $$props;
	let { infotext = "" } = $$props;
	let { labeltext = "" } = $$props;

	$$self.$set = $$props => {
		if ("valid" in $$props) $$invalidate(0, valid = $$props.valid);
		if ("inputerrormsg" in $$props) $$invalidate(1, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(2, infotext = $$props.infotext);
		if ("labeltext" in $$props) $$invalidate(3, labeltext = $$props.labeltext);
	};

	return [valid, inputerrormsg, infotext, labeltext];
}

class Radio extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:flex;flex-direction:column}div{display:flex;padding:11px 0;font-size:14px;line-height:20px}::slotted(input[type="radio"]){position:relative;border:1px solid #767676;border-color:var(--primary-mid, #3C9700);min-width:24px;height:24px;border-radius:50%;margin:0 2px 0 0;padding:3px;background-clip:content-box;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:none;cursor:pointer}::slotted(input[type="radio"]:focus){border-width:2px}::slotted(input[type="radio"]:checked){background-color:var(--primary-mid, #3C9700)}::slotted(input[type="radio"]:disabled){cursor:not-allowed;border-color:#767676;background-color:#E6E6E6}.error ::slotted(input[type="radio"]:checked){background-color:var(--warning-mid, #ED1C24)}.error ::slotted(input[type="radio"]){border-color:var(--warning-mid, #ED1C24)}::slotted(label){cursor:pointer;margin:0 5px;align-self:center}.error ::slotted(label){color:var(--warning-mid, #ED1C24)}</style>`;

		init(this, { target: this.shadowRoot }, instance$4, create_fragment$4, safe_not_equal, {
			valid: 0,
			inputerrormsg: 1,
			infotext: 2,
			labeltext: 3
		});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

/* zoo-modules/select-module/Select.svelte generated by Svelte v3.23.2 */

function create_if_block_5(ctx) {
	let zoo_input_label;

	return {
		c() {
			zoo_input_label = element("zoo-input-label");
			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, zoo_input_label, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*labeltext*/ 2) {
				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[1]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_input_label);
		}
	};
}

// (10:1) {#if linktext}
function create_if_block_4(ctx) {
	let a;
	let t;

	return {
		c() {
			a = element("a");
			t = text(/*linktext*/ ctx[2]);
			attr(a, "class", "input-link");
			attr(a, "href", /*linkhref*/ ctx[3]);
			attr(a, "target", /*linktarget*/ ctx[4]);
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*linktext*/ 4) set_data(t, /*linktext*/ ctx[2]);

			if (dirty & /*linkhref*/ 8) {
				attr(a, "href", /*linkhref*/ ctx[3]);
			}

			if (dirty & /*linktarget*/ 16) {
				attr(a, "target", /*linktarget*/ ctx[4]);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

// (13:2) {#if slottedSelect && !slottedSelect.hasAttribute('multiple')}
function create_if_block_1$2(ctx) {
	let t;
	let if_block1_anchor;
	let if_block0 = /*loading*/ ctx[8] && create_if_block_3();

	function select_block_type(ctx, dirty) {
		if (/*valueSelected*/ ctx[11]) return create_if_block_2$1;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block1 = current_block_type(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t = space();
			if_block1.c();
			if_block1_anchor = empty();
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t, anchor);
			if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*loading*/ ctx[8]) {
				if (if_block0) ; else {
					if_block0 = create_if_block_3();
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
		d(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach(t);
			if_block1.d(detaching);
			if (detaching) detach(if_block1_anchor);
		}
	};
}

// (14:3) {#if loading}
function create_if_block_3(ctx) {
	let zoo_preloader;

	return {
		c() {
			zoo_preloader = element("zoo-preloader");
		},
		m(target, anchor) {
			insert(target, zoo_preloader, anchor);
		},
		d(detaching) {
			if (detaching) detach(zoo_preloader);
		}
	};
}

// (21:3) {:else}
function create_else_block(ctx) {
	let svg;
	let path;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "d", "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
			attr(svg, "class", "arrows");
			attr(svg, "width", "24");
			attr(svg, "height", "24");
			attr(svg, "viewBox", "0 0 24 24");
			toggle_class(svg, "disabled", /*slottedSelect*/ ctx[9].disabled);
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);
		},
		p(ctx, dirty) {
			if (dirty & /*slottedSelect*/ 512) {
				toggle_class(svg, "disabled", /*slottedSelect*/ ctx[9].disabled);
			}
		},
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

// (17:3) {#if valueSelected}
function create_if_block_2$1(ctx) {
	let svg;
	let path;
	let mounted;
	let dispose;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
			attr(svg, "class", "close");
			attr(svg, "width", "21");
			attr(svg, "height", "21");
			attr(svg, "viewBox", "0 0 24 24");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);

			if (!mounted) {
				dispose = listen(svg, "click", /*click_handler*/ ctx[14]);
				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(svg);
			mounted = false;
			dispose();
		}
	};
}

// (28:1) {#if infotext || !valid}
function create_if_block$3(ctx) {
	let zoo_input_info;

	return {
		c() {
			zoo_input_info = element("zoo-input-info");
			set_custom_element_data(zoo_input_info, "class", "input-info");
			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
		},
		m(target, anchor) {
			insert(target, zoo_input_info, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*valid*/ 128) {
				set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[7]);
			}

			if (dirty & /*inputerrormsg*/ 32) {
				set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			}

			if (dirty & /*infotext*/ 64) {
				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[6]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_input_info);
		}
	};
}

function create_fragment$5(ctx) {
	let div1;
	let span;
	let slot0;
	let t0;
	let t1;
	let div0;
	let slot1;
	let t2;
	let show_if = /*slottedSelect*/ ctx[9] && !/*slottedSelect*/ ctx[9].hasAttribute("multiple");
	let div0_class_value;
	let t3;
	let div1_class_value;
	let if_block0 = /*labeltext*/ ctx[1] && create_if_block_5(ctx);
	let if_block1 = /*linktext*/ ctx[2] && create_if_block_4(ctx);
	let if_block2 = show_if && create_if_block_1$2(ctx);
	let if_block3 = (/*infotext*/ ctx[6] || !/*valid*/ ctx[7]) && create_if_block$3(ctx);

	return {
		c() {
			div1 = element("div");
			span = element("span");
			slot0 = element("slot");
			if (if_block0) if_block0.c();
			t0 = space();
			if (if_block1) if_block1.c();
			t1 = space();
			div0 = element("div");
			slot1 = element("slot");
			t2 = space();
			if (if_block2) if_block2.c();
			t3 = space();
			if (if_block3) if_block3.c();
			this.c = noop;
			attr(slot0, "name", "selectlabel");
			attr(span, "class", "input-label");
			attr(slot1, "name", "selectelement");
			attr(div0, "class", div0_class_value = "input-slot " + (/*valid*/ ctx[7] ? "" : "error"));
			attr(div1, "class", div1_class_value = "box " + /*labelposition*/ ctx[0] + " " + (/*linktext*/ ctx[2] ? "" : "link-absent"));
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, span);
			append(span, slot0);
			if (if_block0) if_block0.m(slot0, null);
			append(div1, t0);
			if (if_block1) if_block1.m(div1, null);
			append(div1, t1);
			append(div1, div0);
			append(div0, slot1);
			/*slot1_binding*/ ctx[13](slot1);
			append(div0, t2);
			if (if_block2) if_block2.m(div0, null);
			append(div1, t3);
			if (if_block3) if_block3.m(div1, null);
		},
		p(ctx, [dirty]) {
			if (/*labeltext*/ ctx[1]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_5(ctx);
					if_block0.c();
					if_block0.m(slot0, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*linktext*/ ctx[2]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_4(ctx);
					if_block1.c();
					if_block1.m(div1, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (dirty & /*slottedSelect*/ 512) show_if = /*slottedSelect*/ ctx[9] && !/*slottedSelect*/ ctx[9].hasAttribute("multiple");

			if (show_if) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_1$2(ctx);
					if_block2.c();
					if_block2.m(div0, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (dirty & /*valid*/ 128 && div0_class_value !== (div0_class_value = "input-slot " + (/*valid*/ ctx[7] ? "" : "error"))) {
				attr(div0, "class", div0_class_value);
			}

			if (/*infotext*/ ctx[6] || !/*valid*/ ctx[7]) {
				if (if_block3) {
					if_block3.p(ctx, dirty);
				} else {
					if_block3 = create_if_block$3(ctx);
					if_block3.c();
					if_block3.m(div1, null);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}

			if (dirty & /*labelposition, linktext*/ 5 && div1_class_value !== (div1_class_value = "box " + /*labelposition*/ ctx[0] + " " + (/*linktext*/ ctx[2] ? "" : "link-absent"))) {
				attr(div1, "class", div1_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			/*slot1_binding*/ ctx[13](null);
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
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
			$$invalidate(11, valueSelected = slottedSelect.value && !slottedSelect.disabled);
			slottedSelect.addEventListener("change", e => $$invalidate(11, valueSelected = e.target.value ? true : false));
		});
	});

	const handleCrossClick = () => {
		$$invalidate(9, slottedSelect.value = null, slottedSelect);
		slottedSelect.dispatchEvent(new Event("change"));
	};

	function slot1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			selectSlot = $$value;
			$$invalidate(10, selectSlot);
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
		this.shadowRoot.innerHTML = `<style>.box{box-sizing:border-box;width:100%;display:grid;grid-template-areas:"label label link" "input input input" "info info info";grid-template-columns:1fr 1fr 1fr;grid-gap:3px;position:relative}.link-absent{grid-template-areas:"label label label" "input input input" "info info info";grid-gap:3px 0}@media only screen and (min-width: 500px){.left{grid-template-areas:"label link link" "label input input" "label info info"}}.left .input-label{align-self:center;padding-right:5px}.input-label{grid-area:label;align-self:self-start}.input-link{grid-area:link;align-self:flex-end}.input-slot{grid-area:input;position:relative}.input-info{grid-area:info}a{text-align:right;text-decoration:none;font-size:12px;line-height:14px;color:var(--primary-dark, #286400)}a:visited{color:var(--primary-mid, #3C9700)}a:hover,a:focus,a:active{color:var(--primary-dark, #286400)}.close,.arrows{position:absolute;right:10px;top:12px}.close{cursor:pointer;right:11px;top:14px}.arrows{pointer-events:none}.arrows path{fill:var(--primary-mid, #3C9700)}.arrows.disabled path{fill:#E6E6E6}.error .arrows path{fill:var(--warning-mid, #ED1C24)}::slotted(select){-webkit-appearance:none;-moz-appearance:none;width:100%;background:white;font-size:14px;line-height:20px;padding:13px 25px 13px 15px;border:1px solid #767676;border-radius:5px;color:#555555;outline:none;box-sizing:border-box;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}::slotted(select:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#767676}::slotted(select:disabled:hover){cursor:not-allowed}::slotted(select:focus){border:2px solid #555555;padding:12px 24px 12px 14px}.error ::slotted(select){border:2px solid var(--warning-mid, #ED1C24);padding:12px 24px 12px 14px}::slotted(label){font-size:14px;line-height:20px;font-weight:800;color:#555555;text-align:left}</style>`;

		init(this, { target: this.shadowRoot }, instance$5, create_fragment$5, safe_not_equal, {
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
				insert(options.target, this, options.anchor);
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

/* zoo-modules/searchable-select-module/SearchableSelect.svelte generated by Svelte v3.23.2 */

function create_else_block$1(ctx) {
	let zoo_select;
	let slot;

	return {
		c() {
			zoo_select = element("zoo-select");
			slot = element("slot");
			attr(slot, "name", "selectelement");
			attr(slot, "slot", "selectelement");
			set_custom_element_data(zoo_select, "labelposition", /*labelposition*/ ctx[0]);
			set_custom_element_data(zoo_select, "linktext", /*linktext*/ ctx[2]);
			set_custom_element_data(zoo_select, "linkhref", /*linkhref*/ ctx[3]);
			set_custom_element_data(zoo_select, "linktarget", /*linktarget*/ ctx[4]);
			set_custom_element_data(zoo_select, "labeltext", /*labeltext*/ ctx[1]);
			set_custom_element_data(zoo_select, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			set_custom_element_data(zoo_select, "infotext", /*infotext*/ ctx[6]);
			set_custom_element_data(zoo_select, "valid", /*valid*/ ctx[7]);
		},
		m(target, anchor) {
			insert(target, zoo_select, anchor);
			append(zoo_select, slot);
			/*slot_binding_1*/ ctx[24](slot);
		},
		p(ctx, dirty) {
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
		d(detaching) {
			if (detaching) detach(zoo_select);
			/*slot_binding_1*/ ctx[24](null);
		}
	};
}

// (3:1) {#if !_isMobile}
function create_if_block$4(ctx) {
	let zoo_input;
	let label;
	let t0;
	let t1;
	let input;
	let input_disabled_value;
	let t2;
	let t3;
	let t4;
	let t5;
	let slot;
	let mounted;
	let dispose;
	let if_block0 = /*_valueSelected*/ ctx[14] && create_if_block_3$1(ctx);
	let if_block1 = /*loading*/ ctx[9] && create_if_block_2$2();
	let if_block2 = /*tooltipText*/ ctx[15] && create_if_block_1$3(ctx);

	return {
		c() {
			zoo_input = element("zoo-input");
			label = element("label");
			t0 = text(/*labeltext*/ ctx[1]);
			t1 = space();
			input = element("input");
			t2 = space();
			if (if_block0) if_block0.c();
			t3 = space();
			if (if_block1) if_block1.c();
			t4 = space();
			if (if_block2) if_block2.c();
			t5 = space();
			slot = element("slot");
			attr(label, "for", "input");
			attr(label, "slot", "inputlabel");
			attr(input, "id", "input");
			input.disabled = input_disabled_value = /*_selectElement*/ ctx[12] && /*_selectElement*/ ctx[12].disabled;
			attr(input, "slot", "inputelement");
			attr(input, "type", "text");
			attr(input, "placeholder", /*placeholder*/ ctx[8]);
			set_custom_element_data(zoo_input, "type", "text");
			set_custom_element_data(zoo_input, "valid", /*valid*/ ctx[7]);
			set_custom_element_data(zoo_input, "labelposition", /*labelposition*/ ctx[0]);
			set_custom_element_data(zoo_input, "inputerrormsg", /*inputerrormsg*/ ctx[5]);
			set_custom_element_data(zoo_input, "linktext", /*linktext*/ ctx[2]);
			set_custom_element_data(zoo_input, "linkhref", /*linkhref*/ ctx[3]);
			set_custom_element_data(zoo_input, "linktarget", /*linktarget*/ ctx[4]);
			set_custom_element_data(zoo_input, "infotext", /*infotext*/ ctx[6]);
			attr(slot, "name", "selectelement");
		},
		m(target, anchor) {
			insert(target, zoo_input, anchor);
			append(zoo_input, label);
			append(label, t0);
			append(zoo_input, t1);
			append(zoo_input, input);
			/*input_binding*/ ctx[20](input);
			append(zoo_input, t2);
			if (if_block0) if_block0.m(zoo_input, null);
			append(zoo_input, t3);
			if (if_block1) if_block1.m(zoo_input, null);
			append(zoo_input, t4);
			if (if_block2) if_block2.m(zoo_input, null);
			insert(target, t5, anchor);
			insert(target, slot, anchor);
			/*slot_binding*/ ctx[23](slot);

			if (!mounted) {
				dispose = listen(input, "input", /*input_handler*/ ctx[21]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*labeltext*/ 2) set_data(t0, /*labeltext*/ ctx[1]);

			if (dirty & /*_selectElement*/ 4096 && input_disabled_value !== (input_disabled_value = /*_selectElement*/ ctx[12] && /*_selectElement*/ ctx[12].disabled)) {
				input.disabled = input_disabled_value;
			}

			if (dirty & /*placeholder*/ 256) {
				attr(input, "placeholder", /*placeholder*/ ctx[8]);
			}

			if (/*_valueSelected*/ ctx[14]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_3$1(ctx);
					if_block0.c();
					if_block0.m(zoo_input, t3);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*loading*/ ctx[9]) {
				if (if_block1) ; else {
					if_block1 = create_if_block_2$2();
					if_block1.c();
					if_block1.m(zoo_input, t4);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*tooltipText*/ ctx[15]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_1$3(ctx);
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
		d(detaching) {
			if (detaching) detach(zoo_input);
			/*input_binding*/ ctx[20](null);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (detaching) detach(t5);
			if (detaching) detach(slot);
			/*slot_binding*/ ctx[23](null);
			mounted = false;
			dispose();
		}
	};
}

// (7:3) {#if _valueSelected}
function create_if_block_3$1(ctx) {
	let svg;
	let path;
	let mounted;
	let dispose;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr(path, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
			attr(svg, "slot", "inputelement");
			attr(svg, "class", "close");
			attr(svg, "width", "20");
			attr(svg, "height", "20");
			attr(svg, "viewBox", "0 0 24 24");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);

			if (!mounted) {
				dispose = listen(svg, "click", /*click_handler*/ ctx[22]);
				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(svg);
			mounted = false;
			dispose();
		}
	};
}

// (12:3) {#if loading}
function create_if_block_2$2(ctx) {
	let zoo_preloader;

	return {
		c() {
			zoo_preloader = element("zoo-preloader");
			set_custom_element_data(zoo_preloader, "slot", "inputelement");
		},
		m(target, anchor) {
			insert(target, zoo_preloader, anchor);
		},
		d(detaching) {
			if (detaching) detach(zoo_preloader);
		}
	};
}

// (15:3) {#if tooltipText}
function create_if_block_1$3(ctx) {
	let zoo_tooltip;

	return {
		c() {
			zoo_tooltip = element("zoo-tooltip");
			set_custom_element_data(zoo_tooltip, "slot", "inputelement");
			set_custom_element_data(zoo_tooltip, "position", "right");
			set_custom_element_data(zoo_tooltip, "text", /*tooltipText*/ ctx[15]);
		},
		m(target, anchor) {
			insert(target, zoo_tooltip, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*tooltipText*/ 32768) {
				set_custom_element_data(zoo_tooltip, "text", /*tooltipText*/ ctx[15]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_tooltip);
		}
	};
}

function create_fragment$6(ctx) {
	let div;

	function select_block_type(ctx, dirty) {
		if (!/*_isMobile*/ ctx[13]) return create_if_block$4;
		return create_else_block$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			this.c = noop;
			attr(div, "class", "box");
			toggle_class(div, "error", !/*valid*/ ctx[7]);
			toggle_class(div, "hidden", /*hidden*/ ctx[16]);
			toggle_class(div, "mobile", /*_isMobile*/ ctx[13]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_block.m(div, null);
		},
		p(ctx, [dirty]) {
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

			if (dirty & /*valid*/ 128) {
				toggle_class(div, "error", !/*valid*/ ctx[7]);
			}

			if (dirty & /*hidden*/ 65536) {
				toggle_class(div, "hidden", /*hidden*/ ctx[16]);
			}

			if (dirty & /*_isMobile*/ 8192) {
				toggle_class(div, "mobile", /*_isMobile*/ ctx[13]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			if_block.d();
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
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

	function input_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			searchableInput = $$value;
			$$invalidate(10, searchableInput);
		});
	}

	const input_handler = () => handleSearchChange();
	const click_handler = e => handleCrossClick();

	function slot_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			_selectSlot = $$value;
			$$invalidate(11, _selectSlot);
		});
	}

	function slot_binding_1($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			_selectSlot = $$value;
			$$invalidate(11, _selectSlot);
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
		this.shadowRoot.innerHTML = `<style>:host,.box{position:relative}.close{display:inline-block;position:absolute;top:15px;right:14px;cursor:pointer;background:white;z-index:1}.box:hover zoo-tooltip,.box:focus zoo-tooltip{display:block}zoo-tooltip{display:none}zoo-tooltip:hover,zoo-tooltip:focus{display:block}.mobile ::slotted(select){border-radius:3px;border:1px solid #767676;position:relative;top:0}::slotted(select){-webkit-appearance:none;-moz-appearance:none;width:100%;background:white;padding:13px 15px;border:1px solid #767676;border-bottom-left-radius:3px;border-bottom-right-radius:3px;border-top:none;position:absolute;z-index:2;top:60px;font-size:14px}.box.hidden ::slotted(select){display:none}.box input{padding:13px 25px 13px 15px}.box.error input{padding:12px 24px 12px 14px;border:2px solid var(--warning-mid, #ED1C24)}.box:focus-within ::slotted(select){border:2px solid #555555;border-top:none;padding:12px 14px}.box.mobile:focus-within ::slotted(select){border:2px solid #555555;padding:12px 14px}.box:focus-within input{border:2px solid #555555;padding:12px 24px 12px 14px}.box.error ::slotted(select){border:2px solid var(--warning-mid, #ED1C24);border-top:none;padding:12px 14px}::slotted(select:disabled){border:1px solid #E6E6E6;background-color:#F2F3F4;color:#767676}::slotted(select:disabled:hover){cursor:not-allowed}</style>`;

		init(this, { target: this.shadowRoot }, instance$6, create_fragment$6, safe_not_equal, {
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
				insert(options.target, this, options.anchor);
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
}

customElements.define("zoo-searchable-select", SearchableSelect);

/* zoo-modules/preloader-module/Preloader.svelte generated by Svelte v3.23.2 */

function create_fragment$7(ctx) {
	let div3;

	return {
		c() {
			div3 = element("div");

			div3.innerHTML = `<div class="bounce1"></div> 
	<div class="bounce2"></div> 
	<div class="bounce3"></div>`;

			this.c = noop;
			attr(div3, "class", "bounce");
		},
		m(target, anchor) {
			insert(target, div3, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div3);
		}
	};
}

class Preloader extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{position:absolute;width:100%;height:100%;top:0;display:flex;align-items:center;justify-content:center;pointer-events:none}.bounce{text-align:center}.bounce>div{width:10px;height:10px;background-color:#333;border-radius:100%;display:inline-block;animation:sk-bouncedelay 1.4s infinite ease-in-out both}.bounce .bounce1{animation-delay:-0.32s}.bounce .bounce2{animation-delay:-0.16s}@keyframes sk-bouncedelay{0%,80%,100%{transform:scale(0)}40%{transform:scale(1.0)}}</style>`;
		init(this, { target: this.shadowRoot }, null, create_fragment$7, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-preloader", Preloader);

/* zoo-modules/quantity-control-module/QuantityControl.svelte generated by Svelte v3.23.2 */

function create_if_block_1$4(ctx) {
	let zoo_input_label;

	return {
		c() {
			zoo_input_label = element("zoo-input-label");
			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, zoo_input_label, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*labeltext*/ 1) {
				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[0]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_input_label);
		}
	};
}

// (21:0) {#if infotext || !valid}
function create_if_block$5(ctx) {
	let zoo_input_info;

	return {
		c() {
			zoo_input_info = element("zoo-input-info");
			set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[3]);
			set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[1]);
			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, zoo_input_info, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*valid*/ 8) {
				set_custom_element_data(zoo_input_info, "valid", /*valid*/ ctx[3]);
			}

			if (dirty & /*inputerrormsg*/ 2) {
				set_custom_element_data(zoo_input_info, "inputerrormsg", /*inputerrormsg*/ ctx[1]);
			}

			if (dirty & /*infotext*/ 4) {
				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[2]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_input_info);
		}
	};
}

function create_fragment$8(ctx) {
	let slot0;
	let t0;
	let div;
	let button0;
	let t1;
	let slot1;
	let t2;
	let button1;
	let t3;
	let if_block1_anchor;
	let mounted;
	let dispose;
	let if_block0 = /*labeltext*/ ctx[0] && create_if_block_1$4(ctx);
	let if_block1 = (/*infotext*/ ctx[2] || !/*valid*/ ctx[3]) && create_if_block$5(ctx);

	return {
		c() {
			slot0 = element("slot");
			if (if_block0) if_block0.c();
			t0 = space();
			div = element("div");
			button0 = element("button");
			button0.innerHTML = `<svg height="18" width="18"><line y1="9" x1="0" x2="18" y2="9"></line></svg>`;
			t1 = space();
			slot1 = element("slot");
			t2 = space();
			button1 = element("button");
			button1.innerHTML = `<svg height="18" width="18"><line y1="0" x1="9" x2="9" y2="18"></line><line y1="9" x1="0" x2="18" y2="9"></line></svg>`;
			t3 = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
			this.c = noop;
			attr(slot0, "name", "label");
			attr(button0, "type", "button");
			toggle_class(button0, "disabled", /*decreasedisabled*/ ctx[4]);
			attr(slot1, "name", "input");
			attr(button1, "type", "button");
			toggle_class(button1, "disabled", /*increasedisabled*/ ctx[5]);
			attr(div, "class", "control");
		},
		m(target, anchor) {
			insert(target, slot0, anchor);
			if (if_block0) if_block0.m(slot0, null);
			insert(target, t0, anchor);
			insert(target, div, anchor);
			append(div, button0);
			append(div, t1);
			append(div, slot1);
			/*slot1_binding*/ ctx[9](slot1);
			append(div, t2);
			append(div, button1);
			insert(target, t3, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);

			if (!mounted) {
				dispose = [
					listen(button0, "click", /*click_handler*/ ctx[8]),
					listen(button1, "click", /*click_handler_1*/ ctx[10])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (/*labeltext*/ ctx[0]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_1$4(ctx);
					if_block0.c();
					if_block0.m(slot0, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (dirty & /*decreasedisabled*/ 16) {
				toggle_class(button0, "disabled", /*decreasedisabled*/ ctx[4]);
			}

			if (dirty & /*increasedisabled*/ 32) {
				toggle_class(button1, "disabled", /*increasedisabled*/ ctx[5]);
			}

			if (/*infotext*/ ctx[2] || !/*valid*/ ctx[3]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block$5(ctx);
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(slot0);
			if (if_block0) if_block0.d();
			if (detaching) detach(t0);
			if (detaching) detach(div);
			/*slot1_binding*/ ctx[9](null);
			if (detaching) detach(t3);
			if (if_block1) if_block1.d(detaching);
			if (detaching) detach(if_block1_anchor);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	let { labeltext = "" } = $$props;
	let { inputerrormsg = "" } = $$props;
	let { infotext = "" } = $$props;
	let { valid = true } = $$props;
	let { decreasedisabled = false } = $$props;
	let { increasedisabled = false } = $$props;
	let inputSlot;
	let input;

	onMount(() => {
		inputSlot.addEventListener("slotchange", () => {
			input = inputSlot.assignedNodes()[0];
			setInputWidth();
		});
	});

	const handleClick = (type, disabled) => {
		if (disabled || !input) return;
		const step = input.step || 1;
		input.value = input.value ? input.value : 0;
		input.value -= type == "a" ? -step : step;
		input.dispatchEvent(new Event("change"));
		setInputWidth();
	};

	const setInputWidth = () => {
		const length = input.value ? input.value.length || 1 : 1;
		inputSlot.getRootNode().host.style.setProperty("--input-length", length + 1 + "ch");
	};

	const click_handler = () => handleClick("s", decreasedisabled);

	function slot1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			inputSlot = $$value;
			$$invalidate(6, inputSlot);
		});
	}

	const click_handler_1 = () => handleClick("a", increasedisabled);

	$$self.$set = $$props => {
		if ("labeltext" in $$props) $$invalidate(0, labeltext = $$props.labeltext);
		if ("inputerrormsg" in $$props) $$invalidate(1, inputerrormsg = $$props.inputerrormsg);
		if ("infotext" in $$props) $$invalidate(2, infotext = $$props.infotext);
		if ("valid" in $$props) $$invalidate(3, valid = $$props.valid);
		if ("decreasedisabled" in $$props) $$invalidate(4, decreasedisabled = $$props.decreasedisabled);
		if ("increasedisabled" in $$props) $$invalidate(5, increasedisabled = $$props.increasedisabled);
	};

	return [
		labeltext,
		inputerrormsg,
		infotext,
		valid,
		decreasedisabled,
		increasedisabled,
		inputSlot,
		handleClick,
		click_handler,
		slot1_binding,
		click_handler_1
	];
}

class QuantityControl extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{--input-length:1ch}svg line{stroke-width:1.5;stroke:#FFFFFF}.control{height:36px;display:flex}button:first-child{border-radius:5px 0 0 5px}button:last-child{border-radius:0 5px 5px 0}button{border-width:0;min-width:30px;background:var(--primary-mid, #3C9700);display:flex;align-items:center;justify-content:center;padding:4px;cursor:pointer}button.disabled{background:#F2F3F4;cursor:not-allowed}button.disabled svg line{stroke:#767676}::slotted(input){width:var(--input-length);min-width:30px;font-size:14px;line-height:20px;margin:0;border:none;color:#555555;outline:none;box-sizing:border-box;-moz-appearance:textfield;background:#FFFFFF;text-align:center}zoo-input-info{display:block;margin-top:2px}::slotted(label){align-self:self-start;font-size:14px;line-height:20px;font-weight:800;color:#555555;text-align:left}</style>`;

		init(this, { target: this.shadowRoot }, instance$7, create_fragment$8, safe_not_equal, {
			labeltext: 0,
			inputerrormsg: 1,
			infotext: 2,
			valid: 3,
			decreasedisabled: 4,
			increasedisabled: 5
		});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}

			if (options.props) {
				this.$set(options.props);
				flush();
			}
		}
	}

	static get observedAttributes() {
		return [
			"labeltext",
			"inputerrormsg",
			"infotext",
			"valid",
			"decreasedisabled",
			"increasedisabled"
		];
	}

	get labeltext() {
		return this.$$.ctx[0];
	}

	set labeltext(labeltext) {
		this.$set({ labeltext });
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

	get valid() {
		return this.$$.ctx[3];
	}

	set valid(valid) {
		this.$set({ valid });
		flush();
	}

	get decreasedisabled() {
		return this.$$.ctx[4];
	}

	set decreasedisabled(decreasedisabled) {
		this.$set({ decreasedisabled });
		flush();
	}

	get increasedisabled() {
		return this.$$.ctx[5];
	}

	set increasedisabled(increasedisabled) {
		this.$set({ increasedisabled });
		flush();
	}
}

customElements.define("zoo-quantity-control", QuantityControl);

/* zoo-modules/toggle-switch-module/ToggleSwitch.svelte generated by Svelte v3.23.2 */

function create_if_block_1$5(ctx) {
	let zoo_input_label;

	return {
		c() {
			zoo_input_label = element("zoo-input-label");
			set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, zoo_input_label, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*labeltext*/ 1) {
				set_custom_element_data(zoo_input_label, "labeltext", /*labeltext*/ ctx[0]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_input_label);
		}
	};
}

// (11:1) {#if infotext}
function create_if_block$6(ctx) {
	let zoo_input_info;

	return {
		c() {
			zoo_input_info = element("zoo-input-info");
			set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, zoo_input_info, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*infotext*/ 2) {
				set_custom_element_data(zoo_input_info, "infotext", /*infotext*/ ctx[1]);
			}
		},
		d(detaching) {
			if (detaching) detach(zoo_input_info);
		}
	};
}

function create_fragment$9(ctx) {
	let div1;
	let slot0;
	let t0;
	let div0;
	let slot1;
	let t1;
	let mounted;
	let dispose;
	let if_block0 = /*labeltext*/ ctx[0] && create_if_block_1$5(ctx);
	let if_block1 = /*infotext*/ ctx[1] && create_if_block$6(ctx);

	return {
		c() {
			div1 = element("div");
			slot0 = element("slot");
			if (if_block0) if_block0.c();
			t0 = space();
			div0 = element("div");
			slot1 = element("slot");
			t1 = space();
			if (if_block1) if_block1.c();
			this.c = noop;
			attr(slot0, "name", "label");
			attr(slot1, "name", "input");
			attr(div0, "class", "input");
			attr(div1, "class", "box");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, slot0);
			if (if_block0) if_block0.m(slot0, null);
			append(div1, t0);
			append(div1, div0);
			append(div0, slot1);
			/*slot1_binding*/ ctx[4](slot1);
			append(div1, t1);
			if (if_block1) if_block1.m(div1, null);

			if (!mounted) {
				dispose = listen(div0, "click", /*click_handler*/ ctx[5]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (/*labeltext*/ ctx[0]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_1$5(ctx);
					if_block0.c();
					if_block0.m(slot0, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*infotext*/ ctx[1]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block$6(ctx);
					if_block1.c();
					if_block1.m(div1, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block0) if_block0.d();
			/*slot1_binding*/ ctx[4](null);
			if (if_block1) if_block1.d();
			mounted = false;
			dispose();
		}
	};
}

function instance$8($$self, $$props, $$invalidate) {
	let { labeltext = "" } = $$props;
	let { infotext = "" } = $$props;
	let inputSlot;
	let input;

	onMount(() => {
		inputSlot.addEventListener("slotchange", () => input = inputSlot.assignedNodes()[0]);

		inputSlot.addEventListener("keypress", e => {
			if (e.keyCode === 13) input.click();
		});
	});

	const handleBoxClick = e => {
		if (e.target !== input) {
			e.preventDefault();
			e.stopPropagation();
			input.click();
		}
	};

	function slot1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			inputSlot = $$value;
			$$invalidate(2, inputSlot);
		});
	}

	const click_handler = e => handleBoxClick(e);

	$$self.$set = $$props => {
		if ("labeltext" in $$props) $$invalidate(0, labeltext = $$props.labeltext);
		if ("infotext" in $$props) $$invalidate(1, infotext = $$props.infotext);
	};

	return [labeltext, infotext, inputSlot, handleBoxClick, slot1_binding, click_handler];
}

class ToggleSwitch extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{height:100%;width:100%}.input{position:relative;height:17px;width:40px;background:#E6E6E6;border-radius:10px;border-width:0px;cursor:pointer}::slotted(input[type="checkbox"]){position:absolute;top:-6px;transition:transform 0.2s;transform:translateX(-30%);width:60%;height:24px;background:#FFFFFF;border:1px solid #E6E6E6;border-radius:50%;display:flex;-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:none;cursor:pointer}::slotted(input[type="checkbox"]:checked){transform:translateX(80%);left:initial;background:var(--primary-mid, #3C9700)}::slotted(input[type="checkbox"]:focus){border-width:2px;border:1px solid #767676}::slotted(input[type="checkbox"]:disabled){background:#F2F3F4;cursor:not-allowed}::slotted(label){display:flex;font-size:14px;line-height:20px;font-weight:800;color:#555555;text-align:left;margin-bottom:10px}zoo-input-info{display:flex;margin-top:8px}</style>`;
		init(this, { target: this.shadowRoot }, instance$8, create_fragment$9, safe_not_equal, { labeltext: 0, infotext: 1 });

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}

			if (options.props) {
				this.$set(options.props);
				flush();
			}
		}
	}

	static get observedAttributes() {
		return ["labeltext", "infotext"];
	}

	get labeltext() {
		return this.$$.ctx[0];
	}

	set labeltext(labeltext) {
		this.$set({ labeltext });
		flush();
	}

	get infotext() {
		return this.$$.ctx[1];
	}

	set infotext(infotext) {
		this.$set({ infotext });
		flush();
	}
}

customElements.define("zoo-toggle-switch", ToggleSwitch);

class Button extends HTMLElement {

	// Fires when an instance of the element is created or updated
	constructor() {
		super();
		let shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		<style>
		:host {
			--int-primary-mid: #3C9700;
			--int-primary-light: #66B100;
			--int-primary-dark: #286400;
			--int-secondary-mid: #FF6200;
			--int-secondary-light: #FF8800;
			--int-secondary-dark: #CC4E00;
			display: flex;
			max-width: 330px;
			min-height: 36px;
			position: relative;
		}
		
		div {
			display: flex;
			width: 100%;
			min-height: 100%;
		}
		
		::slotted(button) {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			color: white;
			border: 0;
			border-radius: 5px;
			cursor: pointer;
			width: 100%;
			min-height: 100%;
			font-size: 14px;
			line-height: 20px;
			font-weight: bold;
			text-align: center;
			background: linear-gradient(to right, var(--primary-mid, --int-primary-mid), var(--primary-light, --int-primary-light));
		}
		
		::slotted(button:hover), ::slotted(button:focus) {
			background: var(--primary-mid, --int-primary-mid);
		}
		
		::slotted(button:active) {
			background: var(--primary-dark, --int-primary-dark);
			transform: translateY(1px);
		}
		
		::slotted(button:disabled) {
			background: #F2F3F4 !important;
			color: #767676 !important;
			border: 1px solid #E6E6E6 !important;
			cursor: not-allowed;
			transform: translateY(0);
		}
		
		:host([type="secondary"]) ::slotted(button) {
			background: linear-gradient(to right, var(--secondary-mid, --int-secondary-mid), var(--secondary-light, --int-secondary-light));
		}
		
		:host([type="secondary"]) ::slotted(button:hover) :host([type="secondary"]) ::slotted(button:focus) {
			background: var(--secondary-mid, --int-secondary-mid);
		}
		
		:host([type="secondary"]) ::slotted(button:active) {
			background: var(--secondary-dark, --int-secondary-dark);
		}
		
		:host([type="hollow"]) ::slotted(button) {
			border: 2px solid var(--primary-mid, --int-primary-mid);
			color: var(--primary-mid, --int-primary-mid);
			background: transparent;
		}
		
		:host([type="hollow"]) ::slotted(button:hover), :host([type="hollow"]) ::slotted(button:focus), :host([type="hollow"]) ::slotted(button:active) {
			color: white;
			background: var(--primary-mid, --int-primary-mid);
		}
		
		:host([type="hollow"]) ::slotted(button:active) {
			background: var(--primary-dark, --int-primary-dark);
		}
		
		:host([type="empty"]) ::slotted(button) {
			color: initial;
			background: transparent;
		}
		
		:host([type="empty"]) ::slotted(button:hover), :host([type="empty"]) ::slotted(button:focus) {
			background: #E6E6E6;
		}
		
		:host([size="medium"]) {
			min-height: 46px;
		}
		
		::slotted(*) {
			padding: 0 20px;
		}
		</style>
		<slot></slot>`;
	}
}

// Registers custom element
window.customElements.define('zoo-button', Button);

/* zoo-modules/segmented-buttons-module/SegmentedButtons.svelte generated by Svelte v3.23.2 */

function create_fragment$a(ctx) {
	let div;
	let slot;

	return {
		c() {
			div = element("div");
			slot = element("slot");
			this.c = noop;
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, slot);
			/*slot_binding*/ ctx[1](slot);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*slot_binding*/ ctx[1](null);
		}
	};
}

function instance$9($$self, $$props, $$invalidate) {
	let btnSlot;
	let prevActiveBtn;

	onMount(() => {
		btnSlot.addEventListener("slotchange", () => {
			const buttons = btnSlot.assignedNodes().filter(e => e.tagName === "ZOO-BUTTON");

			for (const btn of buttons) {
				if (!btn.hasAttribute("type")) {
					btn.setAttribute("type", "empty");
				}

				if (btn.getAttribute("type") !== "empty") {
					prevActiveBtn = btn;
				}
			}

			btnSlot.getRootNode().host.addEventListener("click", e => {
				if (buttons.includes(e.target)) {
					if (prevActiveBtn) {
						prevActiveBtn.setAttribute("type", "empty");
					}

					prevActiveBtn = e.target;
					prevActiveBtn.setAttribute("type", "primary");
				}
			});
		});
	});

	function slot_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			btnSlot = $$value;
			$$invalidate(0, btnSlot);
		});
	}

	return [btnSlot, slot_binding];
}

class SegmentedButtons extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:flex;height:46px}div{display:flex;justify-content:space-between;width:100%;height:100%;border:1px solid;border-radius:5px;padding:2px}::slotted(zoo-button){display:inline-flex;flex-grow:1}::slotted(zoo-button[type="primary"]){padding:0 2px}</style>`;
		init(this, { target: this.shadowRoot }, instance$9, create_fragment$a, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-segmented-buttons", SegmentedButtons);

/* zoo-modules/grid-module/Grid.svelte generated by Svelte v3.23.2 */

function create_if_block$7(ctx) {
	let div;
	let t;
	let zoo_spinner;

	return {
		c() {
			div = element("div");
			t = space();
			zoo_spinner = element("zoo-spinner");
			attr(div, "class", "loading-shade");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			insert(target, t, anchor);
			insert(target, zoo_spinner, anchor);
		},
		d(detaching) {
			if (detaching) detach(div);
			if (detaching) detach(t);
			if (detaching) detach(zoo_spinner);
		}
	};
}

function create_fragment$b(ctx) {
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
	let mounted;
	let dispose;
	let if_block = /*loading*/ ctx[2] && create_if_block$7();

	return {
		c() {
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
			attr(slot0, "name", "headercell");
			attr(div0, "class", "header-row");
			attr(slot1, "name", "row");
			attr(slot2, "name", "norecords");
			attr(slot3, "name", "pagesizeselector");
			attr(slot3, "slot", "pagesizeselector");
			set_custom_element_data(zoo_grid_paginator, "currentpage", /*currentpage*/ ctx[0]);
			set_custom_element_data(zoo_grid_paginator, "maxpages", /*maxpages*/ ctx[1]);
			attr(slot4, "name", "paginator");
			attr(div1, "class", "box");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			if (if_block) if_block.m(div1, null);
			append(div1, t0);
			append(div1, div0);
			append(div0, slot0);
			/*slot0_binding*/ ctx[8](slot0);
			append(div1, t1);
			append(div1, slot1);
			/*slot1_binding*/ ctx[10](slot1);
			append(div1, t2);
			append(div1, slot2);
			append(div1, t3);
			append(div1, slot4);
			append(slot4, zoo_grid_paginator);
			append(zoo_grid_paginator, slot3);
			/*div1_binding*/ ctx[12](div1);

			if (!mounted) {
				dispose = [
					listen(div0, "sortChange", /*sortChange_handler*/ ctx[9]),
					listen(zoo_grid_paginator, "pageChange", /*pageChange_handler*/ ctx[11])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (/*loading*/ ctx[2]) {
				if (if_block) ; else {
					if_block = create_if_block$7();
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
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block) if_block.d();
			/*slot0_binding*/ ctx[8](null);
			/*slot1_binding*/ ctx[10](null);
			/*div1_binding*/ ctx[12](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$a($$self, $$props, $$invalidate) {
	let { currentpage = "" } = $$props;
	let { maxpages = "" } = $$props;
	let { loading = false } = $$props;
	let gridRoot;
	let headerCellSlot;
	let rowSlot;
	let resizeObserver;
	let mutationObserver;
	let prevSortedHeader;
	let draggedOverHeader;

	// sortable grid -> set min-width to set width
	// not sortable -> set --grid-column-sizes variable
	onMount(() => {
		const host = gridRoot.getRootNode().host;
		mutationObserver = new MutationObserver(mutationHandler);

		mutationObserver.observe(host, {
			attributes: true,
			childList: false,
			subtree: false
		});

		headerCellSlot.addEventListener("slotchange", () => {
			const headers = headerCellSlot.assignedNodes();
			host.style.setProperty("--grid-column-num", headers.length);
			host.style.setProperty("--grid-column-sizes", "repeat(var(--grid-column-num), minmax(50px, 1fr))");
			handleHeaders(headers);
		});

		rowSlot.addEventListener("slotchange", assignColumnNumberToRows);
	});

	const mutationHandler = mutationsList => {
		for (let mutation of mutationsList) {
			const attrName = mutation.attributeName;

			if (attrName == "resizable" || attrName == "reorderable") {
				const host = gridRoot.getRootNode().host;
				const headers = headerCellSlot.assignedNodes();

				if (host.hasAttribute("resizable")) {
					handleResizableHeaders(headers, host);
				}

				if (host.hasAttribute("reorderable")) {
					handleDraggableHeaders(headers, host);
				}
			}
		}
	};

	const handleHeaders = headers => {
		let i = 1;

		for (let header of headers) {
			header.setAttribute("column", i);
			i++;
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
			resizeObserver = null;
		}

		mutationObserver.disconnect();
		mutationObserver = null;
	});

	function slot0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			headerCellSlot = $$value;
			$$invalidate(4, headerCellSlot);
		});
	}

	const sortChange_handler = e => handleSortChange(e);

	function slot1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			rowSlot = $$value;
			$$invalidate(5, rowSlot);
		});
	}

	const pageChange_handler = e => dispatchPageEvent(e);

	function div1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			gridRoot = $$value;
			$$invalidate(3, gridRoot);
		});
	}

	$$self.$set = $$props => {
		if ("currentpage" in $$props) $$invalidate(0, currentpage = $$props.currentpage);
		if ("maxpages" in $$props) $$invalidate(1, maxpages = $$props.maxpages);
		if ("loading" in $$props) $$invalidate(2, loading = $$props.loading);
	};

	return [
		currentpage,
		maxpages,
		loading,
		gridRoot,
		headerCellSlot,
		rowSlot,
		handleSortChange,
		dispatchPageEvent,
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
		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.box{position:relative;max-height:inherit;max-width:inherit;min-height:inherit;min-width:inherit}.loading-shade{position:absolute;left:0;top:0;right:0;bottom:56px;z-index:9998;display:flex;align-items:center;justify-content:center;height:100%;background:rgba(0, 0, 0, 0.15);pointer-events:none}.header-row{min-width:inherit;font-size:12px;line-height:14px;font-weight:600;color:#555555;box-sizing:border-box;z-index:1}.header-row,::slotted(*[slot="row"]){display:grid;grid-template-columns:var(--grid-column-sizes, repeat(var(--grid-column-num), minmax(50px, 1fr)));padding:5px 10px;border-bottom:1px solid rgba(0, 0, 0, 0.2);min-height:50px;font-size:14px;line-height:20px}:host([resizable]) .header-row,:host([resizable]) ::slotted(*[slot="row"]){display:flex}:host([resizable]) ::slotted(*[slot="headercell"]){overflow:auto;resize:horizontal;height:inherit}:host(.dragging) ::slotted(*[ondrop]){border-radius:3px;box-shadow:inset 0px 0px 1px 1px rgba(0, 0, 0, 0.1)}:host(.dragging) ::slotted(.drag-over){box-shadow:inset 0px 0px 1px 1px rgba(0, 0, 0, 0.4)}::slotted(*[slot="row"]){overflow:visible;align-items:center;box-sizing:border-box}::slotted(*[slot="row"] *[column]){align-items:center}:host([stickyheader]) .header-row{top:0;position:sticky;background:white}::slotted(*[slot="headercell"]){display:flex;align-items:center;flex-grow:1}::slotted(*[slot="row"]:nth-child(odd)){background:#F2F3F4}::slotted(*[slot="row"]:hover),::slotted(*[slot="row"]:focus){background:#E6E6E6}::slotted(*[slot="norecords"]){color:var(--warning-dark, #BD161C);grid-column:span var(--grid-column-num);text-align:center;padding:10px 0}zoo-grid-paginator{display:grid;position:sticky;grid-column:span var(--grid-column-num);bottom:0;background:#FFFFFF}</style>`;
		init(this, { target: this.shadowRoot }, instance$a, create_fragment$b, safe_not_equal, { currentpage: 0, maxpages: 1, loading: 2 });

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

/* zoo-modules/grid-module/GridHeader.svelte generated by Svelte v3.23.2 */

function create_fragment$c(ctx) {
	let div;
	let slot;
	let t0;
	let svg0;
	let path0;
	let t1;
	let svg1;
	let path1;
	let path2;
	let mounted;
	let dispose;

	return {
		c() {
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
			attr(path0, "d", "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
			attr(svg0, "class", "arrow");
			attr(svg0, "sortstate", /*sortState*/ ctx[0]);
			attr(svg0, "width", "24");
			attr(svg0, "height", "24");
			attr(svg0, "viewBox", "0 0 24 24");
			attr(path1, "d", "M0 0h24v24H0V0z");
			attr(path1, "fill", "none");
			attr(path2, "d", "M7 11l-4 4 4 4v-3h7v-2H7v-3zm14-2l-4-4v3h-7v2h7v3l4-4z");
			attr(svg1, "reorderable", /*reorderable*/ ctx[2]);
			attr(svg1, "class", "swap");
			attr(svg1, "viewBox", "0 0 24 24");
			attr(svg1, "width", "18");
			attr(svg1, "height", "18");
			attr(div, "class", "box");
			toggle_class(div, "sortable", /*sortable*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, slot);
			append(div, t0);
			append(div, svg0);
			append(svg0, path0);
			append(div, t1);
			append(div, svg1);
			append(svg1, path1);
			append(svg1, path2);
			/*div_binding*/ ctx[7](div);

			if (!mounted) {
				dispose = [
					listen(svg0, "click", /*click_handler*/ ctx[6]),
					listen(svg1, "mousedown", /*toggleHostDraggable*/ ctx[5])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*sortState*/ 1) {
				attr(svg0, "sortstate", /*sortState*/ ctx[0]);
			}

			if (dirty & /*reorderable*/ 4) {
				attr(svg1, "reorderable", /*reorderable*/ ctx[2]);
			}

			if (dirty & /*sortable*/ 2) {
				toggle_class(div, "sortable", /*sortable*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*div_binding*/ ctx[7](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$b($$self, $$props, $$invalidate) {
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
	const click_handler = () => handleSortClick();

	function div_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			gridHeaderRoot = $$value;
			$$invalidate(3, gridHeaderRoot);
		});
	}

	$$self.$set = $$props => {
		if ("sortState" in $$props) $$invalidate(0, sortState = $$props.sortState);
		if ("sortable" in $$props) $$invalidate(1, sortable = $$props.sortable);
		if ("reorderable" in $$props) $$invalidate(2, reorderable = $$props.reorderable);
	};

	return [
		sortState,
		sortable,
		reorderable,
		gridHeaderRoot,
		handleSortClick,
		toggleHostDraggable,
		click_handler,
		div_binding
	];
}

class GridHeader extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:flex;align-items:center;width:100%;height:100%}.box{display:flex;align-items:center;width:100%;height:100%}.box:hover .arrow,.box:focus .arrow{opacity:1}.box:hover .swap,.box:focus .swap{opacity:1}.box.sortable .arrow,.swap[reorderable]{display:flex}.arrow,.swap{display:none;min-width:20px;width:20px;opacity:0;transition:opacity 0.1s;margin-left:5px;border-radius:5px;background:#F2F3F4}.arrow{cursor:pointer;transform:rotate(0deg)}.swap{cursor:grab}.swap:active{cursor:grabbing}.arrow[sortstate='asc']{transform:rotate(180deg)}.arrow[sortstate='desc'],.arrow[sortstate='asc']{opacity:1;background:#F2F3F4}.box .arrow:active,.arrow[sortstate='desc']:active,.arrow[sortstate='asc']:active{opacity:0.5;transform:translateY(1px)}</style>`;

		init(this, { target: this.shadowRoot }, instance$b, create_fragment$c, safe_not_equal, {
			sortState: 0,
			sortable: 1,
			reorderable: 2
		});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

/* zoo-modules/grid-module/GridPaginator.svelte generated by Svelte v3.23.2 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[10] = list[i];
	return child_ctx;
}

// (10:62) 
function create_if_block_1$6(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = "...";
			attr(div, "class", "page-element-dots");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (8:3) {#if page == 1 || page == +currentpage - 1 || page == +currentpage || page == +currentpage + 1 || page == maxpages}
function create_if_block$8(ctx) {
	let div;
	let t_value = /*page*/ ctx[10] + "";
	let t;
	let mounted;
	let dispose;

	function click_handler_1(...args) {
		return /*click_handler_1*/ ctx[7](/*page*/ ctx[10], ...args);
	}

	return {
		c() {
			div = element("div");
			t = text(t_value);
			attr(div, "class", "page-element");
			toggle_class(div, "active", /*page*/ ctx[10] == /*currentpage*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);

			if (!mounted) {
				dispose = listen(div, "click", click_handler_1);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*maxpages*/ 2 && t_value !== (t_value = /*page*/ ctx[10] + "")) set_data(t, t_value);

			if (dirty & /*Array, maxpages, currentpage*/ 3) {
				toggle_class(div, "active", /*page*/ ctx[10] == /*currentpage*/ ctx[0]);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

// (6:2) {#each Array(+maxpages).fill().map((_, i) => i+1) as page}
function create_each_block(ctx) {
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (/*page*/ ctx[10] == 1 || /*page*/ ctx[10] == +/*currentpage*/ ctx[0] - 1 || /*page*/ ctx[10] == +/*currentpage*/ ctx[0] || /*page*/ ctx[10] == +/*currentpage*/ ctx[0] + 1 || /*page*/ ctx[10] == /*maxpages*/ ctx[1]) return create_if_block$8;
		if (/*page*/ ctx[10] == +/*currentpage*/ ctx[0] - 2 || +/*currentpage*/ ctx[0] + 2 == /*page*/ ctx[10]) return create_if_block_1$6;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type && current_block_type(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if (if_block) if_block.d(1);
				if_block = current_block_type && current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		d(detaching) {
			if (if_block) {
				if_block.d(detaching);
			}

			if (detaching) detach(if_block_anchor);
		}
	};
}

function create_fragment$d(ctx) {
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
	let mounted;
	let dispose;
	let each_value = Array(+/*maxpages*/ ctx[1]).fill().map(func);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
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

			template.innerHTML = `<style>
				.btn.next svg {transform: rotate(-90deg);}

				.btn.prev svg {transform: rotate(90deg);}
			</style> 
			<svg class="arrow" width="24" height="24" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path></svg>`;

			this.c = noop;
			attr(slot, "name", "pagesizeselector");
			attr(div0, "class", "btn prev");
			toggle_class(div0, "hidden", !/*currentpage*/ ctx[0] || /*currentpage*/ ctx[0] == 1);
			attr(div1, "class", "btn next");
			toggle_class(div1, "hidden", !/*currentpage*/ ctx[0] || !/*maxpages*/ ctx[1] || /*currentpage*/ ctx[0] == /*maxpages*/ ctx[1]);
			attr(template, "id", "arrow");
			attr(nav, "class", "paging");
			attr(div2, "class", "box");
			toggle_class(div2, "hidden", !/*currentpage*/ ctx[0] || !/*maxpages*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, slot);
			append(div2, t0);
			append(div2, nav);
			append(nav, div0);
			append(nav, t1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(nav, null);
			}

			append(nav, t2);
			append(nav, div1);
			append(nav, t3);
			append(nav, template);
			/*div2_binding*/ ctx[9](div2);

			if (!mounted) {
				dispose = [
					listen(div0, "click", /*click_handler*/ ctx[6]),
					listen(div1, "click", /*click_handler_2*/ ctx[8])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*currentpage*/ 1) {
				toggle_class(div0, "hidden", !/*currentpage*/ ctx[0] || /*currentpage*/ ctx[0] == 1);
			}

			if (dirty & /*Array, maxpages, currentpage, goToPage*/ 35) {
				each_value = Array(+/*maxpages*/ ctx[1]).fill().map(func);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
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
		d(detaching) {
			if (detaching) detach(div2);
			destroy_each(each_blocks, detaching);
			/*div2_binding*/ ctx[9](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

const func = (_, i) => i + 1;

function instance$c($$self, $$props, $$invalidate) {
	let { maxpages = 0 } = $$props;
	let { currentpage = 0 } = $$props;
	let gridPaginatorRoot;

	onMount(() => {
		const arrowTemplateContent = gridPaginatorRoot.querySelector("#arrow").content;
		gridPaginatorRoot.querySelector(".btn.prev").appendChild(arrowTemplateContent.cloneNode(true));
		gridPaginatorRoot.querySelector(".btn.next").appendChild(arrowTemplateContent.cloneNode(true));
	});

	const goToPrevPage = () => goToPage(+currentpage - 1);
	const goToNextPage = () => goToPage(+currentpage + 1);

	const goToPage = pageNumber => {
		$$invalidate(0, currentpage = pageNumber);

		gridPaginatorRoot.getRootNode().host.dispatchEvent(new CustomEvent("pageChange",
		{
				detail: { pageNumber },
				bubbles: true,
				compose: true
			}));
	};

	const click_handler = () => goToPrevPage();
	const click_handler_1 = page => goToPage(page);
	const click_handler_2 = () => goToNextPage();

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			gridPaginatorRoot = $$value;
			$$invalidate(2, gridPaginatorRoot);
		});
	}

	$$self.$set = $$props => {
		if ("maxpages" in $$props) $$invalidate(1, maxpages = $$props.maxpages);
		if ("currentpage" in $$props) $$invalidate(0, currentpage = $$props.currentpage);
	};

	return [
		currentpage,
		maxpages,
		gridPaginatorRoot,
		goToPrevPage,
		goToNextPage,
		goToPage,
		click_handler,
		click_handler_1,
		click_handler_2,
		div2_binding
	];
}

class GridPaginator extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{padding:10px;min-width:inherit;border-top:1px solid #E6E6E6}.box{display:flex;font-size:14px;width:max-content;right:10px;justify-self:flex-end;position:sticky}.box.hidden{display:none}.paging{display:flex;align-items:center;border:1px solid #E6E6E6;border-radius:5px;margin:3px 0 3px 20px;padding:0 15px}.btn{display:flex;cursor:pointer;opacity:1;transition:opacity 0.1s}.btn:active{opacity:0.5}.btn.hidden{display:none}.btn.next{margin-left:5px}.btn.prev{margin-right:10px}svg{fill:#555555}.arrow path{fill:var(--primary-mid, #3C9700)}.page-element{cursor:pointer}.page-element:hover,.page-element:focus{background:#F2F3F4}.page-element.active{background:var(--primary-ultralight, #EBF4E5);color:var(--primary-mid, #3C9700)}.page-element,.page-element-dots{display:flex;align-items:center;justify-content:center;border-radius:5px;margin-right:5px;padding:4px 8px}.page-element-dots{display:flex}</style>`;
		init(this, { target: this.shadowRoot }, instance$c, create_fragment$d, safe_not_equal, { maxpages: 1, currentpage: 0 });

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

/* zoo-modules/header-module/Header.svelte generated by Svelte v3.23.2 */

function create_fragment$e(ctx) {
	let header;
	let slot0;
	let t0;
	let slot1;
	let h2;
	let t1;
	let t2;
	let slot2;

	return {
		c() {
			header = element("header");
			slot0 = element("slot");
			t0 = space();
			slot1 = element("slot");
			h2 = element("h2");
			t1 = text(/*headertext*/ ctx[0]);
			t2 = space();
			slot2 = element("slot");
			this.c = noop;
			attr(slot0, "name", "img");
			attr(slot1, "name", "headertext");
		},
		m(target, anchor) {
			insert(target, header, anchor);
			append(header, slot0);
			append(header, t0);
			append(header, slot1);
			append(slot1, h2);
			append(h2, t1);
			append(header, t2);
			append(header, slot2);
		},
		p(ctx, [dirty]) {
			if (dirty & /*headertext*/ 1) set_data(t1, /*headertext*/ ctx[0]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(header);
		}
	};
}

function instance$d($$self, $$props, $$invalidate) {
	let { headertext = "" } = $$props;

	$$self.$set = $$props => {
		if ("headertext" in $$props) $$invalidate(0, headertext = $$props.headertext);
	};

	return [headertext];
}

class Header extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:style}header{display:flex;align-items:center;background:#FFFFFF;padding:0 0 0 25px;height:70px}::slotted(img){height:46px;display:inline-block;padding:5px 25px 5px 0;cursor:pointer}@media only screen and (max-width: 544px){::slotted(img){height:36px}}::slotted(*[slot="headertext"]),h2{display:inline-block;color:var(--primary-mid, #3C9700)}@media only screen and (max-width: 544px){::slotted(*[slot="headertext"]),h2{display:none}}</style>`;
		init(this, { target: this.shadowRoot }, instance$d, create_fragment$e, safe_not_equal, { headertext: 0 });

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

/* zoo-modules/modal-module/Modal.svelte generated by Svelte v3.23.2 */

function create_fragment$f(ctx) {
	let div4;
	let div3;
	let div1;
	let span;
	let t0;
	let t1;
	let div0;
	let t2;
	let div2;
	let div4_class_value;
	let mounted;
	let dispose;

	return {
		c() {
			div4 = element("div");
			div3 = element("div");
			div1 = element("div");
			span = element("span");
			t0 = text(/*headertext*/ ctx[0]);
			t1 = space();
			div0 = element("div");
			div0.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"></path></svg>`;
			t2 = space();
			div2 = element("div");
			div2.innerHTML = `<slot></slot>`;
			this.c = noop;
			attr(span, "class", "header-text");
			attr(div0, "class", "close");
			attr(div1, "class", "heading");
			attr(div2, "class", "content");
			attr(div3, "class", "dialog-content");
			attr(div4, "class", div4_class_value = "box " + (/*hidden*/ ctx[3] ? "hide" : "show"));
		},
		m(target, anchor) {
			insert(target, div4, anchor);
			append(div4, div3);
			append(div3, div1);
			append(div1, span);
			append(span, t0);
			append(div1, t1);
			append(div1, div0);
			append(div3, t2);
			append(div3, div2);
			/*div4_binding*/ ctx[6](div4);

			if (!mounted) {
				dispose = listen(div0, "click", /*click_handler*/ ctx[5]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*headertext*/ 1) set_data(t0, /*headertext*/ ctx[0]);

			if (dirty & /*hidden*/ 8 && div4_class_value !== (div4_class_value = "box " + (/*hidden*/ ctx[3] ? "hide" : "show"))) {
				attr(div4, "class", div4_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div4);
			/*div4_binding*/ ctx[6](null);
			mounted = false;
			dispose();
		}
	};
}

function instance$e($$self, $$props, $$invalidate) {
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

	const click_handler = event => closeModal();

	function div4_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			_modalRoot = $$value;
			$$invalidate(2, _modalRoot);
		});
	}

	$$self.$set = $$props => {
		if ("headertext" in $$props) $$invalidate(0, headertext = $$props.headertext);
	};

	return [
		headertext,
		closeModal,
		_modalRoot,
		hidden,
		openModal,
		click_handler,
		div4_binding
	];
}

class Modal extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:none;contain:style}.box{position:fixed;width:100%;height:100%;background:rgba(0, 0, 0, 0.8);opacity:0;transition:opacity 0.3s;z-index:9999;left:0;top:0;display:flex;justify-content:center;align-items:center;will-change:opacity;transform:translateZ(0)}.dialog-content{padding:0 20px 20px 20px;box-sizing:border-box;background:white;overflow-y:auto;max-height:95%;border-radius:5px;animation-name:anim-show;animation-duration:0.3s;animation-fill-mode:forwards}@media only screen and (max-width: 544px){.dialog-content{padding:25px}}@media only screen and (max-width: 375px){.dialog-content{width:100%;height:100%;top:0;left:0;transform:none}}.heading{display:flex;flex-direction:row;align-items:flex-start}.heading .header-text{font-size:24px;line-height:29px;font-weight:bold;margin:30px 0}.heading .close{cursor:pointer;margin:30px 0 30px auto}.heading .close path{fill:var(--primary-mid, #3C9700)}.show{opacity:1}.hide .dialog-content{animation-name:anim-hide}@keyframes anim-show{0%{opacity:0;transform:scale3d(0.9, 0.9, 1)}100%{opacity:1;transform:scale3d(1, 1, 1)}}@keyframes anim-hide{0%{opacity:1}100%{opacity:0;transform:scale3d(0.9, 0.9, 1)}}</style>`;

		init(this, { target: this.shadowRoot }, instance$e, create_fragment$f, safe_not_equal, {
			headertext: 0,
			openModal: 4,
			closeModal: 1
		});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

	get closeModal() {
		return this.$$.ctx[1];
	}
}

customElements.define("zoo-modal", Modal);

/* zoo-modules/footer-module/Footer.svelte generated by Svelte v3.23.2 */

function create_if_block$9(ctx) {
	let div;
	let t0;
	let t1;
	let t2;
	let t3;

	return {
		c() {
			div = element("div");
			t0 = text("© ");
			t1 = text(/*copyright*/ ctx[0]);
			t2 = space();
			t3 = text(/*currentYear*/ ctx[1]);
			attr(div, "class", "footer-copyright");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t0);
			append(div, t1);
			append(div, t2);
			append(div, t3);
		},
		p(ctx, dirty) {
			if (dirty & /*copyright*/ 1) set_data(t1, /*copyright*/ ctx[0]);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function create_fragment$g(ctx) {
	let footer;
	let nav;
	let t;
	let if_block = /*copyright*/ ctx[0] && create_if_block$9(ctx);

	return {
		c() {
			footer = element("footer");
			nav = element("nav");
			nav.innerHTML = `<slot></slot>`;
			t = space();
			if (if_block) if_block.c();
			this.c = noop;
		},
		m(target, anchor) {
			insert(target, footer, anchor);
			append(footer, nav);
			append(footer, t);
			if (if_block) if_block.m(footer, null);
		},
		p(ctx, [dirty]) {
			if (/*copyright*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$9(ctx);
					if_block.c();
					if_block.m(footer, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(footer);
			if (if_block) if_block.d();
		}
	};
}

function instance$f($$self, $$props, $$invalidate) {
	let { copyright = "" } = $$props;
	let currentYear = new Date().getFullYear();

	$$self.$set = $$props => {
		if ("copyright" in $$props) $$invalidate(0, copyright = $$props.copyright);
	};

	return [copyright, currentYear];
}

class Footer extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:style}nav{display:flex;background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));justify-content:center;padding:10px 30px;flex-wrap:wrap}.footer-copyright{font-size:12px;line-height:14px;text-align:left;background:#FFFFFF;color:#555555;padding:10px 0 10px 30px}@media only screen and (max-width: 544px){.footer-copyright{text-align:center;padding:10px 0}}</style>`;
		init(this, { target: this.shadowRoot }, instance$f, create_fragment$g, safe_not_equal, { copyright: 0 });

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

/* zoo-modules/feedback-module/Feedback.svelte generated by Svelte v3.23.2 */

function create_fragment$h(ctx) {
	let div;

	return {
		c() {
			div = element("div");

			div.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24"><path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"></path></svg> 
	<slot></slot>`;

			this.c = noop;
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

class Feedback extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:flex;box-sizing:border-box;font-size:14px;line-height:20px;border-left:3px solid;width:100%;height:100%;padding:5px 0;background:var(--info-ultralight, #ECF5FA);border-color:var(--info-mid, #459FD0)}div{width:100%;height:100%;display:flex;align-items:center}svg{min-width:30px;min-height:30px;padding:0 10px 0 15px;fill:var(--info-mid, #459FD0)}::slotted(*){display:flex;align-items:center;height:100%;overflow:auto;box-sizing:border-box;padding:5px 5px 5px 0}:host([type="error"]){background:var(--warning-ultralight, #FDE8E9);border-color:var(--warning-mid, #ED1C24)}:host([type="error"]) svg{fill:var(--warning-mid, #ED1C24)}:host([type="success"]){background:var(--primary-ultralight, #EBF4E5);border-color:var(--primary-mid, #3C9700)}:host([type="success"]) svg{fill:var(--primary-mid, #3C9700)}</style>`;
		init(this, { target: this.shadowRoot }, null, create_fragment$h, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-feedback", Feedback);

/* zoo-modules/tooltip-module/Tooltip.svelte generated by Svelte v3.23.2 */

function create_fragment$i(ctx) {
	let div2;
	let div0;
	let slot;
	let span;
	let t0;
	let t1;
	let div1;
	let div1_class_value;
	let div2_class_value;

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			slot = element("slot");
			span = element("span");
			t0 = text(/*text*/ ctx[0]);
			t1 = space();
			div1 = element("div");
			this.c = noop;
			attr(span, "class", "text");
			attr(div0, "class", "tooltip-content");
			attr(div1, "class", div1_class_value = "tip " + /*position*/ ctx[1]);
			attr(div2, "class", div2_class_value = "box " + /*position*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div0, slot);
			append(slot, span);
			append(span, t0);
			append(div2, t1);
			append(div2, div1);
		},
		p(ctx, [dirty]) {
			if (dirty & /*text*/ 1) set_data(t0, /*text*/ ctx[0]);

			if (dirty & /*position*/ 2 && div1_class_value !== (div1_class_value = "tip " + /*position*/ ctx[1])) {
				attr(div1, "class", div1_class_value);
			}

			if (dirty & /*position*/ 2 && div2_class_value !== (div2_class_value = "box " + /*position*/ ctx[1])) {
				attr(div2, "class", div2_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
		}
	};
}

function instance$g($$self, $$props, $$invalidate) {
	let { text = "" } = $$props;
	let { position = "top" } = $$props; // left, right, bottom

	$$self.$set = $$props => {
		if ("text" in $$props) $$invalidate(0, text = $$props.text);
		if ("position" in $$props) $$invalidate(1, position = $$props.position);
	};

	return [text, position];
}

class Tooltip extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:flex;position:absolute;width:100%;height:100%;z-index:9997;left:0;bottom:0;pointer-events:none;contain:layout;justify-content:center}.box{pointer-events:initial;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1);border-radius:5px;position:absolute;transform:translate(0%, -50%)}.box.top{bottom:calc(100% + 11px);right:50%;transform:translate3d(50%, 0, 0)}.box.right{left:calc(100% + 10px);top:50%}.box.bottom{top:100%;right:50%;transform:translate3d(50%, 20%, 0)}.box.left{right:calc(100% + 11px);top:50%}.tooltip-content{padding:10px;font-size:12px;line-height:14px;font-weight:initial;position:relative;z-index:1;background:white;border-radius:5px}.tooltip-content .text{white-space:pre;color:black}.tip{position:absolute}.tip:after{content:"";width:16px;height:16px;position:absolute;box-shadow:0 4px 15px 0 rgba(0, 0, 0, 0.1);top:-8px;transform:rotate(45deg);z-index:0;background:white}.tip.top,.tip.bottom{right:calc(50% + 8px)}.tip.right{bottom:50%;left:-8px}.tip.bottom{top:0}.tip.left{bottom:50%;right:8px}</style>`;
		init(this, { target: this.shadowRoot }, instance$g, create_fragment$i, safe_not_equal, { text: 0, position: 1 });

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

/* zoo-modules/link-module/Link.svelte generated by Svelte v3.23.2 */

function create_fragment$j(ctx) {
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
	let mounted;
	let dispose;

	return {
		c() {
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
			attr(slot0, "name", "pre");
			attr(div0, "class", "bottom-line");
			set_style(a, "text-align", /*textalign*/ ctx[5]);
			attr(a, "href", /*href*/ ctx[0]);
			attr(a, "target", /*target*/ ctx[2]);
			attr(a, "class", a_class_value = "" + (/*type*/ ctx[3] + " " + /*size*/ ctx[6]));
			toggle_class(a, "disabled", /*disabled*/ ctx[4]);
			attr(slot1, "name", "post");
			attr(div1, "class", "box");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, slot0);
			append(div1, t0);
			append(div1, a);
			append(a, span);
			append(span, t1);
			append(a, t2);
			append(a, div0);
			append(div1, t3);
			append(div1, slot1);

			if (!mounted) {
				dispose = listen(a, "click", /*click_handler*/ ctx[8]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*text*/ 2) set_data(t1, /*text*/ ctx[1]);

			if (dirty & /*textalign*/ 32) {
				set_style(a, "text-align", /*textalign*/ ctx[5]);
			}

			if (dirty & /*href*/ 1) {
				attr(a, "href", /*href*/ ctx[0]);
			}

			if (dirty & /*target*/ 4) {
				attr(a, "target", /*target*/ ctx[2]);
			}

			if (dirty & /*type, size*/ 72 && a_class_value !== (a_class_value = "" + (/*type*/ ctx[3] + " " + /*size*/ ctx[6]))) {
				attr(a, "class", a_class_value);
			}

			if (dirty & /*type, size, disabled*/ 88) {
				toggle_class(a, "disabled", /*disabled*/ ctx[4]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			mounted = false;
			dispose();
		}
	};
}

function instance$h($$self, $$props, $$invalidate) {
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
		this.shadowRoot.innerHTML = `<style>:host{contain:layout;display:flex}.box{width:100%;height:100%;display:flex;justify-content:center;align-items:center;position:relative;padding:0 5px}a{text-decoration:none;font-size:12px;line-height:14px;padding:0 2px;color:#FFFFFF}a:hover,a:focus,a:active{color:#FFFFFF;cursor:pointer}.negative:hover .bottom-line{width:100%}.bottom-line{position:absolute;bottom:-3px;left:0;overflow:hidden;width:0;border-bottom:1px solid #FFFFFF;color:#FFFFFF}.disabled{color:#767676 !important}.disabled:hover,.disabled:focus{cursor:not-allowed}.primary{color:var(--primary-mid, #3C9700)}.primary:visited{color:var(--primary-light, #66B100)}.primary:hover,.primary:focus,.primary:active{color:var(--primary-dark, #286400)}.grey{color:#767676}.grey:hover,.grey:focus,.grey:active{color:var(--primary-dark, #286400)}.warning{color:#ED1C24}.warning:hover,.warning:focus,.warning:active{color:var(--warning-dark, #BD161C)}.large{font-size:18px;line-height:22px;font-weight:bold}.bold{font-weight:bold}.bold:active{background:#E6E6E6;border-radius:5px}</style>`;

		init(this, { target: this.shadowRoot }, instance$h, create_fragment$j, safe_not_equal, {
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
				insert(options.target, this, options.anchor);
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

/* zoo-modules/navigation-module/Navigation.svelte generated by Svelte v3.23.2 */

function create_fragment$k(ctx) {
	let nav;

	return {
		c() {
			nav = element("nav");
			nav.innerHTML = `<slot></slot>`;
			this.c = noop;
		},
		m(target, anchor) {
			insert(target, nav, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(nav);
		}
	};
}

class Navigation extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:layout}nav{width:100%;height:56px;background-image:linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100));background-image:-webkit-linear-gradient(left, var(--primary-mid, #3C9700), var(--primary-light, #66B100))}::slotted(*:first-child){display:flex;flex-direction:row;height:100%;overflow:auto;overflow-y:hidden;padding:0 20px}</style>`;
		init(this, { target: this.shadowRoot }, null, create_fragment$k, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-navigation", Navigation);

/* zoo-modules/toast-module/Toast.svelte generated by Svelte v3.23.2 */

function create_fragment$l(ctx) {
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
	let mounted;
	let dispose;

	return {
		c() {
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
			attr(path0, "d", "M14.2 21c.4.1.6.6.5 1a2.8 2.8 0 01-5.4 0 .7.7 0 111.4-.5 1.3 1.3 0 002.6 0c.1-.4.5-.6 1-.5zM12 0c.4 0 .8.3.8.8v1.5c4.2.4 7.4 3.9 7.4 8.2 0 3 .3 5.1.8 6.5l.4 1v.2c.6.4.3 1.3-.4 1.3H3c-.6 0-1-.7-.6-1.2.1-.2.4-.6.6-1.5.5-1.5.7-3.6.7-6.3 0-4.3 3.3-7.8 7.6-8.2V.8c0-.5.3-.8.7-.8zm0 3.8c-3.7 0-6.7 3-6.8 6.7a24.2 24.2 0 01-1 7.5h15.5l-.2-.5c-.5-1.6-.8-3.8-.8-7 0-3.7-3-6.8-6.7-6.8z");
			attr(svg0, "width", "30");
			attr(svg0, "height", "30");
			attr(svg0, "viewBox", "0 0 24 24");
			attr(span, "class", "text");
			attr(path1, "d", "M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z");
			attr(svg1, "class", "close");
			attr(svg1, "width", "24");
			attr(svg1, "height", "24");
			attr(svg1, "viewBox", "0 0 24 24");
			attr(div, "class", div_class_value = "toast " + (/*hidden*/ ctx[3] ? "hide" : "show") + " " + /*type*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, svg0);
			append(svg0, path0);
			append(div, t0);
			append(div, span);
			append(span, t1);
			append(div, t2);
			append(div, svg1);
			append(svg1, path1);
			/*div_binding*/ ctx[8](div);

			if (!mounted) {
				dispose = listen(svg1, "click", /*click_handler*/ ctx[7]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*text*/ 2) set_data(t1, /*text*/ ctx[1]);

			if (dirty & /*hidden, type*/ 9 && div_class_value !== (div_class_value = "toast " + (/*hidden*/ ctx[3] ? "hide" : "show") + " " + /*type*/ ctx[0])) {
				attr(div, "class", div_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*div_binding*/ ctx[8](null);
			mounted = false;
			dispose();
		}
	};
}

function instance$i($$self, $$props, $$invalidate) {
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

	const click_handler = () => close();

	function div_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			toastRoot = $$value;
			$$invalidate(4, toastRoot);
		});
	}

	$$self.$set = $$props => {
		if ("type" in $$props) $$invalidate(0, type = $$props.type);
		if ("text" in $$props) $$invalidate(1, text = $$props.text);
		if ("timeout" in $$props) $$invalidate(5, timeout = $$props.timeout);
	};

	return [
		type,
		text,
		close,
		hidden,
		toastRoot,
		timeout,
		show,
		click_handler,
		div_binding
	];
}

class Toast extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:none;top:20px;right:20px;position:fixed;z-index:10001;contain:layout}.toast{max-width:330px;min-height:50px;box-shadow:0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);border-left:3px solid;display:flex;align-items:center;word-break:break-word;font-size:14px;line-height:20px;padding:15px;transition:transform 0.3s, opacity 0.4s}.info{background:var(--info-ultralight, #ECF5FA);border-color:var(--info-mid, #459FD0)}.info svg{fill:var(--info-mid, #459FD0)}.error{background:var(--warning-ultralight, #FDE8E9);border-color:var(--warning-mid, #ED1C24)}.error svg{fill:var(--warning-mid, #ED1C24)}.success{background:var(--primary-ultralight, #EBF4E5);border-color:var(--primary-mid, #3C9700)}.success svg{fill:var(--primary-mid, #3C9700)}.text{flex-grow:1}.close{cursor:pointer}svg{padding-right:10px;min-width:48px}.hide{opacity:0;transform:translate3d(100%, 0, 0)}.show{opacity:1;transform:translate3d(0, 0, 0)}</style>`;

		init(this, { target: this.shadowRoot }, instance$i, create_fragment$l, safe_not_equal, {
			type: 0,
			text: 1,
			timeout: 5,
			show: 6,
			close: 2
		});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
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

	get close() {
		return this.$$.ctx[2];
	}
}

customElements.define("zoo-toast", Toast);

/* zoo-modules/collapsable-list-module/CollapsableList.svelte generated by Svelte v3.23.2 */

function create_fragment$m(ctx) {
	let slot;

	return {
		c() {
			slot = element("slot");
			this.c = noop;
		},
		m(target, anchor) {
			insert(target, slot, anchor);
			/*slot_binding*/ ctx[1](slot);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(slot);
			/*slot_binding*/ ctx[1](null);
		}
	};
}

function instance$j($$self, $$props, $$invalidate) {
	let itemSlot;
	let prevActiveItem;

	onMount(() => {
		itemSlot.addEventListener("slotchange", () => {
			let items = itemSlot.assignedNodes();
			items = items.filter(i => i.tagName == "ZOO-COLLAPSABLE-LIST-ITEM");

			if (items[0]) {
				items[0].setAttribute("active", true);
				prevActiveItem = items[0];
			}

			for (const item of items) {
				item.addEventListener("click", () => {
					if (item.hasAttribute("active")) return;
					prevActiveItem.removeAttribute("active");
					prevActiveItem = item;
					item.setAttribute("active", true);
				});
			}
		});
	});

	function slot_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			itemSlot = $$value;
			$$invalidate(0, itemSlot);
		});
	}

	return [itemSlot, slot_binding];
}

class CollapsableList extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{display:flex;flex-direction:column}</style>`;
		init(this, { target: this.shadowRoot }, instance$j, create_fragment$m, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-collapsable-list", CollapsableList);

/* zoo-modules/collapsable-list-module/CollapsableListItem.svelte generated by Svelte v3.23.2 */

function create_fragment$n(ctx) {
	let div;
	let t1;
	let slot1;

	return {
		c() {
			div = element("div");

			div.innerHTML = `<slot name="header"></slot> 
	<svg width="24" height="24" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path></svg>`;

			t1 = space();
			slot1 = element("slot");
			this.c = noop;
			attr(div, "class", "header");
			attr(slot1, "name", "content");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			insert(target, t1, anchor);
			insert(target, slot1, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			if (detaching) detach(t1);
			if (detaching) detach(slot1);
		}
	};
}

class CollapsableListItem extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{padding:0 10px;display:flex;flex-direction:column}:host([active]){border:1px solid var(--primary-mid, #3C9700);border-radius:3px}.header{display:flex;cursor:pointer}::slotted(*[slot="header"]){display:inline-flex;color:var(--primary-mid, #3C9700);font-size:14px;line-height:20px;font-weight:bold;align-items:center;padding:20px 0}:host([active]) ::slotted(*[slot="header"]){color:var(--primary-dark, #286400)}::slotted(*[slot="content"]){display:none}:host([active]) ::slotted(*[slot="content"]){display:initial}svg{display:inline-flex;margin-left:auto;fill:var(--primary-mid, #3C9700);transition:transform 0.3s;padding:20px 0}:host([active]) svg{fill:var(--primary-dark, #286400);transform:rotateX(180deg)}</style>`;
		init(this, { target: this.shadowRoot }, null, create_fragment$n, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-collapsable-list-item", CollapsableListItem);

/* zoo-modules/spinner-module/Spinner.svelte generated by Svelte v3.23.2 */

function create_fragment$o(ctx) {
	let svg;
	let circle;

	return {
		c() {
			svg = svg_element("svg");
			circle = svg_element("circle");
			this.c = noop;
			attr(circle, "class", "path");
			attr(circle, "cx", "50");
			attr(circle, "cy", "50");
			attr(circle, "r", "20");
			attr(circle, "fill", "none");
			attr(circle, "stroke-width", "2.5");
			attr(circle, "stroke-miterlimit", "10");
			attr(svg, "class", "spinner");
			attr(svg, "viewBox", "25 25 50 50");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, circle);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

class Spinner extends SvelteElement {
	constructor(options) {
		super();
		this.shadowRoot.innerHTML = `<style>:host{contain:layout}.spinner{position:absolute;left:calc(50% - 60px);top:calc(50% - 60px);right:0;bottom:0;height:120px;width:120px;transform-origin:center center;animation:rotate 2s linear infinite;z-index:10002}.spinner .path{animation:dash 1.5s ease-in-out infinite;stroke:var(--primary-mid, #3C9700);stroke-dasharray:1, 200;stroke-dashoffset:0;stroke-linecap:round}@keyframes rotate{100%{transform:rotate(360deg)}}@keyframes dash{0%{stroke-dasharray:1, 200;stroke-dashoffset:0}50%{stroke-dasharray:89, 200;stroke-dashoffset:-35px}100%{stroke-dasharray:89, 200;stroke-dashoffset:-124px}}</style>`;
		init(this, { target: this.shadowRoot }, null, create_fragment$o, safe_not_equal, {});

		if (options) {
			if (options.target) {
				insert(options.target, this, options.anchor);
			}
		}
	}
}

customElements.define("zoo-spinner", Spinner);
//# sourceMappingURL=components.js.map
