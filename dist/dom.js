/*!
 * Dom-Builder JavaScript Library v3.0.7
 * https://github.com/Mubarrat/dom-builder/
 * 
 * Released under the MIT license
 * https://github.com/Mubarrat/dom-builder/blob/main/LICENSE
 */

Symbol.observable = Symbol('observable');

function base_observable(baseFunction) {
	const subscriptions = new Set();
	baseFunction.subscribe = fn => { subscriptions.add(fn); return () => subscriptions.delete(fn); };
    baseFunction.notify = () => subscriptions.forEach(fn => fn(baseFunction()));
	baseFunction[Symbol.observable] = "from";
	baseFunction.bindSelect = selector => (() => selector(baseFunction())).computed(baseFunction);
	baseFunction.bindMap = templateFn => baseFunction.bindSelect(collection => {
		if (collection == null || typeof collection[Symbol.iterator] !== 'function')
			throw new Error("bindMap requires an iterable (Array, Set, Generator, etc.)");
		const result = [];
		let index = 0;
		for (const item of collection)
			result.push(templateFn(item, index++));
		return result;
	});
	baseFunction.validatable = (validator = () => true) =>
		Object.setPrototypeOf(Object.assign((...args) => baseFunction(...args), {
			isValid: (() => validator(baseFunction())).computed(baseFunction)
		}), baseFunction);
	baseFunction.coercible = (coerce = x => x) => Object.setPrototypeOf((...args) => {
		if (args.length === 0) return baseFunction();
		const coerced = coerce(...args);
		if (Array.isArray(coerced)) return baseFunction(...coerced);
		return baseFunction(coerced);
	}, baseFunction);
	baseFunction.extend = fn => {
		const extended = (typeof fn === "function" ? fn.call(baseFunction, baseFunction) : fn) || baseFunction;
		if (extended !== baseFunction && Object.getPrototypeOf(extended) !== baseFunction && extended !== Object.prototype)
			Object.setPrototypeOf(extended, baseFunction);
		return extended;
	};
	return baseFunction;
}

Function.prototype.computed = function(...observables) {
    const obs = base_observable(this);
    observables.forEach(observable => observable.subscribe(obs.notify));
    return obs;
};

Object.defineProperties(Document.prototype, {
	$dom: {
		value(namespace) {
			// Proxy allows dynamic tag creation: $html.div(), $svg.circle(), etc.
			return new Proxy({}, {
				get: (_, prop) => {
					// Convert camelCase to kebab-case for tag names (e.g., myTag -> my-tag)
					const tagName = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
					return (...args) => {
						const element = this.createElementNS(namespace, tagName);
						for (const arg of flattenIterable(args)) {
							if (arg === null || arg === undefined || arg === false)
								continue;
							if (arg.constructor === Object && arg[Symbol.observable] === undefined && arg[Symbol.iterator] === undefined) {
								for (const [attr, value] of Object.entries(arg)) {
									if (attr === 'style') {
										bindObservable(value,
											v => typeof v === 'string'
												? element.setAttribute('style', v)
												: Object.entries(v).forEach(([prop, value]) =>
													bindObservable(value,
														v => element.style[prop] = v,
														() => observeElementAttr(element, 'style', () => value(element.style[prop])))),
											v => observeElementAttr(element, 'style', () => value(typeof v === 'string'
												? element.getAttribute('style') || ''
												: Object.assign({}, element.style))));
									} else if (attr === 'on' && typeof value === 'object') {
										// Attach multiple event listeners from an object
										for (const [eventName, handler] of Object.entries(value)) {
											for (const event of flattenIterable([handler])) {
												if (typeof event === 'function') {
													element.addEventListener(eventName.toLowerCase(), event);
												}
											}
										}
									} else if (attr.startsWith('on')) {
										// Attach single event listener (e.g., onclick)
										for (const event of flattenIterable([value])) {
											if (typeof event === 'function') {
												element.addEventListener(attr.slice(2).toLowerCase(), event);
											}
										}
									} else if (attr === 'data' && typeof value === 'object') {
										// Handle data-* attributes, including observable bindings
										for (const [name, data] of Object.entries(value))
											bindObservable(data,
												v => element.dataset[name] = typeof v === 'object' ? JSON.stringify(v) : v,
												v => observeElementAttr(element, `data-${name}`, () => {
													const newValue = element.dataset[name];
													try {
														data(JSON.parse(newValue));
													} catch {
														data(newValue);
													}
												})
											);
									} else if (attr.toLowerCase().startsWith('ref')) {
										// Call ref functions with the element as argument
										for (const event of flattenIterable([value])) {
											if (typeof event === 'function') {
												event.bind(element, element);
											}
										}
									} else if (attr === 'value' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
										bindObservable(value,
											v => element.value = v,
											() => element.addEventListener(element instanceof HTMLSelectElement ? 'change' : 'input', () => value(element.value))
										);
									} else if (attr === 'checked' && (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio'))) {
										bindObservable(value,
											v => element.checked = v,
											() => element.addEventListener("change", () => value(element.checked))
										);
									} else if (value !== undefined) {
										bindObservable(value,
											v => attr in element
													? element[attr] = v
													: element.setAttribute(attr, typeof v === 'object' ? JSON.stringify(v) : v),
											() => {
												let newVal = attr in element ? element[attr] : element.getAttribute(attr);
												try {
													value(JSON.parse(newVal));
												} catch {
													value(newVal);
												}
											}
										);
									}
								}
							} else if (arg?.[Symbol.observable] === "to" && typeof arg === "function") {
								// Observable content: replace children when observable changes
								const anchor = new Text();
								element.append(anchor);
								let currentNodes = [];
								function update() {
									for (const node of currentNodes) node.remove();
									let projected = arg();
									while (typeof projected === "function") projected = projected();
									const fragment = new DocumentFragment();
									fragment.append(...flattenRenderable(projected).filter(node => node !== null && node !== undefined && node !== false));
									currentNodes = Array.from(fragment.children);
									anchor.after(fragment);
								};
								update();
								arg.subscribe(update);
							} else {
								// Append static or computed children (including arrays, functions, nodes, or primitives)
								element.append(...flattenRenderable(arg).filter(node => node !== null && node !== undefined && node !== false));
							}
						}
						return element;

						function shouldBeIterated(x) {
							return (
								x != null &&
								typeof x !== 'string' &&
								typeof x !== 'function' &&
								typeof x[Symbol.iterator] === 'function' &&
								!(x instanceof Node) &&
								!(x instanceof Date) &&
								!(x instanceof RegExp)
							);
						}

						function flattenIterable(iterable) {
							return shouldBeIterated(iterable) ? Array.from(iterable).flatMap(flattenIterable) : [iterable];
						}

						function flattenRenderable(renderable) {
							while (typeof renderable === 'function') renderable = renderable();
							return shouldBeIterated(renderable) ? Array.from(renderable).flatMap(flattenRenderable) : [renderable];
						}

						function bindObservable(value, set, observe) {
							const mode = value?.[Symbol.observable];
							if (!mode) { set(value); return; }
							const evaluated = value();
							set(evaluated);
							if (mode === 'to' || mode === 'two-way')
								value.subscribe(set);
							if (mode === 'from' || mode === 'two-way')
								observe?.(evaluated);
						}
					};
				}
			});
		},
		configurable: false,
		enumerable: true
	},
	$html: {
		get() { return this.$html = this.$dom("http://www.w3.org/1999/xhtml"); },
		configurable: false,
		enumerable: true
	},
	$svg: {
		get() { return this.$svg = this.$dom("http://www.w3.org/2000/svg"); },
		configurable: false,
		enumerable: true
	},
	$mml: {
		get() { return this.$mml = this.$dom("http://www.w3.org/1998/Math/MathML"); },
		configurable: false,
		enumerable: true
	}
});

const attributeObservers = new WeakMap();

new MutationObserver(mutations => mutations.forEach(mutation => attributeObservers.get(mutation.target)?.get(mutation.attributeName)?.forEach(callback => callback()))).observe(document, { attributes: true, subtree: true });

function observeElementAttr(element, attribute, callback) {
    let handlers = attributeObservers.get(element);
    if (!handlers) attributeObservers.set(element, handlers = new Map());
    let callbacks = handlers.get(attribute);
    if (!callbacks) handlers.set(attribute, callbacks = new Set());
    callbacks.add(callback);
}


function observable(initialValue = null) {
	let value = initialValue;
	const obs = base_observable(function (newVal) {
		if (arguments.length !== 0 && value !== newVal) {
			value = newVal;
			obs.notify();
		}
		return value;
	});
	obs[Symbol.observable] = "two-way";
	obs.bindTo = Object.assign((...args) => obs(...args), { [Symbol.observable]: "to" });
	obs.bindFrom = Object.assign((...args) => obs(...args), { [Symbol.observable]: "from" });
	Object.setPrototypeOf(obs.bindTo, obs);
	Object.setPrototypeOf(obs.bindFrom, obs);
	return obs;
}

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
