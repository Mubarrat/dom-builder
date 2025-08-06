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

/**
 * A custom event class that extends the standard DOM `Event` interface
 * to directly expose arbitrary change data as properties on the event instance.
 *
 * Unlike `CustomEvent`, which wraps data inside `detail`, this class
 * spreads the provided object onto the event itself for direct access.
 *
 * @typeParam T - The shape of the change data to attach (default: `object`).
 *
 * @example
 * ```ts
 * // Create a ValueChangeEvent with custom properties
 * const event = new ValueChangeEvent("valuechanged", { oldValue: 1, newValue: 2 }, { bubbles: true });
 *
 * // Access data directly
 * console.log(event.oldValue, event.newValue);
 *
 * // Dispatch and listen like any standard DOM event
 * element.dispatchEvent(event);
 * element.addEventListener("valuechanged", e => console.log(e.newValue));
 * ```
 */
class ValueChangeEvent<T extends object = object> extends Event {
	/**
	 * Enables arbitrary property access to expose change data
	 * (merged directly onto the event instance).
	 */
	[key: string]: any;

	/**
	 * Creates a new `ValueChangeEvent`.
	 *
	 * @param type - The event type name (e.g., `"valuechanged"`).
	 * @param change - Optional data object; properties are shallow-copied
	 *                 onto the event for direct access.
	 * @param options - Standard `EventInit` options (`bubbles`, `cancelable`, `composed`).
	 */
	constructor(type: string, change?: T, options?: EventInit) {
		super(type, options);
		if (change) {
			Object.assign(this, change);
		}
	}
}
