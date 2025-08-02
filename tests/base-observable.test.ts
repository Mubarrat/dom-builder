import path from "path";
import { test, expect } from "@playwright/test";

const filePath = path.resolve("tests/test.html");

test.beforeEach(async ({ page }) => {
    await page.goto(`file://${filePath}`);
});

test.describe("baseObservable", () => {
    test("is callable and returns initial value", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = baseObservable((v = 1) => v);
            return obs();
        });
        expect(result).toBe(1);
    });

    test("addEventListener and dispatchEvent work", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = baseObservable((v = 1) => v);
            let called = false;
            obs.addEventListener("valuechanged", () => called = true);
            obs.notify();
            return called;
        });
        expect(result).toBe(true);
    });

    test("removeEventListener works", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = baseObservable((v = 1) => v);
            let called = false;
            function handler() { called = true; }
            obs.addEventListener("valuechanged", handler);
            obs.removeEventListener("valuechanged", handler);
            obs.notify();
            return called;
        });
        expect(result).toBe(false);
    });

    test("notifyBefore can cancel change", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = baseObservable((v = 1) => v);
            obs.addEventListener("valuechanging", e => e.preventDefault());
            const changed = obs.tryChange(() => 2, { oldValue: 1, newValue: 2 });
            return changed === undefined;
        });
        expect(result).toBe(true);
    });

    test("tryChange applies change and notifies", async ({ page }) => {
        const result = await page.evaluate(() => {
            let value = 1;
            const obs = baseObservable(() => value);
            let notified = false;
            obs.addEventListener("valuechanged", () => notified = true);
            const res = obs.tryChange(() => value = 2, { oldValue: 1, newValue: 2 });
            return { value, res, notified };
        });
        expect(result.value).toBe(2);
        expect(result.res).toBe(2);
        expect(result.notified).toBe(true);
    });

    test("bindSelect creates derived observable", async ({ page }) => {
        const result = await page.evaluate(() => {
            let value = 3;
            const obs = baseObservable(() => value);
            const derived = obs.bindSelect(v => v * 2);
            return derived();
        });
        expect(result).toBe(6);
    });

    test("validatable adds isValid observable", async ({ page }) => {
        const result = await page.evaluate(() => {
            let value = 5;
            const obs = baseObservable(() => value);
            const valid = obs.validatable(v => v > 3);
            return valid.isValid();
        });
        expect(result).toBe(true);
    });

    test("coercible applies coercion", async ({ page }) => {
        const result = await page.evaluate(() => {
            let value = 0;
            const obs = baseObservable((v = 0) => value = v);
            const coerced = obs.coercible(v => v * 10);
            coerced(2);
            return value;
        });
        expect(result).toBe(20);
    });

    test("Symbol.toStringTag is baseObservable", async ({ page }) => {
        const result = await page.evaluate(() => {
            return Object.prototype.toString.call(baseObservable.prototype);
        });
        expect(result).toBe("[object baseObservable]");
    });

    test("prototype chain inherits from EventTarget", async ({ page }) => {
        const result = await page.evaluate(() => {
            return Object.getPrototypeOf(baseObservable.prototype) === EventTarget.prototype;
        });
        expect(result).toBe(true);
    });

    test("baseObservable.autoBind binds plain value", async ({ page }) => {
        const result = await page.evaluate(() => {
            let val;
            baseObservable.autoBind(123, v => val = v);
            return val;
        });
        expect(result).toBe(123);
    });

    test("baseObservable.autoBind binds observable and listens for changes", async ({ page }) => {
        const result = await page.evaluate(() => {
            let value = 1;
            const obs = baseObservable(() => value);
            let bound;
            baseObservable.autoBind(obs, v => bound = v);
            value = 2;
            obs.notify();
            return bound;
        });
        expect(result).toBe(2);
    });

    test("baseObservable.autoBind calls observe for input modes", async ({ page }) => {
        const result = await page.evaluate(() => {
            let value = 1;
            const obs = baseObservable(() => value);
            obs.type = "from";
            let observed;
            baseObservable.autoBind(obs, () => {}, v => observed = v);
            return observed;
        });
        expect(result).toBe(1);
    });

    test("addEventListener supports AbortController for removal", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = baseObservable((v = 1) => v);
            let called = false;
            const controller = new AbortController();
            obs.addEventListener("valuechanged", () => called = true, { signal: controller.signal });
            controller.abort();
            obs.notify();
            return called;
        });
        expect(result).toBe(false);
    });

    test("dispatchEvent returns true if not canceled", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = baseObservable((v = 1) => v);
            const event = new Event("valuechanging", { cancelable: true });
            return obs.dispatchEvent(event);
        });
        expect(result).toBe(true);
    });

    test("dispatchEvent returns false if canceled", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = baseObservable((v = 1) => v);
            obs.addEventListener("valuechanging", e => e.preventDefault());
            const event = new Event("valuechanging", { cancelable: true });
            return obs.dispatchEvent(event);
        });
        expect(result).toBe(false);
    });

    test("tryChange returns undefined if notifyBefore is canceled", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = baseObservable((v = 1) => v);
            obs.addEventListener("valuechanging", e => e.preventDefault());
            return obs.tryChange(() => 123);
        });
        expect(result).toBe(undefined);
    });

    test("multiple listeners are all called", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = baseObservable((v = 1) => v);
            let count = 0;
            obs.addEventListener("valuechanged", () => count++);
            obs.addEventListener("valuechanged", () => count++);
            obs.notify();
            return count;
        });
        expect(result).toBe(2);
    });

    test("can listen for valuechanging and valuechanged", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = baseObservable((v = 1) => v);
            let changing = false, changed = false;
            obs.addEventListener("valuechanging", () => changing = true);
            obs.addEventListener("valuechanged", () => changed = true);
            obs.notifyBefore();
            obs.notify();
            return { changing, changed };
        });
        expect(result.changing).toBe(true);
        expect(result.changed).toBe(true);
    });

    test("bindSelect result is recomputed when source changes", async ({ page }) => {
        const result = await page.evaluate(() => {
            let value = 10;
            const obs = baseObservable(() => value);
            const derived = obs.bindSelect(v => v + 1);
            value = 20;
            obs.notify();
            return derived();
        });
        expect(result).toBe(21);
    });

    test("validatable isValid updates when value changes", async ({ page }) => {
        const result = await page.evaluate(() => {
            let value = 0;
            const obs = baseObservable(() => value);
            const valid = obs.validatable(v => v > 5);
            value = 10;
            obs.notify();
            return valid.isValid();
        });
        expect(result).toBe(true);
    });

    test("coercible returns same observable if no coerce function", async ({ page }) => {
        const result = await page.evaluate(() => {
            let value = 5;
            const obs = baseObservable((v = 5) => value = v);
            const coerced = obs.coercible();
            coerced(7);
            return value;
        });
        expect(result).toBe(7);
    });

});
