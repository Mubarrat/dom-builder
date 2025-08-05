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
    return callable;
};
Object.setPrototypeOf(baseObservable.prototype, EventTarget.prototype);
Object.setPrototypeOf(baseObservable, EventTarget);
baseObservable.prototype.addEventListener = function (...args) { return this._eventTarget.addEventListener(...args); };
baseObservable.prototype.removeEventListener = function (...args) { return this._eventTarget.removeEventListener(...args); };
baseObservable.prototype.dispatchEvent = function (...args) { return this._eventTarget.dispatchEvent(...args); };
Object.defineProperty(baseObservable.prototype, 'type', {
    value: 'to',
    writable: false,
    configurable: false,
    enumerable: true
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
baseObservable.prototype.bindSelect = function (selector) {
    return (() => selector(this())).computed(this);
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
Object.defineProperty(baseObservable.prototype, Symbol.toStringTag, {
    value: 'baseObservable',
    writable: false,
    enumerable: false,
    configurable: false
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
    const array = [...initialValues];
    const obs = baseObservable(() => [...array]);
    Object.setPrototypeOf(obs, arrayObservable.prototype);
    return new Proxy(obs, {
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
                        const oldArray = [...array];
                        array.sort(compareFn);
                        const sortedIndices = oldArray.map(item => array.indexOf(item));
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
};
Object.setPrototypeOf(arrayObservable.prototype, baseObservable.prototype);
Object.setPrototypeOf(arrayObservable, baseObservable);
arrayObservable.prototype.bindMap = function (mapper) {
    const mapped = arrayObservable(this.map((item, i) => mapper.call(this, item, i, this)));
    const weakMapped = new WeakRef(mapped);
    const registry = new FinalizationRegistry(() => this.removeEventListener("valuechanged", updateListener));
    registry.register(mapped, weakMapped);
    const updateListener = (change) => {
        const target = weakMapped.deref();
        if (!target)
            return;
        if ("index" in change) {
            const { index, newItems, oldItems } = change;
            if ((oldItems && oldItems.length) || (newItems && newItems.length)) {
                target.splice(index, oldItems?.length ?? 0, ...(newItems?.map((item, i) => mapper.call(this, item, index + i, this)) ?? []));
            }
        }
        if ("reversed" in change)
            target.reverse();
        if ("sortFn" in change)
            target.sort(change.sortFn);
    };
    this.addEventListener("valuechanged", updateListener);
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
Object.defineProperty(arrayObservable.prototype, Symbol.toStringTag, {
    value: 'arrayObservable',
    writable: false,
    enumerable: false,
    configurable: false
});
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
Function.prototype.computed.prototype = Object.create(baseObservable.prototype);
Function.prototype.computed.prototype.constructor = Function.prototype.computed;
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
                                            baseObservable.autoBind(value, v => attr in element
                                                ? element[attr] = v
                                                : element.setAttribute(attr, typeof v === 'object' ? JSON.stringify(v) : v), () => {
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
                                        function createNode(value) {
                                            while (typeof value === 'function')
                                                value = value.call(element, element);
                                            return flattenRenderable(value).filter(node => node !== null && node !== undefined && node !== false);
                                        }
                                        arg().forEach((item, i) => {
                                            const marker = new Text();
                                            childAnchors[i] = marker;
                                            anchor.before(marker, ...createNode(item));
                                        });
                                        function update(change) {
                                            if ("index" in change) {
                                                const { index, oldItems, newItems } = change;
                                                if (oldItems?.length) {
                                                    for (let i = 0; i < oldItems.length; i++) {
                                                        const marker = childAnchors[index];
                                                        let next = marker.nextSibling;
                                                        while (next && next !== childAnchors[index + 1]) {
                                                            const toRemove = next;
                                                            next = next.nextSibling;
                                                            toRemove.remove();
                                                        }
                                                        marker.remove();
                                                        childAnchors.splice(index, 1);
                                                    }
                                                }
                                                if (newItems?.length) {
                                                    for (let i = 0; i < newItems.length; i++) {
                                                        const marker = new Text();
                                                        const refNode = childAnchors[index] || anchor;
                                                        refNode.before(marker, ...createNode(newItems[i]));
                                                        childAnchors.splice(index + i, 0, marker);
                                                    }
                                                }
                                            }
                                            else if ("reversed" in change) {
                                                const nodes = [];
                                                for (let i = 0; i < childAnchors.length; i++) {
                                                    const marker = childAnchors[i];
                                                    let cursor = marker.nextSibling;
                                                    const group = [marker];
                                                    while (cursor && (i === childAnchors.length - 1 || cursor !== childAnchors[i + 1])) {
                                                        group.push(cursor);
                                                        cursor = cursor.nextSibling;
                                                    }
                                                    nodes.push(...group);
                                                }
                                                nodes.reverse().forEach(node => anchor.before(node));
                                                childAnchors.reverse();
                                            }
                                            else if ("sortedIndices" in change) {
                                                const mapping = change.sortedIndices;
                                                const newOrder = [];
                                                for (let i = 0; i < mapping.length; i++) {
                                                    const marker = childAnchors[mapping[i]];
                                                    let cursor = marker;
                                                    const group = [];
                                                    do {
                                                        group.push(cursor);
                                                        cursor = cursor.nextSibling;
                                                    } while (cursor && mapping.includes(childAnchors.indexOf(cursor)) === false);
                                                    newOrder.push(marker);
                                                    group.forEach(n => anchor.before(n));
                                                }
                                                childAnchors.splice(0, childAnchors.length, ...newOrder);
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
                                            currentNodes = Array.from(fragment.children);
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
    obs.bindTo = Object.setPrototypeOf(Object.assign((...args) => obs(...args), { type: "to" }), obs);
    obs.bindFrom = Object.setPrototypeOf(Object.assign((...args) => obs(...args), { type: "from" }), obs);
    return obs;
};
Object.setPrototypeOf(observable.prototype, baseObservable.prototype);
Object.setPrototypeOf(observable, baseObservable);
observable.prototype.type = "two-way";
observable.prototype.optimistic = function (updater, promise) {
    const snapshot = this();
    this(updater(snapshot));
    return promise.catch(err => {
        this(snapshot);
        throw err;
    });
};
Object.defineProperty(observable.prototype, Symbol.toStringTag, {
    value: 'observable',
    writable: false,
    enumerable: false,
    configurable: false
});
//# sourceMappingURL=dom.js.map