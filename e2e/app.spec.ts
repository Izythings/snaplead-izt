import { expect, test } from "@playwright/test";

test("dashboard authenticated shell renders core navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Plan commercial terrain" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Importer des photos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ouvrir le CRM" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Générer le plan" })).toBeVisible();
  await expect(page.getByRole("main").getByText("Captures", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Leads", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Confrères", { exact: true })).toBeVisible();
});

test("crm page exposes lead filters and internal actions", async ({ page }) => {
  await page.goto("/leads");

  await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  await expect(page.getByPlaceholder("Rechercher nom, ville, téléphone")).toBeVisible();
  await expect(page.locator("select").first()).toBeVisible();
  await expect(page.getByText("Leads filtrés")).toBeVisible();
  await expect(page.locator(".snap-panel").filter({ hasText: "Pertinence moyenne" }).first()).toBeVisible();
  const scoreHeader = page.getByRole("button", { name: /Trier par Pertinence/ });
  if (await scoreHeader.isVisible()) {
    await scoreHeader.click();
    await expect(page).toHaveURL(/sort=score-asc/);
    await scoreHeader.click();
    await expect(page).toHaveURL(/sort=score-desc/);
    await page.getByRole("button", { name: /Trier par Confiance/ }).click();
    await expect(page).toHaveURL(/sort=confidence-asc/);
  }
});

test("import page exposes batch photo workflow", async ({ page }) => {
  await page.goto("/import");

  await expect(page.getByRole("heading", { name: "Photos du jour" })).toBeVisible();
  await expect(page.getByText("Déposer les photos terrain")).toBeVisible();
  await expect(page.getByText("Multi-photo, EXIF GPS et date extraits avant compression et upload.")).toBeVisible();
});

test("plan page exposes generation, csv and crm actions", async ({ page }) => {
  await page.goto("/plan");

  await expect(page.getByRole("heading", { name: "Plan d'attaque" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Générer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Push all" })).toBeVisible();
});

test("settings page can prefill webhook presets", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Webhooks" })).toBeVisible();
  await page.getByRole("button", { name: "Make" }).click();
  await expect(page.getByPlaceholder("URL webhook")).toHaveValue("https://hook.eu1.make.com/...");
  await page.getByRole("button", { name: "Zapier" }).click();
  await expect(page.getByPlaceholder("URL webhook")).toHaveValue("https://hooks.zapier.com/hooks/catch/...");
});
