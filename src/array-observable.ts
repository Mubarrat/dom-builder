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
 * Describes the shape of change events emitted by an {@link arrayObservable}.
 *
 * This type models the various mutation operations possible on the observable array.
 * Each variant corresponds to a particular mutation category:
 * - Insertions/removals/replacements at a specific index,
 * - Reversals of the entire array,
 * - Sorting operations with optional custom comparer,
 * - Providing indices mapping for sorted array items.
 *
 * This enables consumers and internal implementations to precisely react to
 * what part of the array changed and how.
 *
 * @template T The type of elements contained in the observable array.
 *
 * @example
 * ```ts
 * // Example of an insertion change:
 * const insertion: ArrayChange<string> = {
 *   index: 2,
 *   newItems: ["hello", "world"]
 * };
 *
 * // Example of a reversal change:
 * const reversal: ArrayChange<number> = { reversed: true };
 *
 * // Example of a sort change with a comparator:
 * const sort: ArrayChange<number> = {
 *   sortFn: (a, b) => a - b
 * };
 *
 * // Example of sorted indices change (mapping new index → old index):
 * const sortedIndicesChange: ArrayChange<number> = {
 *   sortedIndices: [2, 0, 1]
 * };
 * ```
 *
 * @see {@link arrayObservable} for usage.
 */
type ArrayChange<T> =
	| {
		/** The zero-based index at which elements were inserted, removed, or replaced. */
		index: number;

		/** The new elements inserted at the specified index, if any. */
		newItems?: T[];

		/** The previous elements removed from the specified index, if any. */
		oldItems?: T[];
	}
	| { reversed: true }
	| { sortFn: ((a: T, b: T) => number) | null }
	| { sortedIndices: number[] };

/**
 * A reactive, observable array type that extends native Array capabilities with
 * fine-grained change notifications and proxy-based index access.
 *
 * This type wraps a native array and provides:
 * - Transparent proxy access via index or length properties,
 * - Precise mutation events describing granular changes (insert, remove, reorder),
 * - Support for optimistic updates with rollback on async failure,
 * - Read-only mapped projections that stay synchronized with source changes,
 * - Compatibility with a base observable pattern (from {@link baseObservable}).
 *
 * @template T The type of elements contained in the observable array.
 *
 * @remarks
 * The {@link arrayObservable} is designed for reactive programming scenarios where
 * UI or other consumers need to update precisely and efficiently on array changes.
 * It supports all standard array mutation methods (`push`, `pop`, `splice`, etc.)
 * while emitting structured change events.
 *
 * @example
 * ```ts
 * import { arrayObservable } from 'your-observable-library';
 *
 * // Create an observable array of numbers
 * const numbers = arrayObservable([1, 2, 3]);
 *
 * // Listen for detailed changes
 * numbers.addEventListener('valuechanged', (event) => {
 *   console.log('Change detected:', event.detail);
 * });
 *
 * // Mutate the array - triggers change notifications
 * numbers.push(4);    // Change: { index: 3, newItems: [4] }
 * numbers.splice(1, 1, 9); // Change: { index: 1, oldItems: [2], newItems: [9] }
 *
 * // Reactive UI frameworks can subscribe and update only changed parts.
 * ```
 *
 * @see {@link ArrayChange} for the shape of change events emitted.
 * @see {@link baseObservable} for base observable functionality.
 */
interface arrayObservable<T = any> extends baseObservable<T[]>, Array<T> {
	/**
	 * Notifies listeners *before* a mutation is applied.
	 *
	 * This method dispatches a `valuechanging` event containing a structured
	 * payload describing the planned mutation. Listeners can cancel the operation
	 * by returning `false`.
	 *
	 * @param change An {@link ArrayChange} describing the intended mutation.
	 * @returns `true` if the change is allowed and should proceed, `false` if canceled.
	 *
	 * @example
	 * ```ts
	 * observableArray.addEventListener('valuechanging', (e) => {
	 *   if (someCondition) e.preventDefault(); // cancels change
	 * });
	 * const allowed = observableArray.notifyBefore({ index: 0, newItems: [42] });
	 * if (allowed) {
	 *   // proceed with mutation
	 * }
	 * ```
	 */
	notifyBefore(change: ArrayChange<T>): boolean;

	/**
	 * Notifies listeners *after* a mutation has been applied.
	 *
	 * This method dispatches a `valuechanged` event containing a structured
	 * payload describing the mutation that just occurred.
	 *
	 * @param change An {@link ArrayChange} describing the mutation that was applied.
	 *
	 * @example
	 * ```ts
	 * observableArray.addEventListener('valuechanged', (e) => {
	 *   console.log('Array mutated:', e.detail);
	 * });
	 * observableArray.notify({ index: 1, oldItems: [10], newItems: [20] });
	 * ```
	 */
	notify(change: ArrayChange<T>): void;

	/**
	 * Attempts to apply a mutation atomically by invoking a mutator function.
	 *
	 * This method wraps the mutation in `notifyBefore` and `notify` calls.
	 * If `notifyBefore` returns `false`, the mutation is canceled and no changes
	 * occur.
	 *
	 * @param fn A synchronous function performing the mutation and returning a result.
	 * @param change An {@link ArrayChange} describing the mutation for notification.
	 * @returns The return value of `fn` if the mutation succeeds; otherwise `undefined`.
	 *
	 * @example
	 * ```ts
	 * const result = observableArray.tryChange(() => {
	 *   observableArray.push(5);
	 *   return observableArray.length;
	 * }, { index: observableArray.length, newItems: [5] });
	 * if (result === undefined) {
	 *   console.log('Mutation was canceled');
	 * } else {
	 *   console.log('New length:', result);
	 * }
	 * ```
	 */
	tryChange<TResult>(fn: () => TResult, change: ArrayChange<T>): TResult | undefined;

	/**
	 * Performs an *optimistic update* that can be rolled back if an async operation fails.
	 *
	 * Applies the synchronous `updater` function to mutate the array immediately.
	 * If the provided `promise` resolves, the changes are kept.
	 * If the `promise` rejects, all changes caused by `updater` are reverted.
	 *
	 * @typeParam R The type of the value resolved by the promise.
	 * @param updater A synchronous function that applies mutations to the array optimistically.
	 * @param promise An asynchronous operation representing the intended update outcome.
	 * @returns The same `promise`, allowing further chaining.
	 *
	 * @remarks
	 * - The `updater` function **must be synchronous**. Asynchronous mutations
	 *   inside `updater` will not be tracked correctly for rollback.
	 * - This method is useful for cases where optimistic UI updates are desired,
	 *   but errors from async operations should revert the UI.
	 *
	 * @example
	 * ```ts
	 * const updatePromise = fetch('/api/update', { method: 'POST', body: JSON.stringify(data) });
	 * observableArray.optimistic(
	 *   arr => arr.push(newItem),
	 *   updatePromise
	 * ).catch(() => {
	 *   console.error('Update failed, changes reverted.');
	 * });
	 * ```
	 */
	optimistic<R>(updater: (current: arrayObservable<T>) => void, promise: Promise<R>): Promise<R>;

	/**
	 * Extended `bind` functionality inherited from {@link baseObservable}.
	 *
	 * Includes additional observable mapping methods.
	 */
	bind: baseObservable<T[]>['bind'] & {
		__observable__: arrayObservable<T>;

		/**
		 * Creates a **read-only mapped projection** of the observable array.
		 *
		 * The mapped array stays synchronized with source mutations by applying
		 * the `mapper` function to each element.
		 *
		 * The resulting mapped array:
		 * - Is an {@link arrayObservable} of the mapped element type.
		 * - Emits change events on source changes.
		 * - Is **immutable**; attempts to mutate will throw errors.
		 *
		 * @template U The type of elements in the mapped array.
		 * @param mapper A function mapping each source item to a new value.
		 * @returns A new observable array reflecting the mapped items.
		 *
		 * @example
		 * ```ts
		 * const source = arrayObservable([1, 2, 3]);
		 * const squares = source.bind.map(x => x * x);
		 *
		 * squares.addEventListener('valuechanged', e => {
		 *   console.log('Squares updated:', e.detail);
		 * });
		 *
		 * source.push(4);
		 * // squares is now [1, 4, 9, 16]
		 * ```
		 */
		map<U>(mapper: (item: T, index: number, array: arrayObservable<T>) => U): arrayObservable<U>;
	};
}

/**
 * Constructor interface for creating {@link arrayObservable} instances.
 *
 * Supports creating an observable array from:
 * - An iterable of initial values,
 * - An array-like object,
 * - A number to create an empty array of that length.
 *
 * @example
 * ```ts
 * const obs = arrayObservable([1, 2, 3]);
 * const obsFromArrayLike = arrayObservable(document.querySelectorAll('div'));
 * const obsEmpty = arrayObservable(10); // 10 undefined elements
 * ```
 */
interface arrayObservableConstructor extends Omit<baseObservableConstructor, ''> {
	<T>(initialValues: Iterable<T> | ArrayLike<T> | number): arrayObservable<T>;

	/**
	 * Prototype object for all {@link arrayObservable} instances.
	 * Useful for extending or introspecting instances.
	 */
	readonly prototype: arrayObservable;
}

/**
 * Factory function implementing {@link arrayObservableConstructor}.
 *
 * Wraps a native array with a Proxy to enable transparent observable behavior,
 * mutation interception, and change notifications.
 */
const arrayObservable = function<T>(initialValues: Iterable<T> | ArrayLike<T> | number): arrayObservable<T> {
	// Internal backing storage (never directly exposed to users)
	const array: T[] = !initialValues
		? []
		: typeof initialValues === 'number'
			? new Array(initialValues).fill(undefined)
			: Array.from(initialValues);

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
						if (!target.notifyBefore({ sortFn: compareFn || null })) return receiver;

						// Pair each item with its original index
						const indexed = array.map((v, i) => ({ v, i }));

						// Sort the pairs by value, using the compare function
						indexed.sort((a, b) => (compareFn ? compareFn(a.v, b.v) : (a.v > b.v ? 1 : a.v < b.v ? -1 : 0)));

						// Apply the sorted values back to the original array
						for (let i = 0; i < array.length; i++) {
							array[i] = indexed[i].v;
						}

						// Build sortedIndices: new index → original index
						const sortedIndices = indexed.map(pair => pair.i);

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

		has: (target, prop) => prop in target || prop in array,

		deleteProperty(target, prop) {
			if (typeof prop === "string") {
				const n = Number(prop);
				if (Number.isInteger(n) && n >= 0 && String(n) === prop) {
					return target.tryChange(() => {
						array[n] = undefined as T;
						return true;
					}, { index: n, oldItems: [array[n]], newItems: [undefined as T] }) ?? false;
				}
			}
			return Reflect.deleteProperty(target, prop);
		},

		ownKeys: target => [...new Set([...Object.keys(target), ...Object.keys(array)])],

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

Object.defineProperties(arrayObservable.prototype, {
	[Symbol.species]: {
		get() { return arrayObservable; },
		enumerable: false,
		configurable: false
	},
	[Symbol.toStringTag]: {
		value: 'arrayObservable',
		writable: false,
		enumerable: false,
		configurable: false
	}
});

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
