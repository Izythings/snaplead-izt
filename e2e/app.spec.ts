import { expect, test } from "@playwright/test";

test("dashboard authenticated shell renders core navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nouvelle capture" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Ouvrir le CRM" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan d'appel" }).first()).toBeVisible();
  await expect(page.getByRole("main").getByText("Captures", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Leads terrain", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Leads chauds", { exact: true })).toBeVisible();
});

test("crm page exposes lead filters and internal actions", async ({ page }) => {
  await page.goto("/leads");

  await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  await expect(page.getByPlaceholder("Nom, ville, téléphone…")).toBeVisible();
  await expect(page.locator("select").first()).toBeVisible();
  await expect(page.getByText("Leads filtrés")).toBeVisible();
  await expect(page.locator(".snap-panel").filter({ hasText: "Score moyen" }).first()).toBeVisible();
  const scoreHeader = page.getByRole("button", { name: /Trier par Score/ });
  if (await scoreHeader.isVisible()) {
    await scoreHeader.click();
    await expect(page).toHaveURL(/sort=score-asc/);
    await scoreHeader.click();
    await expect(page).toHaveURL(/sort=score-desc/);
  }
});

test("import page exposes batch photo workflow", async ({ page }) => {
  await page.goto("/import");

  await expect(page.getByRole("heading", { name: "Nouvelle capture" })).toBeVisible();
  await expect(page.getByText("Prendre ou déposer des photos")).toBeVisible();
  await expect(page.getByText("Multi-photo, EXIF GPS et date extraits avant compression et upload.")).toBeVisible();
});

test("import page accepts JPEG and HEIC captures", async ({ page }) => {
  await page.route("https://api-adresse.data.gouv.fr/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        features: [{
          properties: {
            city: "Paris",
            context: "75, Paris, Île-de-France",
            label: "Paris",
          },
        }],
      }),
    });
  });
  await page.goto("/import");

  await page.locator('input[type="file"]').setInputFiles([
    "e2e/fixtures/capture-sample.jpg",
    "e2e/fixtures/capture-sample.heic",
  ]);

  const jpeg = page.locator("article").filter({ hasText: "capture-sample.jpg" });
  await expect(jpeg).toContainText("Paris");
  await expect(jpeg).toContainText("48.85667, 2.35222");
  await expect(jpeg).toContainText("2026");

  const heic = page.locator("article").filter({ hasText: "capture-sample.heic" });
  await expect(heic).toContainText("GPS absent");
  await expect(heic).toContainText("Date absente");
});

test("plan page exposes generation, csv and crm actions", async ({ page }) => {
  await page.goto("/plan");

  await expect(page.getByRole("heading", { name: "Plan d'appel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Générer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Push all" })).toBeVisible();
});

test("settings page can prefill webhook presets", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Intégrations et webhooks" })).toBeVisible();
  await page.getByRole("button", { name: "Make" }).click();
  await expect(page.getByPlaceholder("URL webhook")).toHaveValue("https://hook.eu1.make.com/...");
  await page.getByRole("button", { name: "Zapier" }).click();
  await expect(page.getByPlaceholder("URL webhook")).toHaveValue("https://hooks.zapier.com/hooks/catch/...");
});

test("core routes do not overflow the viewport horizontally", async ({ page }) => {
  for (const route of ["/", "/import", "/captures", "/leads", "/plan"]) {
    await page.goto(route);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `${route} should fit the viewport`).toBeLessThanOrEqual(dimensions.viewport);
  }
});
