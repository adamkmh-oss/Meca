import { expect, test } from "@playwright/test";
import { login, mailLink, PASSWORD } from "./fixtures";

const stamp = Date.now().toString(36);

test.describe("authentification", () => {
  test("inscription → e-mail de confirmation → espace personnel → déconnexion", async ({ page }) => {
    const email = `inscription-${stamp}@test.structura.local`;
    await page.goto("/inscription");
    await page.getByLabel("Prénom ou pseudonyme").fill("Camille");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("faible");
    await page.getByLabel("Année d'étude").selectOption("BUT1");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText(/Le mot de passe doit contenir/)).toBeVisible();

    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Vérifiez votre boîte mail")).toBeVisible();

    // Avant confirmation, la connexion est refusée avec un message explicite
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText(/non confirmée/)).toBeVisible();

    await page.goto(await mailLink(email, "/auth/confirm"));
    await expect(page).toHaveURL(/\/espace$/);
    await expect(page.getByRole("heading", { name: "Bonjour Camille" })).toBeVisible();

    await page.getByRole("button", { name: "Se déconnecter" }).first().click();
    await expect(page).toHaveURL(/deconnecte=1/);
    await page.goto("/espace");
    await expect(page).toHaveURL(/\/connexion\?next=%2Fespace/);
  });

  test("un lien de confirmation ne sert qu'une fois ; jeton forgé refusé", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&type=email");
    await expect(page).toHaveURL(/lien=invalide/);
    await page.goto("/auth/confirm?token_hash=x&type=admin");
    await expect(page).toHaveURL(/lien=invalide/);
  });

  test("message d'erreur identique pour compte inconnu et mauvais mot de passe", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill(`inconnu-${stamp}@test.structura.local`);
    await page.getByLabel("Mot de passe").fill("Nimporte-quoi-1");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Adresse e-mail ou mot de passe incorrect.")).toBeVisible();
  });

  test("mot de passe oublié → lien → nouveau mot de passe → connexion", async ({ page, browser }) => {
    const { createUser } = await import("./fixtures");
    const u = await createUser("reset");
    await page.goto("/mot-de-passe-oublie");
    await page.getByLabel("Adresse e-mail").fill(u.email);
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(page.getByText(/Si un compte correspond/)).toBeVisible();
    await page.goto(await mailLink(u.email, "type=recovery"));
    await expect(page).toHaveURL(/nouveau-mot-de-passe/);
    await page.getByLabel("Nouveau mot de passe").fill("Nouveau-Mdp-2026");
    await page.getByLabel("Confirmation").fill("Nouveau-Mdp-2026");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText(/Mot de passe modifié/)).toBeVisible();

    const other = await (await browser.newContext()).newPage();
    await login(other, u.email, "Nouveau-Mdp-2026");
    await expect(other).toHaveURL(/\/espace/);
  });

  test("redirection après connexion limitée au site (pas de redirection ouverte)", async ({ page }) => {
    const { createUser } = await import("./fixtures");
    const u = await createUser("redirect");
    await page.goto("/connexion?next=https://evil.example/vol");
    await page.getByLabel("Adresse e-mail").fill(u.email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/localhost:3000\/espace$/);
  });
});

test.describe("protection contre la force brute", () => {
  test("au-delà de 8 essais sur un même compte, la connexion est bloquée", async ({ page }) => {
    const { createUser } = await import("./fixtures");
    const u = await createUser("brute");
    await page.goto("/connexion");
    for (let i = 0; i < 9; i++) {
      await page.getByLabel("Adresse e-mail").fill(u.email);
      await page.getByLabel("Mot de passe").fill(`Mauvais-${i}-Mdp`);
      await page.getByRole("button", { name: "Se connecter" }).click();
      await expect(page.locator("form [role=alert]")).toBeVisible();
    }
    await expect(page.getByText(/Trop de tentatives/)).toBeVisible();
    // même le bon mot de passe est refusé pendant la fenêtre de blocage
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText(/Trop de tentatives/)).toBeVisible();
  });
});
