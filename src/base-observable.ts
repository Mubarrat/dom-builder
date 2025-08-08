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
 * This interface represents a foundational reactive programming primitive which
 * is designed to efficiently encapsulate mutable state that can be observed,
 * bound, and reacted to by multiple listeners in a UI or application logic context.
 * It is intended to simplify synchronization between data sources and consumers
 * by exposing a callable API that acts both as a getter and setter of a value.
 *
 * The `baseObservable` type is designed to:
 * - Act as a **callable object** that can be invoked as a function both with or without arguments.
 * - Implement the {@link EventTarget} interface, thereby allowing for standardized event
 *   dispatching and subscription, especially for notifying listeners of value changes.
 * - Support declarative configuration of **binding modes** which control the direction
 *   of data flow between ViewModel and UI layers.
 * - Be extended with additional capabilities such as derivation of computed values,
 *   validation of inputs, and coercion/transformation of incoming data before storage.
 *
 * @template T The generic type parameter `T` indicates the type of the value stored or computed
 * by the observable. This type parameter enables type safety and IntelliSense support
 * for consumers of this interface, ensuring consistent typing for the value being managed.
 */
interface baseObservable<T = any> extends EventTarget {
	/**
	 * Internal EventTarget instance used for actual event dispatching and listener management.
	 * This encapsulated property is used to implement the EventTarget interface methods
	 * in a way that is compatible with environments where EventTarget cannot be directly extended.
	 *
	 * @private
	 */
	_eventTarget: EventTarget;

	/**
	 * The callable form of the observable:
	 *
	 * This is the key feature that allows the observable to be used as a function:
	 * - When called with **no arguments**, it acts as a **getter** returning the current stored or computed value.
	 * - When called with **one or more arguments**, it acts as a **setter or recompute trigger**, 
	 *   updating the internal value based on the supplied arguments or recomputing it if it is derived.
	 *
	 * This dual behavior simplifies state interaction by merging getter and setter semantics
	 * into a single call signature.
	 *
	 * @param args Zero or more arguments that influence the update or computation of the value.
	 * The semantics and expected types of these arguments depend on the implementation details
	 * of the specific observable.
	 * @returns The current value of type `T` after applying any update or computation.
	 */
	(...args: any[]): T;

	/**
	 * Defines the binding mode of the observable, specifying the directionality of data flow:
	 *
	 * - `"to"`: Indicates a **one-way binding** where data flows **from the ViewModel to the UI only**.
	 *   In this mode, the observable pushes updates outward but does not accept changes from the UI.
	 * - `"from"`: Indicates a **one-way binding** where data flows **from the UI to the ViewModel only**.
	 *   Here, the observable receives input from UI changes but does not propagate updates outward.
	 * - `"two-way"`: Indicates a **bidirectional binding** where data flows **both ways**,
	 *   allowing synchronization between ViewModel and UI, accepting updates and pushing changes.
	 *
	 * This property governs how binding libraries and frameworks interact with the observable during
	 * automatic binding and synchronization processes.
	 */
	type: "to" | "from" | "two-way";

	/**
	 * Dispatches a `"valuechanging"` event **before** the observable's value is changed.
	 *
	 * This pre-change notification event allows subscribers to observe impending changes,
	 * inspect the details, and optionally cancel the update by calling `preventDefault()` on
	 * the event. This mechanism provides a hook for validation, veto logic, or side effects
	 * that should occur prior to committing a change.
	 *
	 * If the event is canceled by any listener, the observable will not apply the change.
	 *
	 * @param change Optional arbitrary object describing the nature, origin, or context of the change.
	 * This object can be used by event handlers to make informed decisions about whether to allow
	 * the change or not.
	 * @returns Returns `true` if the change is allowed (i.e., no listener canceled the event);
	 * returns `false` if the event was canceled and the change should not proceed.
	 */
	notifyBefore(change?: object): boolean;

	/**
	 * Dispatches a `"valuechanged"` event **after** the observable's value has been updated.
	 *
	 * This post-change event notifies all registered subscribers that the observable's value
	 * has changed, enabling them to react accordingly (e.g., updating UI elements, triggering
	 * computations, or propagating changes).
	 *
	 * @param change Optional object containing metadata or contextual information about the change.
	 * This can include previous values, reasons for the change, or any other relevant details.
	 */
	notify(change?: object): void;

	/**
	 * Attempts to perform a value change operation by invoking a provided mutator function.
	 *
	 * This method wraps the mutation logic inside an event-driven pattern:
	 * - First, it calls `notifyBefore()` to dispatch a `"valuechanging"` event to allow listeners
	 *   to cancel the change.
	 * - If the event is not canceled, the provided function `fn` is executed to perform the actual
	 *   change.
	 * - After the change is applied, it calls `notify()` to dispatch a `"valuechanged"` event
	 *   signaling the completion of the update.
	 *
	 * This pattern provides a transactional update mechanism that respects event cancellation,
	 * ensuring controlled and observable state mutations.
	 *
	 * @template TResult The return type of the mutation function `fn`.
	 * @param fn A callback function that performs the actual mutation or update of the observable's value.
	 * This function should return a result which is then propagated back to the caller.
	 * @param change Optional object describing the intended change, passed to `notifyBefore()` and `notify()`.
	 * @returns The result returned by the mutation function `fn()` if the change was successfully applied;
	 * returns `undefined` if the change was canceled by any listener during `notifyBefore()`.
	 */
	tryChange<TResult>(fn: () => TResult, change?: object): TResult | undefined;

	/**
	 * Enhances the observable with validation capabilities.
	 *
	 * This method adds an `isValid` computed observable property that reflects the validity
	 * of the current value according to a provided validator function.
	 *
	 * The validator is a predicate function that takes the current value as input and returns
	 * a boolean indicating whether the value is considered valid (`true`) or invalid (`false`).
	 *
	 * The `isValid` observable automatically updates whenever the base observable's value changes,
	 * providing reactive validation state useful for UI validation, form feedback, or business rules.
	 *
	 * @param validator A predicate function `(val: T) => boolean` used to evaluate validity.
	 * If omitted, defaults to a validator that always returns `true` (i.e., always valid).
	 * @returns The original observable instance extended with an `isValid` computed observable property.
	 * The returned type combines the original interface with `{ isValid: computed<boolean> }`.
	 */
	validatable(validator?: (val: T) => boolean): this & {
		isValid: computed<boolean>;
	};

	/**
	 * Adds coercion functionality to the observable, enabling transformation or sanitization
	 * of input arguments before they are applied to the underlying value.
	 *
	 * The provided `coerce` function is called with the arguments intended to update the observable.
	 * Its return value (or values) replaces the original inputs and is then used to update the observable.
	 *
	 * This is useful for enforcing types, clamping ranges, parsing input, or any other
	 * input normalization necessary prior to storing or processing values.
	 *
	 * @param coerce A function which accepts the incoming arguments and returns either:
	 * - A single coerced value,
	 * - An array of values to spread as individual arguments,
	 * - Or the identity (default) which returns inputs unchanged.
	 * If omitted, the identity function is used (no coercion).
	 * @returns The same observable instance augmented with coercion behavior on set/update.
	 */
	coercible(coerce?: (...args: any[]) => any): this;

	/**
	 * Provides an advanced binding interface allowing property and method-based projections
	 * of the observable's underlying value, facilitating creation of derived observables
	 * or "sub-observables" for granular reactivity.
	 *
	 * The `bind` property acts as a dynamic proxy object with the following capabilities:
	 * - Properties of the current value become individual `baseObservable` instances,
	 *   allowing binding and observation of sub-values directly.
	 * - Methods of the current value can be invoked via the proxy, returning computed observables
	 *   representing the method's return value.
	 * - The `select` method allows creation of derived observables by applying arbitrary
	 *   selector functions to the current value, producing computed projections.
	 *
	 * This enables a flexible and expressive reactive data binding pattern,
	 * supporting nested or computed data flow scenarios within the observable ecosystem.
	 *
	 * ### Example usage:
	 * ```ts
	 * const person = baseObservable(() => ({ name: "Alice", age: 30 }));
	 *
	 * // Bind to a specific property to observe it independently
	 * const nameObs = person.bind.name; // baseObservable<string>
	 *
	 * // Create a derived observable by applying a projection function
	 * const greetingObs = person.bind.select(p => `Hello, ${p.name}`);
	 *
	 * // Bind to a method of the underlying value, getting a computed observable result
	 * const upperNameObs = person.bind.name.bind.toUpperCase(); // baseObservable<string>
	 * ```
	 *
	 * @template T The generic type parameter representing the type of the underlying value.
	 */
	bind: (T extends object | Function ? {
		/**
		 * A mapped type that projects each property key `K` of the underlying value `T` into an
		 * observable form:
		 * - If the property is a method, it becomes a function returning a computed observable
		 *   of the method's return type.
		 * - Otherwise, it becomes a computed observable of the property's type.
		 */
		[K in keyof T]: T[K] extends (...args: infer A) => infer R
			? (...args: A) => computed<R> : computed<T[K]>;
	} : {}) & {
		/**
		 * Direct reference to the current observable instance underlying this bind proxy.
		 * This allows access to the root observable for advanced manipulation or introspection.
		 */
		__observable__: baseObservable<T>;

		/**
		 * Creates a new derived observable by applying a selector function to the current value.
		 * This function enables transformation or projection of the observable's data into
		 * new reactive streams.
		 *
		 * @param selector A function which takes the current value of the observable and
		 * returns a derived value of type `U`.
		 * @returns A new computed observable representing the derived value.
		 */
		select<U>(selector: (value: T) => U): computed<U>;
	};
}

/**
 * Constructor interface for creating instances of {@link baseObservable}.
 *
 * Provides a callable signature and static utility methods to facilitate creation and
 * binding of observables.
 */
interface baseObservableConstructor {
	/**
	 * Factory method signature: accepts a function which computes or returns the observable's value,
	 * returning a `baseObservable` instance wrapping that function.
	 *
	 * @template T The type of the value produced by the base function.
	 * @param baseFunction The function that computes or returns the value managed by the observable.
	 * @returns An instance of {@link baseObservable} wrapping the provided function.
	 */
	<T = any>(baseFunction: (...args: any[]) => T): baseObservable<T>;

	/**
	 * Prototype object shared by all instances of {@link baseObservable}.
	 * This can be used to extend, override, or introspect common instance methods
	 * and properties.
	 */
	readonly prototype: baseObservable;

	/**
	 * Static utility method that facilitates binding a source value or observable to
	 * a target setter and optionally an observer for reverse binding.
	 *
	 * This method implements a flexible two-way binding system:
	 * - If the `observable` argument is a plain value (not a `baseObservable`),
	 *   it invokes the `set` callback immediately once with that value.
	 * - If the `observable` argument is itself a `baseObservable` instance:
	 *   - It calls `set` immediately with the observable's current value.
	 *   - If the observable supports output binding modes (`"to"` or `"two-way"`),
	 *     it subscribes to the `"valuechanged"` event, calling `set` on updates.
	 *   - If the observable supports input binding modes (`"from"` or `"two-way"`),
	 *     it invokes the optional `observe` callback to handle reverse updates.
	 *
	 * @template T The type of the value managed by the observable or passed as a plain value.
	 * @param observable The source value or {@link baseObservable} to bind from.
	 * @param set A callback function to update the target when the source value changes.
	 * @param observe An optional callback function invoked for input binding from target to source.
	 */
	autoBind<T>(observable: baseObservable<T> | T, set: (val: T) => void, observe?: (val: T) => void): void;
}

/**
 * Factory function creating a new `baseObservable` instance wrapping the provided
 * base function which produces or manages the observable's value.
 *
 * The returned callable object implements the `baseObservable` interface,
 * including reactive event dispatching and property projections.
 *
 * @template T The type of the value produced or managed by the observable.
 * @param baseFunction The function to invoke on calls to get or update the observable's value.
 * @returns A new instance of {@link baseObservable} wrapping `baseFunction`.
 */
const baseObservable = function<T = any>(baseFunction: (...args: any[]) => T): baseObservable<T> {
	// Create a callable object that delegates to the provided baseFunction
	const callable = ((...args) => baseFunction(...args)) as baseObservable<T>;

	// Assign the observable prototype so instance methods are available
	Object.setPrototypeOf(callable, baseObservable.prototype);

	// Create EventTarget property to enable event dispatch/listening
	callable._eventTarget = new EventTarget();

	callable.bind = Object.create(baseObservable.prototype.bind);
	callable.bind.__observable__ = callable;

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

Object.defineProperties(baseObservable.prototype, {
	// Default binding mode is "to" (ViewModel → UI)
	type: {
		value: 'to',
		writable: false,
		configurable: false,
		enumerable: true
	},
	[Symbol.toStringTag]: {
		value: 'baseObservable',
		writable: false,
		configurable: false,
		enumerable: false
	}
});

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

baseObservable.prototype.bind = new Proxy({
	__observable__: baseObservable.prototype,
	select<T, U>(selector: (value: T) => U): baseObservable<U> {
		return (() => selector(this.__observable__())).computed(this.__observable__)
	},
}, {
	get(target, p, receiver) {
		if (p in target)
			return Reflect.get(target, p, receiver);
		const value = target.__observable__();
		if (!(p in value))
			return undefined;
		if (typeof value[p] === 'function')
			return (...args) => target.select((x: any) => x[p](...args));
		return target.select((x: any) => x[p]);
	}
}) as baseObservable['bind'];

baseObservable.autoBind = <T>(observable: baseObservable<T> | T, set: (val: T) => void, observe?: (val: T) => void) => {
	// Plain value: just set it
	if (!(observable instanceof baseObservable)) {
		set(observable);
		return () => {}; // No cleanup needed
	}

	// Initial set
	set(observable());

	const listener = () => set(observable());

	// Bind for "to" or "two-way"
	if (observable.type === "to" || observable.type === "two-way") {
		observable.addEventListener("valuechanged", listener);
	}

	// Bind for "from" or "two-way"
	if (observable.type === "from" || observable.type === "two-way") {
		observe?.(observable());
	}

	// Return unbind function
	return () => {
		if (observable.type === "to" || observable.type === "two-way") {
			observable.removeEventListener("valuechanged", listener)
		}
	};
};
