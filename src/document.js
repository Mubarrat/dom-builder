/**
 * MIT License
 *
 * Copyright (c) 2025 Mubarrat
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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
						for (const arg of args.flat(Infinity)) {
							if (arg === null || arg === undefined || arg === false) {
								continue;
							}
							if (arg.constructor === Object) {
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
											for (const event of [handler].flat(Infinity)) {
												if (typeof event === 'function') {
													element.addEventListener(eventName.toLowerCase(), event);
												}
											}
										}
									} else if (attr.startsWith('on')) {
										// Attach single event listener (e.g., onclick)
										for (const event of [value].flat(Infinity)) {
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
										for (const event of [value].flat(Infinity)) {
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
									const stack = [projected];
									while (stack.length) {
										let current = stack.pop();
										if (current == null || current === false) continue;
										while (typeof current === "function") current = current();
										if (current && typeof current[Symbol.iterator] === 'function') {
											stack.push(...Array.from(current).reverse());
											continue;
										}
										const node = current instanceof Node ? current : this.createTextNode(String(current));
										currentNodes.push(node);
										fragment.appendChild(node);
									}
									anchor.after(fragment);
								};

								update();
								arg.target.subscribe(update);
							} else {
								// Append static or computed children (including arrays, functions, nodes, or primitives)
								const stack = [arg];
								while (stack.length) {
									let current = stack.pop();
									if (current == null || current === false) continue;
									while (typeof current === "function") current = current();
									if (current && typeof current[Symbol.iterator] === 'function') {
										stack.push(...Array.from(current).reverse());
										continue;
									}
									element.append(current instanceof Node ? current : this.createTextNode(String(current)));
								}
							}
						}
						return element;
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
