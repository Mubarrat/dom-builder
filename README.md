# Dom-Builder

> [!NOTE]
> Looking for **HTML Builder**?
>
> You're in the right place — the project has been **renamed** to **Dom-Builder** starting from **version 3.0.0** for clarity.
>
> If you're using the older `html-builder`, simply stick to version `<3.0.0`.

---

## Overview

**Dom-Builder** is a modern JavaScript library for declaratively constructing and updating DOM elements with simplicity and precision. It improves upon the previous [`html-builder`](https://github.com/Mubarrat/html-builder) by offering a cleaner, MVVM-friendly architecture and clearer naming.

---

## What's New in v3+

* Renamed to **Dom-Builder** to better reflect its focus on the DOM.
* Declarative usage is now the default — no more `build()` method.
* Introduced built-in MVVM-style utilities like `observable`, `computed`, and powerful binding mechanisms such as `bind`, `bindSelect`, and `bindMap`.
* Removed long-form `new HtmlItem(...)` syntax — replaced with concise `$html.div(...)` style.
* Smaller, faster, and framework-agnostic.

---

## Installation

### Download

Download the latest [release files](https://github.com/Mubarrat/dom-builder/releases) from this GitHub repository.

#### Contents

After extracting the zip, you'll find:

```
dom-builder
├── dom.js
└── dom.min.js
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/gh/Mubarrat/dom-builder@3.x/dist/dom.js"></script>
```

Minified:

```html
<script src="https://cdn.jsdelivr.net/gh/Mubarrat/dom-builder@3.x/dist/dom.min.js"></script>
```

### GitHub Package

> **Not available via GitHub Packages or npm**
> This library is **browser-focused** and intended to be used directly via `<script>` tags, not through package managers.

Use the [CDN](#cdn) or [Releases](https://github.com/Mubarrat/dom-builder/releases) to include it in your project.

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
