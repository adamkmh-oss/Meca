-- =====================================================================
-- STRUCTURA — contenus pédagogiques : matières, chapitres, leçons (cours
-- et fiches), exercices, questions, choix de réponse, clés de correction,
-- corrigés, documents.
--
-- Cycle de vie : draft → published → archived. Les étudiants (et les
-- visiteurs) ne lisent que le publié, et seulement si toute la chaîne
-- parente est publiée. Les clés de correction et les corrigés ne sont
-- jamais lisibles directement par un étudiant : ils sont renvoyés par
-- submit_attempt / get_correction après une tentative.
-- =====================================================================

create type public.lesson_kind as enum ('cours', 'fiche');
create type public.question_kind as enum ('qcm', 'numeric', 'free');

-- ----------------------------- Tables ---------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  icon text not null default 'BookOpen' check (icon ~ '^[A-Za-z0-9]{1,40}$'),
  position integer not null default 0,
  status public.content_status not null default 'draft',
  builtin_modules text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
comment on column public.subjects.builtin_modules is 'Modules du cursus intégré (code vérifié : cours interactifs, simulateurs) rattachés à la matière.';

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 2 and 160),
  summary text not null default '' check (char_length(summary) <= 1000),
  level public.difficulty not null default 'debutant',
  position integer not null default 0,
  status public.content_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (subject_id, slug)
);
create index chapters_subject_idx on public.chapters (subject_id, position);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  kind public.lesson_kind not null default 'cours',
  title text not null check (char_length(title) between 2 and 160),
  summary text not null default '' check (char_length(summary) <= 1000),
  body_md text not null default '' check (char_length(body_md) <= 200000),
  estimated_minutes integer not null default 15 check (estimated_minutes between 1 and 240),
  position integer not null default 0,
  status public.content_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  search tsvector generated always as (
    setweight(to_tsvector('french', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(body_md, '')), 'C')
  ) stored,
  unique (chapter_id, slug)
);
create index lessons_chapter_idx on public.lessons (chapter_id, position);
create index lessons_search_idx on public.lessons using gin (search);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects (id) on delete set null,
  chapter_id uuid references public.chapters (id) on delete set null,
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '' check (char_length(description) <= 1000),
  storage_path text not null unique check (storage_path ~ '^uploads/[0-9]{4}/[0-9a-f-]{36}\.(pdf|png|jpg|webp)$'),
  original_name text not null default '' check (char_length(original_name) <= 200),
  mime_type text not null check (mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status public.content_status not null default 'draft',
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index documents_subject_idx on public.documents (subject_id, status);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null check (char_length(title) between 2 and 160),
  statement_md text not null default '' check (char_length(statement_md) <= 50000),
  data_md text not null default '' check (char_length(data_md) <= 20000),
  illustration_document_id uuid references public.documents (id) on delete set null,
  difficulty public.difficulty not null default 'debutant',
  position integer not null default 0,
  status public.content_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  search tsvector generated always as (
    setweight(to_tsvector('french', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(statement_md, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(data_md, '')), 'C')
  ) stored
);
create index exercises_chapter_idx on public.exercises (chapter_id, position);
create index exercises_search_idx on public.exercises using gin (search);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position integer not null default 0,
  kind public.question_kind not null,
  prompt_md text not null check (char_length(prompt_md) between 1 and 20000),
  unit text not null default '' check (char_length(unit) <= 30),
  points numeric(5, 2) not null default 1 check (points > 0 and points <= 100),
  multiple boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questions_exercise_idx on public.questions (exercise_id, position);

-- Choix proposés pour un QCM (sans l'indication de bonne réponse).
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  position integer not null default 0,
  label_md text not null check (char_length(label_md) between 1 and 2000)
);
create index answers_question_idx on public.answers (question_id, position);

-- Clé de correction d'une question : jamais lisible par un étudiant.
create table public.question_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  correct_answer_ids uuid[] not null default '{}',
  expected_value double precision,
  tolerance_rel double precision not null default 0.01 check (tolerance_rel between 0 and 0.5),
  tolerance_abs double precision not null default 0 check (tolerance_abs >= 0),
  model_answer_md text not null default '' check (char_length(model_answer_md) <= 20000),
  explanation_md text not null default '' check (char_length(explanation_md) <= 20000)
);

-- Corrigé détaillé en six parties (même trame que les corrigés du cours).
create table public.corrections (
  exercise_id uuid primary key references public.exercises (id) on delete cascade,
  donnees_md text not null default '' check (char_length(donnees_md) <= 20000),
  schema_md text not null default '' check (char_length(schema_md) <= 20000),
  equations_md text not null default '' check (char_length(equations_md) <= 20000),
  calculs_md text not null default '' check (char_length(calculs_md) <= 40000),
  resultat_md text not null default '' check (char_length(resultat_md) <= 20000),
  verification_md text not null default '' check (char_length(verification_md) <= 20000),
  updated_at timestamptz not null default now()
);

-- ----------------------- Déclencheurs de contenu ----------------------
-- Auteur, horodatage, garde de publication.
create or replace function public.content_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old_status text := case when tg_op = 'UPDATE' then to_jsonb(old) ->> 'status' else 'draft' end;
  v_new_status text := to_jsonb(new) ->> 'status';
begin
  if v_new_status is distinct from v_old_status and v_new_status <> 'draft'
     and auth.uid() is not null and not public.has_permission('content.publish') then
    raise exception 'publishing requires content.publish' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if tg_table_name = 'documents' then
      new.uploaded_by := coalesce(auth.uid(), new.uploaded_by);
    else
      new := jsonb_populate_record(new, jsonb_build_object('created_by', coalesce(auth.uid()::text, to_jsonb(new) ->> 'created_by')));
    end if;
  else
    new.updated_at := now();
    new.created_at := old.created_at;
  end if;
  if v_new_status = 'published' and v_new_status is distinct from v_old_status then
    new.published_at := now();
  end if;
  if tg_table_name = 'lessons' then
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end $$;

create trigger subjects_before_write before insert or update on public.subjects for each row execute function public.content_before_write();
create trigger chapters_before_write before insert or update on public.chapters for each row execute function public.content_before_write();
create trigger lessons_before_write before insert or update on public.lessons for each row execute function public.content_before_write();
create trigger exercises_before_write before insert or update on public.exercises for each row execute function public.content_before_write();
create trigger documents_before_write before insert or update on public.documents for each row execute function public.content_before_write();
create trigger questions_touch before update on public.questions for each row execute function public.touch_updated_at();
create trigger corrections_touch before update on public.corrections for each row execute function public.touch_updated_at();

create trigger subjects_audit after insert or update or delete on public.subjects for each row execute function public.audit_row_change();
create trigger chapters_audit after insert or update or delete on public.chapters for each row execute function public.audit_row_change();
create trigger lessons_audit after insert or update or delete on public.lessons for each row execute function public.audit_row_change();
create trigger exercises_audit after insert or update or delete on public.exercises for each row execute function public.audit_row_change();
create trigger documents_audit after insert or update or delete on public.documents for each row execute function public.audit_row_change();
create trigger question_keys_audit after insert or update or delete on public.question_keys for each row execute function public.audit_row_change('question_id');
create trigger corrections_audit after insert or update or delete on public.corrections for each row execute function public.audit_row_change('exercise_id');

-- --------------------------------- RLS --------------------------------
alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons enable row level security;
alter table public.documents enable row level security;
alter table public.exercises enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.question_keys enable row level security;
alter table public.corrections enable row level security;

-- Lecture : publié (et parent visible) pour tous ; tout pour l'équipe pédagogique.
-- Les sous-requêtes sur la table parente sont elles-mêmes filtrées par sa RLS.
create policy "subjects: lecture" on public.subjects for select to anon, authenticated
  using (status = 'published' or (select public.has_permission('content.read_drafts')));
create policy "chapters: lecture" on public.chapters for select to anon, authenticated
  using ((status = 'published' and exists (select 1 from public.subjects s where s.id = subject_id))
         or (select public.has_permission('content.read_drafts')));
create policy "lessons: lecture" on public.lessons for select to anon, authenticated
  using ((status = 'published' and exists (select 1 from public.chapters c where c.id = chapter_id))
         or (select public.has_permission('content.read_drafts')));
create policy "exercises: lecture" on public.exercises for select to anon, authenticated
  using ((status = 'published' and exists (select 1 from public.chapters c where c.id = chapter_id))
         or (select public.has_permission('content.read_drafts')));
create policy "questions: lecture" on public.questions for select to anon, authenticated
  using (exists (select 1 from public.exercises e where e.id = exercise_id));
create policy "answers: lecture" on public.answers for select to anon, authenticated
  using (exists (select 1 from public.questions q where q.id = question_id));
-- Documents : réservés aux comptes connectés (supports des enseignants).
create policy "documents: lecture" on public.documents for select to authenticated
  using ((status = 'published' and (select public.is_active_user())) or (select public.has_permission('documents.manage')));
create policy "question_keys: équipe" on public.question_keys for select to authenticated
  using ((select public.has_permission('content.read_drafts')));
create policy "corrections: équipe" on public.corrections for select to authenticated
  using ((select public.has_permission('content.read_drafts')));

-- Écriture : équipe pédagogique (la publication est contrôlée par déclencheur).
create policy "subjects: création" on public.subjects for insert to authenticated with check ((select public.has_permission('subjects.manage')));
create policy "subjects: modification" on public.subjects for update to authenticated
  using ((select public.has_permission('content.write'))) with check ((select public.has_permission('content.write')));
create policy "subjects: suppression" on public.subjects for delete to authenticated using ((select public.has_permission('subjects.manage')));

create policy "chapters: écriture" on public.chapters for all to authenticated
  using ((select public.has_permission('content.write'))) with check ((select public.has_permission('content.write')));
create policy "lessons: écriture" on public.lessons for all to authenticated
  using ((select public.has_permission('content.write'))) with check ((select public.has_permission('content.write')));
create policy "exercises: écriture" on public.exercises for all to authenticated
  using ((select public.has_permission('content.write'))) with check ((select public.has_permission('content.write')));
create policy "questions: écriture" on public.questions for all to authenticated
  using ((select public.has_permission('content.write'))) with check ((select public.has_permission('content.write')));
create policy "answers: écriture" on public.answers for all to authenticated
  using ((select public.has_permission('content.write'))) with check ((select public.has_permission('content.write')));
create policy "question_keys: écriture" on public.question_keys for all to authenticated
  using ((select public.has_permission('content.write'))) with check ((select public.has_permission('content.write')));
create policy "corrections: écriture" on public.corrections for all to authenticated
  using ((select public.has_permission('content.write'))) with check ((select public.has_permission('content.write')));
create policy "documents: écriture" on public.documents for all to authenticated
  using ((select public.has_permission('documents.manage'))) with check ((select public.has_permission('documents.manage')));

-- Défense en profondeur : les visiteurs anonymes ne lisent que le nécessaire.
revoke insert, update, delete on public.subjects, public.chapters, public.lessons, public.documents, public.exercises,
  public.questions, public.answers, public.question_keys, public.corrections from anon;
revoke all on public.question_keys, public.corrections, public.documents from anon;
revoke execute on function public.content_before_write() from public, anon, authenticated;

-- ------------------------- Matières de départ -------------------------
insert into public.subjects (slug, title, description, icon, position, status, builtin_modules, published_at) values
  ('mecanique-structures', 'Mécanique des structures', 'Sollicitations internes, poutres, portiques, treillis, hyperstatisme et flambement : cours interactifs, simulateur et exercices corrigés.', 'Building2', 1, 'published', '{sollicitations,structures,approfondissement}', now()),
  ('rdm', 'Résistance des matériaux', 'Contraintes, moment quadratique, flexion, cisaillement, flèche : dimensionner et vérifier une section.', 'Ruler', 2, 'published', '{rdm}', now()),
  ('statique', 'Statique', 'Forces, moments, équilibre et réactions d''appui : la base de tout calcul de structure.', 'Scale', 3, 'published', '{fondamentaux,reactions-appui}', now()),
  ('beton-arme', 'Béton armé', 'Matériaux, actions et combinaisons, dimensionnement des éléments courants selon l''Eurocode 2.', 'Columns3', 4, 'published', '{}', now()),
  ('geotechnique', 'Géotechnique', 'Identification des sols, contraintes dans le sol, tassements, fondations superficielles.', 'Mountain', 5, 'published', '{}', now()),
  ('materiaux', 'Matériaux de construction', 'Béton, acier, bois, granulats : propriétés, essais et choix des matériaux.', 'Layers', 6, 'published', '{}', now()),
  ('topographie', 'Topographie', 'Nivellement, mesures d''angles et de distances, implantation.', 'Compass', 7, 'published', '{}', now()),
  ('thermique', 'Thermique du bâtiment', 'Conduction, résistances thermiques, déperditions, ponts thermiques.', 'Thermometer', 8, 'published', '{}', now()),
  ('construction-durable', 'Construction durable', 'Analyse de cycle de vie, RE2020, matériaux biosourcés, sobriété.', 'Leaf', 9, 'published', '{}', now()),
  ('lecture-plans', 'Lecture de plans et structures', 'Échelles, vues, coupes, cotation et lecture des plans de structure.', 'DraftingCompass', 10, 'published', '{}', now())
on conflict (slug) do nothing;
