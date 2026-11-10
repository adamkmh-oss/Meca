/**
 * Tests de sécurité de la base (RLS, RBAC, fonctions) à travers l'API
 * Supabase réelle (PostgREST + Auth + Storage), avec de vrais jetons.
 * Chaque test tente l'accès interdit ET vérifie l'accès légitime.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createUser, deleteUsers, serviceClient, sql, stackAvailable, uniq, type TestUser } from "./helpers";

const up = await stackAvailable();
const d = describe.skipIf(!up);

let admin: TestUser, teacher: TestUser, alice: TestUser, bob: TestUser;
let subjectId: string;

beforeAll(async () => {
  if (!up) return;
  [admin, teacher, alice, bob] = await Promise.all([
    createUser("admin", "admin"),
    createUser("prof", "teacher"),
    createUser("alice"),
    createUser("bob"),
  ]);
  const [s] = await sql<{ id: string }>("select id from public.subjects where slug = 'thermique'");
  subjectId = s.id;
}, 60_000);

afterAll(async () => {
  if (up) await deleteUsers([alice, bob, teacher, admin].filter(Boolean));
});

/** Crée (en tant qu'enseignant) un chapitre et un exercice publiés avec QCM + numérique + corrigé. */
async function publishedExercise() {
  const t = teacher.client;
  const { data: ch, error: e1 } = await t.from("chapters").insert({ subject_id: subjectId, slug: uniq("ch"), title: "Chapitre test", status: "published" }).select().single();
  expect(e1).toBeNull();
  const { data: ex, error: e2 } = await t
    .from("exercises")
    .insert({ chapter_id: ch!.id, title: "Résistance thermique", statement_md: "Calculer R.", status: "published" })
    .select()
    .single();
  expect(e2).toBeNull();
  const { data: q1 } = await t.from("questions").insert({ exercise_id: ex!.id, kind: "qcm", prompt_md: "Unité de λ ?", position: 1 }).select().single();
  const { data: choices } = await t
    .from("answers")
    .insert([
      { question_id: q1!.id, label_md: "W/(m·K)", position: 1 },
      { question_id: q1!.id, label_md: "m²·K/W", position: 2 },
    ])
    .select();
  const good = choices!.find((c) => c.position === 1)!.id;
  const bad = choices!.find((c) => c.position === 2)!.id;
  const { data: q2 } = await t.from("questions").insert({ exercise_id: ex!.id, kind: "numeric", prompt_md: "R = e/λ pour e = 0,2 m, λ = 0,04", unit: "m²·K/W", position: 2, points: 2 }).select().single();
  const { data: q3 } = await t.from("questions").insert({ exercise_id: ex!.id, kind: "free", prompt_md: "Commentez.", position: 3 }).select().single();
  const { error: e3 } = await t.from("question_keys").insert([
    { question_id: q1!.id, correct_answer_ids: [good], explanation_md: "λ est une conductivité." },
    { question_id: q2!.id, expected_value: 5, tolerance_rel: 0.01 },
    { question_id: q3!.id, model_answer_md: "Un isolant épais a une grande résistance." },
  ], { defaultToNull: false });
  expect(e3).toBeNull();
  const { error: e4 } = await t.from("corrections").insert({ exercise_id: ex!.id, calculs_md: "R = 0,2 / 0,04 = 5 m²·K/W" });
  expect(e4).toBeNull();
  return { chapterId: ch!.id as string, exerciseId: ex!.id as string, q1: q1!.id as string, q2: q2!.id as string, q3: q3!.id as string, good, bad };
}

d("profils et rôles", () => {
  it("chacun lit son profil, pas celui des autres", async () => {
    const { data: own } = await alice.client.from("profiles").select("id, role, display_name");
    expect(own).toHaveLength(1);
    expect(own![0]).toMatchObject({ id: alice.id, role: "student", display_name: "alice" });
    const { data: other } = await alice.client.from("profiles").select("id").eq("id", bob.id);
    expect(other).toEqual([]);
  });

  it("un étudiant ne peut pas se donner un rôle ni se réactiver", async () => {
    const r1 = await alice.client.from("profiles").update({ role: "admin" }).eq("id", alice.id);
    expect(r1.error).not.toBeNull();
    const r2 = await alice.client.from("profiles").update({ status: "active" }).eq("id", alice.id);
    expect(r2.error).not.toBeNull();
    const [p] = await sql("select role from public.profiles where id = $1", [alice.id]);
    expect(p.role).toBe("student");
  });

  it("le rôle fourni dans les métadonnées d'inscription est ignoré", async () => {
    const email = `${uniq("meta")}@test.structura.local`;
    const { data } = await serviceClient().auth.admin.createUser({ email, password: "Structura-test-2026", email_confirm: true, user_metadata: { role: "admin", display_name: "<script>x</script>" } });
    const [p] = await sql("select role, display_name from public.profiles where id = $1", [data.user!.id]);
    expect(p.role).toBe("student");
    expect(p.display_name).not.toContain("<");
    await serviceClient().auth.admin.deleteUser(data.user!.id);
  });

  it("modifier le profil d'un autre n'a aucun effet", async () => {
    await alice.client.from("profiles").update({ display_name: "pirate" }).eq("id", bob.id);
    const [p] = await sql("select display_name from public.profiles where id = $1", [bob.id]);
    expect(p.display_name).toBe("bob");
    const { error } = await alice.client.from("profiles").update({ display_name: "Alice M." }).eq("id", alice.id);
    expect(error).toBeNull();
  });

  it("fonctions d'administration refusées aux étudiants et enseignants", async () => {
    for (const u of [alice, teacher]) {
      const { error } = await u.client.rpc("admin_list_users", {});
      expect(error?.code).toBe("42501");
      const r = await u.client.rpc("admin_set_role", { p_user: u.id, p_role: "admin" });
      expect(r.error?.code).toBe("42501");
    }
    const { data, error } = await admin.client.rpc("admin_list_users", { p_search: "alice" });
    expect(error).toBeNull();
    expect(data!.some((u: { email: string }) => u.email === alice.email)).toBe(true);
  });

  it("un admin ne peut pas changer son propre rôle ; le dernier admin est protégé", async () => {
    const r = await admin.client.rpc("admin_set_role", { p_user: admin.id, p_role: "student" });
    expect(r.error?.code).toBe("42501");
    const ok = await admin.client.rpc("admin_set_role", { p_user: bob.id, p_role: "teacher" });
    expect(ok.error).toBeNull();
    await admin.client.rpc("admin_set_role", { p_user: bob.id, p_role: "student" });
    const { data: notes } = await bob.client.from("notifications").select("kind, title");
    expect(notes!.some((n) => n.kind === "role")).toBe(true);
  });

  it("un compte suspendu perd ses permissions", async () => {
    const tmp = await createUser("suspendu");
    expect((await admin.client.rpc("admin_set_status", { p_user: tmp.id, p_status: "suspended" })).error).toBeNull();
    const { data } = await tmp.client.rpc("my_permissions");
    expect(data).toEqual([]);
    const { error } = await tmp.client.from("favorites").insert({ item_key: "page:simulateur", kind: "outil", title: "Simulateur", href: "/simulateur" });
    expect(error).not.toBeNull();
    await deleteUsers([tmp]);
  });
});

d("visiteur anonyme", () => {
  it("lit les matières publiées, rien de privé", async () => {
    const anon = anonClient();
    const { data: subjects } = await anon.from("subjects").select("slug");
    expect(subjects!.length).toBeGreaterThanOrEqual(10);
    for (const table of ["profiles", "attempts", "progress", "favorites", "reports", "audit_logs", "question_keys", "corrections", "documents"]) {
      const { data } = await anon.from(table).select("*").limit(1);
      expect(data ?? [], table).toEqual([]);
    }
    const { error } = await anon.from("subjects").insert({ slug: "pirate", title: "Pirate" });
    expect(error).not.toBeNull();
    const rpc = await anon.rpc("submit_attempt", { p_exercise_id: "00000000-0000-0000-0000-000000000000", p_responses: {} });
    expect(rpc.error).not.toBeNull();
  });
});

d("contenus : brouillon, publication, réponses cachées", () => {
  it("un enseignant ne crée pas de matière ; un admin oui", async () => {
    const { error } = await teacher.client.from("subjects").insert({ slug: uniq("m"), title: "Matière prof" });
    expect(error).not.toBeNull();
    const slug = uniq("m");
    const ok = await admin.client.from("subjects").insert({ slug, title: "Matière admin" }).select().single();
    expect(ok.error).toBeNull();
    await admin.client.from("subjects").delete().eq("id", ok.data!.id);
  });

  it("brouillon invisible des étudiants, visible après publication", async () => {
    const { data: ch } = await teacher.client.from("chapters").insert({ subject_id: subjectId, slug: uniq("c"), title: "Ponts thermiques" }).select().single();
    const { data: lesson, error } = await teacher.client
      .from("lessons")
      .insert({ chapter_id: ch!.id, slug: uniq("l"), title: "Pont thermique linéique", body_md: "Le coefficient ψ s'exprime en W/(m·K)." })
      .select()
      .single();
    expect(error).toBeNull();
    expect(lesson!.created_by).toBe(teacher.id);
    expect((await alice.client.from("lessons").select("id").eq("id", lesson!.id)).data).toEqual([]);
    // leçon publiée mais chapitre en brouillon : toujours invisible
    await teacher.client.from("lessons").update({ status: "published" }).eq("id", lesson!.id);
    expect((await alice.client.from("lessons").select("id").eq("id", lesson!.id)).data).toEqual([]);
    await teacher.client.from("chapters").update({ status: "published" }).eq("id", ch!.id);
    const visible = await alice.client.from("lessons").select("id, published_at").eq("id", lesson!.id);
    expect(visible.data).toHaveLength(1);
    expect(visible.data![0].published_at).not.toBeNull();
    // recherche plein texte : visible une fois publié
    const { data: found } = await alice.client.rpc("search_content", { p_query: "pont thermique linéique" });
    expect(found!.some((r: { id: string }) => r.id === lesson!.id)).toBe(true);
    // un étudiant ne peut ni écrire ni dépublier
    const w = await alice.client.from("lessons").update({ status: "archived" }).eq("id", lesson!.id).select();
    expect(w.data ?? []).toEqual([]);
    const ins = await alice.client.from("lessons").insert({ chapter_id: ch!.id, slug: uniq("x"), title: "Intrus" });
    expect(ins.error).not.toBeNull();
    // le journal garde la trace de la publication
    const [log] = await sql("select actor_id from public.audit_logs where target_id = $1 and action = 'lessons.status'", [lesson!.id]);
    expect(log.actor_id).toBe(teacher.id);
  });

  it("clés de correction et corrigés illisibles par un étudiant", async () => {
    const ex = await publishedExercise();
    expect((await alice.client.from("questions").select("id").eq("exercise_id", ex.exerciseId)).data).toHaveLength(3);
    expect((await alice.client.from("answers").select("id, label_md").eq("question_id", ex.q1)).data).toHaveLength(2);
    expect((await alice.client.from("question_keys").select("*").eq("question_id", ex.q1)).data).toEqual([]);
    expect((await alice.client.from("corrections").select("*").eq("exercise_id", ex.exerciseId)).data).toEqual([]);
    const before = await alice.client.rpc("get_correction", { p_exercise_id: ex.exerciseId });
    expect(before.error?.code).toBe("42501");
  });
});

d("tentatives corrigées par la base", () => {
  it("corrige QCM et numérique, révèle le corrigé, enregistre la tentative", async () => {
    const ex = await publishedExercise();
    const wrong = await alice.client.rpc("submit_attempt", {
      p_exercise_id: ex.exerciseId,
      p_responses: { [ex.q1]: { choices: [ex.bad] }, [ex.q2]: { value: 0.008 }, [ex.q3]: { text: "isolant" } },
      p_duration_seconds: 42,
    });
    expect(wrong.error).toBeNull();
    expect(wrong.data).toMatchObject({ score: 0, max: 3 });
    const right = await alice.client.rpc("submit_attempt", {
      p_exercise_id: ex.exerciseId,
      p_responses: { [ex.q1]: { choices: [ex.good] }, [ex.q2]: { value: 5.03 } },
    });
    expect(right.data).toMatchObject({ score: 3, max: 3 });
    expect(right.data.correction.calculs_md).toContain("= 5");
    const free = right.data.results.find((r: { kind: string }) => r.kind === "free");
    expect(free.correct).toBeNull();
    expect(free.model_answer_md).toContain("isolant");
    const { data: mine } = await alice.client.from("attempts").select("score, max_score, item_key").eq("exercise_id", ex.exerciseId);
    expect(mine).toHaveLength(2);
    expect((await alice.client.rpc("get_correction", { p_exercise_id: ex.exerciseId })).error).toBeNull();
    // Bob ne voit ni les tentatives d'Alice ni le corrigé sans avoir essayé
    expect((await bob.client.from("attempts").select("id").eq("exercise_id", ex.exerciseId)).data).toEqual([]);
    expect((await bob.client.rpc("get_correction", { p_exercise_id: ex.exerciseId })).error?.code).toBe("42501");
  });

  it("impossible d'écrire une note directement ou via la fonction serveur", async () => {
    const { error } = await alice.client.from("attempts").insert({
      user_id: alice.id, source: "exercise", item_key: "exercise:x", title: "Triche", score: 10, max_score: 10,
    });
    expect(error).not.toBeNull();
    const r = await alice.client.rpc("record_graded_attempt", {
      p_user: alice.id, p_source: "quiz", p_item_key: "quiz:x", p_subject_slug: "rdm", p_chapter_key: "chapter:x", p_title: "Triche",
      p_difficulty: null, p_score: 10, p_max: 10, p_responses: {}, p_results: [], p_duration_seconds: 1, p_seed: null,
    });
    expect(r.error).not.toBeNull();
    const upd = await alice.client.from("attempts").update({ score: 99 }).eq("user_id", alice.id).select();
    expect(upd.error).not.toBeNull();
  });

  it("réponses malformées refusées, exercice en brouillon introuvable", async () => {
    const ex = await publishedExercise();
    const bad = await alice.client.rpc("submit_attempt", { p_exercise_id: ex.exerciseId, p_responses: ["x"] });
    expect(bad.error?.code).toBe("22023");
    const injected = await alice.client.rpc("submit_attempt", {
      p_exercise_id: ex.exerciseId,
      p_responses: { [ex.q1]: { choices: ["'; drop table attempts; --", ex.good] }, [ex.q2]: { value: "5" } },
    });
    expect(injected.error).toBeNull();
    expect(injected.data.score).toBe(1); // texte ignoré pour la valeur numérique, choix invalide filtré
    await teacher.client.from("exercises").update({ status: "draft" }).eq("id", ex.exerciseId);
    const hidden = await alice.client.rpc("submit_attempt", { p_exercise_id: ex.exerciseId, p_responses: {} });
    expect(hidden.error?.code).toBe("P0002");
  });

  it("la fonction serveur enregistre une tentative corrigée côté serveur", async () => {
    const { error } = await serviceClient().rpc("record_graded_attempt", {
      p_user: bob.id, p_source: "generator", p_item_key: "generator:unites", p_subject_slug: "statique", p_chapter_key: "chapter:m1-unites",
      p_title: "Unités", p_difficulty: "debutant", p_score: 1, p_max: 2, p_responses: {}, p_results: [], p_duration_seconds: 30, p_seed: 123,
    });
    expect(error).toBeNull();
    const { data } = await bob.client.rpc("my_stats");
    expect(data.totals.exercises).toBeGreaterThanOrEqual(1);
  });
});

d("progression, favoris, signalements, export", () => {
  it("suivi de lecture et temps : seulement pour soi, valeurs plafonnées", async () => {
    const r = await alice.client.rpc("track_view", { p_item_key: "chapter:m1-unites", p_subject_slug: "statique", p_title: "Unités", p_href: "/cours/fondamentaux/unites" });
    expect(r.error).toBeNull();
    await alice.client.rpc("track_time", { p_item_key: "chapter:m1-unites", p_seconds: 100000 });
    const { data } = await alice.client.from("progress").select("time_spent_seconds").eq("item_key", "chapter:m1-unites").single();
    expect(data!.time_spent_seconds).toBeLessThanOrEqual(120);
    const bad = await alice.client.rpc("track_view", { p_item_key: "chapter:x", p_subject_slug: "statique", p_title: "x", p_href: "javascript:alert(1)" });
    expect(bad.error).not.toBeNull();
    expect((await bob.client.from("progress").select("*").eq("item_key", "chapter:m1-unites")).data).toEqual([]);
  });

  it("favoris : impossible d'en créer pour un autre compte", async () => {
    const ok = await alice.client.from("favorites").insert({ item_key: "page:simulateur", kind: "outil", title: "Simulateur", href: "/simulateur" });
    expect(ok.error).toBeNull();
    const ko = await alice.client.from("favorites").insert({ user_id: bob.id, item_key: "page:x", kind: "outil", title: "x", href: "/x" });
    expect(ko.error).not.toBeNull();
    expect((await bob.client.from("favorites").select("*")).data).toEqual([]);
  });

  it("signalement : créé par l'étudiant, traité par l'équipe, notification au déclarant", async () => {
    const { data: rep, error } = await alice.client
      .from("reports")
      .insert({ target_type: "chapter", target_key: "chapter:m1-unites", target_title: "Unités", target_href: "/cours/fondamentaux/unites", reason: "erreur", message: "Coquille", status: "resolved" })
      .select()
      .single();
    expect(error).toBeNull();
    expect(rep!.status).toBe("open");
    expect((await bob.client.from("reports").select("id").eq("id", rep!.id)).data).toEqual([]);
    const self = await alice.client.from("reports").update({ status: "resolved" }).eq("id", rep!.id).select();
    expect(self.data ?? []).toEqual([]);
    const mod = await teacher.client.from("reports").update({ status: "resolved", resolution_note: "Corrigé." }).eq("id", rep!.id).select().single();
    expect(mod.error).toBeNull();
    expect(mod.data!.handled_by).toBe(teacher.id);
    const { data: notes } = await alice.client.from("notifications").select("kind, title").eq("kind", "report");
    expect(notes!.length).toBeGreaterThan(0);
    expect((await teacher.client.from("audit_logs").select("id").limit(1)).data).toEqual([]);
    expect((await admin.client.from("audit_logs").select("id").eq("target_id", rep!.id)).data!.length).toBeGreaterThan(0);
  });

  it("export RGPD : uniquement ses propres données", async () => {
    const { data } = await alice.client.rpc("export_my_data");
    expect(data.account.email).toBe(alice.email);
    const text = JSON.stringify(data);
    expect(text).not.toContain(bob.id);
    expect(text).not.toContain(bob.email);
  });

  it("quotas : consume_rate_limit bloque au-delà de la limite, par compte", async () => {
    const res = [];
    for (let i = 0; i < 4; i++) res.push((await alice.client.rpc("consume_rate_limit", { p_bucket: "test", p_max: 3, p_window_seconds: 60 })).data);
    expect(res).toEqual([true, true, true, false]);
    expect((await bob.client.rpc("consume_rate_limit", { p_bucket: "test", p_max: 3, p_window_seconds: 60 })).data).toBe(true);
  });
});

d("stockage des documents", () => {
  const pdf = new Blob([new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF")], { type: "application/pdf" });

  it("dépôt refusé aux étudiants, accepté pour l'équipe ; lecture après publication", async () => {
    const year = new Date().getFullYear();
    const path = `uploads/${year}/${crypto.randomUUID()}.pdf`;
    const denied = await alice.client.storage.from("documents").upload(path, pdf, { contentType: "application/pdf" });
    expect(denied.error).not.toBeNull();
    const badName = await teacher.client.storage.from("documents").upload(`../../etc/${crypto.randomUUID()}.pdf`, pdf, { contentType: "application/pdf" });
    expect(badName.error).not.toBeNull();
    const ok = await teacher.client.storage.from("documents").upload(path, pdf, { contentType: "application/pdf" });
    expect(ok.error).toBeNull();
    const { data: doc, error } = await teacher.client
      .from("documents")
      .insert({ title: "Formulaire", storage_path: path, original_name: "formulaire.pdf", mime_type: "application/pdf", size_bytes: 60, sha256: "a".repeat(64), subject_id: subjectId })
      .select()
      .single();
    expect(error).toBeNull();
    expect((await alice.client.storage.from("documents").createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await alice.client.from("documents").select("id").eq("id", doc!.id)).data).toEqual([]);
    await teacher.client.from("documents").update({ status: "published" }).eq("id", doc!.id);
    const signed = await alice.client.storage.from("documents").createSignedUrl(path, 60);
    expect(signed.error).toBeNull();
    const file = await fetch(signed.data!.signedUrl);
    expect(file.status).toBe(200);
    expect(await file.text()).toContain("%PDF");
    // anonyme : rien
    expect((await anonClient().storage.from("documents").createSignedUrl(path, 60)).error).not.toBeNull();
    const del = await alice.client.storage.from("documents").remove([path]);
    expect(del.data ?? []).toEqual([]);
  });
});
