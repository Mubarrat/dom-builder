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

// Wrap the entire implementation in a block scope to avoid leaking variables to global scope.
{
	/**
	 * `attributeObservers` is a WeakMap that keeps track of all registered attribute observers.
	 * 
	 * Structure details:
	 * - Key: a DOM Node element that is being observed for attribute changes.
	 * - Value: a Map where
	 *    - Key: the attribute name (string) or null (if attribute name missing),
	 *    - Value: a Set of callback functions to invoke when the attribute changes on that element.
	 *
	 * Using WeakMap ensures that entries are garbage collected automatically
	 * when DOM elements are removed and no longer referenced elsewhere.
	 */
	const attributeObservers = new WeakMap<
		Node,
		Map<string | null, Set<() => void>>
	>();


	/**
	 * `MutationObserver` monitors all attribute changes anywhere inside the entire `document`.
	 * This observer is configured with:
	 * - `attributes: true` — watch for any attribute changes
	 * - `subtree: true` — observe changes inside all descendants of `document`
	 *
	 * When a mutation (attribute change) is detected, the observer:
	 * 1. Retrieves the element (`mutation.target`) where the attribute changed.
	 * 2. Gets the set of callbacks registered for the mutated attribute name.
	 * 3. Invokes all these callbacks in order to notify subscribers about the change.
	 *
	 * This centralized observation is highly efficient compared to attaching
	 * separate MutationObservers to every single element or attribute.
	 */
	new MutationObserver((mutations) => {
		// Process each mutation record reported by MutationObserver
		mutations.forEach((mutation) => {
			// Retrieve the map of attribute observers for the mutated element
			const handlersForElement = attributeObservers.get(mutation.target);

			// Defensive check: ensure handlers exist for this element
			if (!handlersForElement) return;

			// Get the set of callbacks registered for the specific attribute that changed
			const callbacksForAttribute = handlersForElement.get(mutation.attributeName);

			// Defensive check: if no callbacks registered, nothing to invoke
			if (!callbacksForAttribute) return;

			// Invoke each registered callback function notifying about the attribute change
			callbacksForAttribute.forEach(callback => {
				try {
					callback();
				} catch (e) {
					// Log error but continue notifying other callbacks
					console.error("Error in attribute change callback:", e);
				}
			});
		});
	})
	// Start observing document for attribute changes on all descendants (subtree)
	.observe(document, { attributes: true, subtree: true });


	/**
	 * Registers a callback function to be invoked whenever a specific attribute
	 * on a given DOM element changes.
	 * 
	 * This function maintains a centralized subscription registry,
	 * so multiple callbacks on the same element/attribute combination
	 * can coexist and be notified independently.
	 *
	 * Internally, it leverages a single `MutationObserver` on the entire document,
	 * and dispatches notifications only to interested subscribers.
	 *
	 * @param element The DOM Node element to watch for attribute changes.
	 * @param attribute The attribute name string to observe, e.g., "class" or "style".
	 * @param callback The function to be called whenever the attribute changes.
	 * 
	 * @example
	 * ```ts
	 * const myDiv = document.querySelector("div")!;
	 * observeElementAttr(myDiv, "class", () => {
	 *   console.log("The class attribute of the div changed to:", myDiv.getAttribute("class"));
	 * });
	 * 
	 * // Changing the class attribute triggers the callback:
	 * myDiv.className = "new-class";
	 * ```
	 */
	// Use `var` intentionally to allow this variable to be accessible outside the block scope
	var observeElementAttr = (
		element: Node,
		attribute: string,
		callback: () => void
	): void => {
		// Try to get the existing Map of attribute callbacks for the element
		let handlers = attributeObservers.get(element);

		// If no map exists yet for this element, create one and store it
		if (!handlers) {
			handlers = new Map<string | null, Set<() => void>>();
			attributeObservers.set(element, handlers);
		}

		// Try to get the Set of callbacks registered for the specific attribute
		let callbacks = handlers.get(attribute);

		// If no Set exists yet for this attribute, create one and store it
		if (!callbacks) {
			callbacks = new Set<() => void>();
			handlers.set(attribute, callbacks);
		}

		// Add the provided callback function to the Set of callbacks
		callbacks.add(callback);
	};
}
