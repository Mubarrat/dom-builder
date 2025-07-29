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
	 * Applies an **optimistic update** strategy:
	 *
	 * - Immediately updates state using `updater`.
	 * - If the `promise` resolves, applies `resolver` (if provided) for reconciliation.
	 * - If the `promise` rejects, reverts to the previous value and optionally calls `onError`.
	 *
	 * @typeParam R The resolved type of the `promise`.
	 * @param updater Function to optimistically modify current value.
	 * @param promise Async operation representing the intended update.
	 * @param resolver Optional reconciliation function upon promise resolution.
	 * @param onError Optional rollback handler invoked on error.
	 * @returns The same `promise` for chaining but with handling.
	 */
	optimistic<R>(
		updater: (current: T) => T | void,
		promise: Promise<R>,
		resolver?: (current: T, result: R) => T | void,
		onError?: (err: any, rollbackValue: T) => void
	): Promise<R | void>;

	/**
	 * Applies a **pessimistic update** strategy:
	 *
	 * - Waits for the `promise` to resolve before updating state via `updater`.
	 * - If the `promise` rejects, optionally calls `onError` without rollback.
	 *
	 * @typeParam R The resolved type of the `promise`.
	 * @param promise Async operation representing the intended update.
	 * @param updater Function to apply value updates after resolution.
	 * @param onError Optional error handler (no rollback).
	 * @returns The same `promise` for chaining but with handling.
	 */
	pessimistic<R>(
		promise: Promise<R>,
		updater: (current: T, result: R) => T | void,
		onError?: (err: any, current: T) => void
	): Promise<R | void>;
}

declare namespace observable {
	/**
	 * Prototype object for all {@link observable} instances.
	 * Allows introspection or extension of shared behavior.
	 */
	var prototype: observable;
}

function observable<T>(initialValue: T | null = null): observable<T> {
	let value = initialValue;

	// Wrap the internal value in a baseObservable for reactivity
	const obs = baseObservable(function (newValue) {
		// Update only when a new value is provided and it's different
		if (arguments.length !== 0 && value !== newValue) {
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

observable.prototype.optimistic = function<T, R>(
	updater: (current: T) => T | void,
	promise: Promise<R>,
	resolver?: (current: T, result: R) => T | void,
	onError?: (err: any, rollbackValue: T) => void
): Promise<R | void> {
	// Snapshot current value for rollback in case of failure
	const value = this();
	const snapshot = Array.isArray(value)
		? [...value] // shallow copy for arrays
		: value && typeof value === "object"
			? Object.create(Object.getPrototypeOf(value), Object.getOwnPropertyDescriptors(value)) // shallow copy for objects
			: value;

	// Perform optimistic update (mutable or immutable)
	const returnedObject = updater(this());
	if (
		typeof returnedObject === typeof value &&
		returnedObject != null &&
		value != null &&
		returnedObject.constructor === value.constructor
	) {
		this(returnedObject); // immutable update: replace value
	} else {
		this.notify(); // mutable update: trigger subscribers without replacement
	}

	return promise.then(result => {
		// Reconcile state if resolver is provided
		if (typeof resolver === "function") {
			const next = resolver(this(), result);
			if (
				typeof next === typeof value &&
				next != null &&
				value != null &&
				next.constructor === value.constructor
			) {
				this(next); // immutable reconciliation
			} else {
				this.notify(); // fallback notify for mutation
			}
		}
		return result;
	}).catch(err => {
		// Rollback on failure
		this(snapshot);
		if (typeof onError === "function") {
			onError(err, snapshot);
		} else {
			throw err;
		}
	});
};

observable.prototype.pessimistic = function<T, R>(
	promise: Promise<R>,
	updater: (current: T, result: R) => T | void,
	onError?: (err: any, current: T) => void
): Promise<R | void> {
	const value = this();

	// Apply update only after promise resolves
	return promise.then(result => {
		const returnedObject = updater(this(), result);
		if (
			typeof returnedObject === typeof value &&
			returnedObject != null &&
			value != null &&
			returnedObject.constructor === value.constructor
		) {
			this(returnedObject); // immutable update
		} else {
			this.notify(); // mutable update
		}
		return result;
	}).catch(err => {
		if (typeof onError === "function") {
			onError(err, this());
		} else {
			throw err;
		}
	});
};

Object.defineProperty(observable.prototype, Symbol.toStringTag, {
	get: () => 'observable',
	writable: false,
	enumerable: false,
	configurable: false
});
