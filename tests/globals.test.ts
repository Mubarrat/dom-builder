import path from "path";
import { test, expect } from "@playwright/test";

const filePath = path.resolve("tests/test.html");

test.beforeEach(function ({ page }) { return page.goto(`file://${filePath}`); });

test.describe("globals DOM builder", () => {
    test("creates HTML element with $html", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const div = this.$html.div({ id: "test-div" }, "Hello");
            return div instanceof HTMLDivElement && div.id === "test-div" && div.textContent === "Hello";
        });
        expect(result).toBe(true);
    });

    test("creates SVG element with $svg", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const circle = this.$svg.circle({ cx: 10, cy: 10, r: 5 });
            return circle instanceof SVGCircleElement && circle.getAttribute("cx") === "10";
        });
        expect(result).toBe(true);
    });

    test("creates MathML element with $mml", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const frac = this.$mml.mfrac();
            return frac instanceof Element && frac.tagName.toLowerCase() === "mfrac";
        });
        expect(result).toBe(true);
    });

    test("creates custom namespace element with $dom", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const $custom = this.$dom("http://schemas.example.com/custom");
            const node = $custom.node({ "data-id": 123 }, "Text");
            return node instanceof Element && node.getAttribute("data-id") === "123" && node.textContent === "Text";
        });
        expect(result).toBe(true);
    });

    test("sets style as string", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const div = this.$html.div({ style: "color: red; background: blue;" });
            return div.style.color === "red" && div.style.backgroundColor === "blue";
        });
        expect(result).toBe(true);
    });

    test("sets style as object", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const div = this.$html.div({ style: { color: "green", fontWeight: "bold" } });
            return div.style.color === "green" && div.style.fontWeight === "bold";
        });
        expect(result).toBe(true);
    });

    test("binds observable to style property", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const color = observable("blue");
            const div = this.$html.div({ style: { color } });
            color("orange");
            return div.style.color;
        });
        expect(result).toBe("orange");
    });

    test("attaches single event listener with onX", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            let clicked = false;
            const div = this.$html.div({ onclick: function () { clicked = true; } });
            div.click();
            return clicked;
        });
        expect(result).toBe(true);
    });

    test("attaches multiple event listeners with on", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            let entered = false, left = false;
            const div = this.$html.div({
                on: {
                    mouseenter: function () { entered = true; },
                    mouseleave: function () { left = true; }
                }
            });
            div.dispatchEvent(new Event("mouseenter"));
            div.dispatchEvent(new Event("mouseleave"));
            return entered && left;
        });
        expect(result).toBe(true);
    });

    test("binds observable to data-* attribute", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const obs = observable("abc");
            const div = this.$html.div({ data: { foo: obs } });
            obs("xyz");
            return div.dataset.foo;
        });
        expect(result).toBe("xyz");
    });

    test("binds observable to value of input", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const obs = observable("hi");
            const input = this.$html.input({ value: obs });
            obs("bye");
            return input.value;
        });
        expect(result).toBe("bye");
    });

    test("binds observable to checked of checkbox", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const obs = observable(true);
            const input = this.$html.input({ type: "checkbox", checked: obs });
            obs(false);
            return input.checked;
        });
        expect(result).toBe(false);
    });

    test("binds observable to generic attribute", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const obs = observable("bar");
            const div = this.$html.div({ title: obs });
            obs("baz");
            return div.title;
        });
        expect(result).toBe("baz");
    });

    test("observable child updates text content", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const obs = observable("hello");
            const div = this.$html.div(obs);
            obs("world");
            return div.textContent;
        });
        expect(result).toBe("world");
    });

    test("arrayObservable child renders and updates", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const arr = arrayObservable(["a", "b"]);
            const div = this.$html.div(arr);
            arr.push("c");
            return div.textContent;
        });
        expect(result).toBe("abc");
    });

    test("arrayObservable child removes nodes on splice", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const arr = arrayObservable(["x", "y", "z"]);
            const div = this.$html.div(arr);
            arr.splice(1, 1);
            return div.textContent;
        });
        expect(result).toBe("xz");
    });

    test("arrayObservable child reverses nodes", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const arr = arrayObservable([1, 2, 3]);
            const div = this.$html.div(arr);
            arr.reverse();
            return div.textContent;
        });
        expect(result).toBe("321");
    });

    test("arrayObservable child sorts nodes", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const arr = arrayObservable([3, 1, 2]);
            const div = this.$html.div(arr);
            arr.sort();
            return div.textContent;
        });
        expect(result).toBe("123");
    });

    test("custom builder creates element with correct namespace", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const $foo = this.$dom("http://foo");
            const el = $foo.bar();
            return el.namespaceURI === "http://foo" && el.tagName === "bar";
        });
        expect(result).toBe(true);
    });

    test("builder proxies support toString", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const $foo = this.$dom("http://foo");
            return typeof $foo.toString();
        });
        expect(result).toBe("string");
    });

    test("children can be arrays", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const div = this.$html.div(["a", "b", "c"]);
            return div.textContent;
        });
        expect(result).toBe("abc");
    });

    test("children can be nested arrays", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const div = this.$html.div([["a", ["b"]], "c"]);
            return div.textContent;
        });
        expect(result).toBe("abc");
    });

    test("children can be DOM nodes", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const span = document.createElement("span");
            span.textContent = "hi";
            const div = this.$html.div(span);
            return div.firstChild === span;
        });
        expect(result).toBe(true);
    });

    test("children can be async iterables", async ({ page }) => {
        const result = await page.evaluate(async function (this: Window) {
            async function* gen() {
                yield "a";
                yield "b";
            }
            const div = this.$html.div(gen());
            await new Promise(r => setTimeout(r, 10));
            return div.textContent;
        });
        expect(result).toBe("ab");
    });

    test("children can be text nodes and numbers", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const div = this.$html.div("foo", 123, "bar");
            return div.textContent;
        });
        expect(result).toBe("foo123bar");
    });

    test("children can be booleans (only false), undefined and null (should be ignored)", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const div = this.$html.div(true, false, null, undefined, "ok");
            return div.textContent;
        });
        expect(result).toBe("trueok");
    });

    test("observable as attribute updates attribute", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const obs = observable("foo");
            const div = this.$html.div({ title: obs });
            obs("bar");
            return div.title;
        });
        expect(result).toBe("bar");
    });

    test("observable as child replaces text node", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const obs = observable("a");
            const div = this.$html.div(obs);
            obs("b");
            return div.textContent;
        });
        expect(result).toBe("b");
    });

    test("arrayObservable as child updates on splice", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const arr = arrayObservable(["a", "b", "c"]);
            const div = this.$html.div(arr);
            arr.splice(1, 1, "x", "y");
            return div.textContent;
        });
        expect(result).toBe("axyc");
    });

    test("arrayObservable as child updates on fill", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const arr = arrayObservable([1, 2, 3]);
            const div = this.$html.div(arr);
            arr.fill(9);
            return div.textContent;
        });
        expect(result).toBe("999");
    });

    test("arrayObservable as child updates on copyWithin", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const arr = arrayObservable([1, 2, 3, 4]);
            const div = this.$html.div(arr);
            arr.copyWithin(1, 2, 4);
            return div.textContent;
        });
        expect(result).toBe("1344");
    });

    test("input value updates observable", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const obs = observable("init");
            const input = this.$html.input({ value: obs });
            input.value = "changed";
            input.dispatchEvent(new Event("input"));
            return obs();
        });
        expect(result).toBe("changed");
    });

    test("checkbox checked updates observable", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const obs = observable(false);
            const input = this.$html.input({ type: "checkbox", checked: obs });
			this.document.body.append(input);
            input.click(); // Toggle by clicking
            return obs();
        });
        expect(result).toBe(true);
    });

    test("data-* attribute updates observable via mutation", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const obs = observable("foo");
            const div = this.$html.div({ data: { bar: obs } });
            this.document.body.append(div);
			div.dataset.bar = "baz";
            return new Promise(resolve => setTimeout(() => resolve(obs()), 100));
        });
        expect(result).toBe("baz");
    });

    test("can create deeply nested elements", async ({ page }) => {
        const result = await page.evaluate(function (this: Window) {
            const tree = this.$html.div(
                this.$html.span("a"),
                this.$html.ul(
                    this.$html.li("b"),
                    this.$html.li("c")
                )
            );
            return tree.querySelector("span") && tree.querySelectorAll("li").length === 2;
        });
        expect(result).toBe(true);
    });
});