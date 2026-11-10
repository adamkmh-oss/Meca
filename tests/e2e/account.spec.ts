import { createHmac } from "node:crypto";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createUser, login, PASSWORD, sql } from "./fixtures";

/** Code TOTP (RFC 6238, SHA-1, 6 chiffres, pas de 30 s) à partir d'une clé base32. */
function totp(secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
}

test.describe("compte : double authentification, export, suppression", () => {
  test("activation de la MFA puis connexion en deux étapes", async ({ page, browser }) => {
    const u = await createUser("mfa");
    await login(page, u.email);
    await page.goto("/compte");
    await page.getByRole("button", { name: "Activer la double authentification" }).click();
    const secret = (await page.locator("code").first().innerText()).trim();
    await page.getByLabel("Code à 6 chiffres").fill(totp(secret));
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByText("Double authentification activée.")).toBeVisible();

    // Nouvelle session : le mot de passe seul ne suffit plus
    const p2 = await (await browser.newContext()).newPage();
    await p2.goto("/connexion?next=/espace");
    await p2.getByLabel("Adresse e-mail").fill(u.email);
    await p2.getByLabel("Mot de passe").fill(PASSWORD);
    await p2.getByRole("button", { name: "Se connecter" }).click();
    await expect(p2).toHaveURL(/\/connexion\/verification/);
    await p2.goto("/espace");
    await expect(p2).toHaveURL(/\/connexion\/verification/);
    await p2.getByLabel("Code").fill("000000");
    await p2.getByRole("button", { name: "Vérifier" }).click();
    await expect(p2.getByText("Code incorrect ou expiré.")).toBeVisible();
    await p2.getByLabel("Code").fill(totp(secret));
    await p2.getByRole("button", { name: "Vérifier" }).click();
    await expect(p2).toHaveURL(/\/espace$/);
  });

  test("export JSON puis suppression définitive du compte", async ({ page }) => {
    const u = await createUser("depart");
    await login(page, u.email);
    await page.goto("/compte");
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Télécharger mes données" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^structura-mes-donnees-\d{4}-\d{2}-\d{2}\.json$/);

    await page.getByLabel("Tapez SUPPRIMER").fill("SUPPRIMER");
    await page.getByLabel("Mot de passe actuel").fill("mauvais");
    await page.getByRole("button", { name: "Supprimer définitivement" }).click();
    await expect(page.getByText("Mot de passe incorrect.").first()).toBeVisible();
    await page.getByLabel("Mot de passe actuel").fill(PASSWORD);
    await page.getByRole("button", { name: "Supprimer définitivement" }).click();
    await expect(page.getByText("Votre compte et toutes ses données ont été supprimés.")).toBeVisible();
    const rows = await sql("select (select count(*) from auth.users where id = $1)::int as u, (select count(*) from public.profiles where id = $1)::int as p", [u.id]);
    expect(rows[0]).toEqual({ u: 0, p: 0 });
  });
});

test.describe("documents", () => {
  test("dépôt contrôlé, publication, téléchargement par lien signé ; fichier déguisé refusé", async ({ browser }) => {
    const prof = await createUser("doc-prof", "teacher");
    const eleve = await createUser("doc-eleve");
    const dir = mkdtempSync(path.join(tmpdir(), "structura-"));
    const good = path.join(dir, "formulaire.pdf");
    const fake = path.join(dir, "faux.pdf");
    writeFileSync(good, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
    writeFileSync(fake, "MZ\x90\x00 ceci est un exécutable renommé");

    const t = await (await browser.newContext()).newPage();
    await login(t, prof.email);
    await t.goto("/admin/documents");
    await t.getByLabel(/Fichier/).setInputFiles(fake);
    await t.getByRole("button", { name: "Déposer" }).click();
    await expect(t.getByText(/ne correspond pas à son extension/)).toBeVisible();

    const title = `Formulaire ${Date.now().toString(36)}`;
    await t.getByLabel(/Fichier/).setInputFiles(good);
    await t.getByLabel("Titre").fill(title);
    await t.getByLabel("Matière").selectOption({ label: "Résistance des matériaux" });
    await t.getByRole("button", { name: "Déposer" }).click();
    await expect(t.getByText("Document déposé (en brouillon).")).toBeVisible();
    const [doc] = await sql("select id, storage_path, sha256 from public.documents where title = $1", [title]);
    expect(doc.storage_path).toMatch(/^uploads\/\d{4}\/[0-9a-f-]{36}\.pdf$/);
    expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);
    const [n] = await sql("select count(*)::int as n from storage.objects where bucket_id = 'documents' and name like '%' || $1", [".pdf"]);
    expect(n.n).toBeGreaterThan(0);

    const s = await (await browser.newContext()).newPage();
    await login(s, eleve.email);
    expect((await s.request.get(`/api/documents/${doc.id}`, { maxRedirects: 0 })).status()).toBe(404);
    await t.locator("div.py-3", { hasText: title }).getByRole("button", { name: "Publier" }).click();
    await expect(t.getByText("Publié.")).toBeVisible();
    const r = await s.request.get(`/api/documents/${doc.id}`, { maxRedirects: 0 });
    expect(r.status()).toBe(302);
    expect(r.headers()["location"]).toContain("/storage/v1/object/sign/documents/");
    const fileRes = await s.request.get(r.headers()["location"]);
    expect((await fileRes.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await s.goto("/ressources");
    await expect(s.getByText(title)).toBeVisible();
  });
});
