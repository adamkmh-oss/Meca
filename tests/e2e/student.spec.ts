import { expect, test } from "@playwright/test";
import { createUser, login, sql } from "./fixtures";

test.describe("parcours étudiant", () => {
  test("exercice corrigé par le serveur, historique, refaire, favoris, signalement", async ({ page }) => {
    const u = await createUser("etudiant");
    await login(page, u.email);

    await page.goto("/matieres/thermique");
    await expect(page.getByRole("heading", { name: "Thermique du bâtiment" })).toBeVisible();
    await page.getByRole("link", { name: "Résistance thermique et coefficient U d'une paroi" }).click();
    await expect(page.locator("article .katex").first()).toBeVisible();
    await page.getByRole("button", { name: "Ajouter aux favoris" }).click();
    await expect(page.getByRole("button", { name: "Dans mes favoris" })).toBeVisible();
    await page.getByRole("button", { name: "Marquer comme terminée" }).click();
    await expect(page.getByText("Leçon terminée")).toBeVisible();

    // Signalement
    await page.getByRole("button", { name: "Signaler une erreur" }).click();
    await page.getByLabel("Précisions (facultatif)").fill("Préciser la valeur de λ du béton armé.");
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText(/signalement a été transmis/)).toBeVisible();

    // Exercice : réponses fausses puis justes
    await page.goto("/matieres/thermique");
    await page.getByRole("link", { name: "Coefficient U d'un mur béton isolé" }).click();
    const html = await page.content();
    expect(html).not.toContain("3.6986"); // aucune réponse attendue dans la page avant l'envoi
    const inputs = page.getByRole("textbox");
    await inputs.nth(0).fill("3,7");
    await inputs.nth(1).fill("0,27");
    await inputs.nth(2).fill("500");
    await page.getByLabel("m²·K/W").check();
    await page.getByRole("button", { name: "Valider mes réponses" }).click();
    await expect(page.getByText(/Score : 3 \/ 4/)).toBeVisible();
    await expect(page.getByText("Corrigé validé par l'équipe pédagogique")).toBeVisible();

    // Historique et détail
    await page.goto("/espace/historique");
    await page.getByRole("link", { name: /Coefficient U d'un mur béton isolé/ }).first().click();
    await expect(page.getByText("3 / 4")).toBeVisible();
    await expect(page.getByRole("link", { name: "Refaire" })).toBeVisible();

    // Tableau de bord
    await page.goto("/espace");
    await expect(page.getByText("Exercices réalisés")).toBeVisible();
    await expect(page.getByText("Reprendre")).toBeVisible();
    await page.goto("/espace/favoris");
    await expect(page.getByRole("link", { name: "Résistance thermique et coefficient U d'une paroi" })).toBeVisible();

    const [row] = await sql("select count(*)::int as n from public.reports where reporter_id = $1", [u.id]);
    expect(row.n).toBe(1);
  });

  test("exercice généré : la note enregistrée est recalculée par le serveur", async ({ page }) => {
    const u = await createUser("generateur");
    await login(page, u.email);
    await page.goto("/exercices/unites?seed=1234");
    const inputs = page.locator("main input[inputmode='decimal']");
    const n = await inputs.count();
    for (let i = 0; i < n; i++) await inputs.nth(i).fill("1");
    await page.getByRole("button", { name: /Vérifier/ }).click();
    await expect.poll(async () => (await sql("select count(*)::int as n from public.attempts where user_id = $1 and source = 'generator'", [u.id]))[0].n).toBe(1);
    const [a] = await sql("select seed, max_score from public.attempts where user_id = $1", [u.id]);
    expect(Number(a.seed)).toBe(1234);
  });

  test("accès interdits : tentative d'autrui, administration, données privées", async ({ page }) => {
    const a = await createUser("victime");
    const b = await createUser("curieux");
    const [ex] = await sql("select id from public.exercises where title = 'Conversions d''échelle'");
    const { data } = await a.client.rpc("submit_attempt", { p_exercise_id: ex.id, p_responses: {} });
    await login(page, b.email);
    const res = await page.goto(`/espace/historique/${data.attempt_id}`);
    expect(res?.status()).toBe(404);
    const admin = await page.goto("/admin");
    expect(admin?.status()).toBe(403);
    await expect(page.getByRole("heading", { name: "Accès refusé" })).toBeVisible();
    for (const p of ["/admin/utilisateurs", "/admin/contenus", "/admin/journal"]) expect((await page.goto(p))?.status(), p).toBe(403);
    // L'export ne contient que ses propres données
    const exp = await page.request.get("/api/compte/export");
    const body = await exp.text();
    expect(body).toContain(b.email);
    expect(body).not.toContain(a.email);
  });
});
