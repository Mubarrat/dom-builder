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
 * Augments the global `Function` type with the `computed` method.
 *
 * The `computed` method transforms a plain function into a reactive **computed observable**:
 * - It automatically recalculates when any of its dependent observables change.
 * - It exposes the same API as {@link baseObservable}, including subscriptions.
 *
 * @template T The computed function’s return type.
 */
declare interface Function {
	/**
	 * Converts this function into a computed observable that recalculates
	 * whenever any of the specified observables emit a `valuechanged` event.
	 *
	 * @param observables The observables this computed depends on.
	 * @returns A computed observable whose value is derived from this function.
	 */
	computed: computedConstructor;
}

/**
 * Represents a computed observable, created via {@link Function.prototype.computed}.
 *
 * @template T The type of the computed value.
 */
interface computed<T = any> extends baseObservable<T> {
	readonly value: T;
}

interface computedConstructor extends Omit<baseObservableConstructor, ''> {
	<T>(this: () => T, ...observables: baseObservable[]): computed<T>;

	/**
	 * Prototype object for all {@link computed} instances.
	 * Useful for extending methods or introspection.
	 */
	readonly prototype: computed;
}

// Encapsulated in a block scope to avoid polluting the global scope.
{
	const computedRegistry = new FinalizationRegistry<{ observers: baseObservable[], listener: () => void }>(
		// Cleanup when computed observable is GC'd
		({ observers, listener }) => observers.forEach(obs => obs.removeEventListener("valuechanged", listener)));

	Function.prototype.computed = function<T>(this: () => T, ...observables: baseObservable[]) {
		const obs = baseObservable(this);
		const weakObs = new WeakRef(obs);
		const token = {}; // Unique token for unregister
		const notifyListener = () => {
			const strongObs = weakObs.deref();
			if (strongObs) {
				strongObs.notify();
			} else {
				// Dead -> cleanup immediately (backup if FinalizationRegistry delayed)
				observables.forEach(o => o.removeEventListener("valuechanged", notifyListener));
				computedRegistry.unregister(token); // <--- Proper unregister
			}
		};
		// Attach listeners
		observables.forEach(o => {
			if (o instanceof baseObservable) {
				o.addEventListener("valuechanged", notifyListener);
			}
		});
		// Register for post-GC cleanup
		computedRegistry.register(obs, { observers: observables, listener: notifyListener }, token);
		Object.setPrototypeOf(obs, Function.prototype.computed.prototype);
		return obs;
	} as computedConstructor;
}

// Establish prototype and inheritance
Object.setPrototypeOf(Function.prototype.computed.prototype, baseObservable.prototype);
Object.setPrototypeOf(Function.prototype.computed, baseObservable);
Object.defineProperty(Function.prototype.computed.prototype, Symbol.toStringTag, {
	value: 'computed',
	writable: false,
	enumerable: false,
	configurable: false
});
