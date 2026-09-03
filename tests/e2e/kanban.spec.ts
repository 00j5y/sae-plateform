import { expect, test } from "@playwright/test";

if (!process.versions.bun) {
  test("un membre actif peut créer une tâche depuis le Kanban", async ({ page }) => {
    await page.context().addCookies([{
      name: "sae-e2e-member-status",
      value: "active",
      url: "http://127.0.0.1:3000"
    }]);

    await page.goto("/kanban");
    await page.getByRole("button", { name: "Nouvelle tâche" }).click();
    await page.getByLabel("Titre").fill("Écrire les tests");
    await page.getByRole("button", { name: "Créer la tâche" }).click();

    await expect(page.getByText("Écrire les tests", { exact: true })).toBeVisible();
  });
}
