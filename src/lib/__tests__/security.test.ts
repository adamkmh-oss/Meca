import { describe, expect, it } from "vitest";
import { passwordProblems, safeNext, signUpSchema, profileSchema } from "../auth/validation";
import { checkContent, checkDeclared, extensionOf, pdfHasActiveContent, sniff, MAX_UPLOAD_BYTES } from "../security/files";
import { buildCsp, SECURITY_HEADERS } from "../security/headers";
import { ROLE_PERMISSIONS, isStaff } from "../auth/permissions";

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => new TextEncoder().encode(s);

describe("mots de passe", () => {
  it("refuse les mots de passe faibles, accepte un mot de passe robuste", () => {
    expect(passwordProblems("court1A")).toContain("au moins 10 caractères");
    expect(passwordProblems("toutenminuscule123")).toContain("une majuscule");
    expect(passwordProblems("Azerty123456")).toContain("ne pas être un mot de passe courant");
    expect(passwordProblems("Camille2026x", "camille@exemple.fr")).toContain("ne pas contenir votre identifiant e-mail");
    expect(passwordProblems("Beton-arme2026")).toEqual([]);
  });

  it("inscription : e-mail normalisé, consentement obligatoire, pseudonyme sans balises", () => {
    const ok = signUpSchema.safeParse({ email: "  Camille@Exemple.FR ", password: "Beton-arme2026", displayName: "Camille", studyYear: "BUT2", consent: "on" });
    expect(ok.success && ok.data.email).toBe("camille@exemple.fr");
    expect(signUpSchema.safeParse({ email: "a@b.fr", password: "Beton-arme2026", displayName: "Camille", studyYear: "BUT2" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.fr", password: "Beton-arme2026", displayName: "<script>", studyYear: "BUT2", consent: "on" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "Lou", studyYear: "BUT9", weeklyGoal: 5 }).success).toBe(false);
  });
});

describe("redirections internes (pas de redirection ouverte)", () => {
  it.each([
    ["/espace", "/espace"],
    ["/cours/rdm/fleche?x=1", "/cours/rdm/fleche?x=1"],
    ["https://evil.example", "/espace"],
    ["//evil.example", "/espace"],
    ["/\\evil.example", "/espace"],
    ["javascript:alert(1)", "/espace"],
    ["/auth/confirm", "/espace"],
    [undefined, "/espace"],
  ])("%s → %s", (input, out) => expect(safeNext(input)).toBe(out));
});

describe("fichiers déposés", () => {
  it("reconnaît la signature réelle des formats autorisés", () => {
    expect(sniff(ascii("%PDF-1.7"))).toBe("pdf");
    expect(sniff(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(sniff(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
    expect(sniff(ascii("RIFF\x00\x00\x00\x00WEBPVP8 "))).toBe("webp");
    expect(sniff(ascii("MZ\x90\x00"))).toBeNull(); // exécutable Windows
    expect(sniff(ascii("<svg onload=alert(1)>"))).toBeNull();
  });

  it("refuse extensions interdites, types incohérents, tailles excessives", () => {
    expect(extensionOf("cours.PDF")).toBe("pdf");
    expect(extensionOf("photo.jpeg")).toBe("jpg");
    expect(checkDeclared("virus.exe", "application/x-msdownload", 100).ok).toBe(false);
    expect(checkDeclared("schema.svg", "image/svg+xml", 100).ok).toBe(false);
    expect(checkDeclared("doc.pdf.exe", "", 100).ok).toBe(false);
    expect(checkDeclared("doc.pdf", "image/png", 100).ok).toBe(false);
    expect(checkDeclared("doc.pdf", "application/pdf", MAX_UPLOAD_BYTES + 1).ok).toBe(false);
    expect(checkDeclared("doc.pdf", "application/pdf", 0).ok).toBe(false);
    expect(checkDeclared("doc.pdf", "application/pdf", 1000).ok).toBe(true);
  });

  it("refuse un fichier déguisé et un PDF contenant du code actif", () => {
    expect(checkContent(ascii("MZ fake"), "pdf").ok).toBe(false);
    expect(checkContent(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "pdf").ok).toBe(false);
    const evil = ascii("%PDF-1.4\n1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>");
    expect(pdfHasActiveContent(evil)).toBe(true);
    expect(checkContent(evil, "pdf").ok).toBe(false);
    expect(checkContent(ascii("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF"), "pdf").ok).toBe(true);
  });
});

describe("en-têtes de sécurité", () => {
  it("CSP stricte : nonce, pas d'unsafe-inline pour les scripts, pas d'iframe", () => {
    const csp = buildCsp("abc123", { dev: false, supabaseUrl: "https://xyz.supabase.co", https: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self' https://xyz.supabase.co");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(buildCsp("n", { dev: true, supabaseUrl: "", https: false })).toContain("'unsafe-eval'");
  });

  it("HSTS, nosniff, Referrer-Policy, Permissions-Policy présents", () => {
    const keys = SECURITY_HEADERS.map((h) => h.key);
    for (const k of ["Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]) expect(keys).toContain(k);
  });
});

describe("rôles", () => {
  it("un étudiant n'a aucune permission d'administration", () => {
    expect(isStaff(ROLE_PERMISSIONS.student)).toBe(false);
    expect(ROLE_PERMISSIONS.student).not.toContain("content.write");
    expect(ROLE_PERMISSIONS.teacher).not.toContain("users.manage");
    expect(ROLE_PERMISSIONS.teacher).not.toContain("subjects.manage");
    expect(isStaff(ROLE_PERMISSIONS.teacher)).toBe(true);
  });
});
