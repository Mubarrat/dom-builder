/*
 * MIT License
 * Copyright (c) 2025 Mubarrat
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
 * Describes changes to an {@link arrayObservable}.
 *
 * - Supports granular mutations (insert/remove at index)
 * - Supports structural reorder operations (reverse, sort)
 *
 * @template T Element type of the observable array
 */
type ArrayChange<T> =
	| {
		/** Index where elements were added/removed/replaced */
		index: number;
		/** New elements (if any) inserted at `index` */
		newItems?: T[];
		/** Previous elements removed from `index` */
		oldItems?: T[];
	}
	| { reversed: true }
	| { sortFn: ((a: T, b: T) => number) | null };

/**
 * Reactive array type combining {@link baseObservable} semantics with native Array methods.
 *
 * - Provides `valuechanged` events describing precise mutations
 * - Proxy-wrapped for transparent index/length access
 * - Supports read-only derived projections via {@link arrayObservable.bindMap}
 *
 * @template T Element type
 */
interface arrayObservable<T = any> extends baseObservable<T[]>, Array<T> {
	/**
	 * Create a reactive mapped projection of this observable array.
	 *
	 * @template U New element type
	 * @param mapper
	 * Function mapping `(item, index, source)` → `mapped value`.
	 * Called initially and on every update.
	 *
	 * @returns
	 * A read-only {@link arrayObservable} mirroring the source,
	 * throwing on any direct mutations.
	 */
	bindMap<U>(mapper: (item: T, index: number, array: arrayObservable<T>) => U): arrayObservable<U>;

	/**
	 * Dispatches `valuechanging` events describing array mutations.
	 *
	 * @param change
	 * Structured change payload describing
	 * either granular index mutations or structural reorder operations.
	 */
	notifyBefore(change: ArrayChange<T>): boolean;

	/**
	 * Dispatches `valuechanged` events describing array mutations.
	 *
	 * @param change
	 * Structured change payload describing
	 * either granular index mutations or structural reorder operations.
	 */
	notify(change: ArrayChange<T>): void;

	/**
	 * Attempts to change the value by invoking a provided mutator function.
	 *
	 * Calls `notifyBefore()` first; if canceled, does nothing and returns `undefined`.
	 * Otherwise applies the change, calls `notify()`, and returns the function’s result.
	 *
	 * @param fn The function that performs the actual change and returns a result.
	 * @param change {@link ArrayChange} object describing the change.
	 * @returns The result of `fn()` if applied; otherwise `undefined` if canceled.
	 */
	tryChange<TResult>(fn: () => TResult, change: ArrayChange<T>): TResult | undefined;

	/**
	 * Applies an **optimistic update** strategy to the array:
	 *
	 * - Immediately mutates array using `updater`.
	 * - If the `promise` resolves, applies `resolver` (if provided).
	 * - If the `promise` rejects, reverts to previous state and optionally calls `onError`.
	 *
	 * @typeParam R The resolved type of the `promise`.
	 * @param updater Function to optimistically modify current array.
	 * @param promise Async operation representing the intended update.
	 * @param resolver Optional reconciliation function upon promise resolution.
	 * @param onError Optional rollback handler invoked on error.
	 * @returns The same `promise` for chaining but with handling.
	 */
	optimistic<R>(
		updater: (current: arrayObservable<T>) => T[] | void,
		promise: Promise<R>,
		resolver?: (current: arrayObservable<T>, result: R) => T[] | void,
		onError?: (err: any, rollbackValue: arrayObservable<T>) => void
	): Promise<R | void>;

	/**
	 * Applies a **pessimistic update** strategy to the array:
	 *
	 * - Waits for the `promise` to resolve before mutating array via `updater`.
	 * - If the `promise` rejects, optionally calls `onError`.
	 *
	 * @typeParam R The resolved type of the `promise`.
	 * @param promise Async operation representing the intended update.
	 * @param updater Function to apply value updates after resolution.
	 * @param onError Optional error handler (no rollback).
	 * @returns The same `promise` for chaining but with handling.
	 */
	pessimistic<R>(
		promise: Promise<R>,
		updater: (current: arrayObservable<T>, result: R) => T[] | void,
		onError?: (err: any, current: arrayObservable<T>) => void
	): Promise<R | void>;
}

declare namespace arrayObservable {
	/**
	 * Prototype object for all {@link arrayObservable} instances.
	 * Useful for extending methods or introspection.
	 */
	var prototype: arrayObservable;
}

function arrayObservable<T>(initialValues: Iterable<T>): arrayObservable<T> {
	// Internal backing storage (never directly exposed to users)
	const array: T[] = [...initialValues];

	// Base observable for broadcasting value changes
	const obs = baseObservable(() => [...array]) as arrayObservable<T>;
	Object.setPrototypeOf(obs, arrayObservable.prototype);

	// Proxy traps allow indexed access and mutation interception
	return new Proxy(obs, {
		get(target, prop, receiver) {
			switch (prop) {
				case "push":
					return (...items: T[]) => target.tryChange(() => array.push(...items), { index: array.length, newItems: items }) ?? array.length;

				case "pop":
					return () => {
						if (array.length === 0) return undefined;
						return target.tryChange(() => array.pop()!, { index: array.length - 1, oldItems: [array[array.length - 1]] });
					};

				case "shift":
					return () => {
						if (array.length === 0) return undefined;
						return target.tryChange(() => array.shift()!, { index: 0, oldItems: [array[0]] });
					};

				case "unshift":
					return (...items: T[]) => target.tryChange(() => array.unshift(...items), { index: 0, newItems: items }) ?? array.length;

				case "splice":
					return (start: number, deleteCount?: number, ...items: T[]) => {
						if (start < 0) start = array.length + start;
						if (deleteCount === undefined) deleteCount = array.length - start;
						return target.tryChange(() => array.splice(start, deleteCount!, ...items), {
							index: start,
							newItems: items.length ? items : undefined,
							oldItems: array.slice(start, start + deleteCount)
						}) ?? [];
					};

				case "reverse":
					return () => {
						target.tryChange(array.reverse, { reversed: true })
						return receiver;
					};

				case "sort":
					return (compareFn?: (a: T, b: T) => number) => {
						target.tryChange(() => array.sort(compareFn), { sortFn: compareFn || null });
						return receiver;
					};

				case "fill":
					return (value: T, start?: number, end?: number) => {
						if (start == null) start = 0;
						if (end == null) end = array.length;
						target.tryChange(() => array.fill(value, start, end), {
							index: start,
							newItems: Array(end - start).fill(value),
							oldItems: array.slice(start, end)
						});
						return receiver;
					};

				case "copyWithin":
					return (targetIndex: number, start?: number, end?: number) => {
						if (start == null) start = 0;
						if (end == null) end = array.length;
						target.tryChange(() => array.copyWithin(targetIndex, start, end), {
							index: targetIndex,
							newItems: array.slice(start, end),
							oldItems: array.slice(targetIndex, targetIndex + (end - start))
						});
						return receiver;
					};

				default:
					return Reflect.get(array, prop, receiver) ?? Reflect.get(target, prop, receiver);
			}
		},

		set(target, prop, value, receiver) {
			// Handle numeric index assignment
			if (typeof prop === "string") {
				const n = Number(prop);
				if (Number.isInteger(n) && n >= 0 && String(n) === prop && array[n] !== value)
					return target.tryChange(() => {
						array[n] = value;
						return true;
					}, { index: n, newItems: [value], oldItems: [array[n]] }) ?? false;
			}

			// Handle length change
			if (prop === "length") {
				const oldLength = array.length;
				const newLength = Number(value);
				return target.tryChange(() => {
					array.length = newLength;
					return true;
				}, (newLength < oldLength
					? { index: newLength, oldItems: array.slice(newLength) }
					: { index: oldLength, newItems: Array(newLength - oldLength) }
				)) ?? false;
			}

			// Fallback: set on observable wrapper
			return Reflect.set(target, prop, value, receiver);
		},

		has(target, prop) {
			if (prop === "length") return true;
			if (typeof prop === "string") {
				const n = Number(prop);
				if (Number.isInteger(n) && n >= 0 && String(n) === prop)
					return n < array.length;
			}
			return prop in target;
		},

		ownKeys: target =>
			Array.from({ length: array.length }, (_, i) => i.toString()).concat(Object.getOwnPropertyNames(target)),

		getOwnPropertyDescriptor(target, prop) {
			if (typeof prop === "string") {
				const n = Number(prop);
				if (Number.isInteger(n) && n >= 0 && String(n) === prop) {
					return {
						configurable: true,
						enumerable: true,
						value: array[n],
						writable: true,
					};
				}
			}
			if (prop === "length") {
				return {
					configurable: false,
					enumerable: false,
					value: array.length,
					writable: true,
				};
			}
			return Object.getOwnPropertyDescriptor(target, prop);
		},
	});
}

Object.setPrototypeOf(arrayObservable.prototype, baseObservable.prototype);
Object.setPrototypeOf(arrayObservable, baseObservable);

arrayObservable.prototype.bindMap = function<T, U>(
	mapper: (item: T, index: number, array: arrayObservable<T>) => U
): arrayObservable<U> {
	// Initial mapping of existing items
	const mapped = arrayObservable(this.map((item, i) => mapper.call(this, item, i, this)));

	// Synchronize mapped array on each source mutation
	this.addEventListener("valuechanged", (change: ValueChangeEvent<ArrayChange<T>>) => {
		if ("index" in change) {
			const { index, newItems, oldItems } = change;
			if ((oldItems && oldItems.length) || (newItems && newItems.length)) {
				mapped.splice(
					index,
					oldItems?.length ?? 0,
					...(newItems?.map((item, i) => mapper.call(this, item, index + i, this)) ?? [])
				);
			}
		}

		if ("reversed" in change) mapped.reverse();
		if ("sortFn" in change) mapped.sort(); // Mirror source ordering
	});

	// Enforce immutability: throw on all mutation attempts
	return new Proxy(mapped, {
		get(target, prop, receiver) {
			if (["push", "pop", "shift", "unshift", "splice", "reverse", "sort", "fill", "copyWithin"].includes(String(prop))) {
				return () => {
					throw new Error("Cannot modify a read-only mapped observable");
				};
			}
			return Reflect.get(target, prop, receiver);
		},
		set(target, prop, value, receiver) {
			if (typeof prop === "string") {
				const n = Number(prop);
				if (Number.isInteger(n) && n >= 0 && String(n) === prop)
					throw new Error("Cannot modify any item of a read-only mapped observable");
			}
			if (prop === "length")
				throw new Error("Cannot modify length of a read-only mapped observable");

			return Reflect.set(target, prop, value, receiver);
		}
	}) as arrayObservable<U>;
};

arrayObservable.prototype.optimistic = function<T, R>(
	updater: (current: arrayObservable<T>) => T[] | void,
	promise: Promise<R>,
	resolver?: (current: arrayObservable<T>, result: R) => T[] | void,
	onError?: (err: any, rollbackValue: arrayObservable<T>) => void
): Promise<R | void> {
	const snapshot = [...this]; // raw for rollback

	// Apply optimistic update (mutable or immutable)
	const returnedArray = updater(this);
	if (Array.isArray(returnedArray)) {
		this.splice(0, this.length, ...returnedArray);
	}

	return promise.then(result => {
		if (typeof resolver === "function") {
			const reconciled = resolver(this, result);
			if (Array.isArray(reconciled)) {
				this.splice(0, this.length, ...reconciled);
			}
		}
		return result;
	}).catch(err => {
		// Rollback state
		this.splice(0, this.length, ...snapshot);

		if (typeof onError === "function") {
			// Wrap snapshot as observable for rollback handler
			onError(err, arrayObservable(snapshot));
		} else {
			throw err;
		}
	});
};

arrayObservable.prototype.pessimistic = function<T, R>(
	promise: Promise<R>,
	updater: (current: arrayObservable<T>, result: R) => T[] | void,
	onError?: (err: any, current: arrayObservable<T>) => void
): Promise<R | void> {
	return promise.then(result => {
		const returnedArray = updater(this, result);
		if (Array.isArray(returnedArray)) {
			this.splice(0, this.length, ...returnedArray);
		}
		return result;
	}).catch(err => {
		if (typeof onError === "function") {
			onError(err, this); // Current observable is already available
		} else {
			throw err;
		}
	});
};

Object.defineProperty(arrayObservable.prototype, Symbol.toStringTag, {
	get: () => 'arrayObservable',
	writable: false,
	enumerable: false,
	configurable: false
});
