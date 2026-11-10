import { expect, test } from "@playwright/test";
import { noHorizontalScroll } from "./fixtures";

test.describe("en-têtes et protections HTTP", () => {
  test("CSP à nonce, HSTS, nosniff, anti-iframe sur les pages", async ({ request }) => {
    const r = await request.get("/");
    const h = r.headers();
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["strict-transport-security"]).toContain("max-age=63072000");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
    const r2 = await request.get("/");
    expect(r2.headers()["content-security-policy"]).not.toBe(h["content-security-policy"]); // nonce renouvelé
  });

  test("aucune violation CSP ni erreur JavaScript sur les pages publiques", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    for (const p of ["/", "/matieres", "/matieres/beton-arme", "/cours/fondamentaux/moment", "/simulateur", "/fiches", "/connexion", "/confidentialite"]) {
      await page.goto(p);
      await page.waitForLoadState("networkidle");
    }
    expect(errors).toEqual([]);
  });

  test("CSRF : requêtes d'une autre origine refusées", async ({ request }) => {
    const evil = { Origin: "https://evil.example" };
    expect((await request.post("/auth/deconnexion", { headers: evil })).status()).toBe(403);
    expect((await request.post("/api/progress/temps", { headers: evil, data: { itemKey: "chapter:m1-unites", seconds: 60 } })).status()).toBe(403);
    expect((await request.post("/api/tuteur", { headers: evil, data: {} })).status()).not.toBe(200);
  });

  test("pages privées et API refusées sans session", async ({ request }) => {
    for (const p of ["/espace", "/compte", "/admin", "/ressources"]) {
      const r = await request.get(p, { maxRedirects: 0 });
      expect([302, 303, 307, 308], p).toContain(r.status());
    }
    expect((await request.get("/api/compte/export")).status()).toBe(401);
    expect((await request.get("/api/documents/00000000-0000-4000-8000-000000000000", { maxRedirects: 0 })).status()).toBe(307);
  });
});

test.describe("affichage mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test("aucun défilement horizontal sur les pages principales", async ({ page }) => {
    for (const p of ["/", "/matieres", "/matieres/geotechnique", "/matieres/geotechnique/identification-contraintes/phases-contraintes-effectives", "/matieres/statique/ms1-notions-de-base/liaisons-principe-fondamental", "/matieres/mecanique-structures/ms3-flambement-poteaux/contrainte-critique-longueur-flambement", "/fiches", "/inscription", "/simulateur", "/cours"]) {
      await page.goto(p);
      await noHorizontalScroll(page);
    }
  });
});

test.describe("affichage mobile (connecté)", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test("espace, compte, historique et administration sans défilement horizontal", async ({ page }) => {
    const { createUser, login } = await import("./fixtures");
    const u = await createUser("mobile", "admin");
    await login(page, u.email);
    for (const p of ["/espace", "/espace/historique", "/espace/favoris", "/compte", "/ressources", "/admin", "/admin/contenus", "/admin/utilisateurs", "/admin/documents", "/admin/journal"]) {
      await page.goto(p);
      await noHorizontalScroll(page);
    }
  });
});

test.describe("formulaires sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("la connexion part en POST : le mot de passe n'apparaît jamais dans l'URL", async ({ page }) => {
    await page.goto("/connexion");
    expect(await page.locator("form").first().getAttribute("method")).toMatch(/post/i);
    await page.locator("input[name=email]").fill("personne@test.structura.local");
    await page.locator("input[name=password]").fill("Secret-1234567");
    await page.locator("button[type=submit]").click();
    await page.waitForLoadState();
    expect(page.url()).not.toContain("Secret-1234567");
    expect(page.url()).not.toContain("password");
  });
});
