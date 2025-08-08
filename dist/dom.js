/*!
 * Dom-Builder JavaScript Library v4.0.0
 * https://github.com/Mubarrat/dom-builder/
 * 
 * Released under the MIT license
 * https://github.com/Mubarrat/dom-builder/blob/main/LICENSE
 */
/// <reference path="./dom.d.ts" />
"use strict";
class ValueChangeEvent extends Event {
    constructor(type, change, options) {
        super(type, options);
        if (change) {
            Object.assign(this, change);
        }
    }
}
const baseObservable = function (baseFunction) {
    const callable = ((...args) => baseFunction(...args));
    Object.setPrototypeOf(callable, baseObservable.prototype);
    callable._eventTarget = new EventTarget();
    callable.bind = Object.create(baseObservable.prototype.bind);
    callable.bind.__observable__ = callable;
    return callable;
};
Object.setPrototypeOf(baseObservable.prototype, EventTarget.prototype);
Object.setPrototypeOf(baseObservable, EventTarget);
baseObservable.prototype.addEventListener = function (...args) { return this._eventTarget.addEventListener(...args); };
baseObservable.prototype.removeEventListener = function (...args) { return this._eventTarget.removeEventListener(...args); };
baseObservable.prototype.dispatchEvent = function (...args) { return this._eventTarget.dispatchEvent(...args); };
Object.defineProperties(baseObservable.prototype, {
    type: {
        value: 'to',
        writable: false,
        configurable: false,
        enumerable: true
    },
    [Symbol.toStringTag]: {
        value: 'baseObservable',
        writable: false,
        configurable: false,
        enumerable: false
    }
});
baseObservable.prototype.notifyBefore = function (change) {
    return this.dispatchEvent(new ValueChangeEvent("valuechanging", change, { cancelable: true }));
};
baseObservable.prototype.notify = function (change) {
    this.dispatchEvent(new ValueChangeEvent("valuechanged", change));
};
baseObservable.prototype.tryChange = function (fn, change) {
    if (!this.notifyBefore(change))
        return undefined;
    const result = fn();
    this.notify(change);
    return result;
};
baseObservable.prototype.validatable = function (validator = () => true) {
    return Object.setPrototypeOf(Object.assign((...args) => this(...args), {
        isValid: (() => validator(this())).computed(this),
    }), this);
};
baseObservable.prototype.coercible = function (coerce = (x) => x) {
    return Object.setPrototypeOf((...args) => {
        if (args.length === 0)
            return this();
        const coerced = coerce(...args);
        if (Array.isArray(coerced))
            return this(...coerced);
        return this(coerced);
    }, this);
};
baseObservable.prototype.bind = new Proxy({
    __observable__: baseObservable.prototype,
    select(selector) {
        return (() => selector(this.__observable__())).computed(this.__observable__);
    },
}, {
    get(target, p, receiver) {
        if (p in target)
            return Reflect.get(target, p, receiver);
        const value = target.__observable__();
        if (!(p in value))
            return undefined;
        if (typeof value[p] === 'function')
            return (...args) => target.select((x) => x[p](...args));
        return target.select((x) => x[p]);
    }
});
baseObservable.autoBind = (observable, set, observe) => {
    if (!(observable instanceof baseObservable)) {
        set(observable);
        return () => { };
    }
    set(observable());
    const listener = () => set(observable());
    if (observable.type === "to" || observable.type === "two-way") {
        observable.addEventListener("valuechanged", listener);
    }
    if (observable.type === "from" || observable.type === "two-way") {
        observe?.(observable());
    }
    return () => {
        if (observable.type === "to" || observable.type === "two-way") {
            observable.removeEventListener("valuechanged", listener);
        }
    };
};
const arrayObservable = function (initialValues) {
    const array = typeof initialValues === 'number' ? new Array(initialValues).fill(undefined) : Array.from(initialValues);
    const obs = baseObservable(() => [...array]);
    Object.setPrototypeOf(obs, arrayObservable.prototype);
    const proxy = new Proxy(obs, {
        get(target, prop, receiver) {
            switch (prop) {
                case "push":
                    return (...items) => target.tryChange(() => array.push(...items), { index: array.length, newItems: items }) ?? array.length;
                case "pop":
                    return () => {
                        if (array.length === 0)
                            return undefined;
                        return target.tryChange(() => array.pop(), { index: array.length - 1, oldItems: [array[array.length - 1]] });
                    };
                case "shift":
                    return () => {
                        if (array.length === 0)
                            return undefined;
                        return target.tryChange(() => array.shift(), { index: 0, oldItems: [array[0]] });
                    };
                case "unshift":
                    return (...items) => target.tryChange(() => array.unshift(...items), { index: 0, newItems: items }) ?? array.length;
                case "splice":
                    return (start, deleteCount, ...items) => {
                        if (start < 0)
                            start = array.length + start;
                        if (deleteCount === undefined)
                            deleteCount = array.length - start;
                        return target.tryChange(() => array.splice(start, deleteCount, ...items), {
                            index: start,
                            newItems: items.length ? items : undefined,
                            oldItems: array.slice(start, start + deleteCount)
                        }) ?? [];
                    };
                case "reverse":
                    return () => {
                        target.tryChange(() => array.reverse(), { reversed: true });
                        return receiver;
                    };
                case "sort":
                    return (compareFn) => {
                        if (!target.notifyBefore({ sortFn: compareFn || null }))
                            return receiver;
                        const indexed = array.map((v, i) => ({ v, i }));
                        indexed.sort((a, b) => (compareFn ? compareFn(a.v, b.v) : (a.v > b.v ? 1 : a.v < b.v ? -1 : 0)));
                        for (let i = 0; i < array.length; i++) {
                            array[i] = indexed[i].v;
                        }
                        const sortedIndices = indexed.map(pair => pair.i);
                        target.notify({ sortedIndices });
                        return receiver;
                    };
                case "fill":
                    return (value, start, end) => {
                        if (start == null)
                            start = 0;
                        if (end == null)
                            end = array.length;
                        target.tryChange(() => array.fill(value, start, end), {
                            index: start,
                            newItems: Array(end - start).fill(value),
                            oldItems: array.slice(start, end)
                        });
                        return receiver;
                    };
                case "copyWithin":
                    return (targetIndex, start, end) => {
                        if (start == null)
                            start = 0;
                        if (end == null)
                            end = array.length;
                        target.tryChange(() => array.copyWithin(targetIndex, start, end), {
                            index: targetIndex,
                            newItems: array.slice(start, end),
                            oldItems: array.slice(targetIndex, targetIndex + (end - start))
                        });
                        return receiver;
                    };
                default:
                    return Reflect.get(array, prop, receiver) ?? Reflect.get(target, prop, receiver);
            }
        },
        set(target, prop, value, receiver) {
            if (typeof prop === "string") {
                const n = Number(prop);
                if (Number.isInteger(n) && n >= 0 && String(n) === prop && !Object.is(array[n], value))
                    return target.tryChange(() => {
                        array[n] = value;
                        return true;
                    }, { index: n, newItems: [value], oldItems: [array[n]] }) ?? false;
            }
            if (prop === "length") {
                const oldLength = array.length;
                const newLength = Number(value);
                return target.tryChange(() => {
                    array.length = newLength;
                    return true;
                }, (newLength < oldLength
                    ? { index: newLength, oldItems: array.slice(newLength) }
                    : { index: oldLength, newItems: Array(newLength - oldLength) })) ?? false;
            }
            return Reflect.set(target, prop, value, receiver);
        },
        has(target, prop) {
            if (prop === "length")
                return true;
            if (typeof prop === "string") {
                const n = Number(prop);
                if (Number.isInteger(n) && n >= 0 && String(n) === prop)
                    return n < array.length;
            }
            return prop in target;
        },
        deleteProperty(target, prop) {
            if (typeof prop === "string") {
                const n = Number(prop);
                if (Number.isInteger(n) && n >= 0 && String(n) === prop) {
                    return target.tryChange(() => {
                        array[n] = undefined;
                        return true;
                    }, { index: n, oldItems: [array[n]], newItems: [undefined] }) ?? false;
                }
            }
            return Reflect.deleteProperty(target, prop);
        },
        ownKeys: target => Array.from({ length: array.length }, (_, i) => i.toString()).concat(Object.getOwnPropertyNames(target)),
        getOwnPropertyDescriptor(target, prop) {
            if (typeof prop === "string") {
                const n = Number(prop);
                if (Number.isInteger(n) && n >= 0 && String(n) === prop) {
                    return {
                        configurable: true,
                        enumerable: true,
                        value: array[n],
                        writable: true,
                    };
                }
            }
            if (prop === "length") {
                return {
                    configurable: true,
                    enumerable: false,
                    value: array.length,
                    writable: true,
                };
            }
            return Object.getOwnPropertyDescriptor(target, prop);
        },
    });
    obs.bind = Object.create(arrayObservable.prototype.bind);
    obs.bind.__observable__ = proxy;
    return proxy;
};
Object.setPrototypeOf(arrayObservable.prototype, baseObservable.prototype);
Object.setPrototypeOf(arrayObservable, baseObservable);
Object.defineProperties(arrayObservable.prototype, {
    [Symbol.species]: {
        get() { return arrayObservable; },
        enumerable: false,
        configurable: false
    },
    [Symbol.toStringTag]: {
        value: 'arrayObservable',
        writable: false,
        enumerable: false,
        configurable: false
    }
});
arrayObservable.prototype.optimistic = function (updater, promise) {
    const changes = [];
    const capture = (e) => changes.push(e);
    this.addEventListener("valuechanged", capture);
    updater(this);
    this.removeEventListener("valuechanged", capture);
    return promise.catch(err => {
        for (let i = changes.length - 1; i >= 0; i--) {
            const change = changes[i];
            if ("index" in change) {
                this.splice(change.index, change.newItems?.length ?? 0, ...(change.oldItems ?? []));
            }
            else if ("reversed" in change) {
                this.reverse();
            }
            else if ("sortedIndices" in change) {
                const inverse = new Array(change.sortedIndices.length);
                for (let oldIndex = 0; oldIndex < change.sortedIndices.length; oldIndex++)
                    inverse[change.sortedIndices[oldIndex]] = oldIndex;
                const lookup = new Map();
                this.forEach((item, i) => lookup.set(item, inverse[i]));
                this.sort((a, b) => lookup.get(a) - lookup.get(b));
            }
        }
        throw err;
    });
};
arrayObservable.prototype.bind = Object.create(baseObservable.prototype.bind);
arrayObservable.prototype.bind.__observable__ = arrayObservable.prototype;
arrayObservable.prototype.bind.map = function (mapper) {
    const mapped = arrayObservable(this.__observable__.map((item, i) => mapper.call(this.__observable__, item, i, this.__observable__)));
    const weakMapped = new WeakRef(mapped);
    const registry = new FinalizationRegistry(() => this.__observable__.removeEventListener("valuechanged", updateListener));
    registry.register(mapped, weakMapped);
    const updateListener = (change) => {
        const target = weakMapped.deref();
        if (!target)
            return;
        if ("index" in change) {
            const { index, newItems, oldItems } = change;
            if ((oldItems && oldItems.length) || (newItems && newItems.length)) {
                target.splice(index, oldItems?.length ?? 0, ...(newItems?.map((item, i) => mapper.call(this.__observable__, item, index + i, this.__observable__)) ?? []));
            }
        }
        if ("reversed" in change)
            target.reverse();
        if ("sortFn" in change)
            target.sort(change.sortFn);
    };
    this.__observable__.addEventListener("valuechanged", updateListener);
    return new Proxy(mapped, {
        get(target, prop, receiver) {
            if (["push", "pop", "shift", "unshift", "splice", "reverse", "sort", "fill", "copyWithin"].includes(String(prop))) {
                return () => {
                    throw new Error("Cannot modify a read-only mapped observable");
                };
            }
            return Reflect.get(target, prop, receiver);
        },
        set(target, prop, value, receiver) {
            if (typeof prop === "string") {
                const n = Number(prop);
                if (Number.isInteger(n) && n >= 0 && String(n) === prop)
                    throw new Error("Cannot modify any item of a read-only mapped observable");
            }
            if (prop === "length")
                throw new Error("Cannot modify length of a read-only mapped observable");
            return Reflect.set(target, prop, value, receiver);
        }
    });
};
{
    const computedRegistry = new FinalizationRegistry(({ observers, listener }) => observers.forEach(obs => obs.removeEventListener("valuechanged", listener)));
    Function.prototype.computed = function (...observables) {
        const obs = baseObservable(this);
        const weakObs = new WeakRef(obs);
        const token = {};
        const notifyListener = () => {
            const strongObs = weakObs.deref();
            if (strongObs) {
                strongObs.notify();
            }
            else {
                observables.forEach(o => o.removeEventListener("valuechanged", notifyListener));
                computedRegistry.unregister(token);
            }
        };
        observables.forEach(o => {
            if (o instanceof baseObservable) {
                o.addEventListener("valuechanged", notifyListener);
            }
        });
        computedRegistry.register(obs, { observers: observables, listener: notifyListener }, token);
        Object.setPrototypeOf(obs, Function.prototype.computed.prototype);
        return obs;
    };
}
Object.setPrototypeOf(Function.prototype.computed.prototype, baseObservable.prototype);
Object.setPrototypeOf(Function.prototype.computed, baseObservable);
Object.defineProperty(Function.prototype.computed.prototype, Symbol.toStringTag, {
    value: 'computed',
    writable: false,
    enumerable: false,
    configurable: false
});
function cstr(strings, ...values) {
    const observables = values.filter(v => v instanceof baseObservable);
    if (observables.length === 0) {
        return strings.reduce((acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ""), "");
    }
    return (() => {
        let result = strings[0];
        for (let i = 0; i < values.length; i++) {
            const val = values[i];
            result += String(val instanceof baseObservable ? val() : val);
            result += strings[i + 1];
        }
        return result;
    }).computed(...observables);
}
{
    const attributeObservers = new WeakMap();
    new MutationObserver(mutations => mutations.forEach(mutation => attributeObservers
        .get(mutation.target)
        ?.get(mutation.attributeName)
        ?.forEach(callback => callback()))).observe(document, { attributes: true, subtree: true });
    var observeElementAttr = (element, attribute, callback) => {
        let handlers = attributeObservers.get(element);
        if (!handlers)
            attributeObservers.set(element, handlers = new Map());
        let callbacks = handlers.get(attribute);
        if (!callbacks)
            handlers.set(attribute, callbacks = new Set());
        callbacks.add(callback);
    };
}
Object.defineProperties(Document.prototype, {
    $dom: {
        get() {
            return (namespace) => {
                return new Proxy({}, {
                    get: (_, prop) => {
                        if (typeof prop !== "string")
                            return undefined;
                        if (prop === "toString")
                            return () => `DOM Proxy for namespace: ${namespace}`;
                        const tagName = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
                        return (...args) => {
                            const element = this.createElementNS(namespace, tagName);
                            for (const arg of flattenIterable(args)) {
                                if (arg === null || arg === undefined || arg === false)
                                    continue;
                                if (arg.constructor === Object && arg[Symbol.iterator] === undefined && Symbol.asyncIterator && arg[Symbol.asyncIterator] === undefined) {
                                    for (const [attr, value] of Object.entries(arg)) {
                                        if (attr === 'style' && element instanceof HTMLElement) {
                                            baseObservable.autoBind(value, v => typeof v === 'string'
                                                ? element.setAttribute('style', v)
                                                : Object.entries(v).forEach(([prop, value]) => baseObservable.autoBind(value, v => element.style[prop] = v, () => observeElementAttr(element, 'style', () => value(element.style[prop])))), v => observeElementAttr(element, 'style', () => value(typeof v === 'string'
                                                ? element.getAttribute('style') || ''
                                                : Object.assign({}, element.style))));
                                        }
                                        else if (attr === 'on' && typeof value === 'object' && value) {
                                            for (const [eventName, handler] of Object.entries(value)) {
                                                for (const event of flattenIterable([handler])) {
                                                    if (typeof event === 'function') {
                                                        element.addEventListener(eventName.toLowerCase(), event);
                                                    }
                                                }
                                            }
                                        }
                                        else if (attr.startsWith('on')) {
                                            for (const event of flattenIterable([value])) {
                                                if (typeof event === 'function') {
                                                    element.addEventListener(attr.slice(2).toLowerCase(), event);
                                                }
                                            }
                                        }
                                        else if (attr === 'data' && typeof value === 'object' && (element instanceof HTMLElement || element instanceof SVGElement || element instanceof MathMLElement)) {
                                            for (const [name, data] of Object.entries(value))
                                                baseObservable.autoBind(data, v => element.dataset[name] = typeof v === 'object' ? JSON.stringify(v) : v, v => observeElementAttr(element, `data-${name.replace(/([A-Z])/g, "-$1").toLowerCase()}`, () => {
                                                    const newValue = element.dataset[name];
                                                    try {
                                                        data(JSON.parse(newValue));
                                                    }
                                                    catch {
                                                        data(newValue);
                                                    }
                                                }));
                                        }
                                        else if (attr === 'value' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
                                            baseObservable.autoBind(value, v => element.value = v, () => element.addEventListener(element instanceof HTMLSelectElement ? 'change' : 'input', () => value(element.value)));
                                        }
                                        else if (attr === 'checked' && (element instanceof HTMLInputElement && (arg.type === 'checkbox' || arg.type === 'radio'))) {
                                            baseObservable.autoBind(value, v => element.checked = v, () => element.addEventListener("change", () => value(element.checked)));
                                        }
                                        else if (value !== undefined) {
                                            baseObservable.autoBind(value, v => {
                                                if (attr in element) {
                                                    try {
                                                        element[attr] = v;
                                                        return;
                                                    }
                                                    catch { }
                                                }
                                                element.setAttribute(attr, typeof v === 'object' ? JSON.stringify(v) : v);
                                            }, () => {
                                                let newVal = attr in element ? element[attr] : element.getAttribute(attr);
                                                try {
                                                    value(JSON.parse(newVal));
                                                }
                                                catch {
                                                    value(newVal);
                                                }
                                            });
                                        }
                                    }
                                }
                                else if (arg instanceof baseObservable) {
                                    if (arg instanceof arrayObservable) {
                                        const anchor = new Text();
                                        element.append(anchor);
                                        const childAnchors = [];
                                        const createNode = (value) => {
                                            while (typeof value === 'function')
                                                value = value.call(element, element);
                                            return flattenRenderable(value).filter(n => n != null && n !== false);
                                        };
                                        arg().forEach((item, i) => {
                                            const marker = new Text();
                                            childAnchors.push(marker);
                                            anchor.before(marker, ...createNode(item));
                                        });
                                        const snapshotGroups = () => childAnchors.map((marker, i) => {
                                            const end = childAnchors[i + 1] || anchor;
                                            const nodes = [];
                                            for (let n = marker; n && n !== end; n = n.nextSibling)
                                                nodes.push(n);
                                            return nodes;
                                        });
                                        const reorder = (mapping) => {
                                            const groups = snapshotGroups();
                                            for (let idx of mapping)
                                                for (let node of groups[idx])
                                                    anchor.before(node);
                                            childAnchors.splice(0, childAnchors.length, ...mapping.map(i => childAnchors[i]));
                                        };
                                        function update(change) {
                                            if ("index" in change) {
                                                const { index, oldItems, newItems } = change;
                                                if (oldItems?.length) {
                                                    const startMarker = childAnchors[index];
                                                    const endMarker = childAnchors[index + oldItems.length] || anchor;
                                                    let node = startMarker;
                                                    while (node && node !== endMarker) {
                                                        const next = node.nextSibling;
                                                        node.remove();
                                                        node = next;
                                                    }
                                                    childAnchors.splice(index, oldItems.length);
                                                }
                                                if (newItems?.length) {
                                                    const markers = [];
                                                    const nodes = [];
                                                    for (let item of newItems) {
                                                        const marker = new Text();
                                                        markers.push(marker);
                                                        nodes.push(marker, ...createNode(item));
                                                    }
                                                    (childAnchors[index] || anchor).before(...nodes);
                                                    childAnchors.splice(index, 0, ...markers);
                                                }
                                            }
                                            else if ("reversed" in change) {
                                                reorder([...childAnchors.keys()].reverse());
                                            }
                                            else if ("sortedIndices" in change) {
                                                reorder(change.sortedIndices);
                                            }
                                        }
                                        arg.addEventListener("valuechanged", (e) => update(e));
                                    }
                                    else {
                                        const anchor = new Text();
                                        element.append(anchor);
                                        let currentNodes = [];
                                        function update() {
                                            for (const node of currentNodes)
                                                node.remove();
                                            let projected = arg();
                                            while (typeof projected === 'function')
                                                projected = projected.call(element, element);
                                            const fragment = new DocumentFragment();
                                            fragment.append(...flattenRenderable(projected).filter(node => node !== null && node !== undefined && node !== false));
                                            currentNodes = Array.from(fragment.childNodes);
                                            anchor.after(fragment);
                                        }
                                        ;
                                        update();
                                        arg.addEventListener('valuechanged', update);
                                    }
                                }
                                else if (Symbol.asyncIterator) {
                                    (function render(arg, givenAnchor) {
                                        for (const item of flattenRenderable(arg).filter(n => n != null && n !== false && n !== undefined)) {
                                            if (typeof item[Symbol.asyncIterator] === 'function') {
                                                const anchor = new Text();
                                                if (givenAnchor) {
                                                    givenAnchor.before(anchor);
                                                }
                                                else {
                                                    element.append(anchor);
                                                }
                                                (async () => { for await (const chunk of item)
                                                    render(chunk, anchor); })();
                                            }
                                            else if (givenAnchor) {
                                                givenAnchor.before(item);
                                            }
                                            else {
                                                element.append(item);
                                            }
                                        }
                                    })(arg);
                                }
                                else {
                                    element.append(...flattenRenderable(arg).filter(n => n != null && n !== false));
                                }
                            }
                            return element;
                            function shouldBeIterated(x) {
                                return (x != null &&
                                    typeof x !== 'string' &&
                                    typeof x !== 'function' &&
                                    typeof x[Symbol.iterator] === 'function' &&
                                    !(x instanceof Node) &&
                                    !(x instanceof Date) &&
                                    !(x instanceof RegExp));
                            }
                            function flattenIterable(iterable) {
                                return shouldBeIterated(iterable) ? Array.from(iterable).flatMap(flattenIterable) : [iterable];
                            }
                            function flattenRenderable(renderable) {
                                while (typeof renderable === 'function')
                                    renderable = renderable.call(element, element);
                                return shouldBeIterated(renderable) ? Array.from(renderable).flatMap(flattenRenderable) : [renderable];
                            }
                        };
                    }
                });
            };
        },
        configurable: false,
        enumerable: true
    },
    $html: {
        get() { return this.$dom("http://www.w3.org/1999/xhtml"); },
        configurable: false,
        enumerable: true
    },
    $svg: {
        get() { return this.$dom("http://www.w3.org/2000/svg"); },
        configurable: false,
        enumerable: true
    },
    $mml: {
        get() { return this.$dom("http://www.w3.org/1998/Math/MathML"); },
        configurable: false,
        enumerable: true
    }
});
Object.defineProperties(Window.prototype, {
    $dom: {
        get() { return this.document.$dom; },
        configurable: false,
        enumerable: true
    },
    $html: {
        get() { return this.document.$html; },
        configurable: false,
        enumerable: true
    },
    $svg: {
        get() { return this.document.$svg; },
        configurable: false,
        enumerable: true
    },
    $mml: {
        get() { return this.document.$mml; },
        configurable: false,
        enumerable: true
    }
});
const observable = function (initialValue) {
    let value = initialValue;
    const obs = baseObservable(function (newValue) {
        if (arguments.length !== 0 && !Object.is(value, newValue)) {
            obs.tryChange(() => value = newValue, { oldValue: value, newValue });
        }
        return value;
    });
    Object.setPrototypeOf(obs, observable.prototype);
    obs.bind = Object.create(observable.prototype.bind);
    obs.bind.__observable__ = obs;
    obs.bind.to = Object.setPrototypeOf(Object.assign((...args) => obs(...args), { type: "to" }), obs);
    obs.bind.from = Object.setPrototypeOf(Object.assign((...args) => obs(...args), { type: "from" }), obs);
    return obs;
};
Object.setPrototypeOf(observable.prototype, baseObservable.prototype);
Object.setPrototypeOf(observable, baseObservable);
Object.defineProperties(observable.prototype, {
    type: {
        value: 'two-way',
        writable: false,
        configurable: false,
        enumerable: true
    },
    value: {
        get() { return this(); },
        set(value) { return this(value); },
        configurable: false,
        enumerable: true
    },
    [Symbol.toStringTag]: {
        value: 'observable',
        writable: false,
        configurable: false,
        enumerable: false
    }
});
observable.prototype.optimistic = function (updater, promise) {
    const snapshot = this();
    this(updater(snapshot));
    return promise.catch(err => {
        this(snapshot);
        throw err;
    });
};
observable.prototype.bind = Object.create(baseObservable.prototype.bind);
observable.prototype.bind.__observable__ = observable.prototype;
//# sourceMappingURL=dom.js.map