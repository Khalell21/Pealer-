# Règles pour l'agent de code (Claude Code + ECC, Cline, OpenCode…)

Ce dépôt est un **moule** : chaque app est générée dans `./app` à partir de `PROMPT.md`.
Les règles ci-dessous sont **non négociables** ; en cas de conflit avec PROMPT.md, elles gagnent.

## Règle d'or
> Aucun secret dans le code client ; RLS sur chaque table ; appels tiers via Edge Functions uniquement.

## Interdits
- Mettre une clé secrète (service_role, `sb_secret_…`, clé `sk_` RevenueCat, Stripe…) dans `./app`
  ou dans une variable `EXPO_PUBLIC_*`. Côté client : URL Supabase + clé `anon`/publishable + clés publiques RevenueCat, c'est tout.
- Créer une table sans `enable row level security` + policies explicites
  (modèle : `supabase/migrations/00000000000000_rls_baseline.sql`).
- Déverrouiller du contenu payant uniquement sur la base de l'état client : l'entitlement
  RevenueCat est revérifié côté serveur (Edge Function → API RevenueCat ou table alimentée par webhook).
- Vendre du contenu numérique autrement qu'en In-App Purchase (RevenueCat).
- Initialiser un SDK d'analytics / tracking avant le consentement explicite.
- Logger des données personnelles en clair.
- Ajouter une dépendance non maintenue ou exotique sans le signaler ; `--no-verify` sur un commit.

## Obligatoires dans toute app générée
- Écran « Supprimer mon compte » qui appelle l'Edge Function `delete-account`.
- Écran de consentement (refuser aussi simple qu'accepter) avant tout tracking.
- Liens Politique de confidentialité + CGU accessibles depuis l'app.
- Vérification email + mot de passe robuste côté Supabase Auth.

## Avant de déclarer une tâche terminée
Vérifie la « Definition of Done » du README (§5) et lance :
```bash
gitleaks dir . --redact
semgrep scan --config p/default --config p/secrets --severity ERROR --error .
```

## Prompts système et IA
- Un prompt système est un secret serveur (secret de l'Edge Function), jamais dans `./app` ni dans git
  (`prompts/private/` est ignoré). Les appels au modèle passent uniquement par une Edge Function.
- Ne jamais logger le contenu des conversations ; l'app dit explicitement qu'on parle à une IA.
- Pour une app de soutien psychologique : la ressource de crise et le bouton d'urgence ne sont jamais derrière le paywall,
  et le filet déterministe `supabase/functions/_shared/crisis.ts` ne se retire pas.
