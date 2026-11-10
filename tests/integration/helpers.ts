/**
 * Outils des tests d'intégration : pile Supabase locale (npm run stack:up).
 * Les tests sont ignorés si la pile ne répond pas.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";

function stackEnv(): Record<string, string> {
  const file = path.resolve(__dirname, "../../infra/local/.env");
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}

const env = stackEnv();
export const SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY ?? env.ANON_KEY ?? "";
export const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY ?? env.SERVICE_ROLE_KEY ?? "";
export const DATABASE_URL = process.env.TEST_DATABASE_URL ?? `postgres://postgres:${env.POSTGRES_PASSWORD}@127.0.0.1:54322/postgres`;

export async function stackAvailable(): Promise<boolean> {
  if (!ANON_KEY) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

export const anonClient = () => createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
export const serviceClient = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values: unknown[] = []) {
  const c = new pg.Client({ connectionString: DATABASE_URL });
  await c.connect();
  try {
    return (await c.query<T>(text, values)).rows;
  } finally {
    await c.end();
  }
}

export const PASSWORD = "Structura-test-2026";
const run = Date.now().toString(36);

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

/** Crée un compte confirmé, fixe son rôle (amorçage direct en base) et ouvre une session. */
export async function createUser(label: string, role: "student" | "teacher" | "admin" = "student"): Promise<TestUser> {
  const email = `${label}-${run}@test.structura.local`;
  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: label, study_year: "BUT2" } });
  if (error) throw error;
  if (role !== "student") await sql("update public.profiles set role = $1 where id = $2", [role, data.user.id]);
  const client = anonClient();
  const { error: e2 } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (e2) throw e2;
  return { id: data.user.id, email, client };
}

export async function deleteUsers(users: TestUser[]) {
  const admin = serviceClient();
  for (const u of users) await admin.auth.admin.deleteUser(u.id).catch(() => {});
}

export const uniq = (p: string) => `${p}-${run}-${Math.random().toString(36).slice(2, 7)}`;
