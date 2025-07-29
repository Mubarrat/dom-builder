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
	computed<T>(this: () => T, ...observables: baseObservable[]): computed<T>;
}

/**
 * Represents a computed observable, created via {@link Function.prototype.computed}.
 *
 * @template T The type of the computed value.
 */
interface computed<T = any> extends baseObservable<T> {}

Function.prototype.computed = function(...observables) {
	// Wrap the function as a baseObservable
	const obs = baseObservable(this);

	// Subscribe computed to changes in dependencies
	observables.forEach(observable => {
		if (observable instanceof baseObservable) {
			observable.addEventListener('valuechanged', obs.notify);
		}
	});

	// Set prototype chain to inherit computed methods
	Object.setPrototypeOf(obs, Function.prototype.computed.prototype);
	return obs;
};

// Establish prototype and inheritance
Function.prototype.computed.prototype = Object.create(baseObservable.prototype) as computed;
Function.prototype.computed.prototype.constructor = Function.prototype.computed;
Object.setPrototypeOf(Function.prototype.computed, baseObservable);
Object.defineProperty(Function.prototype.computed.prototype, Symbol.toStringTag, {
	get: () => 'computed',
	writable: false,
	enumerable: false,
	configurable: false
});
