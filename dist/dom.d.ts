/*!
 * Dom-Builder JavaScript Library v4.0.1
 * https://github.com/Mubarrat/dom-builder/
 * 
 * Released under the MIT license
 * https://github.com/Mubarrat/dom-builder/blob/main/LICENSE
 */
/**
 * A custom Event subclass that spreads an arbitrary data object directly
 * onto the event instance as properties.
 *
 * This differs from the standard `CustomEvent` pattern where data is
 * encapsulated inside a `.detail` property.
 *
 * This design allows direct access to properties without needing
 * to reference `.detail`.
 *
 * @template T The shape of the change data attached to the event (defaults to `object`).
 */
declare class ValueChangeEvent<T extends object = object> extends Event {
    /**
     * Index signature allowing arbitrary keys on the event instance.
     * This allows attaching dynamic properties from the change data.
     */
    [key: string]: any;
    /**
     * Constructs a new ValueChangeEvent.
     *
     * @param type - The string event type (e.g., `"valuechanged"`).
     * @param change - Optional change data object to merge into the event.
     * @param options - Optional EventInit options: bubbles, cancelable, composed.
     */
    constructor(type: string, change?: T, options?: EventInit);
}
/**
 * A lightweight reactive primitive for managing state and binding.
 *
 * This interface represents a foundational reactive programming primitive which
 * is designed to efficiently encapsulate mutable state that can be observed,
 * bound, and reacted to by multiple listeners in a UI or application logic context.
 * It is intended to simplify synchronization between data sources and consumers
 * by exposing a callable API that acts both as a getter and setter of a value.
 *
 * The `baseObservable` type is designed to:
 * - Act as a **callable object** that can be invoked as a function both with or without arguments.
 * - Implement the {@link EventTarget} interface, thereby allowing for standardized event
 *   dispatching and subscription, especially for notifying listeners of value changes.
 * - Support declarative configuration of **binding modes** which control the direction
 *   of data flow between ViewModel and UI layers.
 * - Be extended with additional capabilities such as derivation of computed values,
 *   validation of inputs, and coercion/transformation of incoming data before storage.
 *
 * @template T The generic type parameter `T` indicates the type of the value stored or computed
 * by the observable. This type parameter enables type safety and IntelliSense support
 * for consumers of this interface, ensuring consistent typing for the value being managed.
 */
interface baseObservable<T = any> extends EventTarget {
    /**
     * Internal EventTarget instance used for actual event dispatching and listener management.
     * This encapsulated property is used to implement the EventTarget interface methods
     * in a way that is compatible with environments where EventTarget cannot be directly extended.
     *
     * @private
     */
    _eventTarget: EventTarget;
    /**
     * The callable form of the observable:
     *
     * This is the key feature that allows the observable to be used as a function:
     * - When called with **no arguments**, it acts as a **getter** returning the current stored or computed value.
     * - When called with **one or more arguments**, it acts as a **setter or recompute trigger**,
     *   updating the internal value based on the supplied arguments or recomputing it if it is derived.
     *
     * This dual behavior simplifies state interaction by merging getter and setter semantics
     * into a single call signature.
     *
     * @param args Zero or more arguments that influence the update or computation of the value.
     * The semantics and expected types of these arguments depend on the implementation details
     * of the specific observable.
     * @returns The current value of type `T` after applying any update or computation.
     */
    (...args: any[]): T;
    /**
     * Defines the binding mode of the observable, specifying the directionality of data flow:
     *
     * - `"to"`: Indicates a **one-way binding** where data flows **from the ViewModel to the UI only**.
     *   In this mode, the observable pushes updates outward but does not accept changes from the UI.
     * - `"from"`: Indicates a **one-way binding** where data flows **from the UI to the ViewModel only**.
     *   Here, the observable receives input from UI changes but does not propagate updates outward.
     * - `"two-way"`: Indicates a **bidirectional binding** where data flows **both ways**,
     *   allowing synchronization between ViewModel and UI, accepting updates and pushing changes.
     *
     * This property governs how binding libraries and frameworks interact with the observable during
     * automatic binding and synchronization processes.
     */
    type: "to" | "from" | "two-way";
    /**
     * Dispatches a `"valuechanging"` event **before** the observable's value is changed.
     *
     * This pre-change notification event allows subscribers to observe impending changes,
     * inspect the details, and optionally cancel the update by calling `preventDefault()` on
     * the event. This mechanism provides a hook for validation, veto logic, or side effects
     * that should occur prior to committing a change.
     *
     * If the event is canceled by any listener, the observable will not apply the change.
     *
     * @param change Optional arbitrary object describing the nature, origin, or context of the change.
     * This object can be used by event handlers to make informed decisions about whether to allow
     * the change or not.
     * @returns Returns `true` if the change is allowed (i.e., no listener canceled the event);
     * returns `false` if the event was canceled and the change should not proceed.
     */
    notifyBefore(change?: object): boolean;
    /**
     * Dispatches a `"valuechanged"` event **after** the observable's value has been updated.
     *
     * This post-change event notifies all registered subscribers that the observable's value
     * has changed, enabling them to react accordingly (e.g., updating UI elements, triggering
     * computations, or propagating changes).
     *
     * @param change Optional object containing metadata or contextual information about the change.
     * This can include previous values, reasons for the change, or any other relevant details.
     */
    notify(change?: object): void;
    /**
     * Attempts to perform a value change operation by invoking a provided mutator function.
     *
     * This method wraps the mutation logic inside an event-driven pattern:
     * - First, it calls `notifyBefore()` to dispatch a `"valuechanging"` event to allow listeners
     *   to cancel the change.
     * - If the event is not canceled, the provided function `fn` is executed to perform the actual
     *   change.
     * - After the change is applied, it calls `notify()` to dispatch a `"valuechanged"` event
     *   signaling the completion of the update.
     *
     * This pattern provides a transactional update mechanism that respects event cancellation,
     * ensuring controlled and observable state mutations.
     *
     * @template TResult The return type of the mutation function `fn`.
     * @param fn A callback function that performs the actual mutation or update of the observable's value.
     * This function should return a result which is then propagated back to the caller.
     * @param change Optional object describing the intended change, passed to `notifyBefore()` and `notify()`.
     * @returns The result returned by the mutation function `fn()` if the change was successfully applied;
     * returns `undefined` if the change was canceled by any listener during `notifyBefore()`.
     */
    tryChange<TResult>(fn: () => TResult, change?: object): TResult | undefined;
    /**
     * Enhances the observable with validation capabilities.
     *
     * This method adds an `isValid` computed observable property that reflects the validity
     * of the current value according to a provided validator function.
     *
     * The validator is a predicate function that takes the current value as input and returns
     * a boolean indicating whether the value is considered valid (`true`) or invalid (`false`).
     *
     * The `isValid` observable automatically updates whenever the base observable's value changes,
     * providing reactive validation state useful for UI validation, form feedback, or business rules.
     *
     * @param validator A predicate function `(val: T) => boolean` used to evaluate validity.
     * If omitted, defaults to a validator that always returns `true` (i.e., always valid).
     * @returns The original observable instance extended with an `isValid` computed observable property.
     * The returned type combines the original interface with `{ isValid: computed<boolean> }`.
     */
    validatable(validator?: (val: T) => boolean): this & {
        isValid: computed<boolean>;
    };
    /**
     * Adds coercion functionality to the observable, enabling transformation or sanitization
     * of input arguments before they are applied to the underlying value.
     *
     * The provided `coerce` function is called with the arguments intended to update the observable.
     * Its return value (or values) replaces the original inputs and is then used to update the observable.
     *
     * This is useful for enforcing types, clamping ranges, parsing input, or any other
     * input normalization necessary prior to storing or processing values.
     *
     * @param coerce A function which accepts the incoming arguments and returns either:
     * - A single coerced value,
     * - An array of values to spread as individual arguments,
     * - Or the identity (default) which returns inputs unchanged.
     * If omitted, the identity function is used (no coercion).
     * @returns The same observable instance augmented with coercion behavior on set/update.
     */
    coercible(coerce?: (...args: any[]) => any): this;
    /**
     * Provides an advanced binding interface allowing property and method-based projections
     * of the observable's underlying value, facilitating creation of derived observables
     * or "sub-observables" for granular reactivity.
     *
     * The `bind` property acts as a dynamic proxy object with the following capabilities:
     * - Properties of the current value become individual `baseObservable` instances,
     *   allowing binding and observation of sub-values directly.
     * - Methods of the current value can be invoked via the proxy, returning computed observables
     *   representing the method's return value.
     * - The `select` method allows creation of derived observables by applying arbitrary
     *   selector functions to the current value, producing computed projections.
     *
     * This enables a flexible and expressive reactive data binding pattern,
     * supporting nested or computed data flow scenarios within the observable ecosystem.
     *
     * ### Example usage:
     * ```ts
     * const person = baseObservable(() => ({ name: "Alice", age: 30 }));
     *
     * // Bind to a specific property to observe it independently
     * const nameObs = person.bind.name; // baseObservable<string>
     *
     * // Create a derived observable by applying a projection function
     * const greetingObs = person.bind.select(p => `Hello, ${p.name}`);
     *
     * // Bind to a method of the underlying value, getting a computed observable result
     * const upperNameObs = person.bind.name.bind.toUpperCase(); // baseObservable<string>
     * ```
     *
     * @template T The generic type parameter representing the type of the underlying value.
     */
    bind: (T extends object | Function ? {
        [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => computed<R> : computed<T[K]>;
    } : {}) & {
        /**
         * Direct reference to the current observable instance underlying this bind proxy.
         * This allows access to the root observable for advanced manipulation or introspection.
         */
        __observable__: baseObservable<T>;
        /**
         * Creates a new derived observable by applying a selector function to the current value.
         * This function enables transformation or projection of the observable's data into
         * new reactive streams.
         *
         * @param selector A function which takes the current value of the observable and
         * returns a derived value of type `U`.
         * @returns A new computed observable representing the derived value.
         */
        select<U>(selector: (value: T) => U): computed<U>;
    };
}
/**
 * Constructor interface for creating instances of {@link baseObservable}.
 *
 * Provides a callable signature and static utility methods to facilitate creation and
 * binding of observables.
 */
interface baseObservableConstructor {
    /**
     * Factory method signature: accepts a function which computes or returns the observable's value,
     * returning a `baseObservable` instance wrapping that function.
     *
     * @template T The type of the value produced by the base function.
     * @param baseFunction The function that computes or returns the value managed by the observable.
     * @returns An instance of {@link baseObservable} wrapping the provided function.
     */
    <T = any>(baseFunction: (...args: any[]) => T): baseObservable<T>;
    /**
     * Prototype object shared by all instances of {@link baseObservable}.
     * This can be used to extend, override, or introspect common instance methods
     * and properties.
     */
    readonly prototype: baseObservable;
    /**
     * Static utility method that facilitates binding a source value or observable to
     * a target setter and optionally an observer for reverse binding.
     *
     * This method implements a flexible two-way binding system:
     * - If the `observable` argument is a plain value (not a `baseObservable`),
     *   it invokes the `set` callback immediately once with that value.
     * - If the `observable` argument is itself a `baseObservable` instance:
     *   - It calls `set` immediately with the observable's current value.
     *   - If the observable supports output binding modes (`"to"` or `"two-way"`),
     *     it subscribes to the `"valuechanged"` event, calling `set` on updates.
     *   - If the observable supports input binding modes (`"from"` or `"two-way"`),
     *     it invokes the optional `observe` callback to handle reverse updates.
     *
     * @template T The type of the value managed by the observable or passed as a plain value.
     * @param observable The source value or {@link baseObservable} to bind from.
     * @param set A callback function to update the target when the source value changes.
     * @param observe An optional callback function invoked for input binding from target to source.
     */
    autoBind<T>(observable: baseObservable<T> | T, set: (val: T) => void, observe?: (val: T) => void): void;
}
/**
 * Factory function creating a new `baseObservable` instance wrapping the provided
 * base function which produces or manages the observable's value.
 *
 * The returned callable object implements the `baseObservable` interface,
 * including reactive event dispatching and property projections.
 *
 * @template T The type of the value produced or managed by the observable.
 * @param baseFunction The function to invoke on calls to get or update the observable's value.
 * @returns A new instance of {@link baseObservable} wrapping `baseFunction`.
 */
declare const baseObservable: baseObservableConstructor;
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
type ArrayChange<T> = {
    /** The zero-based index at which elements were inserted, removed, or replaced. */
    index: number;
    /** The new elements inserted at the specified index, if any. */
    newItems?: T[];
    /** The previous elements removed from the specified index, if any. */
    oldItems?: T[];
} | {
    reversed: true;
} | {
    sortFn: ((a: T, b: T) => number) | null;
} | {
    sortedIndices: number[];
};
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
declare const arrayObservable: arrayObservableConstructor;
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
declare function cstr(strings: TemplateStringsArray, ...values: any[]): computed<string> | string;
/**
 * Converts a `kebab-case` string to `camelCase` at the type level.
 *
 * This is useful for mapping DOM tag names like `"my-element"` to
 * camelCase versions like `"myElement"` for builder function names.
 *
 * @template S - The kebab-case string to convert.
 *
 * @example
 * ```ts
 * type T = CamelCase<'my-element'>; // "myElement"
 * ```
 */
type CamelCase<S extends string> = S extends `${infer T}-${infer U}` ? `${T}${Capitalize<CamelCase<U>>}` : S;
/**
 * Represents an attribute object passed to element builders.
 *
 * The keys are attribute names, and the values are their corresponding values.
 * This allows setting attributes like `class`, `id`, `style`, and event handlers.
 */
type Attribute = Record<string, any>;
/**
 * Represents any valid child node passed to element builders.
 *
 * This can be strings, DOM nodes, observables, or any type that
 * can be appended to an element as a child.
 */
type Child = any;
/**
 * A collection of builder functions for DOM elements categorized by namespace.
 *
 * For each namespace URI, the builder object maps tag names converted to camelCase
 * to factory functions that accept attributes and children, returning
 * strongly typed elements from the corresponding DOM interfaces.
 *
 * @remarks
 * - HTML elements are under `"http://www.w3.org/1999/xhtml"`.
 * - SVG elements are under `"http://www.w3.org/2000/svg"`.
 * - MathML elements are under `"http://www.w3.org/1998/Math/MathML"`.
 * - Custom namespaces fall back to generic `Element` nodes with string tag names.
 *
 * @example
 * ```ts
 * // Creating a <div> with a class and text content:
 * const div = $html.div({ class: "container" }, "Hello World");
 *
 * // Creating an SVG circle:
 * const circle = $svg.circle({ cx: 50, cy: 50, r: 40, fill: "red" });
 *
 * // Using a custom namespace builder:
 * const customNS = $dom("http://schemas.example.com/custom");
 * const customElem = customNS.customElement({ "data-id": 123 }, "Custom Content");
 * ```
 */
declare interface DomBuilders {
    /** XHTML namespace (HTML elements) */
    "http://www.w3.org/1999/xhtml": {
        [K in keyof HTMLElementTagNameMap as CamelCase<K>]: (...args: (Attribute | Child)[]) => HTMLElementTagNameMap[K];
    };
    /** SVG namespace */
    "http://www.w3.org/2000/svg": {
        [K in keyof SVGElementTagNameMap as CamelCase<K>]: (...args: (Attribute | Child)[]) => SVGElementTagNameMap[K];
    };
    /** MathML namespace */
    "http://www.w3.org/1998/Math/MathML": {
        [K in keyof MathMLElementTagNameMap as CamelCase<K>]: (...args: (Attribute | Child)[]) => MathMLElementTagNameMap[K];
    };
    /**
     * Fallback builder for any other namespaces.
     *
     * This creates generic `Element` instances without strict typing of tags,
     * allowing usage with custom XML namespaces.
     */
    [namespace: string]: {
        [tag: string]: (...args: (Attribute | Child)[]) => Element;
    };
}
/**
 * Helpers to build DOM elements, mixed into global `Window` and `Document`.
 *
 * Provides:
 * - `$dom(namespace)` to create builders for any XML namespace.
 * - Shortcut builders for common namespaces `$html`, `$svg`, and `$mml`.
 *
 * @example
 * ```ts
 * // Get a builder for SVG elements
 * const svg = document.$svg;
 *
 * // Create a red circle
 * const redCircle = svg.circle({ r: 40, fill: "red" });
 *
 * // Create a custom namespace builder
 * const custom = window.$dom("http://schemas.example.com/custom");
 * const node = custom.node({ "data-id": 42 }, "Example");
 * ```
 */
declare interface DomHelper {
    /**
     * Creates a builder object for the specified XML namespace URI.
     *
     * The returned object maps camelCase tag names to factory functions.
     *
     * @param namespace - Namespace URI string (e.g., `"http://www.w3.org/2000/svg"`).
     * @returns A map of tag builder functions for the namespace.
     */
    $dom<K extends keyof DomBuilders | string = string>(namespace: K): DomBuilders[K];
    /** Builder for standard HTML elements in XHTML namespace. */
    readonly $html: DomBuilders["http://www.w3.org/1999/xhtml"];
    /** Builder for SVG elements. */
    readonly $svg: DomBuilders["http://www.w3.org/2000/svg"];
    /** Builder for MathML elements. */
    readonly $mml: DomBuilders["http://www.w3.org/1998/Math/MathML"];
}
/**
 * Extend the global `Document` interface to include DOM builder helpers.
 */
declare interface Document extends DomHelper {
}
/**
 * Extend the global `Window` interface to include DOM builder helpers.
 */
declare interface Window extends DomHelper {
}
/**
 * Global function to create DOM builders for arbitrary namespaces.
 *
 * Equivalent to calling `document.$dom(namespace)`.
 *
 * @param namespace - The XML namespace URI.
 * @returns A builder object with tag factory functions.
 *
 * @example
 * ```ts
 * const custom = $dom("http://schemas.example.com/custom");
 * const node = custom.node({ "data-attr": "value" }, "Content");
 * ```
 */
declare function $dom<K extends keyof DomBuilders | string = string>(namespace: K): DomBuilders[K];
/** Shortcut builder for standard HTML elements. */
declare const $html: DomBuilders["http://www.w3.org/1999/xhtml"];
/** Shortcut builder for SVG elements. */
declare const $svg: DomBuilders["http://www.w3.org/2000/svg"];
/** Shortcut builder for MathML elements. */
declare const $mml: DomBuilders["http://www.w3.org/1998/Math/MathML"];
/**
 * `observable<T>` extends the core reactive primitive `baseObservable<T>` by
 * maintaining a **stateful value** alongside reactive subscriptions.
 *
 * This observable supports:
 * - Direct getter/setter callable interface via `(newValue?: T): T`.
 * - Two-way binding modes (`bind.to` and `bind.from`) for flexible data flow.
 * - Async update patterns, including an **optimistic update** strategy with rollback.
 *
 * Note: For array-like data, use `arrayObservable` instead for richer mutation events.
 *
 * @template T The type of the internal value.
 */
interface observable<T = any> extends baseObservable<T> {
    /**
     * Callable signature that acts as both:
     * - Getter (no arguments) — returns current value.
     * - Setter (with argument) — attempts to update and returns new value.
     *
     * @param newValue Optional new value to set.
     * @returns The current or updated value.
     */
    (newValue?: T): T;
    /** Current stored value (getter/setter). */
    value: T;
    /**
     * Applies an **optimistic update**:
     * 1. Calls `updater` synchronously to calculate a new immutable value.
     * 2. Immediately applies this new value.
     * 3. Returns a promise that, on rejection, rolls back to the previous value.
     *
     * This strategy is useful for instant UI feedback with rollback on failure.
     *
     * @typeParam R The type of the resolved value from the async operation.
     * @param updater Pure synchronous function returning the new value from current.
     * @param promise Async promise representing the eventual operation.
     * @returns The same promise for chaining, with rollback logic attached.
     */
    optimistic<R>(updater: (current: T) => T, promise: Promise<R>): Promise<R>;
    /** Binding object supporting two-way, "to" and "from" directional bindings. */
    bind: baseObservable<T>['bind'] & {
        __observable__: observable<T>;
        /**
         * One-way binding mode from ViewModel → UI.
         * UI updates do NOT propagate back.
         */
        to: observable<T>;
        /**
         * One-way binding mode from UI → ViewModel.
         * ViewModel updates do NOT propagate to UI automatically.
         */
        from: observable<T>;
    };
}
/**
 * `observableConstructor` defines the signature and prototype for the `observable` factory.
 */
interface observableConstructor extends Omit<baseObservableConstructor, ''> {
    <T>(initialValue?: T): observable<T>;
    /**
     * Prototype shared by all `observable` instances.
     * Useful for extending or inspecting observable behavior.
     */
    readonly prototype: observable;
}
/**
 * Factory function creating a new `observable` instance.
 *
 * It encapsulates an internal value and exposes a reactive callable wrapper,
 * delegating core reactive mechanics to `baseObservable`.
 *
 * @param initialValue Optional initial value to start with.
 * @returns A new `observable` instance wrapping the value.
 */
declare const observable: observableConstructor;
//# sourceMappingURL=dom.d.ts.map