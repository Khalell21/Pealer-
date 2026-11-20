# PROMPT — app « PsyGPT » (soutien psychologique par IA)

> Demande à l'agent : « Génère l'app décrite dans PROMPT.md dans ./app en respectant CLAUDE.md ».

## Base de prompt
Le prompt système **PSAI GPT V3** est propriétaire : il vit dans `prompts/private/psai-gpt-v3.md`
(ignoré par git, dépôt public) et est déployé comme secret serveur `PSAI_SYSTEM_PROMPT`.
**L'app ne contient jamais le prompt** : elle appelle l'Edge Function `chat`.

## L'app
- **Nom** : PsyGPT (nom de travail, choix du porteur de projet).
- **Public cible** : adultes ET mineurs cherchant une écoute (anxiété, couple, deuil, burn-out, isolement…).
  Mineur déclaré → module adolescents permanent (verrouillé en base) + ligne jeunesse du pays.
- **Problème résolu** : un espace d'écoute disponible à tout moment, qui oriente vers l'humain et les pros.
- **Écrans** :
  1. Onboarding : « Tu parles à une IA, pas à un professionnel » + pays + âge déclaré + consentement explicite au traitement de données de santé.
  2. Chat (appel `functions/v1/chat`). Si la réponse a `crisis: true` → bandeau fixe avec la ressource et bouton d'appel.
  3. Bouton « Aide urgente » toujours visible (numéro selon le pays, 112 sinon).
  4. Réglages : pays, effacer l'historique local, supprimer mon compte, confidentialité, CGU.
  5. Paywall (RevenueCat).
- **Données** :
  - Historique de conversation **uniquement sur l'appareil** (stockage chiffré : expo-secure-store / SQLite chiffré). Le serveur est sans état.
  - Côté Supabase : profil minimal + compteur de jours d'usage (sans contenu) pour le garde-fou dépendance.
- **Monétisation** : abonnement IAP via RevenueCat ; quota gratuit vérifié **côté serveur** dans `chat`.
  Le bouton « Aide urgente » et le protocole de crise ne sont **jamais** derrière le paywall.
- **Analytics** : aucun en v1.
- **Langues** : FR d'abord ; le prompt gère le multilingue.

## Hors périmètre
- Diagnostic, traitement, posologie, protocole de sevrage.
- Stockage serveur des conversations, entraînement sur les conversations.
- Notifications « reviens me parler » (renforcent la dépendance).

## Décisions
- [x] Mineurs acceptés (module adolescents du prompt).
- [ ] Moins de 15 ans en France : consentement parental requis (RGPD + loi française) — parcours à ajouter, ou âge minimum 15 ans.
- [ ] Prix / quota gratuit : à fixer après mesure du coût réel (`FREE_MESSAGES_PER_DAY`, 0 = illimité).
- [ ] Vérifier chaque numéro de `supabase/functions/_shared/crisis.ts` avant lancement.
