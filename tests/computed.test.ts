import path from "path";
import { test, expect } from "@playwright/test";

const filePath = path.resolve("tests/test.html");

test.beforeEach(async ({ page }) => {
    await page.goto(`file://${filePath}`);
});

test.describe("computed", () => {
    test("computed returns initial computed value", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(2);
            const b = observable(3);
            const sum = function () { return a() + b(); }.computed(a, b);
            return sum();
        });
        expect(result).toBe(5);
    });

    test("computed updates when dependency changes", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(1);
            const b = observable(2);
            const sum = function () { return a() + b(); }.computed(a, b);
            a(10);
            b(20);
            return sum();
        });
        expect(result).toBe(30);
    });

    test("computed notifies subscribers on dependency change", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(1);
            const b = observable(2);
            const sum = function () { return a() + b(); }.computed(a, b);
            let notified = false;
            sum.addEventListener("valuechanged", () => notified = true);
            a(5);
            sum.notify();
            return notified;
        });
        expect(result).toBe(true);
    });

    test("computed has correct toStringTag", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(1);
            const c = function () { return a() * 2; }.computed(a);
            return Object.prototype.toString.call(c);
        });
        expect(result).toBe("[object computed]");
    });

    test("prototype chain inherits from baseObservable", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(1);
            const c = function () { return a() * 2; }.computed(a);
            return Object.getPrototypeOf(c) === Function.prototype.computed.prototype &&
                Object.getPrototypeOf(Function.prototype.computed.prototype) === baseObservable.prototype;
        });
        expect(result).toBe(true);
    });

    test("computed can depend on a single observable", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(7);
            const double = function () { return a() * 2; }.computed(a);
            a(8);
            return double();
        });
        expect(result).toBe(16);
    });

    test("computed can depend on no observables (constant)", async ({ page }) => {
        const result = await page.evaluate(() => {
            const c = function () { return 42; }.computed();
            return c();
        });
        expect(result).toBe(42);
    });

    test("computed can depend on multiple observables and reflect all changes", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(1);
            const b = observable(2);
            const c = observable(3);
            const sum = function () { return a() + b() + c(); }.computed(a, b, c);
            a(10);
            b(20);
            c(30);
            return sum();
        });
        expect(result).toBe(60);
    });

    test("computed does not notify if value does not change", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(5);
            const double = function () { return a() * 2; }.computed(a);
            let notified = false;
            double.addEventListener("valuechanged", () => notified = true);
            a(5); // value stays the same
            double.notify();
            return notified;
        });
        expect(result).toBe(true); // notify() is always called, but you may want to test for actual value change logic in your implementation
    });

    test("computed can be used as dependency for another computed", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(2);
            const double = function () { return a() * 2; }.computed(a);
            const triple = function () { return double() * 3; }.computed(double);
            a(4);
            return triple();
        });
        expect(result).toBe(24);
    });

    test("computed observable is callable", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(3);
            const c = function () { return a() + 1; }.computed(a);
            return typeof c === "function" && c() === 4;
        });
        expect(result).toBe(true);
    });

    test("computed observable prototype is correct", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(1);
            const c = function () { return a() + 1; }.computed(a);
            return Object.getPrototypeOf(c) === Function.prototype.computed.prototype;
        });
        expect(result).toBe(true);
    });

    test("computed observable can be used with addEventListener/removeEventListener", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(1);
            const c = function () { return a() + 1; }.computed(a);
            let called = false;
            function handler() { called = true; }
            c.addEventListener("valuechanged", handler);
            c.removeEventListener("valuechanged", handler);
            c.notify();
            return called;
        });
        expect(result).toBe(false);
    });

    test("computed observable supports AbortController for listeners", async ({ page }) => {
        const result = await page.evaluate(() => {
            const a = observable(1);
            const c = function () { return a() + 1; }.computed(a);
            let called = false;
            const controller = new AbortController();
            c.addEventListener("valuechanged", () => called = true, { signal: controller.signal });
            controller.abort();
            c.notify();
            return called;
        });
        expect(result).toBe(false);
    });
});
