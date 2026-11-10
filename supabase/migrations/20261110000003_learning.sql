-- =====================================================================
-- STRUCTURA — apprentissage : tentatives (corrigées côté serveur),
-- progression, temps d'étude, favoris, notifications, signalements,
-- usage de l'IA, statistiques, recherche plein texte, administration
-- des comptes, export RGPD.
-- =====================================================================

create type public.attempt_source as enum ('exercise', 'generator', 'quiz', 'exam');
create type public.report_status as enum ('open', 'in_review', 'resolved', 'rejected');
create type public.report_reason as enum ('erreur', 'incomprehensible', 'inapproprie', 'technique', 'autre');

-- ----------------------------- Tables ---------------------------------
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source public.attempt_source not null,
  exercise_id uuid references public.exercises (id) on delete set null,
  item_key text not null check (item_key ~ '^(exercise|generator|quiz|exam):[A-Za-z0-9_-]{1,80}$'),
  subject_slug text check (subject_slug ~ '^[a-z0-9-]{1,60}$'),
  chapter_key text check (chapter_key ~ '^(chapter|dbchapter):[A-Za-z0-9_-]{1,80}$'),
  title text not null check (char_length(title) between 1 and 200),
  difficulty public.difficulty,
  score numeric(7, 2) not null check (score >= 0),
  max_score numeric(7, 2) not null check (max_score >= 0 and score <= max_score),
  responses jsonb not null default '{}'::jsonb check (octet_length(responses::text) <= 20000),
  results jsonb not null default '[]'::jsonb check (octet_length(results::text) <= 200000),
  duration_seconds integer check (duration_seconds between 0 and 86400),
  seed bigint,
  created_at timestamptz not null default now()
);
create index attempts_user_idx on public.attempts (user_id, created_at desc);
create index attempts_user_item_idx on public.attempts (user_id, item_key);
create index attempts_created_idx on public.attempts (created_at);

create table public.progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null check (item_key ~ '^(chapter|lesson):[A-Za-z0-9_-]{1,80}$'),
  subject_slug text not null check (subject_slug ~ '^[a-z0-9-]{1,60}$'),
  title text not null check (char_length(title) between 1 and 200),
  href text not null check (href ~ '^/[A-Za-z0-9/_.?=&%-]{0,255}$'),
  completed_at timestamptz,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  primary key (user_id, item_key)
);
create index progress_user_recent_idx on public.progress (user_id, last_viewed_at desc);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  item_key text not null check (item_key ~ '^(chapter|lesson|fiche|exercise|generator|document|page):[A-Za-z0-9_/-]{1,120}$'),
  kind text not null check (kind in ('cours', 'fiche', 'exercice', 'document', 'outil')),
  title text not null check (char_length(title) between 1 and 200),
  href text not null check (href ~ '^/[A-Za-z0-9/_.?=&%-]{0,255}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('report', 'role', 'account', 'content', 'info')),
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 2000),
  href text check (href ~ '^/[A-Za-z0-9/_.?=&%-]{0,255}$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null default auth.uid(),
  target_type text not null check (target_type in ('lesson', 'exercise', 'question', 'document', 'chapter', 'generator', 'page')),
  target_key text not null check (target_key ~ '^[A-Za-z0-9_:/-]{1,160}$'),
  target_title text not null default '' check (char_length(target_title) <= 200),
  target_href text check (target_href ~ '^/[A-Za-z0-9/_.?=&%-]{0,255}$'),
  reason public.report_reason not null,
  message text not null default '' check (char_length(message) <= 2000),
  status public.report_status not null default 'open',
  resolution_note text not null default '' check (char_length(resolution_note) <= 2000),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('expliquer', 'indices', 'verifier')),
  prompt_chars integer not null check (prompt_chars >= 0),
  output_chars integer not null default 0 check (output_chars >= 0),
  tool_calls integer not null default 0 check (tool_calls >= 0),
  created_at timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);
create index ai_usage_created_idx on public.ai_usage (created_at);

-- --------------------------------- RLS --------------------------------
alter table public.attempts enable row level security;
alter table public.progress enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.ai_usage enable row level security;

-- Chacun ne voit que ses propres données. Les écritures passent par des
-- fonctions qui valident et corrigent (aucune note fournie par le client).
create policy "attempts: les siennes" on public.attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "attempts: effacer les siennes" on public.attempts for delete to authenticated using (user_id = (select auth.uid()));
create policy "progress: la sienne" on public.progress for select to authenticated using (user_id = (select auth.uid()));
create policy "progress: effacer la sienne" on public.progress for delete to authenticated using (user_id = (select auth.uid()));

create policy "favorites: les siens" on public.favorites for select to authenticated using (user_id = (select auth.uid()));
create policy "favorites: ajout" on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_permission('learning.track')));
create policy "favorites: retrait" on public.favorites for delete to authenticated using (user_id = (select auth.uid()));

create policy "notifications: les siennes" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: marquer lue" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: effacer" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

create policy "reports: création" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and (select public.has_permission('reports.create')));
create policy "reports: lecture" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.has_permission('reports.moderate')));
create policy "reports: modération" on public.reports for update to authenticated
  using ((select public.has_permission('reports.moderate'))) with check ((select public.has_permission('reports.moderate')));

create policy "ai_usage: le sien" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.attempts, public.progress, public.favorites, public.notifications, public.reports, public.ai_usage from anon;
revoke insert, update on public.attempts, public.progress, public.ai_usage from authenticated;
revoke update on public.favorites from authenticated;
revoke insert, update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke update on public.reports from authenticated;
grant update (status, resolution_note) on public.reports to authenticated;

-- ---------------------------- Notifications ---------------------------
create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_href text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, href) values (p_user, p_kind, p_title, p_body, p_href);
$$;

-- ---------------------------- Signalements ----------------------------
create or replace function public.reports_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.rate_limit_hit('report:' || auth.uid()::text, 10, 3600) then
      raise exception 'too many reports' using errcode = 'PT429';
    end if;
    new.reporter_id := coalesce(auth.uid(), new.reporter_id);
    new.status := 'open';
    new.handled_by := null;
    new.handled_at := null;
    new.resolution_note := '';
  elsif new.status is distinct from old.status then
    new.handled_by := auth.uid();
    new.handled_at := now();
  end if;
  return new;
end $$;

create or replace function public.reports_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    perform public.write_audit('reports.status', 'reports', new.id::text, jsonb_build_object('from', old.status, 'to', new.status));
    if new.reporter_id is not null and new.status in ('resolved', 'rejected') then
      perform public.notify(new.reporter_id, 'report',
        case new.status when 'resolved' then 'Signalement traité : merci !' else 'Signalement examiné' end,
        'À propos de « ' || left(new.target_title, 120) || ' ». ' || left(new.resolution_note, 600),
        new.target_href);
    end if;
  end if;
  return new;
end $$;

create trigger reports_before_write before insert or update on public.reports for each row execute function public.reports_before_write();
create trigger reports_after_update after update on public.reports for each row execute function public.reports_after_update();

-- ----------------------------- Favoris --------------------------------
create or replace function public.favorites_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.favorites where user_id = new.user_id) >= 500 then
    raise exception 'too many favorites' using errcode = 'PT429';
  end if;
  return new;
end $$;
create trigger favorites_limit before insert on public.favorites for each row execute function public.favorites_limit();

-- ------------------- Correction d'un exercice (base) ------------------
create or replace function public.grade_exercise(p_exercise_id uuid, p_responses jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  q record;
  v_resp jsonb;
  v_results jsonb := '[]'::jsonb;
  v_score numeric := 0;
  v_max numeric := 0;
  v_correct boolean;
  v_chosen uuid[];
  v_value double precision;
  v_tol double precision;
begin
  for q in
    select qu.id, qu.kind, qu.points, qu.unit, k.correct_answer_ids, k.expected_value, k.tolerance_rel, k.tolerance_abs,
           k.model_answer_md, k.explanation_md
    from public.questions qu left join public.question_keys k on k.question_id = qu.id
    where qu.exercise_id = p_exercise_id
    order by qu.position, qu.id
  loop
    v_resp := coalesce(p_responses -> q.id::text, '{}'::jsonb);
    v_correct := null;
    v_value := null;
    v_chosen := null;
    if q.kind = 'qcm' then
      select coalesce(array_agg(distinct x::uuid order by x::uuid), '{}') into v_chosen
      from jsonb_array_elements_text(case when jsonb_typeof(v_resp -> 'choices') = 'array' then v_resp -> 'choices' else '[]'::jsonb end) as x
      where x ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      v_correct := cardinality(v_chosen) > 0 and v_chosen = (select coalesce(array_agg(distinct c order by c), '{}') from unnest(q.correct_answer_ids) c);
      v_max := v_max + q.points;
    elsif q.kind = 'numeric' then
      if jsonb_typeof(v_resp -> 'value') = 'number' then
        v_value := (v_resp ->> 'value')::double precision;
      end if;
      if q.expected_value is not null then
        v_tol := greatest(q.tolerance_abs, q.tolerance_rel * abs(q.expected_value), 1e-12);
        v_correct := v_value is not null and abs(v_value - q.expected_value) <= v_tol;
      end if;
      v_max := v_max + q.points;
    end if;
    if v_correct then
      v_score := v_score + q.points;
    end if;
    v_results := v_results || jsonb_build_object(
      'question_id', q.id,
      'kind', q.kind,
      'points', q.points,
      'correct', v_correct,
      'earned', case when v_correct then q.points else 0 end,
      'given', case q.kind when 'qcm' then to_jsonb(v_chosen) when 'numeric' then to_jsonb(v_value)
                           else to_jsonb(left(coalesce(v_resp ->> 'text', ''), 4000)) end,
      'correct_answer_ids', case when q.kind = 'qcm' then to_jsonb(q.correct_answer_ids) end,
      'expected_value', case when q.kind = 'numeric' then to_jsonb(q.expected_value) end,
      'unit', q.unit,
      'model_answer_md', coalesce(q.model_answer_md, ''),
      'explanation_md', coalesce(q.explanation_md, '')
    );
  end loop;
  return jsonb_build_object('score', v_score, 'max', v_max, 'results', v_results);
end $$;

create or replace function public.correction_json(p_exercise_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(c) - 'exercise_id' - 'updated_at' from public.corrections c where c.exercise_id = p_exercise_id;
$$;

create or replace function public.submit_attempt(p_exercise_id uuid, p_responses jsonb, p_duration_seconds integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ex record;
  v_grade jsonb;
  v_id uuid;
begin
  if v_uid is null or not public.has_permission('learning.track') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_responses is null or jsonb_typeof(p_responses) <> 'object' or octet_length(p_responses::text) > 20000 then
    raise exception 'invalid responses' using errcode = '22023';
  end if;
  if not public.rate_limit_hit('attempt:' || v_uid::text, 30, 60) then
    raise exception 'too many attempts' using errcode = 'PT429';
  end if;

  select e.id, e.title, e.difficulty, e.chapter_id, s.slug as subject_slug,
         (e.status = 'published' and c.status = 'published' and s.status = 'published') as is_public
  into v_ex
  from public.exercises e
  join public.chapters c on c.id = e.chapter_id
  join public.subjects s on s.id = c.subject_id
  where e.id = p_exercise_id;

  if not found or not (v_ex.is_public or public.has_permission('content.read_drafts')) then
    raise exception 'exercise not found' using errcode = 'P0002';
  end if;

  v_grade := public.grade_exercise(p_exercise_id, p_responses);

  insert into public.attempts (user_id, source, exercise_id, item_key, subject_slug, chapter_key, title, difficulty,
                               score, max_score, responses, results, duration_seconds)
  values (v_uid, 'exercise', p_exercise_id, 'exercise:' || p_exercise_id, v_ex.subject_slug, 'dbchapter:' || v_ex.chapter_id,
          v_ex.title, v_ex.difficulty, (v_grade ->> 'score')::numeric, (v_grade ->> 'max')::numeric,
          p_responses, v_grade -> 'results',
          case when p_duration_seconds between 0 and 86400 then p_duration_seconds end)
  returning id into v_id;

  return v_grade || jsonb_build_object('attempt_id', v_id, 'correction', public.correction_json(p_exercise_id));
end $$;

-- Corrigé d'un exercice : après au moins une tentative (ou pour l'équipe).
create or replace function public.get_correction(p_exercise_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.has_permission('content.read_drafts')
     and not exists (select 1 from public.attempts a where a.user_id = auth.uid() and a.exercise_id = p_exercise_id) then
    raise exception 'attempt required' using errcode = '42501';
  end if;
  return public.correction_json(p_exercise_id);
end $$;

-- Tentatives du cursus intégré (exercices générés, quiz, examens) :
-- corrigées par le serveur Next.js à partir du code vérifié, puis
-- enregistrées avec la clé de service. Jamais appelable par un client.
create or replace function public.record_graded_attempt(
  p_user uuid, p_source public.attempt_source, p_item_key text, p_subject_slug text, p_chapter_key text,
  p_title text, p_difficulty public.difficulty, p_score numeric, p_max numeric,
  p_responses jsonb, p_results jsonb, p_duration_seconds integer, p_seed bigint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_user and status = 'active') then
    raise exception 'inactive user' using errcode = '42501';
  end if;
  if not public.rate_limit_hit('attempt:' || p_user::text, 30, 60) then
    raise exception 'too many attempts' using errcode = 'PT429';
  end if;
  insert into public.attempts (user_id, source, item_key, subject_slug, chapter_key, title, difficulty, score, max_score,
                               responses, results, duration_seconds, seed)
  values (p_user, p_source, p_item_key, p_subject_slug, p_chapter_key, left(p_title, 200), p_difficulty, p_score, p_max,
          coalesce(p_responses, '{}'::jsonb), coalesce(p_results, '[]'::jsonb),
          case when p_duration_seconds between 0 and 86400 then p_duration_seconds end, p_seed)
  returning id into v_id;
  return v_id;
end $$;

-- ----------------------- Progression et temps -------------------------
create or replace function public.track_view(p_item_key text, p_subject_slug text default null, p_title text default null, p_href text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_subject text := p_subject_slug;
  v_title text := p_title;
  v_href text := p_href;
  v_lesson uuid;
begin
  if v_uid is null or not public.has_permission('learning.track') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.rate_limit_hit('view:' || v_uid::text, 120, 60) then
    return;
  end if;
  if p_item_key ~ '^lesson:[0-9a-f-]{36}$' then
    v_lesson := substr(p_item_key, 8)::uuid;
    select s.slug, l.title, '/matieres/' || s.slug || '/' || c.slug || '/' || l.slug
    into v_subject, v_title, v_href
    from public.lessons l join public.chapters c on c.id = l.chapter_id join public.subjects s on s.id = c.subject_id
    where l.id = v_lesson
      and ((l.status = 'published' and c.status = 'published' and s.status = 'published') or public.has_permission('content.read_drafts'));
    if not found then
      raise exception 'lesson not found' using errcode = 'P0002';
    end if;
  elsif p_item_key !~ '^chapter:[A-Za-z0-9_-]{1,80}$' or v_subject is null or v_title is null or v_href is null then
    raise exception 'invalid item' using errcode = '22023';
  end if;

  insert into public.progress as pr (user_id, item_key, subject_slug, title, href)
  values (v_uid, p_item_key, v_subject, left(v_title, 200), v_href)
  on conflict (user_id, item_key) do update
    set last_viewed_at = now(), title = excluded.title, href = excluded.href, subject_slug = excluded.subject_slug;

  update public.profiles
     set last_item_key = p_item_key, last_item_title = left(v_title, 200), last_item_href = v_href, last_item_at = now()
   where id = v_uid;
end $$;

create or replace function public.track_time(p_item_key text, p_seconds integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('learning.track') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_seconds is null or p_seconds < 1 then
    return;
  end if;
  -- au plus ~2 min comptées par appel et 3 appels par minute : impossible de gonfler le compteur
  if not public.rate_limit_hit('time:' || auth.uid()::text, 3, 60) then
    return;
  end if;
  update public.progress set time_spent_seconds = time_spent_seconds + least(p_seconds, 120), last_viewed_at = now()
   where user_id = auth.uid() and item_key = p_item_key;
end $$;

create or replace function public.mark_completed(p_item_key text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_permission('learning.track') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.progress set completed_at = coalesce(completed_at, now()) where user_id = auth.uid() and item_key = p_item_key;
end $$;

create or replace function public.set_weekly_goal(p_goal integer)
returns void language sql security definer set search_path = '' as $$
  update public.profiles set weekly_goal = greatest(1, least(100, p_goal)) where id = auth.uid();
$$;

-- ------------------------------ IA ------------------------------------
-- Vérifie les quotas et enregistre l'appel (sans le contenu des messages).
create or replace function public.ai_begin(p_mode text, p_prompt_chars integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
begin
  if auth.uid() is null or not public.has_permission('ai.use') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.rate_limit_hit('ai-min:' || auth.uid()::text, 6, 60)
     or not public.rate_limit_hit('ai-day:' || auth.uid()::text, 80, 86400) then
    raise exception 'ai quota exceeded' using errcode = 'PT429';
  end if;
  insert into public.ai_usage (user_id, mode, prompt_chars) values (auth.uid(), p_mode, greatest(0, p_prompt_chars))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.ai_end(p_id bigint, p_output_chars integer, p_tool_calls integer)
returns void language sql security definer set search_path = '' as $$
  update public.ai_usage set output_chars = greatest(0, p_output_chars), tool_calls = greatest(0, p_tool_calls)
  where id = p_id and user_id = auth.uid();
$$;

-- ---------------------------- Statistiques ----------------------------
create or replace function public.my_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'profile', (select jsonb_build_object('display_name', p.display_name, 'study_year', p.study_year, 'role', p.role,
                       'weekly_goal', p.weekly_goal, 'last_item_title', p.last_item_title, 'last_item_href', p.last_item_href,
                       'last_item_at', p.last_item_at) from public.profiles p where p.id = v_uid),
    'totals', (select jsonb_build_object(
                 'attempts', count(*),
                 'exercises', count(*) filter (where source in ('exercise', 'generator')),
                 'distinct_exercises', count(distinct item_key) filter (where source in ('exercise', 'generator')),
                 'score', coalesce(sum(score) filter (where max_score > 0), 0),
                 'max', coalesce(sum(max_score) filter (where max_score > 0), 0),
                 'attempt_seconds', coalesce(sum(duration_seconds), 0),
                 'week_exercises', count(*) filter (where source in ('exercise', 'generator') and created_at >= date_trunc('week', now())))
               from public.attempts where user_id = v_uid),
    'reading_seconds', (select coalesce(sum(time_spent_seconds), 0) from public.progress where user_id = v_uid),
    'subjects', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                   select s.slug,
                          (select count(*) from public.progress p where p.user_id = v_uid and p.subject_slug = s.slug) as viewed,
                          (select count(*) from public.progress p where p.user_id = v_uid and p.subject_slug = s.slug and p.completed_at is not null) as completed,
                          (select coalesce(sum(p.time_spent_seconds), 0) from public.progress p where p.user_id = v_uid and p.subject_slug = s.slug) as seconds,
                          (select count(*) from public.attempts a where a.user_id = v_uid and a.subject_slug = s.slug) as attempts,
                          (select coalesce(sum(a.score), 0) from public.attempts a where a.user_id = v_uid and a.subject_slug = s.slug and a.max_score > 0) as score,
                          (select coalesce(sum(a.max_score), 0) from public.attempts a where a.user_id = v_uid and a.subject_slug = s.slug) as max,
                          (select count(*) from public.lessons l join public.chapters c on c.id = l.chapter_id
                            where c.subject_id = s.id and l.status = 'published' and c.status = 'published') as db_lessons
                   from public.subjects s where s.status = 'published' order by s.position) x),
    'chapters', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                   select chapter_key, max(subject_slug) as subject_slug, count(*) as attempts, sum(score) as score, sum(max_score) as max,
                          max(created_at) as last_at
                   from public.attempts where user_id = v_uid and chapter_key is not null and max_score > 0
                   group by chapter_key) x),
    'recent', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                 select id, source, item_key, title, subject_slug, score, max_score, created_at
                 from public.attempts where user_id = v_uid order by created_at desc limit 8) x),
    'active_days', (select coalesce(jsonb_agg(d order by d), '[]'::jsonb) from (
                      select distinct (created_at at time zone 'Europe/Paris')::date as d from public.attempts
                       where user_id = v_uid and created_at > now() - interval '400 days'
                      union
                      select distinct (last_viewed_at at time zone 'Europe/Paris')::date from public.progress
                       where user_id = v_uid and last_viewed_at > now() - interval '400 days') days),
    'completed_items', (select coalesce(jsonb_agg(item_key), '[]'::jsonb) from public.progress where user_id = v_uid and completed_at is not null)
  );
end $$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission('stats.read');
  return jsonb_build_object(
    'users', (select jsonb_build_object(
                'total', count(*),
                'students', count(*) filter (where role = 'student'),
                'teachers', count(*) filter (where role = 'teacher'),
                'admins', count(*) filter (where role = 'admin'),
                'suspended', count(*) filter (where status = 'suspended'),
                'new_7d', count(*) filter (where created_at > now() - interval '7 days'))
              from public.profiles),
    'active_7d', (select count(distinct user_id) from public.attempts where created_at > now() - interval '7 days'),
    'attempts_7d', (select count(*) from public.attempts where created_at > now() - interval '7 days'),
    'success_rate_30d', (select case when sum(max_score) > 0 then round(100 * sum(score) / sum(max_score), 1) end
                         from public.attempts where created_at > now() - interval '30 days' and max_score > 0),
    'content', jsonb_build_object(
      'subjects', (select count(*) from public.subjects where status = 'published'),
      'lessons_published', (select count(*) from public.lessons where status = 'published'),
      'lessons_draft', (select count(*) from public.lessons where status = 'draft'),
      'exercises_published', (select count(*) from public.exercises where status = 'published'),
      'exercises_draft', (select count(*) from public.exercises where status = 'draft'),
      'documents', (select count(*) from public.documents where status = 'published')),
    'reports_open', (select count(*) from public.reports where status in ('open', 'in_review')),
    'ai_calls_7d', (select count(*) from public.ai_usage where created_at > now() - interval '7 days'),
    'by_subject', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                     select subject_slug, count(*) as attempts,
                            case when sum(max_score) > 0 then round(100 * sum(score) / sum(max_score), 1) end as success
                     from public.attempts where created_at > now() - interval '30 days' and subject_slug is not null
                     group by subject_slug order by count(*) desc) x)
  );
end $$;

-- ------------------------- Recherche (RAG) ----------------------------
-- security invoker : la RLS limite les résultats à ce que l'appelant peut lire.
create or replace function public.search_content(p_query text, p_limit integer default 6)
returns table (kind text, id uuid, title text, subject_slug text, href text, snippet text, rank real)
language sql stable security invoker set search_path = '' as $$
  with q as (select websearch_to_tsquery('french', left(coalesce(p_query, ''), 300)) as tsq)
  select * from (
    select 'lesson'::text, l.id, l.title, s.slug, '/matieres/' || s.slug || '/' || c.slug || '/' || l.slug,
           ts_headline('french', l.body_md, q.tsq, 'MaxFragments=3, MaxWords=60, MinWords=20, FragmentDelimiter=" … "'),
           ts_rank(l.search, q.tsq)
    from public.lessons l join public.chapters c on c.id = l.chapter_id join public.subjects s on s.id = c.subject_id, q
    where l.search @@ q.tsq and l.status = 'published'
    union all
    select 'exercise'::text, e.id, e.title, s.slug, '/matieres/' || s.slug || '/exercices/' || e.id,
           ts_headline('french', e.statement_md || ' ' || e.data_md, q.tsq, 'MaxFragments=2, MaxWords=50, MinWords=15'),
           ts_rank(e.search, q.tsq)
    from public.exercises e join public.chapters c on c.id = e.chapter_id join public.subjects s on s.id = c.subject_id, q
    where e.search @@ q.tsq and e.status = 'published'
  ) r
  order by 7 desc
  limit greatest(1, least(p_limit, 10));
$$;

-- ----------------------- Administration des comptes -------------------
create or replace function public.admin_list_users(p_search text default null, p_role public.app_role default null,
                                                   p_limit integer default 50, p_offset integer default 0)
returns table (id uuid, email text, display_name text, role public.app_role, status public.account_status,
               study_year public.study_year, created_at timestamptz, last_sign_in_at timestamptz,
               email_confirmed boolean, mfa boolean, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permission('users.read');
  return query
    select p.id, u.email::text, p.display_name, p.role, p.status, p.study_year, p.created_at, u.last_sign_in_at,
           u.email_confirmed_at is not null,
           exists (select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified'),
           count(*) over ()
    from public.profiles p join auth.users u on u.id = p.id
    where (p_role is null or p.role = p_role)
      and (p_search is null or p_search = '' or u.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%')
    order by p.created_at desc
    limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_old public.app_role;
begin
  perform public.assert_permission('users.manage');
  if p_user = auth.uid() then
    raise exception 'cannot change own role' using errcode = '42501';
  end if;
  select role into v_old from public.profiles where id = p_user for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if v_old = 'admin' and p_role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin' and status = 'active') <= 1 then
    raise exception 'last admin' using errcode = '42501';
  end if;
  perform set_config('structura.admin_op', 'on', true);
  update public.profiles set role = p_role where id = p_user;
  perform set_config('structura.admin_op', 'off', true);
  perform public.write_audit('users.role', 'profiles', p_user::text, jsonb_build_object('from', v_old, 'to', p_role));
  perform public.notify(p_user, 'role', 'Votre rôle a changé',
    'Votre compte a désormais le rôle « ' || (select label from public.roles where key = p_role) || ' ».', '/espace');
end $$;

create or replace function public.admin_set_status(p_user uuid, p_status public.account_status)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_old public.account_status;
begin
  perform public.assert_permission('users.manage');
  if p_user = auth.uid() then
    raise exception 'cannot change own status' using errcode = '42501';
  end if;
  select status into v_old from public.profiles where id = p_user for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  perform set_config('structura.admin_op', 'on', true);
  update public.profiles set status = p_status where id = p_user;
  perform set_config('structura.admin_op', 'off', true);
  perform public.write_audit('users.status', 'profiles', p_user::text, jsonb_build_object('from', v_old, 'to', p_status));
end $$;

-- Journalise une opération faite hors base (ex. suppression d'un compte par l'API Auth).
create or replace function public.log_admin_action(p_action text, p_target text, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permission('users.manage');
  if p_action !~ '^users\.[a-z_]{1,30}$' then
    raise exception 'invalid action' using errcode = '22023';
  end if;
  perform public.write_audit(p_action, 'auth.users', p_target, p_details);
end $$;

-- ------------------------------- RGPD ---------------------------------
create or replace function public.export_my_data()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'export_date', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at,
                       'last_sign_in_at', u.last_sign_in_at, 'email_confirmed_at', u.email_confirmed_at)
                from auth.users u where u.id = v_uid),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'attempts', (select coalesce(jsonb_agg(to_jsonb(a) - 'user_id' order by a.created_at), '[]'::jsonb) from public.attempts a where a.user_id = v_uid),
    'progress', (select coalesce(jsonb_agg(to_jsonb(p) - 'user_id'), '[]'::jsonb) from public.progress p where p.user_id = v_uid),
    'favorites', (select coalesce(jsonb_agg(to_jsonb(f) - 'user_id'), '[]'::jsonb) from public.favorites f where f.user_id = v_uid),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n) - 'user_id'), '[]'::jsonb) from public.notifications n where n.user_id = v_uid),
    'reports', (select coalesce(jsonb_agg(to_jsonb(r) - 'reporter_id' - 'handled_by'), '[]'::jsonb) from public.reports r where r.reporter_id = v_uid),
    'ai_usage', (select coalesce(jsonb_agg(to_jsonb(x) - 'user_id'), '[]'::jsonb) from public.ai_usage x where x.user_id = v_uid)
  );
end $$;

-- ------------------------------ Droits --------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.notify(uuid, text, text, text, text)',
    'public.reports_before_write()', 'public.reports_after_update()', 'public.favorites_limit()',
    'public.grade_exercise(uuid, jsonb)', 'public.correction_json(uuid)',
    'public.record_graded_attempt(uuid, public.attempt_source, text, text, text, text, public.difficulty, numeric, numeric, jsonb, jsonb, integer, bigint)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'public.submit_attempt(uuid, jsonb, integer)', 'public.get_correction(uuid)',
    'public.track_view(text, text, text, text)', 'public.track_time(text, integer)', 'public.mark_completed(text)',
    'public.set_weekly_goal(integer)', 'public.ai_begin(text, integer)', 'public.ai_end(bigint, integer, integer)',
    'public.my_stats()', 'public.admin_stats()', 'public.admin_list_users(text, public.app_role, integer, integer)',
    'public.admin_set_role(uuid, public.app_role)', 'public.admin_set_status(uuid, public.account_status)',
    'public.log_admin_action(text, text, jsonb)', 'public.export_my_data()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
grant execute on function public.record_graded_attempt(uuid, public.attempt_source, text, text, text, text, public.difficulty, numeric, numeric, jsonb, jsonb, integer, bigint) to service_role;
