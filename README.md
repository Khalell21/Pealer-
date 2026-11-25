# Pealer- — Starter Kit app mobile (iOS + Android) « prompt → store », sécurisée & conforme

> **Prompt Dealer** : un socle minimal et durci que tu clones une fois, et qui sert de **moule** pour générer tes futures apps à partir d'un prompt.
> Stack : **Claude Code + ECC** (ou Cline/OpenCode + Ollama) → **Expo / React Native** → **Supabase (région EU)** → **RevenueCat** → **Gitleaks + Semgrep**.

## Ce que contient le dépôt

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Règles non négociables lues par l'agent (sécurité / RGPD / monétisation) |
| `PROMPT.md` | Modèle à remplir : ta base de prompt + description de l'app |
| `.gitignore`, `.env.example` | Aucun secret ne part sur GitHub ; seules les clés publiques côté client |
| `.githooks/pre-commit` + `scripts/setup-hooks.sh` | Gitleaks bloque le commit **avant** qu'il existe (hook versionné) |
| `.gitleaks.toml` | Règles par défaut + détection `service_role` / `sb_secret_` / RevenueCat `sk_` |
| `.github/workflows/security.yml` | CI : gitleaks (historique complet) + Semgrep + `npm audit` |
| `supabase/migrations/…_rls_baseline.sql` | Modèle de table avec RLS + policies « propriétaire uniquement » |
| `supabase/functions/delete-account/` | Edge Function de suppression de compte (stockage + RevenueCat + auth) |
| `supabase/functions/chat/` | Edge Function de conversation : appelle Claude avec le prompt système gardé côté serveur |
| `supabase/functions/_shared/crisis.ts` | Filet de crise déterministe (détection + numéros par pays), indépendant du modèle |
| `prompts/private/` | Prompts propriétaires — **ignoré par git** (le dépôt est public) |

---

## 0. Pré-requis

```bash
node -v             # v20.x ou plus (requis par Expo)
git --version
python3 --version   # pour Semgrep
docker --version    # pour Supabase en local
```

## 1. La toolchain — installer, VALIDER

### 1.1 — Agent de code
**Environnement principal : Claude Code + plugin ECC** — déjà activé dans `.claude/settings.json` (marketplace `affaan-m/ECC`, version épinglée `v2.2.3`). Claude Code lit automatiquement `CLAUDE.md`.

Alternatives :
```bash
code --install-extension saoudrizwan.claude-dev     # Cline (VS Code) — github.com/cline/cline
# OpenCode (CLI) — github.com/sst/opencode : suis la commande d'install du README du repo (elle évolue).
```
Pour Cline/OpenCode, passe `CLAUDE.md` comme instructions système / règles de projet.

### 1.2 — LLM local (optionnel, zéro coût) : Ollama
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5-coder:7b
ollama list          # validation
```
> ⚠️ Un modèle 7B local respecte nettement moins bien les contraintes de sécurité qu'un modèle frontière : relis chaque diff.

### 1.3 — Expo / React Native + EAS
```bash
npx create-expo-app@latest app       # crée le squelette dans ./app (template par défaut)
npm i -g eas-cli
cd app && npx expo-doctor && eas --version   # validation
```

### 1.4 — Supabase CLI (⚠️ région EU)
> `npm i -g supabase` **n'est pas supporté** par Supabase. Utilise une dépendance projet ou Homebrew.
```bash
npm i -D supabase            # ou : brew install supabase/tap/supabase
npx supabase init            # crée supabase/config.toml (migrations & functions déjà fournies)
npx supabase start           # stack locale (Docker)
npx supabase status          # validation : services RUNNING
```
🇪🇺 Projet **hébergé** : crée-le sur supabase.com en région **EU (Frankfurt / Paris)** — la région n'est **pas modifiable** ensuite.

### 1.5 — RevenueCat
```bash
cd app && npx expo install react-native-purchases
npx expo-doctor
```
> `react-native-purchases` contient du code natif : il ne tourne pas dans Expo Go → utilise un **development build** (`eas build --profile development`).

### 1.6 — Gitleaks + Semgrep
```bash
brew install gitleaks                   # ou binaire : github.com/gitleaks/gitleaks/releases
python3 -m pip install semgrep
gitleaks version && semgrep --version

# Validation :
gitleaks dir . --redact -v                                               # 0 leak
semgrep scan --config p/default --config p/secrets --severity ERROR --error .
```
> Depuis gitleaks 8.19, `detect`/`protect` sont dépréciés → `gitleaks dir` / `gitleaks git`.

---

## 2. Activer les garde-fous (une fois par clone)

```bash
./scripts/setup-hooks.sh       # git config core.hooksPath .githooks
```
Le hook vit dans `.githooks/` (versionné) — contrairement à `.git/hooks/`, il suit le dépôt.

**Validation** — un faux secret doit être **refusé** :
```bash
echo "token = \"ghp_$(head -c 64 /dev/urandom | base64 | tr -dc A-Za-z0-9 | head -c 36)\"" > leak.txt
git add leak.txt && git commit -m test     # → ❌ Secret détecté — commit bloqué
git rm --cached leak.txt && rm leak.txt
```
> N'utilise pas les clés d'exemple officielles (`…EXAMPLEKEY`) : gitleaks les ignore volontairement, le test passerait à tort.

La CI (`.github/workflows/security.yml`) refait gitleaks sur **tout l'historique**, Semgrep et `npm audit` à chaque push.

---

## 3. 🔴 RED TEAM — trous et parades

| # | Trou | Conséquence | Parade (et où elle vit dans le dépôt) |
|---|---|---|---|
| 1 | Clé secrète dans le bundle (`EXPO_PUBLIC_…`, service_role) | App décompilée → clé extraite | Seules URL + clé `anon`/publishable côté client (`.env.example`). Hook qui refuse `EXPO_PUBLIC_*SECRET/SERVICE_ROLE*`. Règle gitleaks `service_role`. |
| 2 | RLS désactivé | Clé `anon` = accès total à la base | `enable` + `force row level security` + policies (`rls_baseline.sql`). Requête de contrôle fournie. |
| 3 | Premium déverrouillé côté client | Paiement contourné | Entitlement revérifié côté serveur (Edge Function → API RevenueCat, ou webhooks RevenueCat → table). |
| 4 | Paiement hors IAP pour du numérique | Rejet / bannissement store | IAP via RevenueCat ; Stripe réservé au web / biens physiques. |
| 5 | Pas de suppression de compte | Rejet Apple (5.1.1(v)) + RGPD art. 17 | `supabase/functions/delete-account` : stockage + RevenueCat + `auth.admin.deleteUser` (cascade). |
| 6 | Analytics avant consentement | Collecte illégale | Aucun SDK initialisé avant consentement ; refus aussi simple que l'accord (`CLAUDE.md`). |
| 7 | Sous-traitants non couverts | Non-conformité RGPD | DPA Supabase + RevenueCat, listés dans la politique de confidentialité, hébergement EU. |
| 8 | Supply chain npm | Code malveillant | `npm audit` + Semgrep en CI, `npm ci --ignore-scripts`, lockfile commité. |
| 9 | Agent IA non bridé | Secret committé, commande arbitraire | `CLAUDE.md`, hook gitleaks, interdiction de `--no-verify`, relecture des diffs. |
| 10 | TVA ignorée | Risque fiscal | Via IAP : les stores collectent la TVA. Via Stripe : à toi (guichet unique OSS UE). |
| 11 | Auth faible | Faux comptes, credential stuffing | Vérif email, rate-limit Auth Supabase, mots de passe robustes / leaked-password protection. |
| 12 | Pas de rotation après fuite | Clé fuitée toujours valide | **Révoquer + régénérer**, pas seulement réécrire l'historique. |

## 4. ✅ RGPD — checklist

- [ ] Projet Supabase en **région EU**
- [ ] **Consentement** avant toute collecte / tracking
- [ ] **Politique de confidentialité + CGU** liées dans l'app
- [ ] **Suppression de compte** in-app qui purge vraiment (Edge Function déployée + testée)
- [ ] **Minimisation** ; aucun log de donnée perso en clair
- [ ] **DPA** signés (Supabase, RevenueCat) ; sous-traitants listés
- [ ] **Data Safety (Play)** et **Privacy Nutrition Labels (App Store)** remplis honnêtement

> ⚖️ Ceci n'est pas un avis juridique : fais relire tes mentions par un professionnel avant de monétiser.

## 5. ✅ Definition of Done — avant le 1er `eas build`

1. [ ] `npx expo-doctor` → OK
2. [ ] `npx supabase status` → RUNNING
3. [ ] RLS activé **et testé** sur toutes les tables (requête de contrôle → 0 ligne ; un user ne lit que ses lignes)
4. [ ] `gitleaks dir . --redact` → 0 leak
5. [ ] `semgrep scan … --severity ERROR --error .` → 0 finding
6. [ ] Hook pré-commit testé (faux secret → refusé)
7. [ ] Écran consentement + suppression de compte présents
8. [ ] `.env` ignoré (`git check-ignore .env` → `.env`)

## 6. 🔑 Secrets de l'Edge Function `chat`

```bash
# Clé API Anthropic : via un fichier (jamais en clair dans l'historique du shell)
echo "ANTHROPIC_API_KEY=..." > supabase/functions/.env     # ignoré par git
npx supabase secrets set --env-file supabase/functions/.env
# Prompt système propriétaire
npx supabase secrets set PSAI_SYSTEM_PROMPT_B64="$(base64 -w0 prompts/private/psai-gpt-v3.md)"
npx supabase functions deploy chat
```
> Les appels à l'API Claude partent hors UE : DPA Anthropic + clauses contractuelles types, à mentionner dans la politique de confidentialité.

## 7. 🧪 Lancer PsyGPT en local

```bash
npm install && (cd app && npm install)
npx supabase start                         # Docker requis ; applique les migrations
printf 'PSAI_SYSTEM_PROMPT_B64=%s\nFREE_MESSAGES_PER_DAY=0\nANTHROPIC_API_KEY=%s\n' \
  "$(base64 -w0 prompts/private/psai-gpt-v3.md)" "ta-cle" > supabase/functions/.env   # ignoré par git
npx supabase functions serve --env-file supabase/functions/.env   # fonctions dans Docker
cp app/.env.example app/.env               # puis colle ANON_KEY (npx supabase status) ; vide CHAT_URL/DELETE_ACCOUNT_URL
cd app && npx expo start                   # i = iOS, a = Android, w = navigateur
```
- Emails de confirmation : Mailpit sur http://127.0.0.1:54324 · base : Studio sur http://127.0.0.1:54323
- Si le conteneur des fonctions n'a pas de réseau : `./scripts/dev-function.sh` (chat sur :8000) et
  `DENO_SERVE_ADDRESS=tcp:127.0.0.1:8001 ./scripts/dev-function.sh delete-account`, avec les URL de `app/.env.example`.
- Sans `ANTHROPIC_API_KEY`, l'app marche en mode dégradé : message sûr + numéros d'aide du pays.
- Après modification de `supabase/functions/_shared/crisis.ts` : `./scripts/sync-crisis.sh`.
- Tests de bout en bout (auth, RLS, crise, limites, suppression) : `./scripts/test-local.sh`
- Conversations types (sécurité des réponses de l'IA) : `./scripts/eval.sh` → rapport dans `evals/results/`.
  À relancer après **chaque** modification du prompt. Sans clé API, seul le filet de crise est testé.

## 8. ➡️ Générer une app

1. Remplis **`PROMPT.md`**.
2. Dans Claude Code : *« Génère l'app décrite dans PROMPT.md dans ./app en respectant CLAUDE.md. »*
3. Relis le diff, coche la Definition of Done, puis `eas build`.

> Règle d'or : _« Aucun secret dans le code client ; RLS sur chaque table ; appels tiers via Edge Functions uniquement. »_
