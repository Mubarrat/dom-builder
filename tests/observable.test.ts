import path from "path";
import { test, expect } from "@playwright/test";

const filePath = path.resolve("tests/test.html");

test.beforeEach(({ page }) => page.goto(`file://${filePath}`));

test.describe("observable", () => {

	test("initial value is returned", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable("hello");
			return obs();
		});
		expect(result).toBe("hello");
	});

	test("updates value when called with new value", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable("a");
			obs("b");
			return obs();
		});
		expect(result).toBe("b");
	});

	test("does not trigger change when same value is set", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable("same");
			let called = false;
			obs.addEventListener("valuechanged", () => called = true);
			obs("same");
			return called;
		});
		expect(result).toBe(false);
	});

	test("subscribers are called on change", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable("old");
			let newVal;
			obs.addEventListener("valuechanged", (e: ValueChangeEvent) => newVal = e.newValue);
			obs("new");
			return newVal;
		});
		expect(result).toBe("new");
	});

	test("bindTo has type 'to'", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable("x");
			return obs.bindTo.type;
		});
		expect(result).toBe("to");
	});

	test("bindFrom has type 'from'", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable("x");
			return obs.bindFrom.type;
		});
		expect(result).toBe("from");
	});

	test("bindTo and bindFrom share value with original", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable("a");
			obs.bindTo("b");
			const afterBindTo = obs();
			obs.bindFrom("c");
			const afterBindFrom = obs();
			return { afterBindTo, afterBindFrom };
		});
		expect(result.afterBindTo).toBe("b");
		expect(result.afterBindFrom).toBe("c");
	});

	test("optimistic: updates immediately and reverts on rejection", async ({ page }) => {
		const result = await page.evaluate(async () => {
			const obs = observable(1);
			const p = new Promise((resolve, reject) => {
				setTimeout(() => reject("err"), 100);
			});

			const promise = obs.optimistic(
				current => current + 1,
				p
			);

			const optimisticValue = obs(); // 2
			let finalValue;
			try {
				await promise;
			} catch {
				finalValue = obs(); // rolled back to 1
			}

			return { optimisticValue, finalValue };
		});
		expect(result.optimisticValue).toBe(2);
		expect(result.finalValue).toBe(1);
	});

	test("works with arrays (immutable)", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable([1, 2]);
			obs([3, 4]);
			return obs();
		});
		expect(result).toEqual([3, 4]);
	});

	test("works with objects (immutable)", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable({ a: 1 });
			obs({ a: 2 });
			return obs();
		});
		expect(result).toEqual({ a: 2 });
	});

	test("toStringTag is observable", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable();
			return Object.prototype.toString.call(obs);
		});
		expect(result).toBe("[object observable]");
	});

	test("prototype chain inherits from baseObservable", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable();
			return Object.getPrototypeOf(Object.getPrototypeOf(obs)) === baseObservable.prototype;
		});
		expect(result).toBe(true);
	});

	test("multiple subscribers are notified", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable(0);
			let calls = 0;
			obs.addEventListener("valuechanged", () => calls++);
			obs.addEventListener("valuechanged", () => calls++);
			obs(1);
			return calls;
		});
		expect(result).toBe(2);
	});

	test("notify manually triggers subscribers", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable(5);
			let called = false;
			obs.addEventListener("valuechanged", () => called = true);
			obs.notify();
			return called;
		});
		expect(result).toBe(true);
	});

	test("null initial value", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable(null);
			return obs();
		});
		expect(result).toBeNull();
	});

	test("updates primitive values correctly", async ({ page }) => {
		const result = await page.evaluate(() => {
			const obs = observable(42);
			obs(100);
			return obs();
		});
		expect(result).toBe(100);
	});

    test("does not notify if value is NaN and set to NaN again", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = observable(NaN);
            let called = false;
            obs.addEventListener("valuechanged", () => called = true);
            obs(NaN);
            return called;
        });
        expect(result).toBe(false);
    });

    test("can remove event listener", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = observable("x");
            let called = false;
            function handler() { called = true; }
            obs.addEventListener("valuechanged", handler);
            obs.removeEventListener("valuechanged", handler);
            obs("y");
            return called;
        });
        expect(result).toBe(false);
    });

    test("bindTo and bindFrom are callable and return correct value", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = observable("foo");
            const to = obs.bindTo;
            const from = obs.bindFrom;
            to("bar");
            from("baz");
            return [obs(), to(), from()];
        });
        expect(result).toEqual(["baz", "baz", "baz"]);
    });

    test("optimistic: does not rollback on resolve", async ({ page }) => {
        const result = await page.evaluate(async () => {
            const obs = observable(1);
            const p = Promise.resolve();
            await obs.optimistic(current => current + 1, p);
            return obs();
        });
        expect(result).toBe(2);
    });

    test("optimistic: throws and rolls back if promise rejects", async ({ page }) => {
        const result = await page.evaluate(async () => {
            const obs = observable(10);
            const p = Promise.reject("fail");
            let error;
            try {
                await obs.optimistic(current => current + 5, p);
            } catch (e) {
                error = e;
            }
            return { value: obs(), error: error === "fail" };
        });
        expect(result.value).toBe(10);
        expect(result.error).toBe(true);
    });

    test("prototype has correct toStringTag", async ({ page }) => {
        const result = await page.evaluate(() => {
            return Object.prototype.toString.call(observable.prototype);
        });
        expect(result).toBe("[object observable]");
    });

    test("observable.prototype is prototype of all observables", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = observable();
            return Object.getPrototypeOf(obs) === observable.prototype;
        });
        expect(result).toBe(true);
    });

    test("observable.prototype.type is 'two-way'", async ({ page }) => {
        const result = await page.evaluate(() => observable.prototype.type);
        expect(result).toBe("two-way");
    });

    test("observable can be called with undefined to set value", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = observable("a");
            obs(undefined);
            return obs();
        });
        expect(result).toBe(undefined);
    });

    test("observable can be called with no arguments to get value", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = observable("abc");
            return obs();
        });
        expect(result).toBe("abc");
	});

    test("addEventListener supports AbortController for removal", async ({ page }) => {
        const result = await page.evaluate(() => {
            const obs = observable(1);
            let called = false;
            const controller = new AbortController();
            obs.addEventListener("valuechanged", () => called = true, { signal: controller.signal });
            controller.abort();
            obs(2);
            return called;
        });
        expect(result).toBe(false);
    });

});
