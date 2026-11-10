#!/usr/bin/env node
/**
 * Amorçage : donne un rôle à un compte existant (premier administrateur).
 *   npm run admin:promote -- prenom.nom@exemple.fr [admin|teacher|student]
 * Utilise la clé de service (serveur ou poste de l'administrateur uniquement).
 * Ensuite, les rôles se gèrent depuis /admin/utilisateurs.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) {
  for (const l of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const [email, role = "admin"] = process.argv.slice(2);
if (!email || !["admin", "teacher", "student"].includes(role)) {
  console.error("usage : npm run admin:promote -- <email> [admin|teacher|student]");
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let user = null;
for (let page = 1; !user && page < 200; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`Aucun compte pour ${email} : inscrivez-vous d'abord sur le site.`);
  process.exit(1);
}
const { error } = await db.from("profiles").update({ role }).eq("id", user.id);
if (error) throw error;
await db.from("audit_logs").insert({ action: "users.role_bootstrap", target_table: "profiles", target_id: user.id, details: { to: role, via: "script" } });
console.log(`${email} a maintenant le rôle « ${role} ».`);
