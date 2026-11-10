import { expect, type Page } from "@playwright/test";
import { createUser, PASSWORD, sql, type TestUser } from "../integration/helpers";

export { createUser, PASSWORD, sql, type TestUser };
export const MAIL_API = "http://127.0.0.1:54324/messages";

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).not.toHaveURL(/\/connexion/);
}

export async function mailLink(to: string, contains: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const msgs = (await (await fetch(MAIL_API)).json()) as { to: string[]; links: string[] }[];
    const link = msgs.reverse().find((m) => m.to.includes(to))?.links.find((l) => l.includes(contains));
    if (link) return link;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`aucun e-mail pour ${to}`);
}

/** La page ne doit jamais défiler horizontalement. */
export async function noHorizontalScroll(page: Page) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(w, `débordement horizontal sur ${page.url()}`).toBeLessThanOrEqual(1);
}
