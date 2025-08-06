import path from "path";
import { test, expect } from "@playwright/test";

const filePath = path.resolve("tests/test.html");

test.beforeEach(({ page }) => page.goto(`file://${filePath}`));

test.describe("arrayObservable", () => {
    test("initializes with values", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            return arr.length === 3 && arr[0] === 1 && arr[2] === 3;
        });
        expect(result).toBe(true);
    });

    test("push adds elements and triggers event", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1]);
            let called = false;
            arr.addEventListener("valuechanged", () => called = true);
            arr.push(2, 3);
            return arr.length === 3 && arr[2] === 3 && called;
        });
        expect(result).toBe(true);
    });

    test("pop removes last element", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2]);
            const popped = arr.pop();
            return popped === 2 && arr.length === 1 && arr[0] === 1;
        });
        expect(result).toBe(true);
    });

    test("shift removes first element", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([5, 6, 7]);
            const shifted = arr.shift();
            return shifted === 5 && arr.length === 2 && arr[0] === 6;
        });
        expect(result).toBe(true);
    });

    test("unshift adds elements to start", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([3]);
            arr.unshift(1, 2);
            return arr.length === 3 && arr[0] === 1 && arr[1] === 2;
        });
        expect(result).toBe(true);
    });

    test("splice removes and adds elements", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3, 4]);
            const removed = arr.splice(1, 2, 9, 8);
            return JSON.stringify(removed) === "[2,3]" && arr[1] === 9 && arr[2] === 8 && arr.length === 4;
        });
        expect(result).toBe(true);
    });

    test("reverse reverses array", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            arr.reverse();
            return arr[0] === 3 && arr[2] === 1;
        });
        expect(result).toBe(true);
    });

    test("sort sorts array", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([3, 1, 2]);
            arr.sort();
            return arr[0] === 1 && arr[2] === 3;
        });
        expect(result).toBe(true);
    });

    test("fill fills array with value", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            arr.fill(7);
            return arr[0] === 7 && arr[2] === 7;
        });
        expect(result).toBe(true);
    });

    test("copyWithin copies part of array", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3, 4]);
            arr.copyWithin(1, 2, 4);
            return arr[1] === 3 && arr[2] === 4;
        });
        expect(result).toBe(true);
    });

    test("direct index assignment triggers event", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2]);
            let called = false;
            arr.addEventListener("valuechanged", () => called = true);
            arr[1] = 5;
            return arr[1] === 5 && called;
        });
        expect(result).toBe(true);
    });

    test("length assignment truncates array", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            arr.length = 2;
            return arr.length === 2 && arr[1] === 2;
        });
        expect(result).toBe(true);
    });

    test("length assignment extends array", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1]);
            arr.length = 3;
            return arr.length === 3 && arr[2] === undefined;
        });
        expect(result).toBe(true);
    });

    test("bind.map creates mapped observable", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            const mapped = arr.bind.map(x => x * 2);
            return mapped[0] === 2 && mapped[2] === 6;
        });
        expect(result).toBe(true);
    });

    test("bind.map mapped observable updates on source change", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2]);
            const mapped = arr.bind.map(x => x + 1);
            arr.push(3);
            return mapped[2] === 4;
        });
        expect(result).toBe(true);
    });

    test("bind.map mapped observable is read-only", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2]);
            const mapped = arr.bind.map(x => x * 2);
            try {
                mapped.push(5);
                return false;
            } catch (e) {
                return true;
            }
        });
        expect(result).toBe(true);
    });

    test("optimistic keeps changes on resolve", async ({ page }) => {
        const result = await page.evaluate(async () => {
            const arr = arrayObservable([1]);
            await arr.optimistic(a => a.push(2), Promise.resolve());
            return arr.length === 2 && arr[1] === 2;
        });
        expect(result).toBe(true);
    });

    test("optimistic rolls back on reject", async ({ page }) => {
        const result = await page.evaluate(async () => {
            const arr = arrayObservable([1]);
            try {
                await arr.optimistic(a => a.push(2), Promise.reject("fail"));
            } catch {}
            return arr.length === 1 && arr[0] === 1;
        });
        expect(result).toBe(true);
    });

    test("Symbol.toStringTag is arrayObservable", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([]);
            return Object.prototype.toString.call(arr) === "[object arrayObservable]";
        });
        expect(result).toBe(true);
    });

    test("prototype chain is correct", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([]);
            return Object.getPrototypeOf(arr) === arrayObservable.prototype;
        });
        expect(result).toBe(true);
    });

    test("has trap works for indices and length", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2]);
            return (0 in arr) && (1 in arr) && ("length" in arr) && !(2 in arr);
        });
        expect(result).toBe(true);
    });

    test("ownKeys includes indices and properties", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2]);
            const keys = Object.keys(arr);
            return keys.includes("0") && keys.includes("1");
        });
        expect(result).toBe(true);
    });

    test("getOwnPropertyDescriptor returns correct descriptor for index", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([42]);
            const desc = Object.getOwnPropertyDescriptor(arr, "0");
            return desc && desc.value === 42 && desc.enumerable && desc.writable;
        });
        expect(result).toBe(true);
    });

    test("getOwnPropertyDescriptor returns correct descriptor for length", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            const desc = Object.getOwnPropertyDescriptor(arr, "length");
            return desc && desc.value === 3 && !desc.enumerable && desc.writable === true;
        });
        expect(result).toBe(true);
    });

    test("forEach iterates all items", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            let sum = 0;
            arr.forEach(v => sum += v);
            return sum;
        });
        expect(result).toBe(6);
    });

    test("map returns correct values", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            return arr.map(x => x * 3).join(",");
        });
        expect(result).toBe("3,6,9");
    });

    test("filter returns correct values", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3, 4]);
            return arr.filter(x => x % 2 === 0).join(",");
        });
        expect(result).toBe("2,4");
    });

    test("find returns first matching value", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([5, 7, 9]);
            return arr.find(x => x > 6);
        });
        expect(result).toBe(7);
    });

    test("includes returns true for present value", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            return arr.includes(2);
        });
        expect(result).toBe(true);
    });

    test("indexOf returns correct index", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([10, 20, 30]);
            return arr.indexOf(20);
        });
        expect(result).toBe(1);
    });

    test("every returns true if all match", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([2, 4, 6]);
            return arr.every(x => x % 2 === 0);
        });
        expect(result).toBe(true);
    });

    test("some returns true if any match", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 3, 4]);
            return arr.some(x => x % 2 === 0);
        });
        expect(result).toBe(true);
    });

    test("reduce sums values", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3, 4]);
            return arr.reduce((a, b) => a + b, 0);
        });
        expect(result).toBe(10);
    });

    test("can be spread into a new array", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            const copy = [...arr];
            return copy.length === 3 && copy[1] === 2;
        });
        expect(result).toBe(true);
    });

    test("toString returns array string", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            return arr.toString();
        });
        expect(result).toBe("1,2,3");
    });

    test("join returns joined string", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3]);
            return arr.join("-");
        });
        expect(result).toBe("1-2-3");
    });

    test("slice returns correct subarray", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1, 2, 3, 4]);
            return arr.slice(1, 3).join(",");
        });
        expect(result).toBe("2,3");
    });

    test("can be iterated with for...of", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([10, 20, 30]);
            let sum = 0;
            for (const v of arr) sum += v;
            return sum;
        });
        expect(result).toBe(60);
    });

    test("Array.isArray returns false", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1]);
            return Array.isArray(arr);
        });
        expect(result).toBe(false);
    });

    test("instanceof Array returns false", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1]);
            return arr instanceof Array;
        });
        expect(result).toBe(false);
    });

    test("instanceof baseObservable returns true", async ({ page }) => {
        const result = await page.evaluate(() => {
            const arr = arrayObservable([1]);
            return arr instanceof baseObservable;
		});
		expect(result).toBe(true);
	});
});