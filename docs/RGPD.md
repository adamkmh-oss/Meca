# RGPD — registre des traitements et procédures

À tenir par le responsable de traitement (l'établissement ou l'éditeur de la plateforme). Les champs entre crochets sont à compléter.

## Registre des traitements (article 30)

| | Comptes et apprentissage | Tuteur IA | Sécurité et journalisation |
|---|---|---|---|
| Responsable | [Nom, adresse, contact] | idem | idem |
| Finalité | Créer et gérer les comptes, suivre la progression, corriger les exercices | Répondre aux questions pédagogiques | Prévenir les abus, tracer les opérations sensibles |
| Base légale | Exécution du service (6.1.b) | Exécution du service (6.1.b) | Intérêt légitime (6.1.f) |
| Personnes | Étudiants, enseignants, administrateurs | Utilisateurs du tuteur | Tous les comptes |
| Données | E-mail, pseudonyme, année d'étude, mot de passe haché, facteur MFA, tentatives, réponses, scores, progression, temps d'étude, favoris, signalements | Texte des questions, mode, page, niveau et maîtrise (sans identité) ; compteurs d'usage | Journal d'audit (auteur, action, cible), compteurs de débit (IP et e-mail hachés) |
| Destinataires | Équipe pédagogique (statistiques agrégées), administrateurs (liste des comptes) | Anthropic (sous-traitant) | Administrateurs |
| Sous-traitants | Supabase (UE), Vercel, prestataire SMTP | Anthropic (États-Unis) | Supabase, Sentry (si activé) |
| Transferts hors UE | Vercel, SMTP selon prestataire : clauses contractuelles types | Clauses contractuelles types (DPA Anthropic) | Sentry : région UE disponible |
| Conservation | Jusqu'à suppression du compte ; 3 ans d'inactivité | Contenu non conservé côté plateforme ; compteurs 12 mois | Audit 1 an ; compteurs 48 h |
| Sécurité | Voir `docs/SECURITE.md` | idem | idem |

## Durées de conservation (appliquées)

| Données | Durée | Mécanisme |
|---|---|---|
| Compte et apprentissage | Jusqu'à suppression | Suppression immédiate et en cascade depuis « Mon compte » |
| Comptes étudiants inactifs | 3 ans | `select * from public.inactive_accounts(3);` chaque mois, e-mail d'avertissement, suppression 30 jours après sans reconnexion |
| Usage du tuteur | 12 mois | `retention_cleanup()` (quotidien) |
| Notifications | 6 mois après lecture, 12 mois au plus | idem |
| Signalements traités | 2 ans | idem |
| Journal d'audit | 1 an | idem |
| Compteurs anti-abus | 48 h | idem |
| Sauvegardes | Cycle du fournisseur (7 à 30 jours) | Rotation automatique |

## Exercice des droits

| Droit | Mise en œuvre |
|---|---|
| Accès, portabilité | « Mon compte » > Télécharger mes données (JSON complet) |
| Rectification | « Mon compte » > Profil, adresse e-mail |
| Effacement | « Mon compte » > Supprimer mon compte (immédiat) ; sur demande écrite : `/admin/utilisateurs` > Supprimer |
| Limitation, opposition | Sur demande : suspension du compte par un administrateur |
| Réclamation | CNIL |

Délai de réponse : un mois. Tracer chaque demande traitée manuellement (date, droit, réponse).

## Cookies

Uniquement des cookies strictement nécessaires (session Supabase) et du stockage local de confort (thème, progression hors connexion) : exemptés de consentement. Tout ajout d'outil de mesure d'audience ou de service tiers impose un bandeau de consentement préalable.

## Violation de données

1. Contenir (révoquer les clés, suspendre les comptes concernés, couper l'accès).
2. Évaluer (données, personnes, risque) à l'aide du journal d'audit et des journaux Supabase / Vercel.
3. Notifier la CNIL sous 72 h si risque ; informer les personnes si risque élevé.
4. Documenter dans le registre des violations.

## Mineurs

Des étudiants de BUT peuvent avoir moins de 18 ans mais plus de 15 ans (âge du consentement numérique en France) : aucune autorisation parentale n'est requise pour ce service.
