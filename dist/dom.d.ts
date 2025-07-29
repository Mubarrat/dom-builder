/*!
 * Dom-Builder JavaScript Library v4.0.0
 * https://github.com/Mubarrat/dom-builder/
 * 
 * Released under the MIT license
 * https://github.com/Mubarrat/dom-builder/blob/main/LICENSE
 */
/**
 * A custom event class that extends the standard DOM `Event` interface
 * to directly expose arbitrary change data as properties on the event instance.
 *
 * Unlike `CustomEvent`, which wraps data inside `detail`, this class
 * spreads the provided object onto the event itself for direct access.
 *
 * @typeParam T - The shape of the change data to attach (default: `object`).
 *
 * @example
 * ```ts
 * // Create a ValueChangeEvent with custom properties
 * const event = new ValueChangeEvent("valuechanged", { oldValue: 1, newValue: 2 }, { bubbles: true });
 *
 * // Access data directly
 * console.log(event.oldValue, event.newValue);
 *
 * // Dispatch and listen like any standard DOM event
 * element.dispatchEvent(event);
 * element.addEventListener("valuechanged", e => console.log(e.newValue));
 * ```
 */
declare class ValueChangeEvent<T extends object = object> extends Event {
    /**
     * Enables arbitrary property access to expose change data
     * (merged directly onto the event instance).
     */
    [prop: string]: any;
    /**
     * Creates a new `ValueChangeEvent`.
     *
     * @param type - The event type name (e.g., `"valuechanged"`).
     * @param change - Optional data object; properties are shallow-copied
     *                 onto the event for direct access.
     * @param options - Standard `EventInit` options (`bubbles`, `cancelable`, `composed`).
     */
    constructor(type: string, change?: T, options?: EventInit);
}
/**
 * A lightweight reactive primitive for managing state and binding.
 *
 * A `baseObservable` is:
 * - A **callable object**: calling it with arguments updates/computes a value; without arguments, retrieves the current value.
 * - An **{@link EventTarget}**: notifies via `"valuechanged"` when updates occur.
 * - Configurable for **binding modes** (`to`, `from`, `two-way`).
 * - Extensible: supports derivation (`bindSelect`), validation (`validatable`), and coercion (`coercible`).
 *
 * @template T The type of value stored or computed.
 */
interface baseObservable<T = any> extends EventTarget {
    _eventTarget: EventTarget;
    /**
     * Callable form of the observable:
     * - **Getter**: No arguments → returns current value.
     * - **Setter/Compute**: With arguments → updates value or re‑computes result.
     *
     * @param args Arguments for update/compute.
     * @returns Current value.
     */
    (...args: any[]): T;
    /**
     * Specifies binding direction:
     * - `"to"`: One‑way from ViewModel → UI.
     * - `"from"`: One‑way from UI → ViewModel.
     * - `"two-way"`: Bidirectional.
     */
    type: "to" | "from" | "two-way";
    /**
     * Dispatches `"valuechanging"` before change, allowing cancellation.
     * Returns `true` if change is allowed (default).
     */
    notifyBefore(change?: object): boolean;
    /**
     * Dispatches a `"valuechanged"` event to notify subscribers of an update.
     *
     * @param change Optional object describing the nature of the change.
     */
    notify(change?: object): void;
    /**
     * Attempts to change the value by invoking a provided mutator function.
     *
     * Calls `notifyBefore()` first; if canceled, does nothing and returns `undefined`.
     * Otherwise applies the change, calls `notify()`, and returns the function’s result.
     *
     * @param fn The function that performs the actual change and returns a result.
     * @param change Optional object describing the change.
     * @returns The result of `fn()` if applied; otherwise `undefined` if canceled.
     */
    tryChange<TResult>(fn: () => TResult, change?: object): TResult | undefined;
    /**
     * Creates a derived observable mapped by a selector function.
     *
     * @param selector Maps the current value to a derived value.
     * @returns A new {@link baseObservable} representing the derived value.
     */
    bindSelect<U>(selector: (val: T) => U): this;
    /**
     * Adds validation logic to the observable.
     *
     * The returned object includes an `isValid` observable reflecting the
     * result of the validator whenever the value changes.
     *
     * @param validator Predicate returning `true` when the value is valid.
     * Defaults to always valid.
     * @returns The original observable with an additional `isValid` property.
     */
    validatable(validator?: (val: T) => boolean): this & {
        isValid: baseObservable<boolean>;
    };
    /**
     * Applies coercion to incoming arguments before storage.
     *
     * @param coerce Function that transforms input values (default: identity).
     * @returns The same observable with coercion applied.
     */
    coercible(coerce?: (...args: any[]) => any): this;
}
declare namespace baseObservable {
    /**
     * Prototype object for all {@link baseObservable} instances.
     * Useful for extending methods or introspection.
     */
    var prototype: baseObservable;
}
declare function baseObservable<T = any>(baseFunction: (...args: any[]) => T): baseObservable<T>;
declare namespace baseObservable {
    var autoBind: <T>(observable: baseObservable<T> | T, set: (val: T) => void, observe?: (val: T) => void) => void;
}
/**
 * Describes changes to an {@link arrayObservable}.
 *
 * - Supports granular mutations (insert/remove at index)
 * - Supports structural reorder operations (reverse, sort)
 *
 * @template T Element type of the observable array
 */
type ArrayChange<T> = {
    /** Index where elements were added/removed/replaced */
    index: number;
    /** New elements (if any) inserted at `index` */
    newItems?: T[];
    /** Previous elements removed from `index` */
    oldItems?: T[];
} | {
    reversed: true;
} | {
    sortFn: ((a: T, b: T) => number) | null;
};
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
    optimistic<R>(updater: (current: arrayObservable<T>) => T[] | void, promise: Promise<R>, resolver?: (current: arrayObservable<T>, result: R) => T[] | void, onError?: (err: any, rollbackValue: arrayObservable<T>) => void): Promise<R | void>;
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
    pessimistic<R>(promise: Promise<R>, updater: (current: arrayObservable<T>, result: R) => T[] | void, onError?: (err: any, current: arrayObservable<T>) => void): Promise<R | void>;
}
declare namespace arrayObservable {
    /**
     * Prototype object for all {@link arrayObservable} instances.
     * Useful for extending methods or introspection.
     */
    var prototype: arrayObservable;
}
declare function arrayObservable<T>(initialValues: Iterable<T>): arrayObservable<T>;
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
interface computed<T = any> extends baseObservable<T> {
}
declare function cstr(strings: TemplateStringsArray, ...values: any[]): string | computed<string>;
/**
 * Converts `kebab-case` strings into `camelCase` at the type level.
 *
 * Useful for mapping DOM tag names (e.g., `"my-element"`) to `myElement`
 * when generating typed builder APIs.
 *
 * @example
 * ```ts
 * type T = CamelCase<'my-element'>; // "myElement"
 * ```
 */
type CamelCase<S extends string> = S extends `${infer T}-${infer U}` ? `${T}${Capitalize<CamelCase<U>>}` : S;
/** Represents valid attribute objects for an element. */
type Attribute = Record<string, any>;
/** Represents any valid child node: string, element, observable, etc. */
type Child = any;
/**
 * Typed builder functions for creating DOM elements in various namespaces.
 *
 * Each builder:
 * - Maps tag names (converted to `camelCase`) to factory functions.
 * - Each function accepts attributes and children to produce strongly-typed elements.
 *
 * @example
 * ```ts
 * // HTML
 * const div = $html.div({ class: "box" }, "Hello");
 *
 * // SVG
 * const circle = $svg.circle({ cx: 50, cy: 50, r: 40 });
 * ```
 */
declare interface DomBuilders {
    /** HTML (XHTML) namespace builder. */
    "http://www.w3.org/1999/xhtml": {
        [K in keyof HTMLElementTagNameMap as CamelCase<K>]: (...args: (Attribute | Child)[]) => HTMLElementTagNameMap[K];
    };
    /** SVG namespace builder. */
    "http://www.w3.org/2000/svg": {
        [K in keyof SVGElementTagNameMap as CamelCase<K>]: (...args: (Attribute | Child)[]) => SVGElementTagNameMap[K];
    };
    /** MathML namespace builder. */
    "http://www.w3.org/1998/Math/MathML": {
        [K in keyof MathMLElementTagNameMap as CamelCase<K>]: (...args: (Attribute | Child)[]) => MathMLElementTagNameMap[K];
    };
    /**
     * Generic fallback for **custom namespaces**.
     * Produces functions that create `Element` nodes without strict tag typing.
     *
     * @example
     * ```ts
     * const $custom = $dom("http://schemas.example.com/custom");
     * const node = $custom.node({ "data-id": 123 }, "Text");
     * ```
     */
    [namespace: string]: {
        [tag: string]: (...args: (Attribute | Child)[]) => Element;
    };
}
/**
 * DOM builder helpers mixed into `Window` and `Document`.
 *
 * Provides:
 * - `$dom(namespace)` for arbitrary/custom namespaces
 * - `$html`, `$svg`, `$mml` for common ones
 */
declare interface DomHelper {
    /**
     * Creates a builder for the specified XML namespace.
     *
     * @param namespace - The namespace URI (e.g., `"http://www.w3.org/2000/svg"`).
     * @returns A tag-to-function map for creating namespaced elements.
     *
     * @example
     * ```ts
     * const $example = $dom("http://schemas.example.com/example");
     * const node = $example.node({ data: "Data" }, "Example Data");
     * ```
     */
    $dom<K extends keyof DomBuilders | string = string>(namespace: K): DomBuilders[K];
    /** Builder for HTML elements (XHTML namespace). */
    readonly $html: DomBuilders["http://www.w3.org/1999/xhtml"];
    /** Builder for SVG elements. */
    readonly $svg: DomBuilders["http://www.w3.org/2000/svg"];
    /** Builder for MathML elements. */
    readonly $mml: DomBuilders["http://www.w3.org/1998/Math/MathML"];
}
/** Augments `Document` with DOM builder helpers (`$dom`, `$html`, etc.). */
declare interface Document extends DomHelper {
}
/** Augments `Window` with DOM builder helpers (`$dom`, `$html`, etc.). */
declare interface Window extends DomHelper {
}
/**
 * Global builder function for arbitrary namespaces.
 *
 * Equivalent to `document.$dom(namespace)`.
 *
 * @example
 * ```ts
 * const $example = $dom("http://schemas.example.com/example");
 * const node = $example.node({ data: "Data" }, "Example Data");
 * ```
 */
declare function $dom<K extends keyof DomBuilders | string = string>(namespace: K): DomBuilders[K];
/** Shortcut builder for HTML elements (`<div>`, `<span>`, etc.). */
declare const $html: DomBuilders["http://www.w3.org/1999/xhtml"];
/** Shortcut builder for SVG elements (`<svg>`, `<circle>`, etc.). */
declare const $svg: DomBuilders["http://www.w3.org/2000/svg"];
/** Shortcut builder for MathML elements (`<mfrac>`, `<msqrt>`, etc.). */
declare const $mml: DomBuilders["http://www.w3.org/1998/Math/MathML"];
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
    optimistic<R>(updater: (current: T) => T | void, promise: Promise<R>, resolver?: (current: T, result: R) => T | void, onError?: (err: any, rollbackValue: T) => void): Promise<R | void>;
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
    pessimistic<R>(promise: Promise<R>, updater: (current: T, result: R) => T | void, onError?: (err: any, current: T) => void): Promise<R | void>;
}
declare namespace observable {
    /**
     * Prototype object for all {@link observable} instances.
     * Allows introspection or extension of shared behavior.
     */
    var prototype: observable;
}
declare function observable<T>(initialValue?: T | null): observable<T>;
//# sourceMappingURL=dom.d.ts.map