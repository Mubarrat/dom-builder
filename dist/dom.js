/*!
 * Dom-Builder JavaScript Library v3.0.4
 * https://github.com/Mubarrat/dom-builder/
 * 
 * Released under the MIT license
 * https://github.com/Mubarrat/dom-builder/blob/main/LICENSE
 */

Symbol.observable = Symbol('observable');

function base_observable(baseFunction, subscriptions) {
	baseFunction.subscribe = fn => { subscriptions.add(fn); return () => subscriptions.delete(fn); };
    baseFunction.notify = () => subscriptions.forEach(fn => fn(baseFunction()));
	baseFunction.bind = () => ({
		[Symbol.observable]: "one-way",
		target: baseFunction
	});
	baseFunction.bindSelect = selector => (() => selector(baseFunction())).computed(baseFunction).bind();
	baseFunction.bindMap = templateFn => baseFunction.bindSelect(collection => {
		if (collection == null || typeof collection[Symbol.iterator] !== 'function')
			throw new Error("bindMap requires an iterable (Array, Set, Generator, etc.)");
		const result = [];
		for (const item of collection)
			result.push(templateFn(item));
		return result;
	});
	return baseFunction;
}

Function.prototype.computed = function(...observables) {
    const subscriptions = new Set(), obs = base_observable(this, subscriptions);
    observables.forEach(observable => observable.subscribe(obs.notify));
    return obs;
};

Object.defineProperties(Document.prototype, {
	$dom: {
		value(namespace) {
			// Proxy allows dynamic tag creation: doc.$html.div(), doc.$svg.circle(), etc.
			return new Proxy({}, {
				get: (_, prop) => {
					// Convert camelCase to kebab-case for tag names (e.g., myTag -> my-tag)
					const tagName = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
					return (...args) => {
						const element = this.createElementNS(namespace, tagName);
						for (const arg of flattenDeep(args)) {
							if (arg === null || arg === undefined || arg === false) {
								continue;
							}
							if (arg.constructor === Object && arg[Symbol.observable] === undefined && arg[Symbol.iterator] === undefined) {
								for (const [attr, value] of Object.entries(arg)) {
									if (attr === 'style') {
										// Handle style binding and assignment
										switch (value?.[Symbol.observable]) {
											case "one-way":
												Object.assign(element.style, value.target());
												value.target.subscribe(newStyle => Object.assign(element.style, newStyle));
												break;
											case "to-source":
											case "two-way":
												throw new Error("Two-way style binding not supported");
											default:
												// Support for plain object or observable style properties
												if (typeof value === 'object') {
													for (const [styleProp, styleValue] of Object.entries(value)) {
														if (styleValue?.[Symbol.observable] === "one-way") {
															element.style[styleProp] = styleValue.target();
															styleValue.target.subscribe(v => element.style[styleProp] = v);
														} else {
															element.style[styleProp] = styleValue;
														}
													}
												}
												break;
										}
									} else if (attr === 'on' && typeof value === 'object') {
										// Attach multiple event listeners from an object
										for (const [eventName, handler] of Object.entries(value)) {
											for (const event of flattenDeep([handler])) {
												if (typeof event === 'function') {
													element.addEventListener(eventName.toLowerCase(), event);
												}
											}
										}
									} else if (attr.startsWith('on')) {
										// Attach single event listener (e.g., onclick)
										for (const event of flattenDeep([value])) {
											if (typeof event === 'function') {
												element.addEventListener(attr.slice(2).toLowerCase(), event);
											}
										}
									} else if (attr === 'data' && typeof value === 'object') {
										// Handle data-* attributes, including observable bindings
										for (const name in value) {
											const data = value[name];
											const setDatasetValue = v => element.dataset[name] = typeof v === 'object' ? JSON.stringify(v) : v;
											switch (data?.[Symbol.observable]) {
												case "one-way":
													setDatasetValue(data.target());
													data.target.subscribe(setDatasetValue);
													break;
												case "to-source":
													setDatasetValue(data.target());
													// Listen for changes to data-* attribute and update observable
													new MutationObserver(() => {
														const newValue = element.dataset[name];
														try {
															data.target(JSON.parse(newValue));
														} catch {
															data.target(newValue);
														}
													}).observe(element, {
														attributes: true,
														attributeFilter: [`data-${name}`]
													});
													break;
												case "two-way":
													setDatasetValue(data.target());
													data.target.subscribe(setDatasetValue);
													new MutationObserver(() => {
														const newValue = element.dataset[name];
														try {
															data.target(JSON.parse(newValue));
														} catch {
															data.target(newValue);
														}
													}).observe(element, {
														attributes: true,
														attributeFilter: [`data-${name}`]
													});
													break;
												default:
													setDatasetValue(data);
													break;
											}
										}
									} else if (attr.toLowerCase().startsWith('ref')) {
										// Call ref functions with the element as argument
										for (const event of flattenDeep([value])) {
											if (typeof event === 'function') {
												event.bind(element, element);
											}
										}
									} else if (attr === 'value' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
										// Special handling for value binding on form elements
										switch (value?.[Symbol.observable]) {
											case "one-way":
												element.value = value.target();
												value.target.subscribe(val => element.value = val);
												break;
											case "to-source":
												element.value = value.target();
												element.addEventListener(element instanceof HTMLSelectElement ? "change" : "input", () => value.target(element.value));
												break;
											case "two-way":
												element.value = value.target();
												value.target.subscribe(val => element.value = val);
												element.addEventListener(element instanceof HTMLSelectElement ? "change" : "input", () => value.target(element.value));
												break;
											default:
												element.value = value;
												break;
										}
									} else if (attr === 'checked' && (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio'))) {
										// Special handling for checked binding on checkbox/radio
										switch (value?.[Symbol.observable]) {
											case "one-way":
												element.checked = value.target();
												value.target.subscribe(val => element.checked = val);
												break;
											case "to-source":
												element.checked = value.target();
												element.addEventListener("change", () => value.target(element.checked));
												break;
											case "two-way":
												element.checked = value.target();
												value.target.subscribe(val => element.checked = val);
												element.addEventListener("change", () => value.target(element.checked));
												break;
											default:
												element.checked = value;
												break;
										}
									} else if (value !== undefined) {
										// Fallback: set as property if possible, else as attribute
										const setPropOrAttr = v => {
											if (attr in element) {
												element[attr] = v;
											} else {
												element.setAttribute(attr, typeof v === 'object' ? JSON.stringify(v) : v);
											}
										};
										switch (value?.[Symbol.observable]) {
											case "one-way":
												setPropOrAttr(value.target());
												value.target.subscribe(setPropOrAttr);
												break;
											case "to-source":
												setPropOrAttr(value.target());
												// Listen for attribute/property changes and update observable
												new MutationObserver(() => {
													let newVal = attr in element ? element[attr] : element.getAttribute(attr);
													try {
														value.target(JSON.parse(newVal));
													} catch {
														value.target(newVal);
													}
												}).observe(element, {
													attributes: true,
													attributeFilter: [attr],
													attributeOldValue: true
												});
												break;
											case "two-way":
												setPropOrAttr(value.target());
												value.target.subscribe(setPropOrAttr);
												new MutationObserver(() => {
													let newVal = attr in element ? element[attr] : element.getAttribute(attr);
													try {
														value.target(JSON.parse(newVal));
													} catch {
														value.target(newVal);
													}
												}).observe(element, {
													attributes: true,
													attributeFilter: [attr],
													attributeOldValue: true
												});
												break;
											default:
												setPropOrAttr(value);
												break;
										}
									}
								}
							} else if (arg?.[Symbol.observable] === "one-way" && typeof arg.target === "function") {
								// Observable content: replace children when observable changes
								const anchor = this.createTextNode("");
								element.append(anchor);
								let currentNodes = [];
								const update = () => {
									for (const node of currentNodes) node.remove();
									currentNodes = [];
									let projected = arg.target();
									while (typeof projected === "function") projected = projected();
									const fragment = this.createDocumentFragment();
									for (const node of flattenDeepWithFunction([projected])) {
										if (node == null || node === false) continue;
										const domNode = node instanceof Node ? node : this.createTextNode(String(node));
										currentNodes.push(domNode);
										fragment.appendChild(domNode);
									}
									anchor.after(fragment);
								};
								update();
								arg.target.subscribe(update);
							} else {
								// Append static or computed children (including arrays, functions, nodes, or primitives)
								for (const node of flattenDeepWithFunction([arg])) {
									if (node == null || node === false) continue;
									element.append(node instanceof Node ? node : this.createTextNode(String(node)));
								}
							}
						}
						return element;

						function flattenDeep(iterable) {
							return Array.from(iterable).flatMap(function recursive(x) {
								return (x != null && typeof x !== 'string' && typeof x[Symbol.iterator] === 'function')
									? Array.from(x).flatMap(recursive)
									: [x];
							});
						}

						function flattenDeepWithFunction(iterable) {
							return Array.from(iterable).flatMap(function recursive(x) {
								while (typeof x === 'function') x = x();
								return (x != null && typeof x !== 'string' && typeof x[Symbol.iterator] === 'function')
									? Array.from(x).flatMap(recursive)
									: [x];
							});
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

function observable(initialValue = null) {
	let value = initialValue;
	const subscriptions = new Set(), obs = base_observable(function (newVal) {
		if (arguments.length !== 0 && value !== newVal) {
			value = newVal;
			obs.notify();
		}
		return value;
	}, subscriptions);
	obs.bindToSource = () => ({
		[Symbol.observable]: "to-source",
		target: obs
	});
	obs.bindTwoWay = () => ({
		[Symbol.observable]: "two-way",
		target: obs
	});
	return obs;
}

function validatable(validator = () => true, initialValue = null) {
	const obs = observable(initialValue);
	obs.isValid = (() => validator(obs())).computed(obs);
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
