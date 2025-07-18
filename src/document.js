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
			return new Proxy({}, {
				get: (_, prop) => {
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
										switch (value?.[Symbol.observable]) {
											case "one-way":
												Object.assign(element.style, value.target());
												value.target.subscribe(newStyle => Object.assign(element.style, newStyle));
												break;
											case "to-source":
											case "two-way":
												throw new Error("Two-way style binding not supported");
											default:
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
										for (const [eventName, handler] of Object.entries(value)) {
											for (const event of [handler].flat(Infinity)) {
												if (typeof event === 'function') {
													element.addEventListener(eventName.toLowerCase(), event);
												}
											}
										}
									} else if (attr.startsWith('on')) {
										for (const event of [value].flat(Infinity)) {
											if (typeof event === 'function') {
												element.addEventListener(attr.slice(2).toLowerCase(), event);
											}
										}
									} else if (attr === 'data' && typeof value === 'object') {
										for (const name in value) {
											const data = value[name];
											const setDatasetValue = v =>
												element.dataset[name] = typeof v === 'object' ? JSON.stringify(v) : v;
											switch (data?.[Symbol.observable]) {
												case "one-way":
													setDatasetValue(data.target());
													data.target.subscribe(setDatasetValue);
													break;
												case "to-source":
													setDatasetValue(data.target());
													new MutationObserver(mutations => {
														for (const mutation of mutations) {
															if (mutation.type === 'attributes') {
																const newValue = element.dataset[name];
																try {
																	data.target(JSON.parse(newValue));
																} catch {
																	data.target(newValue);
																}
															}
														}
													}).observe(element, {
														attributes: true,
														attributeFilter: [`data-${name}`]
													});
													break;
												case "two-way":
													setDatasetValue(data.target());
													data.target.subscribe(setDatasetValue);
													new MutationObserver(mutations => {
														for (const mutation of mutations) {
															if (mutation.type === 'attributes') {
																const newValue = element.dataset[name];
																try {
																	data.target(JSON.parse(newValue));
																} catch {
																	data.target(newValue);
																}
															}
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
										for (const event of [value].flat(Infinity)) {
											if (typeof event === 'function') {
												event.bind(element, element);
											}
										}
									} else if (attr === 'value' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
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
												new MutationObserver(mutations => {
													for (const mutation of mutations) {
														let newVal;
														if (attr in element) {
															newVal = element[attr];
														} else {
															newVal = element.getAttribute(attr);
														}
														try {
															value.target(JSON.parse(newVal));
														} catch {
															value.target(newVal);
														}
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
												new MutationObserver(mutations => {
													for (const mutation of mutations) {
														let newVal;
														if (attr in element) {
															newVal = element[attr];
														} else {
															newVal = element.getAttribute(attr);
														}
														try {
															value.target(JSON.parse(newVal));
														} catch {
															value.target(newVal);
														}
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
							} else if (arg?.[Symbol.observable] === "select" && typeof arg.target === "function") {
								const anchor = this.createTextNode("");
								element.append(anchor);
								let currentNodes = [];
								const update = () => {
									for (const node of currentNodes) node.remove();
									currentNodes = [];
									let projected = arg.selector(arg.target());
									while (typeof projected === "function") projected = projected();
									const fragment = this.createDocumentFragment();
									const stack = [projected];
									while (stack.length) {
										let current = stack.pop();
										if (current == null || current === false) continue;
										while (typeof current === "function") current = current();
										if (Array.isArray(current)) {
											stack.push(...current.reverse());
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
								const stack = [arg];
								while (stack.length) {
									let current = stack.pop();
									if (current == null || current === false) continue;
									while (typeof current === "function") current = current();
									if (Array.isArray(current)) {
										stack.push(...current.reverse());
										continue;
									}
									if (current instanceof Node) {
										element.append(current);
									} else {
										element.append(this.createTextNode(String(current)));
									}
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
