# PROMPT — app « PSAI » (soutien psychologique par IA)

> Demande à l'agent : « Génère l'app décrite dans PROMPT.md dans ./app en respectant CLAUDE.md ».

## Base de prompt
Le prompt système **PSAI GPT V3** est propriétaire : il vit dans `prompts/private/psai-gpt-v3.md`
(ignoré par git, dépôt public) et est déployé comme secret serveur `PSAI_SYSTEM_PROMPT`.
**L'app ne contient jamais le prompt** : elle appelle l'Edge Function `chat`.

## L'app
- **Nom** : à choisir — éviter « GPT » (marque d'OpenAI, et l'app tourne sur Claude).
- **Public cible** : adultes cherchant une écoute (anxiété, couple, deuil, burn-out, isolement…).
  Mineurs : décision ouverte (voir « Décisions à prendre »).
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

## Décisions à prendre
- [ ] Mineurs autorisés ? (sinon : âge minimum 18 ans et blocage à l'onboarding)
- [ ] Prix / quota gratuit.
- [ ] Nom définitif.
