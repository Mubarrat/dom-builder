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
									if (attr === 'class') {
										element.className = value;
									} else if (attr === 'style' && typeof value === 'object') {
										Object.assign(element.style, value);
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
											element.setAttribute(`data-${name}`, typeof data === 'object' ? JSON.stringify(data) : data);
										}
									} else if (attr.toLowerCase().startsWith('ref')) {
										for (const event of [value].flat(Infinity)) {
											if (typeof event === 'function') {
												event.bind(element, element);
											}
										}
									} else if (value != null && value !== false) {
										element.setAttribute(attr, typeof value === 'object' ? JSON.stringify(value) : value);
									}
								}
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
