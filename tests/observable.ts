import path from "path";
import { test, expect } from "@playwright/test";

const filePath = path.resolve("tests/test.html");

test.beforeEach(async ({ page }) => {
	await page.goto(`file://${filePath}`);
});

test.describe("observable", () => {

    test("initial value is returned", () => {
        const obs = observable("hello");
        expect(obs()).toBe("hello");
    });

    test("updates value when called with new value", () => {
        const obs = observable("a");
        obs("b");
        expect(obs()).toBe("b");
    });

    test("does not trigger change when same value is set", () => {
		const obs = observable("same");
		let called = false;
		obs.addEventListener("valuechanged", () => called = true);
		obs("same");
		expect(called).toBe(false);
	});

	test("subscribers are called on change", () => {
		const obs = observable("old");
		let newVal;
		obs.addEventListener("valuechanged", (e: ValueChangeEvent) => newVal = e.newValue);
		obs("new");
		expect(newVal).toBe("new");
	});

    test("bindTo has type 'to'", () => {
        const obs = observable("x");
        expect(obs.bindTo.type).toBe("to");
    });

    test("bindFrom has type 'from'", () => {
        const obs = observable("x");
        expect(obs.bindFrom.type).toBe("from");
    });

    test("bindTo and bindFrom share value with original", () => {
        const obs = observable("a");
        obs.bindTo("b");
        expect(obs()).toBe("b");
        obs.bindFrom("c");
        expect(obs()).toBe("c");
    });

    test("optimistic: updates immediately and reverts on rejection", async () => {
        const obs = observable(1);
        const p = Promise.reject("err");

        const promise = obs.optimistic(
            current => current + 1,
            p.catch(e => { throw e; }),
            undefined,
            (err, rollback) => {
                expect(err).toBe("err");
                expect(rollback).toBe(1);
            }
        );

        expect(obs()).toBe(2); // optimistic update applied

        await expect(promise).rejects.toBe("err");
        expect(obs()).toBe(1); // rolled back
    });

    test("optimistic: reconciles with resolver on resolve", async () => {
        const obs = observable(1);
        const p = Promise.resolve(10);

        const result = await obs.optimistic(
            current => current + 1,
            p,
            (current, resolved) => current + resolved
        );

        expect(result).toBe(10);
        expect(obs()).toBe(12); // 2 + 10
    });

    test("pessimistic: waits for promise then updates", async () => {
        const obs = observable(1);
        const p = Promise.resolve(5);

        const result = await obs.pessimistic(
            p,
            (current, resolved) => current + resolved
        );

        expect(result).toBe(5);
        expect(obs()).toBe(6);
    });

    test("pessimistic: handles rejection", async () => {
        const obs = observable(1);
        const p = Promise.reject("fail");

        await expect(
            obs.pessimistic(p, () => {}, (err, current) => {
                expect(err).toBe("fail");
                expect(current).toBe(1);
            })
        ).rejects.toBe("fail");
    });

    test("works with arrays (immutable)", () => {
        const obs = observable([1, 2]);
        obs([3, 4]);
        expect(obs()).toEqual([3, 4]);
    });

    test("works with objects (immutable)", () => {
        const obs = observable({ a: 1 });
        obs({ a: 2 });
        expect(obs()).toEqual({ a: 2 });
    });

    test("toStringTag is observable", () => {
        const obs = observable();
        expect(Object.prototype.toString.call(obs)).toBe("[object observable]");
    });

    test("prototype chain inherits from baseObservable", () => {
        const obs = observable();
        expect(Object.getPrototypeOf(Object.getPrototypeOf(obs)))
            .toBe(baseObservable.prototype);
    });

    test("multiple subscribers are notified", () => {
		const obs = observable(0);
		let calls = 0;
		obs.addEventListener("valuechanged", () => calls++);
		obs.addEventListener("valuechanged", () => calls++);
		obs(1);
		expect(calls).toBe(2);
	});

	test("notify manually triggers subscribers", () => {
		const obs = observable(5);
		let called = false;
		obs.addEventListener("valuechanged", () => called = true);
		obs.notify();
		expect(called).toBe(true);
	});

    test("optimistic supports mutable update (notify)", async () => {
        const obs = observable({ a: 1 });
        const p = Promise.resolve("done");

        const result = await obs.optimistic(
            obj => { obj.a = 2; }, // mutate
            p
        );

        expect(obs()).toEqual({ a: 2 });
        expect(result).toBe("done");
    });

    test("pessimistic supports mutable update (notify)", async () => {
        const obs = observable({ a: 1 });
        const p = Promise.resolve("done");

        await obs.pessimistic(
            p,
            (obj, result) => { obj.a = 2; }
        );

        expect(obs()).toEqual({ a: 2 });
    });

    test("null initial value", () => {
        const obs = observable(null);
        expect(obs()).toBeNull();
    });

    test("updates primitive values correctly", () => {
        const obs = observable(42);
        obs(100);
        expect(obs()).toBe(100);
    });

});
