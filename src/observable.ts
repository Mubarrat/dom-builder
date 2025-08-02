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
 * Represents a stateful observable extending {@link baseObservable}.
 *
 * Key features:
 * - Holds an internal value with optional initial state.
 * - Supports binding modes for **unidirectional** or **bidirectional** data flow:
 *   - {@link bindTo} (ViewModel → UI)
 *   - {@link bindFrom} (UI → ViewModel)
 * - Provides **async update utilities**:
 *   - {@link optimistic} for immediate updates with rollback on error.
 *   - {@link pessimistic} for deferred updates after async resolution.
 * 
 * For arrays, prefer {@link arrayObservable} instead of {@link observable}.
 * {@link arrayObservable} provides mutation notifications and granular events.
 *
 * @template T The type of the value managed by this observable.
 */
interface observable<T = any> extends baseObservable<T> {
	/**
	 * Returns an observable bound in **"to" mode** (ViewModel → UI):
	 *
	 * - Data flows **only from ViewModel to UI**.
	 * - UI changes will not propagate back to the ViewModel.
	 */
	bindTo: observable<T>;

	/**
	 * Returns an observable bound in **"from" mode** (UI → ViewModel):
	 *
	 * - Data flows **only from UI to ViewModel**.
	 * - ViewModel updates will not propagate to the UI automatically.
	 */
	bindFrom: observable<T>;

	/**
	 * Callable form of the observable:
	 * - **Getter**: No arguments → returns current value.
	 * - **Setter**: With arguments → update and return new value.
	 *
	 * @param newValue New value.
	 * @returns Current/New value if new value was provided and change was allowed.
	 */
	(newValue?: T): T;

	/**
	 * Applies an **optimistic update** strategy (immutable-only):
	 *
	 * - Immediately computes a **new immutable value** using `updater` and applies it.
	 * - If the `promise` rejects, rolls back to the **previous value**.
	 *
	 * **Important:**
	 * - `updater` **must return a new immutable value**; in-place mutations are not supported.
	 * - State changes are applied via `tryChange` to ensure consistent change notifications.
	 *
	 * @typeParam R The resolved type of the `promise`.
	 * @param updater Pure function returning the next value for optimistic update.
	 * @param promise Async operation representing the intended update.
	 * @returns The same `promise` for chaining (with rollback on rejection).
	 */
	optimistic<R>(updater: (current: T) => T, promise: Promise<R>): Promise<R>;
}

declare namespace observable {
	/**
	 * Prototype object for all {@link observable} instances.
	 * Allows introspection or extension of shared behavior.
	 */
	var prototype: observable;
}

function observable<T>(initialValue: T | undefined = undefined): observable<T> {
	let value = initialValue;

	// Wrap the internal value in a baseObservable for reactivity
	const obs = baseObservable(function (newValue) {
		// Update only when a new value is provided and it's different
		if (arguments.length !== 0 && !Object.is(value, newValue)) {
			obs.tryChange(() => value = newValue, { oldValue: value, newValue });
		}
		return value;
	}) as observable<T>;

	Object.setPrototypeOf(obs, observable.prototype);

	// Create bound variants (to/from) inheriting from `obs`
	obs.bindTo = Object.setPrototypeOf(Object.assign((...args) => obs(...args), { type: "to" }), obs);
	obs.bindFrom = Object.setPrototypeOf(Object.assign((...args) => obs(...args), { type: "from" }), obs);

	return obs;
}

Object.setPrototypeOf(observable.prototype, baseObservable.prototype);
Object.setPrototypeOf(observable, baseObservable);
observable.prototype.type = "two-way";

observable.prototype.optimistic = function<T, R>(updater: (current: T) => T, promise: Promise<R>): Promise<R> {
	// Snapshot current value for rollback
	const snapshot = this();

	// Apply optimistic update (must return new value)
	this(updater(snapshot));

	return promise.catch(err => {
		// Rollback on failure
		this(snapshot);
		throw err;
	});
};

Object.defineProperty(observable.prototype, Symbol.toStringTag, {
	value: 'observable',
	writable: false,
	enumerable: false,
	configurable: false
});
