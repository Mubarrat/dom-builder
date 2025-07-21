/**
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

Symbol.observable = Symbol('observable');

function base_observable(baseFunction) {
	const subscriptions = new Set();
	baseFunction.subscribe = fn => { subscriptions.add(fn); return () => subscriptions.delete(fn); };
    baseFunction.notify = () => subscriptions.forEach(fn => fn(baseFunction()));
	baseFunction[Symbol.observable] = "from";
	baseFunction.bindSelect = selector => (() => selector(baseFunction())).computed(baseFunction);
	baseFunction.bindMap = templateFn => baseFunction.bindSelect(collection => {
		if (collection == null || typeof collection[Symbol.iterator] !== 'function')
			throw new Error("bindMap requires an iterable (Array, Set, Generator, etc.)");
		const result = [];
		let index = 0;
		for (const item of collection)
			result.push(templateFn(item, index++));
		return result;
	});
	baseFunction.validatable = (validator = () => true) =>
		Object.setPrototypeOf(Object.assign((...args) => baseFunction(...args), {
			isValid: (() => validator(baseFunction())).computed(baseFunction)
		}), baseFunction);
	baseFunction.coercible = (coerce = x => x) => Object.setPrototypeOf((...args) => {
		if (args.length === 0) return baseFunction();
		const coerced = coerce(...args);
		if (Array.isArray(coerced)) return baseFunction(...coerced);
		return baseFunction(coerced);
	}, baseFunction);
	baseFunction.extend = fn => {
		const extended = (typeof fn === "function" ? fn.call(baseFunction, baseFunction) : fn) || baseFunction;
		if (extended !== baseFunction && Object.getPrototypeOf(extended) !== baseFunction && extended !== Object.prototype)
			Object.setPrototypeOf(extended, baseFunction);
		return extended;
	};
	return baseFunction;
}
