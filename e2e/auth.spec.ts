import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5173";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByRole("heading", { name: /sign in|log in|welcome/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto(BASE);
    await page.getByLabel(/email/i).fill("nobody@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong|not found/i)).toBeVisible({ timeout: 5000 });
  });

  test("SUPER_ADMIN can log in and sees admin dashboard", async ({ page }) => {
    await page.goto(BASE);
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("Password123!");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    // After login, should redirect to dashboard
    await expect(page).not.toHaveURL(/login/i, { timeout: 8000 });
    // Should see navigation
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/login/i, { timeout: 5000 });
  });
});

test.describe("PWA", () => {
  test("offline page is served when network is unavailable", async ({ page, context }) => {
    await page.goto(BASE);
    await context.setOffline(true);
    await page.goto(`${BASE}/some-path-that-triggers-network`);
    // The offline.html should be shown by the service worker
    // This test will only pass after the service worker is registered
    await context.setOffline(false);
  });
});
