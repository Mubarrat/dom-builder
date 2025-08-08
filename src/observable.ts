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

/**
 * `observable<T>` extends the core reactive primitive `baseObservable<T>` by
 * maintaining a **stateful value** alongside reactive subscriptions.
 *
 * This observable supports:
 * - Direct getter/setter callable interface via `(newValue?: T): T`.
 * - Two-way binding modes (`bind.to` and `bind.from`) for flexible data flow.
 * - Async update patterns, including an **optimistic update** strategy with rollback.
 *
 * Note: For array-like data, use `arrayObservable` instead for richer mutation events.
 *
 * @template T The type of the internal value.
 */
interface observable<T = any> extends baseObservable<T> {
	/**
	 * Callable signature that acts as both:
	 * - Getter (no arguments) — returns current value.
	 * - Setter (with argument) — attempts to update and returns new value.
	 *
	 * @param newValue Optional new value to set.
	 * @returns The current or updated value.
	 */
	(newValue?: T): T;

	/** Current stored value (getter/setter). */
	value: T;

	/**
	 * Applies an **optimistic update**:
	 * 1. Calls `updater` synchronously to calculate a new immutable value.
	 * 2. Immediately applies this new value.
	 * 3. Returns a promise that, on rejection, rolls back to the previous value.
	 *
	 * This strategy is useful for instant UI feedback with rollback on failure.
	 *
	 * @typeParam R The type of the resolved value from the async operation.
	 * @param updater Pure synchronous function returning the new value from current.
	 * @param promise Async promise representing the eventual operation.
	 * @returns The same promise for chaining, with rollback logic attached.
	 */
	optimistic<R>(updater: (current: T) => T, promise: Promise<R>): Promise<R>;

	/** Binding object supporting two-way, "to" and "from" directional bindings. */
	bind: baseObservable<T>['bind'] & {
		__observable__: observable<T>;

		/**
		 * One-way binding mode from ViewModel → UI.
		 * UI updates do NOT propagate back.
		 */
		to: observable<T>;

		/**
		 * One-way binding mode from UI → ViewModel.
		 * ViewModel updates do NOT propagate to UI automatically.
		 */
		from: observable<T>;
	}
}

/**
 * `observableConstructor` defines the signature and prototype for the `observable` factory.
 */
interface observableConstructor extends Omit<baseObservableConstructor, ''> {
	<T>(initialValue?: T): observable<T>;

	/**
	 * Prototype shared by all `observable` instances.
	 * Useful for extending or inspecting observable behavior.
	 */
	readonly prototype: observable;
}

/**
 * Factory function creating a new `observable` instance.
 *
 * It encapsulates an internal value and exposes a reactive callable wrapper,
 * delegating core reactive mechanics to `baseObservable`.
 *
 * @param initialValue Optional initial value to start with.
 * @returns A new `observable` instance wrapping the value.
 */
const observable = function<T>(initialValue?: T): observable<T> {
	// Internal storage for the current value of the observable
	let value = initialValue as T;

	// Create a baseObservable wrapping a getter/setter function over `value`
	const obs = baseObservable(function (newValue) {
		// Setter: only update if argument provided and different value
		if (arguments.length !== 0 && !Object.is(value, newValue)) {
			// Use tryChange to ensure consistent notification and lifecycle hooks
			obs.tryChange(() => value = newValue, { oldValue: value, newValue });
		}
		// Getter: return current value
		return value;
	}) as observable<T>;

	// Set the prototype chain for the observable instance (inherits from observable.prototype)
	Object.setPrototypeOf(obs, observable.prototype);

	// Create a `.bind` object inheriting from the observable prototype's bind property
	obs.bind = Object.create(observable.prototype.bind);
	obs.bind.__observable__ = obs;

	// Create directional binding variants inheriting from the observable itself
	obs.bind.to = Object.setPrototypeOf(Object.assign((...args) => obs(...args), { type: "to" }), obs);
	obs.bind.from = Object.setPrototypeOf(Object.assign((...args) => obs(...args), { type: "from" }), obs);

	return obs;
} as observableConstructor;

// Set up prototype inheritance
Object.setPrototypeOf(observable.prototype, baseObservable.prototype);
Object.setPrototypeOf(observable, baseObservable);

// Define enumerable and configurable properties on the prototype
Object.defineProperties(observable.prototype, {
	/**
	 * The binding type of the observable is `"two-way"` by default.
	 * This is informational and could be used internally for bindings.
	 */
	type: {
		value: 'two-way',
		writable: false,
		configurable: false,
		enumerable: true
	},

	/**
	 * Property accessor for `.value` that delegates to the callable getter/setter.
	 */
	value: {
		get<T>(this: observable<T>): T { return this(); },
		set<T>(this: observable<T>, value: T): T { return this(value); },
		configurable: false,
		enumerable: true
	},

	/**
	 * Customizes string tag for better debugging and inspection.
	 */
	[Symbol.toStringTag]: {
		value: 'observable',
		writable: false,
		configurable: false,
		enumerable: false
	}
});

/**
 * Implements the optimistic update method:
 *
 * - Captures current snapshot.
 * - Applies optimistic new value synchronously.
 * - Rolls back to snapshot on promise rejection.
 *
 * @template T, R
 * @param updater Pure function from current value to next value.
 * @param promise Async operation that must succeed for update to persist.
 * @returns The original promise with rollback side-effect on failure.
 */
observable.prototype.optimistic = function<T, R>(
	updater: (current: T) => T,
	promise: Promise<R>
): Promise<R> {
	// Save current state for rollback in case of error
	const snapshot = this();

	// Apply optimistic update using the updater function
	this(updater(snapshot));

	// If promise rejects, restore previous state and propagate error
	return promise.catch(err => {
		this(snapshot);
		throw err;
	});
};

// Initialize bind property to inherit from baseObservable's bind object
observable.prototype.bind = Object.create(baseObservable.prototype.bind);
observable.prototype.bind.__observable__ = observable.prototype;
