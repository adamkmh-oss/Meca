#!/usr/bin/env node
/**
 * Pile Supabase locale (docker compose) : npm run stack:up | stack:down | stack:reset | db:migrate | db:seed
 *
 * Au premier lancement, génère des secrets aléatoires dans infra/local/.env et
 * complète .env.local (URL et clés Supabase locales). Aucun secret n'est versionné.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stackEnv = path.join(root, "infra/local/.env");
const appEnv = path.join(root, ".env.local");
const compose = ["compose", "--env-file", stackEnv, "-f", path.join(root, "infra/local/docker-compose.yml")];

const b64url = (b) => Buffer.from(b).toString("base64url");
function jwt(payload, secret) {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  return `${head}.${body}.${createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url")}`;
}

function parseEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z0-9_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}

function ensureEnv() {
  let env = parseEnv(stackEnv);
  if (!env.JWT_SECRET) {
    const secret = randomBytes(48).toString("base64url");
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 10 * 365 * 24 * 3600;
    env = {
      POSTGRES_PASSWORD: randomBytes(24).toString("base64url"),
      JWT_SECRET: secret,
      ANON_KEY: jwt({ role: "anon", iss: "supabase", iat, exp }, secret),
      SERVICE_ROLE_KEY: jwt({ role: "service_role", iss: "supabase", iat, exp }, secret),
      SITE_URL: "http://localhost:3000",
    };
    writeFileSync(stackEnv, Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
    console.log("Secrets locaux générés : infra/local/.env");
  }
  const app = parseEnv(appEnv);
  const wanted = {
    NEXT_PUBLIC_SITE_URL: env.SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SERVICE_ROLE_KEY,
    DATABASE_URL: `postgres://postgres:${env.POSTGRES_PASSWORD}@127.0.0.1:54322/postgres`,
  };
  const missing = Object.entries(wanted).filter(([k]) => !app[k]);
  if (missing.length) {
    const prev = existsSync(appEnv) ? readFileSync(appEnv, "utf8").replace(/\n?$/, "\n") : "";
    writeFileSync(appEnv, prev + missing.map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
    console.log(`.env.local complété : ${missing.map(([k]) => k).join(", ")}`);
  }
  return env;
}

export function databaseUrl() {
  const env = parseEnv(stackEnv);
  return process.env.DATABASE_URL ?? `postgres://postgres:${env.POSTGRES_PASSWORD}@127.0.0.1:54322/postgres`;
}

async function waitFor(url, label, tries = 90) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label} ne répond pas (${url})`);
}

function psql(sql, { file, quiet = true } = {}) {
  const args = [databaseUrl(), "-v", "ON_ERROR_STOP=1", "-X", ...(quiet ? ["-q"] : []), ...(file ? ["-f", file] : ["-c", sql])];
  const r = spawnSync("psql", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${file ?? sql}\n${r.stderr}`);
  return r.stdout;
}

function migrate() {
  psql(`create schema if not exists supabase_migrations;
        create table if not exists supabase_migrations.schema_migrations (version text primary key, name text, applied_at timestamptz default now());`);
  const done = new Set(psql("select version from supabase_migrations.schema_migrations", { quiet: true }).split("\n").map((s) => s.trim()));
  const dir = path.join(root, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const version = f.split("_")[0];
    if (done.has(version)) continue;
    process.stdout.write(`migration ${f}… `);
    psql(null, { file: path.join(dir, f) });
    psql(`insert into supabase_migrations.schema_migrations(version, name) values ('${version}', '${f.replace(/'/g, "")}')`);
    console.log("ok");
  }
}

function seed() {
  const file = path.join(root, "supabase/seed.sql");
  if (existsSync(file)) {
    psql(null, { file });
    console.log("données de départ chargées (supabase/seed.sql)");
  }
}

const cmd = process.argv[2];
if (cmd === "up" || cmd === "reset") {
  ensureEnv();
  if (cmd === "reset") execFileSync("docker", [...compose, "down", "-v"], { stdio: "inherit" });
  execFileSync("docker", [...compose, "up", "-d"], { stdio: "inherit" });
  await waitFor("http://127.0.0.1:54321/auth/v1/health", "Auth");
  await waitFor("http://127.0.0.1:54321/rest/v1/", "PostgREST");
  await waitFor("http://127.0.0.1:54321/storage/v1/status", "Storage");
  migrate();
  if (cmd === "reset") seed();
  console.log("\nPile locale prête : API http://localhost:54321 · base 127.0.0.1:54322 · e-mails http://localhost:54324/messages");
} else if (cmd === "down") {
  execFileSync("docker", [...compose, "down"], { stdio: "inherit" });
} else if (cmd === "migrate") {
  migrate();
} else if (cmd === "seed") {
  seed();
} else if (cmd === "env") {
  ensureEnv();
} else {
  console.log("usage : node scripts/stack.mjs up|down|reset|migrate|seed|env");
}
