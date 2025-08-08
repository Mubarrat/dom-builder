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
 * Converts a `kebab-case` string to `camelCase` at the type level.
 *
 * This is useful for mapping DOM tag names like `"my-element"` to
 * camelCase versions like `"myElement"` for builder function names.
 *
 * @template S - The kebab-case string to convert.
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

/**
 * Represents an attribute object passed to element builders.
 *
 * The keys are attribute names, and the values are their corresponding values.
 * This allows setting attributes like `class`, `id`, `style`, and event handlers.
 */
type Attribute = Record<string, any>;

/**
 * Represents any valid child node passed to element builders.
 *
 * This can be strings, DOM nodes, observables, or any type that
 * can be appended to an element as a child.
 */
type Child = any;

/**
 * A collection of builder functions for DOM elements categorized by namespace.
 *
 * For each namespace URI, the builder object maps tag names converted to camelCase
 * to factory functions that accept attributes and children, returning
 * strongly typed elements from the corresponding DOM interfaces.
 *
 * @remarks
 * - HTML elements are under `"http://www.w3.org/1999/xhtml"`.
 * - SVG elements are under `"http://www.w3.org/2000/svg"`.
 * - MathML elements are under `"http://www.w3.org/1998/Math/MathML"`.
 * - Custom namespaces fall back to generic `Element` nodes with string tag names.
 *
 * @example
 * ```ts
 * // Creating a <div> with a class and text content:
 * const div = $html.div({ class: "container" }, "Hello World");
 *
 * // Creating an SVG circle:
 * const circle = $svg.circle({ cx: 50, cy: 50, r: 40, fill: "red" });
 *
 * // Using a custom namespace builder:
 * const customNS = $dom("http://schemas.example.com/custom");
 * const customElem = customNS.customElement({ "data-id": 123 }, "Custom Content");
 * ```
 */
declare interface DomBuilders {
	/** XHTML namespace (HTML elements) */
	"http://www.w3.org/1999/xhtml": {
		[K in keyof HTMLElementTagNameMap as CamelCase<K>]:
			(...args: (Attribute | Child)[]) => HTMLElementTagNameMap[K];
	};

	/** SVG namespace */
	"http://www.w3.org/2000/svg": {
		[K in keyof SVGElementTagNameMap as CamelCase<K>]:
			(...args: (Attribute | Child)[]) => SVGElementTagNameMap[K];
	};

	/** MathML namespace */
	"http://www.w3.org/1998/Math/MathML": {
		[K in keyof MathMLElementTagNameMap as CamelCase<K>]:
			(...args: (Attribute | Child)[]) => MathMLElementTagNameMap[K];
	};

	/**
	 * Fallback builder for any other namespaces.
	 *
	 * This creates generic `Element` instances without strict typing of tags,
	 * allowing usage with custom XML namespaces.
	 */
	[namespace: string]: {
		[tag: string]: (...args: (Attribute | Child)[]) => Element;
	};
}

/**
 * Helpers to build DOM elements, mixed into global `Window` and `Document`.
 *
 * Provides:
 * - `$dom(namespace)` to create builders for any XML namespace.
 * - Shortcut builders for common namespaces `$html`, `$svg`, and `$mml`.
 *
 * @example
 * ```ts
 * // Get a builder for SVG elements
 * const svg = document.$svg;
 *
 * // Create a red circle
 * const redCircle = svg.circle({ r: 40, fill: "red" });
 *
 * // Create a custom namespace builder
 * const custom = window.$dom("http://schemas.example.com/custom");
 * const node = custom.node({ "data-id": 42 }, "Example");
 * ```
 */
declare interface DomHelper {
	/**
	 * Creates a builder object for the specified XML namespace URI.
	 *
	 * The returned object maps camelCase tag names to factory functions.
	 *
	 * @param namespace - Namespace URI string (e.g., `"http://www.w3.org/2000/svg"`).
	 * @returns A map of tag builder functions for the namespace.
	 */
	$dom<K extends keyof DomBuilders | string = string>(namespace: K): DomBuilders[K];

	/** Builder for standard HTML elements in XHTML namespace. */
	readonly $html: DomBuilders["http://www.w3.org/1999/xhtml"];

	/** Builder for SVG elements. */
	readonly $svg: DomBuilders["http://www.w3.org/2000/svg"];

	/** Builder for MathML elements. */
	readonly $mml: DomBuilders["http://www.w3.org/1998/Math/MathML"];
}

/**
 * Extend the global `Document` interface to include DOM builder helpers.
 */
declare interface Document extends DomHelper {}

/**
 * Extend the global `Window` interface to include DOM builder helpers.
 */
declare interface Window extends DomHelper {}

/**
 * Global function to create DOM builders for arbitrary namespaces.
 *
 * Equivalent to calling `document.$dom(namespace)`.
 *
 * @param namespace - The XML namespace URI.
 * @returns A builder object with tag factory functions.
 *
 * @example
 * ```ts
 * const custom = $dom("http://schemas.example.com/custom");
 * const node = custom.node({ "data-attr": "value" }, "Content");
 * ```
 */
declare function $dom<K extends keyof DomBuilders | string = string>(namespace: K): DomBuilders[K];

/** Shortcut builder for standard HTML elements. */
declare const $html: DomBuilders["http://www.w3.org/1999/xhtml"];

/** Shortcut builder for SVG elements. */
declare const $svg: DomBuilders["http://www.w3.org/2000/svg"];

/** Shortcut builder for MathML elements. */
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
											baseObservable.autoBind(
												value,
												v => {
													if (attr in element) {
														try {
															element[attr] = v;
															return;
														} catch {}
													}
													// Fallback if property doesn't exist or is readonly.
													element.setAttribute(attr, typeof v === 'object' ? JSON.stringify(v) : v);
												},
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
										const childAnchors: Text[] = [];

										const createNode = (value: any): ChildNode[] => {
											while (typeof value === 'function') value = value.call(element, element);
											return flattenRenderable(value).filter(n => n != null && n !== false) as ChildNode[];
										};

										// Initial render
										arg().forEach((item, i) => {
											const marker = new Text();
											childAnchors.push(marker);
											anchor.before(marker, ...createNode(item));
										});

										// Helper: snapshot each [marker, ...nodesUntilNextMarker]
										const snapshotGroups = () => childAnchors.map((marker, i) => {
											const end = childAnchors[i + 1] || anchor;
											const nodes: ChildNode[] = [];
											for (let n: ChildNode = marker; n && n !== end; n = n.nextSibling!) nodes.push(n);
											return nodes;
										});

										// Helper: reorder groups based on mapping
										const reorder = (mapping: number[]) => {
											const groups = snapshotGroups();
											for (let idx of mapping) for (let node of groups[idx]) anchor.before(node);
											childAnchors.splice(0, childAnchors.length, ...mapping.map(i => childAnchors[i]));
										};

										function update(change: ArrayChange<any>) {
											if ("index" in change) {
												const { index, oldItems, newItems } = change;

												// Remove old
												if (oldItems?.length) {
													const startMarker = childAnchors[index];
													const endMarker = childAnchors[index + oldItems.length] || anchor;
													let node: ChildNode = startMarker;
													while (node && node !== endMarker) {
														const next = node.nextSibling!;
														node.remove();
														node = next;
													}
													childAnchors.splice(index, oldItems.length);
												}

												// Insert new
												if (newItems?.length) {
													const markers: Text[] = [];
													const nodes: Node[] = [];
													for (let item of newItems) {
														const marker = new Text();
														markers.push(marker);
														nodes.push(marker, ...createNode(item));
													}
													(childAnchors[index] || anchor).before(...nodes);
													childAnchors.splice(index, 0, ...markers);
												}
											} else if ("reversed" in change) {
												reorder([...childAnchors.keys()].reverse());
											} else if ("sortedIndices" in change) {
												reorder(change.sortedIndices);
											}
										}
										
										arg.addEventListener("valuechanged", (e: ValueChangeEvent<ArrayChange<any>>) =>
											update(e as Extract<ValueChangeEvent<ArrayChange<any>>, ArrayChange<any>>)
										);
									} else {
										// Observable content: replace children when observable changes
										const anchor = new Text();
										element.append(anchor);
										let currentNodes: ChildNode[] = [];
										function update() {
											for (const node of currentNodes) node.remove();
											let projected = arg();
											while (typeof projected === 'function') projected = projected.call(element, element);
											const fragment = new DocumentFragment();
											fragment.append(...flattenRenderable(projected).filter(node => node !== null && node !== undefined && node !== false));
											currentNodes = Array.from(fragment.childNodes);
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
