import { expect, test } from "@playwright/test";

test("affiche le contenu principal et son titre", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "SAE Platform" })).toBeVisible();
});
