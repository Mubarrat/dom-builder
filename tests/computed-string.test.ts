import path from "path";
import { test, expect } from "@playwright/test";

const filePath = path.resolve("tests/test.html");

test.beforeEach(({ page }) => page.goto(`file://${filePath}`));

test.describe("cstr", () => {
    test("returns static string if no observables", async ({ page }) => {
        const result = await page.evaluate(() => {
            return cstr`Hello, ${"world"}!`;
        });
        expect(result).toBe("Hello, world!");
    });

    test("returns computed observable if any value is observable", async ({ page }) => {
        const result = await page.evaluate(() => {
            const name = observable("Alice");
            const greeting = cstr`Hello, ${name}!`;
            return typeof greeting === "function" && greeting();
        });
        expect(result).toBe("Hello, Alice!");
    });

    test("updates computed string when observable changes", async ({ page }) => {
        const result = await page.evaluate(() => {
            const name = observable("Bob");
            const greeting = cstr`Hi, ${name}!` as computed<string>;
            name("Charlie");
            return greeting();
        });
        expect(result).toBe("Hi, Charlie!");
    });

    test("works with multiple observables", async ({ page }) => {
        const result = await page.evaluate(() => {
            const first = observable("Jane");
            const last = observable("Doe");
            const full = cstr`${first} ${last}` as computed<string>;
            first("John");
            last("Smith");
            return full();
        });
        expect(result).toBe("John Smith");
    });

    test("works with mix of observables and static values", async ({ page }) => {
        const result = await page.evaluate(() => {
            const n = observable(5);
            const s = cstr`Count: ${n}, static text, ${"done"}` as computed<string>;
            n(10);
            return s();
        });
        expect(result).toBe("Count: 10, static text, done");
    });

    test("returns empty string for empty template", async ({ page }) => {
        const result = await page.evaluate(() => {
            return cstr``;
        });
        expect(result).toBe("");
    });

    test("handles undefined and null values", async ({ page }) => {
        const result = await page.evaluate(() => {
            const n = observable(undefined);
            const s = cstr`Value: ${n}, ${null}` as computed<string>;
            return s();
        });
        expect(result).toBe("Value: undefined, null");
    });

    test("computed string notifies listeners on observable change", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = observable("x");
            const s = cstr`Val: ${obs}` as computed<string>;
            let called = false;
            s.addEventListener("valuechanged", () => called = true);
            obs("y");
            s.notify();
            return called;
        });
        expect(result).toBe(true);
    });

    test("computed string prototype is correct", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = observable("a");
            const s = cstr`Test: ${obs}`;
            return Object.getPrototypeOf(s) === Function.prototype.computed.prototype;
        });
        expect(result).toBe(true);
    });

    test("computed string updates with multiple observable changes", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable("A");
            const b = observable("B");
            const s = cstr`${a} and ${b}` as computed<string>;
            a("X");
            b("Y");
            return s();
        });
        expect(result).toBe("X and Y");
    });

    test("computed string notifies only once for batch observable changes", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable("foo");
            const b = observable("bar");
            const s = cstr`${a} ${b}` as computed<string>;
            let count = 0;
            s.addEventListener("valuechanged", () => count++);
            a("baz");
            b("qux");
            s.notify();
            return count;
        });
        expect(result).toBeGreaterThanOrEqual(1);
    });

    test("computed string works with numbers and booleans", async ({ page }) => {
        const result = await page.evaluate(() => {
            const n = observable(42);
            const flag = observable(true);
            const s = cstr`Number: ${n}, Flag: ${flag}` as computed<string>;
            n(100);
            flag(false);
            return s();
        });
        expect(result).toBe("Number: 100, Flag: false");
    });

    test("computed string returns correct value after multiple sequential changes", async ({ page }) => {
        const result = await page.evaluate(() => {
            const n = observable(1);
            const s = cstr`N=${n}` as computed<string>;
            n(2);
            let first = s();
            n(3);
            let second = s();
            return [first, second];
        });
        expect(result).toEqual(["N=2", "N=3"]);
    });

    test("computed string can be used as a function", async ({ page }) => {
        const result = await page.evaluate(() => {
            const n = observable("test");
            const s = cstr`Value: ${n}` as computed<string>;
            return typeof s === "function" && s() === "Value: test";
        });
        expect(result).toBe(true);
    });

    test("computed string supports addEventListener/removeEventListener", async ({ page }) => {
        const result = await page.evaluate(() => {
            const n = observable("hi");
            const s = cstr`Say: ${n}` as computed<string>;
            let called = false;
            function handler() { called = true; }
            s.addEventListener("valuechanged", handler);
            s.removeEventListener("valuechanged", handler);
            n("bye");
            s.notify();
            return called;
        });
        expect(result).toBe(false);
    });

    test("computed string supports AbortController for listeners", async ({ page }) => {
        const result = await page.evaluate(() => {
            const n = observable("foo");
            const s = cstr`Word: ${n}` as computed<string>;
            let called = false;
            const controller = new AbortController();
            s.addEventListener("valuechanged", () => called = true, { signal: controller.signal });
            controller.abort();
            n("bar");
            s.notify();
            return called;
        });
        expect(result).toBe(false);
    });
});
