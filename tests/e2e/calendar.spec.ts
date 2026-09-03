import { expect, test } from "@playwright/test";

if (!process.versions.bun || process.env.PLAYWRIGHT_TEST_RUNNER === "true") {
  test("un membre actif filtre le calendrier par SAE", async ({ page }) => {
    await page.context().addCookies([{
      name: "sae-e2e-member-status",
      value: "active",
      url: "http://127.0.0.1:3000"
    }]);

    await page.goto("/calendar");
    await page.getByLabel("SAE").selectOption({ label: "SAE Plateforme" });

    await expect(page.getByText("Phase de développement", { exact: true })).toBeVisible();
    await expect(page.getByText("Rendu SAE Java", { exact: true })).not.toBeVisible();
  });
}
