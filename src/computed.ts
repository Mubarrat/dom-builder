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
 * Extends the global `Function` interface with a new `.computed` method.
 *
 * Usage:
 * ```ts
 * const obsA = baseObservable(10);
 * const obsB = baseObservable(20);
 * const computedSum = (() => obsA() + obsB()).computed(obsA, obsB);
 * console.log(computedSum()); // 30
 * obsA(15);
 * console.log(computedSum()); // Reactively updated to 35
 * ```
 *
 * @template T Return type of the computed function.
 */
declare interface Function {
	/**
	 * Turns this zero-argument function into a reactive computed observable.
	 * The resulting computed observable recalculates whenever any of the
	 * provided dependent observables emit a "valuechanged" event.
	 *
	 * @param observables One or more baseObservable dependencies that trigger updates.
	 * @returns A computed observable instance that exposes the derived value.
	 */
	computed: computedConstructor;
}

/**
 * Represents a reactive computed observable derived from a function.
 * 
 * It implements all features of a `baseObservable` (subscription, notifications)
 * and exposes the computed value as `.value`.
 *
 * @template T The type of the computed value.
 */
interface computed<T = any> extends baseObservable<T> {
	readonly value: T;
}

/**
 * Constructor signature and static API for `.computed`.
 *
 * Invoking `.computed` on a zero-argument function converts it into
 * a reactive computed observable that listens to changes on its dependencies.
 */
interface computedConstructor extends Omit<baseObservableConstructor, ''> {
	<T>(this: () => T, ...observables: baseObservable[]): computed<T>;

	/**
	 * Prototype object for all computed observables.
	 * Allows extension or inspection of computed-specific members.
	 */
	readonly prototype: computed;
}

// Using an IIFE/block to avoid polluting global scope variables
{
	/**
	 * A FinalizationRegistry cleans up event listeners on dependencies
	 * when the computed observable itself is garbage collected.
	 *
	 * This prevents memory leaks by removing subscriptions to observables
	 * no longer needed when the computed observable is discarded.
	 */
	const computedRegistry = new FinalizationRegistry<{
		observers: baseObservable[],
		listener: () => void
	}>(
		/**
		 * Cleanup callback invoked by the garbage collector after
		 * the computed observable is collected.
		 * 
		 * Unsubscribes all listeners attached to the dependent observables.
		 */
		({ observers, listener }) => {
			observers.forEach(obs => {
				obs.removeEventListener("valuechanged", listener);
			});
		}
	);

	/**
	 * Implementation of the `.computed` method attached to Function.prototype.
	 *
	 * Converts the zero-argument function (`this`) into a reactive computed observable.
	 * It listens for changes on all given `baseObservable` dependencies and triggers
	 * recomputation and notification on the computed observable.
	 *
	 * @template T Return type of the function.
	 * @param observables List of observables to listen to for changes.
	 * @returns A computed observable wrapping the function output reactively.
	 */
	Function.prototype.computed = function<T>(this: () => T, ...observables: baseObservable[]): computed<T> {
		// Create a baseObservable wrapping this function (acts as the computed observable)
		const obs = baseObservable(this) as computed<T>;

		// Hold a weak reference to the observable for cleanup checks
		const weakObs = new WeakRef(obs);

		// Unique token used for unregistering from FinalizationRegistry later
		const token = {};

		/**
		 * Listener function invoked whenever any dependent observable emits "valuechanged".
		 * It triggers the computed observable to notify its subscribers of a new value.
		 */
		const notifyListener = () => {
			const strongObs = weakObs.deref();
			if (strongObs) {
				// Computed observable still alive → notify subscribers of updated value
				strongObs.notify();
			} else {
				// Computed observable has been garbage collected → cleanup immediately
				observables.forEach(o => o.removeEventListener("valuechanged", notifyListener));
				computedRegistry.unregister(token);
			}
		};

		// Attach notifyListener to each dependent observable's "valuechanged" event
		observables.forEach(o => {
			if (o instanceof baseObservable) {
				o.addEventListener("valuechanged", notifyListener);
			}
		});

		// Register the computed observable with the FinalizationRegistry
		// so that cleanup runs when GC collects this observable
		computedRegistry.register(obs, { observers: observables, listener: notifyListener }, token);

		// Set the prototype of the computed observable to `Function.prototype.computed.prototype`
		// to allow type checks and extensions specific to computed observables.
		Object.setPrototypeOf(obs, Function.prototype.computed.prototype);

		// Return the reactive computed observable
		return obs;
	} as computedConstructor;
}

// Setup proper prototype chain for inheritance and introspection

// Set the prototype of Function.prototype.computed.prototype to baseObservable.prototype,
// so computed instances inherit observable methods.
Object.setPrototypeOf(Function.prototype.computed.prototype, baseObservable.prototype);

// Make Function.prototype.computed inherit from baseObservable constructor,
// so static members and instanceof checks behave as expected.
Object.setPrototypeOf(Function.prototype.computed, baseObservable);

// Define Symbol.toStringTag to identify computed observables as "computed"
Object.defineProperty(Function.prototype.computed.prototype, Symbol.toStringTag, {
	value: 'computed',
	writable: false,
	enumerable: false,
	configurable: false
});
