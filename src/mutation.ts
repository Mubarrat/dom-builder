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

// Encapsulated in a block scope to avoid polluting the global scope.
{
	/**
	 * Tracks per-element attribute observers.
	 *
	 * Structure:
	 * - **Key**: DOM element being observed
	 * - **Value**: Map of attribute names → Sets of callbacks to invoke on change
	 *
	 * Used internally by `observeElementAttr`.
	 */
	const attributeObservers = new WeakMap<Node, Map<string | null, Set<() => void>>>();

	// Observe all attribute changes in the document tree
	new MutationObserver(mutations =>
		mutations.forEach(mutation =>
			attributeObservers
				.get(mutation.target)
				?.get(mutation.attributeName)
				?.forEach(callback => callback())
		)
	).observe(document, { attributes: true, subtree: true });

	/**
	 * Registers a callback to be invoked whenever a specific attribute
	 * on a given element changes.
	 *
	 * Internally uses a single `MutationObserver` on `document`
	 * and dispatches events to relevant subscribers.
	 *
	 * @param element - The target DOM element to observe.
	 * @param attribute - The name of the attribute to watch (e.g., `"class"`).
	 * @param callback - Function to invoke when the attribute value changes.
	 *
	 * @example
	 * ```ts
	 * const div = document.querySelector("div")!;
	 *
	 * observeElementAttr(div, "class", () => {
	 *   console.log("Class changed to:", div.getAttribute("class"));
	 * });
	 *
	 * div.className = "new-class"; // triggers callback
	 * ```
	 */
	// Use var to pollute.
	var observeElementAttr = (element: Node, attribute: string, callback: () => void) => {
		let handlers = attributeObservers.get(element);
		if (!handlers) attributeObservers.set(element, handlers = new Map<string | null, Set<() => void>>());

		let callbacks = handlers.get(attribute);
		if (!callbacks) handlers.set(attribute, callbacks = new Set<() => void>());

		callbacks.add(callback);
	};
}
