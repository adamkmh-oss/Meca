# Base de données

PostgreSQL 15 (Supabase). Schéma versionné dans `supabase/migrations` :

| Migration | Contenu |
|---|---|
| `…0001_core.sql` | Types, rôles, permissions, profils, fonctions d'accès, audit, limitation de débit |
| `…0002_content.sql` | Matières, chapitres, leçons, documents, exercices, questions, choix, clés, corrigés, matières de départ |
| `…0003_learning.sql` | Tentatives, progression, favoris, notifications, signalements, usage IA, fonctions métier et d'administration, export RGPD |
| `…0004_storage.sql` | Seau privé `documents` et ses politiques |
| `…0005_retention.sql` | Purge selon les durées de conservation |

## Entités

```
auth.users (Supabase Auth : e-mail, mot de passe haché, MFA)
  └─1:1─ profiles (rôle, statut, pseudonyme, année, objectif, dernier contenu ouvert)
roles ─< role_permissions >─ permissions

subjects ─< chapters ─< lessons (cours | fiche)
                     └─< exercises ─< questions ─< answers (choix QCM)
                                   │            └─1:1─ question_keys   (réponses attendues : équipe uniquement)
                                   └─1:1─ corrections (6 parties : équipe, ou après une tentative)
documents (fichiers du seau privé) ── subjects / chapters

attempts  (user, source exercise|generator|quiz|exam, score, réponses, résultats)
progress  (user, item, consulté / terminé, temps d'étude)
favorites (user, item)        notifications (user)
reports   (déclarant, cible, motif, statut, traitement)
ai_usage  (user, mode, volumes)      audit_logs (journal en ajout seul)
rate_limits (compteurs par clé hachée et fenêtre)
```

La table `users` demandée correspond à `auth.users` (gérée par Supabase Auth, non exposée par l'API) ; `answers` désigne les choix proposés, `question_keys` les bonnes réponses. Les tables `roles`, `permissions` et `role_permissions` décrivent le RBAC.

## Clés, contraintes, suppressions

- Clés primaires `uuid` (`gen_random_uuid()`), sauf journaux (`bigint` identité) et tables de liaison (clés composées).
- Suppression d'un compte (`auth.users`) : cascade sur profil, tentatives, progression, favoris, notifications, usage IA ; `set null` sur les contenus créés, signalements et journal (traçabilité sans donnée personnelle).
- Suppression d'une matière / d'un chapitre / d'un exercice : cascade sur les éléments rattachés ; un document supprimé laisse l'exercice sans illustration (`set null`).
- Contraintes `check` sur les longueurs, formats d'identifiants d'URL, chemins de fichiers (`uploads/AAAA/<uuid>.pdf|png|jpg|webp`), types MIME, tailles (≤ 20 Mo), liens internes (`^/…`), notes (`0 ≤ score ≤ max`).
- Index : par utilisateur et date (`attempts`, `progress`, `notifications`, `ai_usage`), par statut (`reports`), par position (contenus), GIN plein texte français (`lessons.search`, `exercises.search`).

## Règles d'accès (RLS)

RLS activée sur **toutes** les tables exposées. `has_permission(p)` (security definer) vérifie : compte actif, rôle portant la permission, et session `aal2` si l'utilisateur a activé la MFA.

| Table | Lecture | Écriture |
|---|---|---|
| profiles | soi ; `users.read` | soi, colonnes limitées (pseudonyme, année, objectif, reprise) ; rôle et statut : fonctions admin uniquement |
| subjects, chapters, lessons, exercises, questions, answers | publié **et** parents publiés (y compris visiteurs) ; tout pour `content.read_drafts` | `content.write` ; création/suppression de matières : `subjects.manage` ; passage à publié : `content.publish` (déclencheur) |
| question_keys, corrections | `content.read_drafts` uniquement | `content.write` |
| documents, storage.objects | comptes actifs si publié ; `documents.manage` | `documents.manage` |
| attempts | soi | **aucune écriture directe** : `submit_attempt` (corrige) ou `record_graded_attempt` (clé de service) |
| progress | soi | via `track_view`, `track_time` (plafonné), `mark_completed` |
| favorites | soi | soi (`learning.track`, 500 maximum) |
| notifications | soi | marquer lue (colonne `read_at`) ; création par fonctions |
| reports | soi ; `reports.moderate` | création par soi (`open` forcé, 10/heure) ; statut et note : `reports.moderate` |
| audit_logs | `audit.read` | déclencheurs et fonctions uniquement |
| ai_usage | soi | `ai_begin` / `ai_end` |
| rate_limits | personne | fonctions uniquement |

Les visiteurs anonymes n'ont aucun droit d'écriture et aucun accès aux tables privées (privilèges retirés en plus de la RLS).

## Fonctions principales

| Fonction | Rôle | Appelable par |
|---|---|---|
| `submit_attempt(exercice, réponses, durée)` | Corrige (QCM, numérique avec tolérance, réponse libre non notée), enregistre, renvoie résultats et corrigé | comptes |
| `get_correction(exercice)` | Corrigé après au moins une tentative | comptes |
| `record_graded_attempt(…)` | Enregistre une tentative corrigée par le serveur | clé de service |
| `track_view`, `track_time`, `mark_completed`, `set_weekly_goal` | Progression | comptes |
| `my_stats()` | Statistiques personnelles agrégées | comptes |
| `search_content(q)` | Recherche plein texte (security invoker : respecte la RLS) | tous |
| `ai_begin`, `ai_end` | Quotas et compteurs du tuteur | comptes |
| `admin_stats`, `admin_list_users`, `admin_set_role`, `admin_set_status`, `log_admin_action` | Administration (permission vérifiée dans la fonction, dernier admin protégé, journalisé) | comptes autorisés |
| `export_my_data()` | Export RGPD | comptes |
| `consume_rate_limit`, `rate_limit_hit` | Limitation de débit | comptes / clé de service |
| `retention_cleanup()`, `inactive_accounts()` | Conservation | clé de service (planifié) |

Toutes les fonctions `security definer` fixent `search_path = ''` et qualifient les objets ; les droits d'exécution sont retirés à `anon` (et à `authenticated` pour les fonctions internes).

## Tests

`tests/integration/security.test.ts` exerce ces règles avec de vrais comptes et jetons à travers l'API : lecture des données d'autrui, élévation de rôle, rôle injecté à l'inscription, clés de correction, triche sur les notes, injection dans les réponses, brouillons, publication, signalements, export, quotas, dépôt et lecture de fichiers.
