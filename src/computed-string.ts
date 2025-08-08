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
/// <reference path="computed.ts" />

/**
 * Tagged template function for creating a reactive computed string based on
 * embedded `baseObservable` values.
 *
 * This function processes a tagged template literal and dynamically constructs a
 * computed string that updates whenever any of the embedded observable values change.
 *
 * If there are no observables among the template values, it returns a simple static
 * concatenated string.
 *
 * If observables are present, it returns a function with a `.computed` property
 * that depends on these observables, allowing reactive updates to the string.
 *
 * @param strings An array of string literals from the tagged template parts.
 *
 * @param values Values interpolated inside the template literal, some of which may
 * be observables (instances of `baseObservable`).
 *
 * @returns Either a plain concatenated string if no observables are present,
 * or a computed function that recomputes the interpolated string reactively.
 *
 * @example
 * ```ts
 * const obsName = baseObservable('Alice');
 * const obsAge = baseObservable(30);
 * const greeting = cstr`Hello, ${obsName}! You are ${obsAge} years old.`;
 * console.log(greeting()); // "Hello, Alice! You are 30 years old."
 * obsName('Bob');
 * console.log(greeting()); // Reactively updates to "Hello, Bob! You are 30 years old."
 * ```
 */
function cstr(strings: TemplateStringsArray, ...values): computed<string> | string {
    // Separate observables for tracking
    const observables = values.filter(v => v instanceof baseObservable);

    // If no observables → return static string
    if (observables.length === 0) {
        return strings.reduce((acc, str, i) =>
            acc + str + (i < values.length ? String(values[i]) : ""), ""
        );
    }

    // Create computation function and attach .computed with observables
    return (() => {
        let result = strings[0];
        for (let i = 0; i < values.length; i++) {
            const val = values[i];
            result += String(val instanceof baseObservable ? val() : val);
            result += strings[i + 1];
        }
        return result;
    }).computed(...observables);
}
