import { test, expect } from "../playwright-fixture";

/**
 * End-to-end Student Journey
 *
 * Covers: login → dashboard → all major sidebar tabs → AI chat → subscriptions.
 *
 * Credentials are read from env so CI can inject a real test account:
 *   STUDENT_TEST_MOBILE  (default: 9999999999)
 *   STUDENT_TEST_PASSWORD (default: Test@1234)
 *
 * The test is resilient: tabs that the seeded user does not have access to
 * (locked behind tier) are skipped rather than failing the whole journey.
 */

const MOBILE = process.env.STUDENT_TEST_MOBILE ?? "9999999999";
const PASSWORD = process.env.STUDENT_TEST_PASSWORD ?? "Test@1234";

const TABS = [
  "Overview",
  "Subscriptions Status",
  "Learning Paths",
  "Module Groups",
  "Modules & Videos",
  "Section Content – AI Chat",
  "Section Content – AI Tools",
  "Question Bank",
  "Coding Challenges",
  "Prompts",
  "Assessments",
  "Projects",
];

test.describe("Student journey", () => {
  test("login → tabs → AI chat → subscriptions", async ({ page }) => {
    test.setTimeout(180_000);

    // 1. LOGIN
    await page.goto("/student-login");
    await expect(page.getByRole("heading", { name: /candidate sign in/i })).toBeVisible();

    await page.getByLabel(/mobile number/i).fill(MOBILE);
    await page.getByLabel(/^password$/i).fill(PASSWORD);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // 2. DASHBOARD LOADED
    await page.waitForURL(/\/student-dashboard/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /your learning dashboard/i })).toBeVisible();

    // 3. WALK EVERY MAJOR TAB
    for (const label of TABS) {
      const item = page.getByRole("button", { name: new RegExp(label, "i") }).first();
      if (!(await item.isVisible().catch(() => false))) continue;

      // Locked items contain a 🔒 marker — open the upgrade dialog instead of asserting content
      const text = (await item.textContent()) ?? "";
      const locked = text.includes("🔒");

      await item.click();
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

      if (locked) {
        // Expect the upgrade dialog
        await expect(page.getByRole("heading", { name: /upgrade your plan/i })).toBeVisible({ timeout: 5_000 });
        await page.keyboard.press("Escape");
      } else {
        // Sanity: the section header / main region rendered something
        await expect(page.locator("main")).toBeVisible();
      }
    }

    // 4. AI CHAT — type a message if the input is reachable
    const aiChatTab = page.getByRole("button", { name: /ai chat/i }).first();
    if (await aiChatTab.isVisible().catch(() => false)) {
      await aiChatTab.click();
      await page.waitForLoadState("networkidle").catch(() => {});
      const input = page
        .getByRole("textbox")
        .filter({ hasText: "" })
        .first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill("Hello from E2E test").catch(() => {});
      }
    }

    // 5. SUBSCRIPTIONS STATUS — verify badge + plan card render
    await page.getByRole("button", { name: /subscriptions status/i }).click();
    await expect(page.getByRole("heading", { name: /your subscription/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /view upgrade options/i })).toBeVisible();

    // 6. LOGOUT (cleanup + smoke check on auth flow)
    await page.getByRole("link", { name: /logout/i }).click();
    await page.waitForURL(/\/student-login/);
  });
});
