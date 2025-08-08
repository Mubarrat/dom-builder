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
 * A custom Event subclass that spreads an arbitrary data object directly
 * onto the event instance as properties.
 *
 * This differs from the standard `CustomEvent` pattern where data is
 * encapsulated inside a `.detail` property.
 *
 * This design allows direct access to properties without needing
 * to reference `.detail`.
 *
 * @template T The shape of the change data attached to the event (defaults to `object`).
 */
class ValueChangeEvent<T extends object = object> extends Event {
	/**
	 * Index signature allowing arbitrary keys on the event instance.
	 * This allows attaching dynamic properties from the change data.
	 */
	[key: string]: any;

	/**
	 * Constructs a new ValueChangeEvent.
	 *
	 * @param type - The string event type (e.g., `"valuechanged"`).
	 * @param change - Optional change data object to merge into the event.
	 * @param options - Optional EventInit options: bubbles, cancelable, composed.
	 */
	constructor(type: string, change?: T, options?: EventInit) {
		// Call base Event constructor with type and options
		super(type, options);

		// If change data provided, shallow-copy all enumerable own properties
		// onto `this` event instance for direct property access
		if (change !== undefined && change !== null) {
			// Defensive: ensure change is an object before assign
			if (typeof change === 'object') {
				Object.assign(this, change);
			} else {
				// Warn if someone tries to pass non-object change data
				console.warn('ValueChangeEvent: change parameter expected to be an object but received', change);
			}
		}
	}
}
