import { test, expect } from "@playwright/test";
import { makeAuthToken } from "../fixtures";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gateway-service-dev-479218009109.asia-south1.run.app";

test.describe("Auth — login flow", () => {
  test("successful login stores token and redirects to the role portal", async ({ page }) => {
    const token = makeAuthToken({ role: "student" });

    await page.route(`${API}/auth/sign-in`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(token) }),
    );

    await page.goto("/login");

    // Fill the username/password form
    await page.fill('input[name="username"]', "ada");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // AuthGuard redirects to /student after successful login
    await expect(page).toHaveURL(/\/student/);

    const stored = await page.evaluate(() => localStorage.getItem("gened_auth_token"));
    expect(stored).toBe(token.access_token);
  });

  test("invalid credentials shows error message without navigating away", async ({ page }) => {
    await page.route(`${API}/auth/sign-in`, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid credentials" }),
      }),
    );

    await page.goto("/login");
    await page.fill('input[name="username"]', "ada");
    await page.fill('input[name="password"]', "wrongpass");
    await page.click('button[type="submit"]');

    await expect(page.getByText("Invalid credentials")).toBeVisible();
    // Stays on the login page — must not have navigated to a portal
    await expect(page).toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/student|\/teacher|\/parent|\/admin/);
  });

  test("unauthenticated direct navigation to /student redirects to login", async ({ page }) => {
    // Catch-all: stop the app from making real network calls while bootstrapping
    await page.route(`${API}/**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );

    await page.goto("/student");

    // AuthGuard reads localStorage (empty), then router.replace("/?redirect=...")
    await expect(page).toHaveURL(/\?redirect=%2Fstudent/);
  });
});
