import { expect, test } from "@playwright/test";
import { createUser, login } from "./fixtures";

test.describe("équipe pédagogique et administration", () => {
  test("brouillon invisible des étudiants, publication, modération d'un signalement", async ({ browser }) => {
    const prof = await createUser("prof", "teacher");
    const eleve = await createUser("eleve");
    const t = await (await browser.newContext()).newPage();
    const s = await (await browser.newContext()).newPage();
    await login(t, prof.email);
    await login(s, eleve.email);

    // Création d'un chapitre et d'une leçon dans la matière Topographie
    await t.goto("/admin/contenus");
    const card = t.locator("div.rounded-xl", { hasText: "Topographie" }).first();
    await card.getByRole("link", { name: "Chapitre" }).click();
    await expect(t.getByRole("heading", { name: "Nouveau chapitre" })).toBeVisible();
    const slug = `implantation-${Date.now().toString(36)}`;
    await t.getByLabel("Titre").fill("Implantation d'un bâtiment");
    await t.getByLabel("Identifiant d'URL").fill(slug);
    await t.getByRole("button", { name: "Enregistrer" }).click();
    await expect(t).toHaveURL(/\/admin\/chapitres\/[0-9a-f-]{36}$/);
    const chapterUrl = t.url();
    await t.getByRole("link", { name: "+ leçon" }).click();
    await expect(t.getByRole("heading", { name: "Nouvelle leçon ou fiche" })).toBeVisible();
    const lessonTitle = `Le piquetage ${slug}`;
    await t.getByLabel("Titre").fill(lessonTitle);
    await t.getByLabel("Identifiant d'URL").fill("piquetage");
    await t.locator("textarea[name='body_md']").fill("Le **piquetage** matérialise les axes. <script>alert(1)</script> [lien](javascript:alert(1))");
    await t.getByRole("button", { name: "Enregistrer" }).click();
    await expect(t).toHaveURL(/\/admin\/lecons\/[0-9a-f-]{36}$/);

    const url = `/matieres/topographie/${slug}/piquetage`;
    expect((await s.goto(url))?.status()).toBe(404);

    await t.getByRole("button", { name: "Publier" }).click();
    await expect(t.getByText("Publié.")).toBeVisible();
    expect((await s.goto(url))?.status()).toBe(404); // chapitre encore en brouillon
    await t.goto(chapterUrl);
    await t.getByRole("button", { name: "Publier" }).click();
    await expect(t.getByText("Publié.")).toBeVisible();

    expect((await s.goto(url))?.status()).toBe(200);
    await expect(s.locator("article strong", { hasText: "piquetage" })).toBeVisible();
    // XSS : le HTML est affiché comme du texte, le lien javascript: est neutralisé
    expect(await s.locator("article script").count()).toBe(0);
    expect(await s.locator("article a[href^='javascript']").count()).toBe(0);

    // Signalement par l'étudiant, traitement par l'enseignant, notification
    await s.getByRole("button", { name: "Signaler une erreur" }).click();
    await s.getByRole("button", { name: "Envoyer" }).click();
    await expect(s.getByText(/signalement a été transmis/)).toBeVisible();
    await t.goto("/admin/signalements");
    const row = t.locator("div.py-3", { hasText: lessonTitle }).first();
    await row.getByLabel("Note de résolution").fill("Corrigé, merci !");
    await row.getByRole("button", { name: "Résolu" }).click();
    await expect(t.locator("div.py-3", { hasText: lessonTitle })).toHaveCount(0);
    await s.goto("/espace/notifications");
    await expect(s.getByText("Signalement traité : merci !")).toBeVisible();

    // Un enseignant n'a pas accès à la gestion des comptes
    expect((await t.goto("/admin/utilisateurs"))?.status()).toBe(403);
  });

  test("administrateur : rôle, suspension, réactivation", async ({ browser }) => {
    const admin = await createUser("chef", "admin");
    const cible = await createUser("cible");
    const a = await (await browser.newContext()).newPage();
    const c = await (await browser.newContext()).newPage();
    await login(a, admin.email);
    await login(c, cible.email);

    await a.goto(`/admin/utilisateurs?q=${encodeURIComponent(cible.email)}`);
    await a.getByLabel("Rôle", { exact: true }).selectOption("teacher");
    await expect(a.getByText("Rôle modifié.")).toBeVisible();
    await c.goto("/admin");
    await expect(c.getByRole("heading", { name: "Vue d'ensemble" })).toBeVisible();

    await a.getByRole("button", { name: "Suspendre" }).click();
    await expect(a.getByText("Compte suspendu.")).toBeVisible();
    await c.goto("/espace");
    await expect(c).toHaveURL(/\/compte\/suspendu|\/connexion/);

    await a.goto(`/admin/utilisateurs?q=${encodeURIComponent(cible.email)}`);
    await a.getByRole("button", { name: "Réactiver" }).click();
    await expect(a.getByText("Compte réactivé.")).toBeVisible();
    await a.goto("/admin/journal");
    await expect(a.getByText("users.status").first()).toBeVisible();
  });
});
