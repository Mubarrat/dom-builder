/*
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
/// <reference path="base-observable.ts" />
/// <reference path="mutation.ts" />

/**
 * Converts `kebab-case` strings into `camelCase` at the type level.
 *
 * Useful for mapping DOM tag names (e.g., `"my-element"`) to `myElement`
 * when generating typed builder APIs.
 *
 * @example
 * ```ts
 * type T = CamelCase<'my-element'>; // "myElement"
 * ```
 */
type CamelCase<S extends string> =
	S extends `${infer T}-${infer U}`
		? `${T}${Capitalize<CamelCase<U>>}`
		: S;

/** Represents valid attribute objects for an element. */
type Attribute = Record<string, any>;

/** Represents any valid child node: string, element, observable, etc. */
type Child = any;

/**
 * Typed builder functions for creating DOM elements in various namespaces.
 *
 * Each builder:
 * - Maps tag names (converted to `camelCase`) to factory functions.
 * - Each function accepts attributes and children to produce strongly-typed elements.
 *
 * @example
 * ```ts
 * // HTML
 * const div = $html.div({ class: "box" }, "Hello");
 *
 * // SVG
 * const circle = $svg.circle({ cx: 50, cy: 50, r: 40 });
 * ```
 */
declare interface DomBuilders {
	/** HTML (XHTML) namespace builder. */
	"http://www.w3.org/1999/xhtml": {
		[K in keyof HTMLElementTagNameMap as CamelCase<K>]:
			(...args: (Attribute | Child)[]) => HTMLElementTagNameMap[K];
	};

	/** SVG namespace builder. */
	"http://www.w3.org/2000/svg": {
		[K in keyof SVGElementTagNameMap as CamelCase<K>]:
			(...args: (Attribute | Child)[]) => SVGElementTagNameMap[K];
	};

	/** MathML namespace builder. */
	"http://www.w3.org/1998/Math/MathML": {
		[K in keyof MathMLElementTagNameMap as CamelCase<K>]:
			(...args: (Attribute | Child)[]) => MathMLElementTagNameMap[K];
	};

	/**
	 * Generic fallback for **custom namespaces**.
	 * Produces functions that create `Element` nodes without strict tag typing.
	 *
	 * @example
	 * ```ts
	 * const $custom = $dom("http://schemas.example.com/custom");
	 * const node = $custom.node({ "data-id": 123 }, "Text");
	 * ```
	 */
	[namespace: string]: {
		[tag: string]: (...args: (Attribute | Child)[]) => Element;
	};
}

/**
 * DOM builder helpers mixed into `Window` and `Document`.
 *
 * Provides:
 * - `$dom(namespace)` for arbitrary/custom namespaces
 * - `$html`, `$svg`, `$mml` for common ones
 */
declare interface DomHelper {
	/**
	 * Creates a builder for the specified XML namespace.
	 *
	 * @param namespace - The namespace URI (e.g., `"http://www.w3.org/2000/svg"`).
	 * @returns A tag-to-function map for creating namespaced elements.
	 *
	 * @example
	 * ```ts
	 * const $example = $dom("http://schemas.example.com/example");
	 * const node = $example.node({ data: "Data" }, "Example Data");
	 * ```
	 */
	$dom<K extends keyof DomBuilders | string = string>(namespace: K): DomBuilders[K];

	/** Builder for HTML elements (XHTML namespace). */
	readonly $html: DomBuilders["http://www.w3.org/1999/xhtml"];

	/** Builder for SVG elements. */
	readonly $svg: DomBuilders["http://www.w3.org/2000/svg"];

	/** Builder for MathML elements. */
	readonly $mml: DomBuilders["http://www.w3.org/1998/Math/MathML"];
}

/** Augments `Document` with DOM builder helpers (`$dom`, `$html`, etc.). */
declare interface Document extends DomHelper {}

/** Augments `Window` with DOM builder helpers (`$dom`, `$html`, etc.). */
declare interface Window extends DomHelper {}

/**
 * Global builder function for arbitrary namespaces.
 *
 * Equivalent to `document.$dom(namespace)`.
 *
 * @example
 * ```ts
 * const $example = $dom("http://schemas.example.com/example");
 * const node = $example.node({ data: "Data" }, "Example Data");
 * ```
 */
declare function $dom<K extends keyof DomBuilders | string = string>(namespace: K): DomBuilders[K];

/** Shortcut builder for HTML elements (`<div>`, `<span>`, etc.). */
declare const $html: DomBuilders["http://www.w3.org/1999/xhtml"];

/** Shortcut builder for SVG elements (`<svg>`, `<circle>`, etc.). */
declare const $svg: DomBuilders["http://www.w3.org/2000/svg"];

/** Shortcut builder for MathML elements (`<mfrac>`, `<msqrt>`, etc.). */
declare const $mml: DomBuilders["http://www.w3.org/1998/Math/MathML"];

Object.defineProperties(Document.prototype, {
	$dom: {
		get(this: Document) {
			return (namespace: string) => {
				// Proxy allows dynamic tag creation: $html.div(), $svg.circle(), etc.
				return new Proxy({}, {
					get: (_, prop) => {
						if (typeof prop !== "string") return undefined;
						if (prop === "toString") return () => `DOM Proxy for namespace: ${namespace}`;

						// Convert camelCase to kebab-case for tag names (e.g., myTag -> my-tag)
						const tagName = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
						return (...args) => {
							const element = this.createElementNS(namespace, tagName);
							for (const arg of flattenIterable(args)) {
								if (arg === null || arg === undefined || arg === false)
									continue;
								if (arg.constructor === Object && arg[Symbol.iterator] === undefined && Symbol.asyncIterator && arg[Symbol.asyncIterator] === undefined) {
									for (const [attr, value] of Object.entries(arg as Record<string, any>)) {
										if (attr === 'style' && element instanceof HTMLElement) {
											baseObservable.autoBind(value,
												v => typeof v === 'string'
													? element.setAttribute('style', v)
													: Object.entries(v as Record<string, any>).forEach(([prop, value]) =>
														baseObservable.autoBind(value,
															v => element.style[prop] = v,
															() => observeElementAttr(element, 'style', () => value(element.style[prop])))),
												v => observeElementAttr(element, 'style', () => value(typeof v === 'string'
													? element.getAttribute('style') || ''
													: Object.assign({}, element.style))));
										} else if (attr === 'on' && typeof value === 'object' && value) {
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
										} else if (attr === 'data' && typeof value === 'object' && (element instanceof HTMLElement || element instanceof SVGElement || element instanceof MathMLElement)) {
											// Handle data-* attributes, including observable bindings
											for (const [name, data] of Object.entries(value as Record<string, any>))
												baseObservable.autoBind(data,
													v => element.dataset[name] = typeof v === 'object' ? JSON.stringify(v) : v,
													v => observeElementAttr(element, `data-${name.replace(/([A-Z])/g, "-$1").toLowerCase()}`, () => {
														const newValue = element.dataset[name]!;
														try {
															data(JSON.parse(newValue));
														} catch {
															data(newValue);
														}
													})
												);
										} else if (attr === 'value' && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
											baseObservable.autoBind(value,
												v => element.value = v,
												() => element.addEventListener(element instanceof HTMLSelectElement ? 'change' : 'input', () => value(element.value))
											);
										} else if (attr === 'checked' && (element instanceof HTMLInputElement && (arg.type === 'checkbox' || arg.type === 'radio'))) {
											baseObservable.autoBind(value,
												v => element.checked = v,
												() => element.addEventListener("change", () => value(element.checked))
											);
										} else if (value !== undefined) {
											baseObservable.autoBind(value,
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
								} else if (arg instanceof baseObservable) {
									if (arg instanceof arrayObservable) {
										const anchor = new Text();
										element.append(anchor);

										// Track anchors for each array element
										const childAnchors: Text[] = [];

										function createNode(value: any): Node[] {
											// Project value like in normal observable
											while (typeof value === 'function') value = value.call(element, element);
											return flattenRenderable(value).filter(node => node !== null && node !== undefined && node !== false);
										}

										// Initial render
										arg().forEach((item, i) => {
											const marker = new Text();
											childAnchors[i] = marker;
											anchor.before(marker, ...createNode(item));
										});

										function update(change: ArrayChange<any>) {
											if ("index" in change) {
												// Handle splice/insert/remove
												const { index, oldItems, newItems } = change;

												// Remove old nodes
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

												// Insert new nodes
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
												// Reverse DOM order
												const nodes: Node[] = [];
												for (let i = 0; i < childAnchors.length; i++) {
													const marker = childAnchors[i];
													let cursor = marker.nextSibling;
													const group: Node[] = [marker];
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
												// Reorder based on sortedIndices
												const mapping = change.sortedIndices;
												const newOrder: Text[] = [];
												for (let i = 0; i < mapping.length; i++) {
													const marker = childAnchors[mapping[i]];
													let cursor = marker;
													const group: Node[] = [];
													do {
														group.push(cursor);
														cursor = cursor.nextSibling as Text;
													} while (cursor && mapping.includes(childAnchors.indexOf(cursor as Text)) === false);
													newOrder.push(marker);
													group.forEach(n => anchor.before(n));
												}
												childAnchors.splice(0, childAnchors.length, ...newOrder);
											}
										}

										// Apply incremental updates
										arg.addEventListener("valuechanged", (e: ValueChangeEvent<ArrayChange<any>>) =>
											update(e as Extract<ValueChangeEvent<ArrayChange<any>>, ArrayChange<any>>));
									} else {
										// Observable content: replace children when observable changes
										const anchor = new Text();
										element.append(anchor);
										let currentNodes: (Element | CharacterData)[] = [];
										function update() {
											for (const node of currentNodes) node.remove();
											let projected = arg();
											while (typeof projected === 'function') projected = projected.call(element, element);
											const fragment = new DocumentFragment();
											fragment.append(...flattenRenderable(projected).filter(node => node !== null && node !== undefined && node !== false));
											currentNodes = Array.from(fragment.children);
											anchor.after(fragment);
										};
										update();
										arg.addEventListener('valuechanged', update);
									}
								} else if (Symbol.asyncIterator) {
									(function render(arg, givenAnchor?: Text) {
										for (const item of flattenRenderable(arg).filter(n => n != null && n !== false && n !== undefined)) {
											if (typeof item[Symbol.asyncIterator] === 'function') {
												const anchor = new Text();
												if (givenAnchor) {
													givenAnchor.before(anchor);
												} else {
													element.append(anchor);
												}
												(async () => { for await (const chunk of item) render(chunk, anchor) })();
											} else if (givenAnchor) {
												givenAnchor.before(item);
											} else {
												element.append(item);
											}
										}
									})(arg);
								} else {
									element.append(...flattenRenderable(arg).filter(n => n != null && n !== false));
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
								while (typeof renderable === 'function') renderable = renderable.call(element, element);
								return shouldBeIterated(renderable) ? Array.from(renderable).flatMap(flattenRenderable) : [renderable];
							}
						};
					}
				});
			}
		},
		configurable: false,
		enumerable: true
	},
	$html: {
		get(this: Document) { return this.$dom("http://www.w3.org/1999/xhtml"); },
		configurable: false,
		enumerable: true
	},
	$svg: {
		get(this: Document) { return this.$dom("http://www.w3.org/2000/svg"); },
		configurable: false,
		enumerable: true
	},
	$mml: {
		get(this: Document) { return this.$dom("http://www.w3.org/1998/Math/MathML"); },
		configurable: false,
		enumerable: true
	}
});

Object.defineProperties(Window.prototype, {
    $dom: {
        get(this: Window) { return this.document.$dom; },
        configurable: false,
        enumerable: true
    },
    $html: {
        get(this: Window) { return this.document.$html; },
        configurable: false,
        enumerable: true
    },
    $svg: {
        get(this: Window) { return this.document.$svg; },
        configurable: false,
        enumerable: true
    },
    $mml: {
        get(this: Window) { return this.document.$mml; },
        configurable: false,
        enumerable: true
    }
});
