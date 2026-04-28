# Dom-Builder

> [!NOTE]
> Looking for **HTML Builder**?
>
> You're in the right place — the project has been **renamed** to **Dom-Builder** starting from **version 3.0.0** for clarity.
>
> If you're using the older `html-builder`, simply stick to version `<3.0.0`.

---

## Overview

**Dom-Builder** is a modern JavaScript library for declaratively constructing and updating DOM elements with simplicity and precision. It improves upon the previous [`html-builder`](https://github.com/Mubarrat/dom-builder/tree/6ec7e8fed86d7769914392fde55479cc2d62fdc9) by offering a cleaner, MVVM-friendly architecture and clearer naming.

---

## What's New in Dom-Builder

You can check out the [Wiki](https://github.com/Mubarrat/dom-builder/wiki) for this.

---

## Installation

### Download

Download the latest [release files](https://github.com/Mubarrat/dom-builder/releases) from this GitHub repository.

#### Contents

After extracting the zip, you'll find:

```
dom-builder
├── dom.d.ts
├── dom.d.ts.map
├── dom.js
├── dom.js.map
├── dom.min.js
└── dom.min.js.map
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/gh/Mubarrat/dom-builder@4.x/dist/dom.js"></script>
```

Minified:

```html
<script src="https://cdn.jsdelivr.net/gh/Mubarrat/dom-builder@4.x/dist/dom.min.js"></script>
```

### GitHub Package

> **Not available via GitHub Packages or npm**
> This library is **browser-focused** and intended to be used directly via `<script>` tags, not through package managers.

Use the [CDN](#cdn) or [Releases](https://github.com/Mubarrat/dom-builder/releases) to include it in your project.

---

## Quick Start

Include the library and write your first elements in under a minute.

```html
<script src="https://cdn.jsdelivr.net/gh/Mubarrat/dom-builder@4.x/dist/dom.js"></script>
```

---

## Basics

### Building Elements

Use the `$html` builder to create any HTML element declaratively.  
The first argument can be an **attribute object**; all following arguments become **children**.

```js
// $html.<tagName>( [attributes], ...children )
const card = $html.div({ class: "card", id: "intro" },
  $html.h2("Hello, Dom-Builder!"),
  $html.p("Declarative DOM — no templates needed."),
  $html.a({ href: "https://example.com", target: "_blank" }, "Learn more")
);

document.body.append(card);
```

Children can be strings, other elements, arrays, or observables.

---

### Attributes & Events

Pass any HTML attribute as a key in the attribute object.

```js
// Inline style — string or object form
const box = $html.div({ style: "color: red; font-weight: bold;" }, "Red text");
const box2 = $html.div({ style: { color: "blue", fontSize: "1.2rem" } }, "Blue text");

// Event listeners — use the `on` prefix or the `on` key for multiple events
const btn = $html.button(
  {
    onclick: () => alert("Clicked!"),
    on: { mouseenter: () => console.log("hover") }
  },
  "Click me"
);

// data-* attributes
const el = $html.div({ data: { userId: 42, role: "admin" } });
// → <div data-user-id="42" data-role="admin">
```

---

### Reactive State — `observable`

An `observable` is a **callable getter/setter** that notifies the DOM when its value changes.

```js
const count = observable(0);   // create with an initial value

count();        // → 0  (getter: call with no arguments)
count(5);       // → 5  (setter: call with a new value)

// Pass an observable directly as a child — the DOM updates automatically
const display = $html.span(count);

const app = $html.div(
  $html.button({ onclick: () => count(count() - 1) }, "−"),
  display,
  $html.button({ onclick: () => count(count() + 1) }, "+")
);

document.body.append(app);
```

Observables can also be bound to **attributes**:

```js
const color = observable("red");
const box = $html.div({ style: { color } }, "Watch me change color");

color("blue");   // box's text color updates immediately
```

#### Two-way binding

Passing an `observable` as the `value` of an `<input>` creates a two-way binding:

```js
const name = observable("");
const input = $html.input({ type: "text", value: name });
const greeting = $html.p((() => `Hello, ${name() || "stranger"}!`).computed(name));

document.body.append(input, greeting);
```

---

### Derived Values — `computed` & `cstr`

#### `computed`

Turn any zero-argument function into a **reactive computed observable** by calling `.computed()` on it and listing the observables it depends on.

```js
const a = observable(3);
const b = observable(4);

const hypotenuse = (() => Math.sqrt(a() ** 2 + b() ** 2)).computed(a, b);

console.log(hypotenuse());   // → 5
a(5); b(12);
console.log(hypotenuse());   // → 13  (updates automatically)

// Use in the DOM just like a plain observable
document.body.append($html.p("Hypotenuse: ", hypotenuse));
```

#### `cstr` — reactive template strings

`cstr` is a **tagged template literal** that produces a computed string whenever it contains observable values.

```js
const user  = observable("Alice");
const score = observable(99);

// Automatically re-evaluates when `user` or `score` changes
const label = cstr`${user} scored ${score} points`;

document.body.append($html.p(label));

user("Bob");   // → "Bob scored 99 points"
```

---

### Reactive Arrays — `arrayObservable`

`arrayObservable` wraps a native array with reactive mutations.  
Use `.bind.map()` to render each item into the DOM; the list updates precisely when items are added, removed, or replaced.

```js
const items = arrayObservable(["Apple", "Banana", "Cherry"]);

// .bind.map() returns a read-only mapped observable array
const listEl = $html.ul(
  items.bind.map(item => $html.li(item))
);

document.body.append(listEl);

// Standard array mutations are fully reactive
items.push("Date");           // <li>Date</li> appended
items.splice(1, 1, "Blueberry"); // "Banana" replaced by "Blueberry"
items.reverse();              // entire list re-ordered
```

---

### Validation — `validatable()`

Call `.validatable(predicateFn)` on any `observable` to attach a reactive `isValid` computed property.

```js
const email = observable("").validatable(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));

// email.isValid is a computed<boolean> that updates with the value
const input = $html.input({ type: "email", value: email });

const errorMsg = $html.p(
  { style: { color: "red" } },
  (() => email.value && !email.isValid() ? "Invalid email address." : "").computed(email, email.isValid)
);

const submitBtn = $html.button(
  { type: "submit", disabled: (() => !email.isValid()).computed(email.isValid) },
  "Subscribe"
);

document.body.append(input, errorMsg, submitBtn);
```

---

## More Examples

See the [`examples/`](examples/) directory for runnable demos:

| | Example | Highlights |
|---|---|---|
| **Static** | [Hello World](examples/without-reaction/01-hello-world.html) | `$html` basics |
| **Static** | [Static List](examples/without-reaction/02-static-list.html) | Mapping arrays |
| **Static** | [Contact Form](examples/without-reaction/03-contact-form.html) | Events & form |
| **Static** | [Data Table](examples/without-reaction/04-data-table.html) | Nested elements |
| **Static** | [SVG Badges](examples/without-reaction/05-svg-badge.html) | `$svg` namespace |
| **Reactive** | [Live Counter](examples/with-reaction/01-live-counter.html) | `observable` |
| **Reactive** | [Todo List](examples/with-reaction/02-todo-list.html) | `arrayObservable`, `cstr` |
| **Reactive** | [Live Search](examples/with-reaction/03-live-search.html) | `computed` |
| **Reactive** | [Registration Form](examples/with-reaction/04-registration-form.html) | `validatable()` |
| **Reactive** | [Optimistic Like](examples/with-reaction/05-optimistic-like.html) | `.optimistic()` |

---

## Migration from HTML Builder

There are **no major breaking changes** between `html-builder` and `dom-builder`.

### Key Points

* `dom-builder` is a **renamed continuation** of `html-builder`, starting from version `3.0.0`.
* The majority of the API remains **declarative and unchanged**.
* The `build()` method is **no longer needed** in `dom-builder`.
* The long-form `new HtmlItem(...)` syntax is **removed** — use concise `$html.div(...)`-style instead.
* The new version introduces **optional MVVM-style utilities** like `observable`, `computed`, `bind`, `bindSelect`, and `bindMap`.

See [Migration from html-builder](https://github.com/Mubarrat/dom-builder/wiki/Migration-from-html-builder) for more details.

> [!TIP]
> Consider adopting MVVM-style view models for better state management.

---

## Documentation

Check out the [Wiki](https://github.com/Mubarrat/dom-builder/wiki) for:

* **API Documentation**
* **Examples**
* **Best Practices**
* **Migration from html-builder**
* **MVVM Patterns** (optional)

---

## License

Dom-Builder is licensed under the [MIT License](LICENSE.md).
