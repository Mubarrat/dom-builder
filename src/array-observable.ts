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
	| { sortFn: ((a: T, b: T) => number) | null }
	| { sortedIndices: number[] };

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
	 * - Immediately mutates the array using `updater`.
	 * - If the `promise` resolves, keeps the optimistic changes.
	 * - If the `promise` rejects, reverts the array to its previous state.
	 *
	 * @remarks
	 * The `updater` function **must be synchronous**; asynchronous mutations
	 * will not be captured for rollback.
	 *
	 * @typeParam R The resolved type of the `promise`.
	 * @param updater Function to synchronously and optimistically modify the array.
	 * @param promise Async operation representing the intended update.
	 * @returns The same `promise` for chaining, with rollback on rejection.
	 */
	optimistic<R>(updater: (current: arrayObservable<T>) => void, promise: Promise<R>): Promise<R>;

	bind: baseObservable<T[]>['bind'] & {
		__observable__: arrayObservable<T>;
		map<U>(mapper: (item: T, index: number, array: arrayObservable<T>) => U): arrayObservable<U>;
	}
}

interface arrayObservableConstructor extends Omit<baseObservableConstructor, '' | 'prototype'> {
	<T>(initialValues: Iterable<T>): arrayObservable<T>;

	/**
	 * Prototype object for all {@link arrayObservable} instances.
	 * Useful for extending methods or introspection.
	 */
	prototype: arrayObservable;
}

const arrayObservable = function<T>(initialValues: Iterable<T>): arrayObservable<T> {
	// Internal backing storage (never directly exposed to users)
	const array: T[] = [...initialValues];

	// Base observable for broadcasting value changes
	const obs = baseObservable(() => [...array]) as arrayObservable<T>;
	Object.setPrototypeOf(obs, arrayObservable.prototype);

	// Proxy traps allow indexed access and mutation interception
	const proxy = new Proxy(obs, {
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
						target.tryChange(() => array.reverse(), { reversed: true })
						return receiver;
					};

				case "sort":
					return (compareFn?: (a: T, b: T) => number) => {
						// Pre-notify with the intent
						if (!target.notifyBefore({ sortFn: compareFn || null })) return receiver;

						// Perform sort
						const oldArray = [...array];
						array.sort(compareFn);

						// Compute permutation mapping: old index → new index
						const sortedIndices = oldArray.map(item => array.indexOf(item));

						// Post-notify with the actual permutation
						target.notify({ sortedIndices });

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
				if (Number.isInteger(n) && n >= 0 && String(n) === prop && !Object.is(array[n], value))
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
					configurable: true,
					enumerable: false,
					value: array.length,
					writable: true,
				};
			}
			return Object.getOwnPropertyDescriptor(target, prop);
		},
	});

	obs.bind = Object.create(arrayObservable.prototype.bind);
	obs.bind.__observable__ = proxy;

	return proxy;
} as arrayObservableConstructor;

Object.setPrototypeOf(arrayObservable.prototype, baseObservable.prototype);
Object.setPrototypeOf(arrayObservable, baseObservable);

arrayObservable.prototype.optimistic = function<T, R>(updater: (current: arrayObservable<T>) => void, promise: Promise<R>): Promise<R> {
	// Collect all valuechanged events triggered by updater
	const changes: ArrayChange<T>[] = [];

	const capture = (e: ValueChangeEvent<ArrayChange<T>>) =>
		changes.push(e as Extract<ValueChangeEvent<ArrayChange<T>>, ArrayChange<T>>);

	this.addEventListener("valuechanged", capture);
	updater(this); // must be synchronous
	this.removeEventListener("valuechanged", capture);

	// On reject, replay inverse changes in reverse order
	return promise.catch(err => {
		for (let i = changes.length - 1; i >= 0; i--) {
			const change = changes[i];
			if ("index" in change) {
				this.splice(change.index, change.newItems?.length ?? 0, ...(change.oldItems ?? []));
			} else if ("reversed" in change) {
				this.reverse(); // Reverse again to undo
			} else if ("sortedIndices" in change) {
				// Build inverse mapping: newIndex -> oldIndex
				const inverse = new Array(change.sortedIndices.length);
				for (let oldIndex = 0; oldIndex < change.sortedIndices.length; oldIndex++)
					inverse[change.sortedIndices[oldIndex]] = oldIndex;

				// Precompute current index → old index mapping
				const lookup = new Map<T, number>();
				this.forEach((item, i) => lookup.set(item, inverse[i]));

				this.sort((a, b) => lookup.get(a)! - lookup.get(b)!);
			}
		}

		throw err;
	});
};

Object.defineProperty(arrayObservable.prototype, Symbol.toStringTag, {
	value: 'arrayObservable',
	writable: false,
	enumerable: false,
	configurable: false
});

arrayObservable.prototype.bind = Object.create(baseObservable.prototype.bind);
arrayObservable.prototype.bind.__observable__ = arrayObservable.prototype;
arrayObservable.prototype.bind.map = function<T, U>(
	mapper: (item: T, index: number, array: arrayObservable<T>) => U
): arrayObservable<U> {
	// Initial mapping
	const mapped = arrayObservable(this.__observable__.map((item, i) => mapper.call(this.__observable__, item, i, this.__observable__)));

	// Create WeakRef to mapped array
	const weakMapped = new WeakRef(mapped);

	// Register cleanup for mapped when GC’d
	const registry = new FinalizationRegistry(() =>
		// On mapped GC, unsubscribe automatically
		this.__observable__.removeEventListener("valuechanged", updateListener)
	);

	// Register the mapped observable for cleanup
	registry.register(mapped, weakMapped);

	// Listener to sync mapped array
	const updateListener = (change: ValueChangeEvent<ArrayChange<T>>) => {
		const target = weakMapped.deref();
		if (!target) return; // GC’d

		if ("index" in change) {
			const { index, newItems, oldItems } = change;
			if ((oldItems && oldItems.length) || (newItems && newItems.length)) {
				target.splice(
					index,
					oldItems?.length ?? 0,
					...(newItems?.map((item, i) => mapper.call(this.__observable__, item, index + i, this.__observable__)) ?? [])
				);
			}
		}

		if ("reversed" in change) target.reverse();
		if ("sortFn" in change) target.sort(change.sortFn);
	};

	this.__observable__.addEventListener("valuechanged", updateListener);

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
