import path from "path";
import { test, expect } from "@playwright/test";

const filePath = path.resolve("tests/test.html");

test("div renders", async ({ page }) => {
	await page.goto(`file://${filePath}`);

	

	const outerHTML = await page.evaluate(() => {
		const hello = observable("Hello");
		
		const div = $html.div("hi");
		return div.outerHTML;
	});

	expect(outerHTML).toBe("<div>hi</div>");
});

