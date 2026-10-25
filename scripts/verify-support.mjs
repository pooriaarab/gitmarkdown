import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const [baseURL, articlePath, articleTitle] = process.argv.slice(2);
assert(baseURL && articlePath && articleTitle, "Pass a base URL, article path, and title");
const artifacts = resolve(process.env.SUPPORT_ARTIFACTS ?? "e2e-artifacts/support");
mkdirSync(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  for (const [name, width, height] of [["desktop", 1280, 900], ["mobile", 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const home = await page.goto(`${baseURL}/support`);
    assert.equal(home.status(), 200);
    await page.getByRole("heading", { level: 1, name: "Help center" }).waitFor();
    await page.screenshot({ path: resolve(artifacts, `${name}-home.png`), fullPage: true });
    const search = page.getByRole("searchbox", { name: "Search articles" });
    await search.fill(articleTitle);
    await page.getByTestId("support-search-results").getByRole("link", { name: articleTitle }).click();
    await page.getByRole("heading", { level: 1, name: articleTitle }).waitFor();
    assert.equal(new URL(page.url()).pathname, articlePath);
    const article = await page.request.get(`${baseURL}${articlePath}`);
    assert.equal(article.status(), 200);
    await page.screenshot({ path: resolve(artifacts, `${name}-article.png`), fullPage: true });
    await page.goto(`${baseURL}/support`);
    await search.fill("zzzz-no-match");
    assert.match(await page.getByTestId("support-search-results").innerText(), /No articles match/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `${name} has horizontal overflow`);
    checks.push({ viewport: name, home: home.status(), article: article.status(), search: "passed" });
    await page.close();
  }
  const request = await browser.newContext();
  for (const [path, status, title] of [
    ["/support.md", 200, "Help center"],
    [`${articlePath}.md`, 200, articleTitle],
    ["/support/articles/missing/missing", 404, ""],
    ["/support/articles/missing/missing.md", 404, ""],
  ]) {
    const result = await request.request.get(`${baseURL}${path}`);
    assert.equal(result.status(), status, path);
    if (status === 200) {
      assert.match(result.headers()["content-type"], /text\/markdown/);
      assert((await result.text()).includes(title));
    }
    checks.push({ path, status: result.status() });
  }
  writeFileSync(resolve(artifacts, "report.json"), JSON.stringify({ checks }, null, 2) + "\n");
  console.log("Support E2E: desktop, mobile, search, Markdown, and 404 checks passed");
} finally {
  await browser.close();
}
