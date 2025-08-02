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
/// <reference path="value-change-event.ts" />

/**
 * A lightweight reactive primitive for managing state and binding.
 *
 * A `baseObservable` is:
 * - A **callable object**: calling it with arguments updates/computes a value; without arguments, retrieves the current value.
 * - An **{@link EventTarget}**: notifies via `"valuechanged"` when updates occur.
 * - Configurable for **binding modes** (`to`, `from`, `two-way`).
 * - Extensible: supports derivation (`bindSelect`), validation (`validatable`), and coercion (`coercible`).
 *
 * @template T The type of value stored or computed.
 */
interface baseObservable<T = any> extends EventTarget {
	_eventTarget: EventTarget;

	/**
	 * Callable form of the observable:
	 * - **Getter**: No arguments → returns current value.
	 * - **Setter/Compute**: With arguments → updates value or re‑computes result.
	 *
	 * @param args Arguments for update/compute.
	 * @returns Current value.
	 */
	(...args: any[]): T;

	/**
	 * Specifies binding direction:
	 * - `"to"`: One‑way from ViewModel → UI.
	 * - `"from"`: One‑way from UI → ViewModel.
	 * - `"two-way"`: Bidirectional.
	 */
	type: "to" | "from" | "two-way";

	/**
	 * Dispatches `"valuechanging"` before change, allowing cancellation.
	 * Returns `true` if change is allowed (default).
	 */
	notifyBefore(change?: object): boolean;

	/**
	 * Dispatches a `"valuechanged"` event to notify subscribers of an update.
	 *
	 * @param change Optional object describing the nature of the change.
	 */
	notify(change?: object): void;

	/**
	 * Attempts to change the value by invoking a provided mutator function.
	 *
	 * Calls `notifyBefore()` first; if canceled, does nothing and returns `undefined`.
	 * Otherwise applies the change, calls `notify()`, and returns the function’s result.
	 *
	 * @param fn The function that performs the actual change and returns a result.
	 * @param change Optional object describing the change.
	 * @returns The result of `fn()` if applied; otherwise `undefined` if canceled.
	 */
	tryChange<TResult>(fn: () => TResult, change?: object): TResult | undefined;

	/**
	 * Creates a derived observable mapped by a selector function.
	 *
	 * @param selector Maps the current value to a derived value.
	 * @returns A new {@link baseObservable} representing the derived value.
	 */
	bindSelect<U>(selector: (val: T) => U): this;

	/**
	 * Adds validation logic to the observable.
	 *
	 * The returned object includes an `isValid` observable reflecting the
	 * result of the validator whenever the value changes.
	 *
	 * @param validator Predicate returning `true` when the value is valid.
	 * Defaults to always valid.
	 * @returns The original observable with an additional `isValid` property.
	 */
	validatable(validator?: (val: T) => boolean): this & {
		isValid: baseObservable<boolean>;
	};

	/**
	 * Applies coercion to incoming arguments before storage.
	 *
	 * @param coerce Function that transforms input values (default: identity).
	 * @returns The same observable with coercion applied.
	 */
	coercible(coerce?: (...args: any[]) => any): this;
}

interface baseObservableConstructor {
	<T = any>(baseFunction: (...args: any[]) => T): baseObservable<T>;

	/**
	 * Prototype object for all {@link baseObservable} instances.
	 * Useful for extending methods or introspection.
	 */
	prototype: baseObservable;

	/**
	 * Binds a value or {@link baseObservable} to a setter and optional observer.
	 *
	 * **Behavior:**
	 * - Plain value: Invokes `set` immediately once.
	 * - Observable: 
	 *   - Calls `set` with its current value.
	 *   - Subscribes to `"valuechanged"` if mode supports output (`to` or `two-way`).
	 *   - Invokes `observe` if mode supports input (`from` or `two-way`).
	 *
	 * @template T Type of the value being bound.
	 * @param observable The source value or {@link baseObservable}.
	 * @param set Callback to update target when value changes.
	 * @param observe Optional callback for reverse (input) binding.
	 */
	autoBind<T>(observable: baseObservable<T> | T, set: (val: T) => void, observe?: (val: T) => void): void;
}

const baseObservable = function<T = any>(baseFunction: (...args: any[]) => T): baseObservable<T> {
	// Create a callable object that delegates to the provided baseFunction
	const callable = ((...args) => baseFunction(...args)) as baseObservable<T>;

	// Assign the observable prototype so instance methods are available
	Object.setPrototypeOf(callable, baseObservable.prototype);

	// Create EventTarget property to enable event dispatch/listening
	callable._eventTarget = new EventTarget();

	return callable;
} as baseObservableConstructor;

// Establish prototype chain: baseObservable.prototype → EventTarget.prototype
Object.setPrototypeOf(baseObservable.prototype, EventTarget.prototype);
// Ensure the constructor function itself inherits from EventTarget
Object.setPrototypeOf(baseObservable, EventTarget);

// Implement mapper because EventTarget class's constructor doesn't support being called as a function
baseObservable.prototype.addEventListener = function(...args) { return this._eventTarget.addEventListener(...args) };
baseObservable.prototype.removeEventListener = function(...args) { return this._eventTarget.removeEventListener(...args) };
baseObservable.prototype.dispatchEvent = function(...args) { return this._eventTarget.dispatchEvent(...args) };

// Default binding mode is "to" (ViewModel → UI)
baseObservable.prototype.type = "to";

baseObservable.prototype.notifyBefore = function (change) {
	return this.dispatchEvent(new ValueChangeEvent("valuechanging", change, { cancelable: true }));
};

baseObservable.prototype.notify = function (change) {
	this.dispatchEvent(new ValueChangeEvent("valuechanged", change));
};

baseObservable.prototype.tryChange = function<TResult>(fn: () => TResult, change?: object): TResult | undefined {
	// Notify listeners before change, allow cancellation
	if (!this.notifyBefore(change)) return undefined;

	// Apply the change and capture result
	const result = fn();

	// Notify listeners after change
	this.notify(change);

	return result;
};

baseObservable.prototype.bindSelect = function (selector: (val) => any) {
	// Creates a derived observable that recomputes via selector whenever source changes
	return (() => selector(this())).computed(this);
};

baseObservable.prototype.validatable = function (validator: (val) => boolean = () => true) {
	// Compose an observable with an additional `isValid` observable derived from the validator
	return Object.setPrototypeOf(
		Object.assign((...args) => this(...args), {
			isValid: (() => validator(this())).computed(this),
		}),
		this
	);
};

baseObservable.prototype.coercible = function (coerce: (...args) => any = (x) => x) {
	// Wraps original observable to coerce inputs before passing through
	return Object.setPrototypeOf((...args) => {
		if (args.length === 0) return this(); // getter path
		const coerced = coerce(...args); // apply coercion
		if (Array.isArray(coerced)) return this(...coerced); // spread if multiple
		return this(coerced); // otherwise pass single value
	}, this);
};

Object.defineProperty(baseObservable.prototype, Symbol.toStringTag, {
	value: 'baseObservable',
	writable: false,
	enumerable: false,
	configurable: false
});

baseObservable.autoBind = <T>(observable: baseObservable<T> | T, set: (val: T) => void, observe?: (val: T) => void) => {
	// Handle plain value binding (not an observable)
	if (!(observable instanceof baseObservable)) {
		set(observable);
		return;
	}

	// Set initial value
	const evaluated = observable();
	set(evaluated);

	// Subscribe to output if mode allows
	if (observable.type === "to" || observable.type === "two-way")
		observable.addEventListener("valuechanged", () => set(observable()));

	// Invoke observe callback for input modes
	if (observable.type === "from" || observable.type === "two-way")
		observe?.(evaluated);
};
