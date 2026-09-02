import { expect, test } from "@playwright/test";

if (!process.versions.bun) {
  test("un membre en attente voit l’écran Accès en attente", async ({ page }) => {
    await page.context().addCookies([{
      name: "sae-e2e-member-status",
      value: "pending",
      url: "http://localhost:3000"
    }]);
    await page.goto("http://localhost:3000/pending");

    await expect(page).toHaveURL(/\/pending$/);
    await expect(page.getByRole("heading", { level: 1, name: "Accès en attente" })).toBeVisible();
  });
}
