#!/bin/bash
# Tests de bout en bout contre la stack Supabase LOCALE (npx supabase start).
# La fonction chat doit tourner (supabase functions serve, ou scripts/dev-function.sh → CHAT_URL=http://127.0.0.1:8000).
# Usage : ./scripts/test-local.sh        Sortie : liste OK/ÉCHEC, code 1 si un test échoue.
set -u
cd "$(git rev-parse --show-toplevel)"
STATUS=$(npx supabase status -o json 2>/dev/null)
get() { echo "$STATUS" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
API=$(get API_URL); ANON=$(get ANON_KEY); MAILPIT=$(get MAILPIT_URL)
CHAT_URL=${CHAT_URL:-$API/functions/v1/chat}
FAIL=0
check() { if echo "$2" | grep -q -- "$3"; then echo "✅ $1"; else echo "❌ $1 → ${2:0:160}"; FAIL=1; fi; }
json_post() { curl -s -X POST "$1" -H "apikey: $ANON" -H 'Content-Type: application/json' "${@:3}" -d "$2"; }

EMAIL="test$RANDOM$RANDOM@example.com"; PASS="Motdepasse123"

check "mot de passe faible refusé" "$(json_post "$API/auth/v1/signup" "{\"email\":\"w$EMAIL\",\"password\":\"abc\"}")" weak_password
json_post "$API/auth/v1/signup" "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" >/dev/null
check "connexion refusée avant confirmation email" \
  "$(json_post "$API/auth/v1/token?grant_type=password" "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")" email_not_confirmed

sleep 2
MSG=$(curl -s "$MAILPIT/api/v1/search?query=to:$EMAIL" | python3 -c 'import sys,json;print(json.load(sys.stdin)["messages"][0]["ID"])')
LINK=$(curl -s "$MAILPIT/api/v1/message/$MSG" | python3 -c 'import sys,json,re,html;t=json.load(sys.stdin)["Text"];print(html.unescape(re.search(r"(http\S+verify\S+)",t).group(1)).rstrip(")"))')
curl -s -o /dev/null "$LINK"
TOKEN=$(json_post "$API/auth/v1/token?grant_type=password" "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
AUTH=(-H "Authorization: Bearer $TOKEN")
patch() { curl -s -X PATCH "$API/rest/v1/profiles?id=not.is.null" -H "apikey: $ANON" "${AUTH[@]}" -H 'Content-Type: application/json' -H 'Prefer: return=representation' -d "$1"; }

check "profil enregistré (BE, mineur)" "$(patch '{"country":"BE","is_minor":true,"onboarded_at":"now()"}')" '"is_minor":true'
check "un mineur ne peut pas redevenir majeur" "$(patch '{"is_minor":false}')" "cannot be reverted"
check "compteur non modifiable directement" "$(json_post "$API/rest/v1/usage_daily" '{"messages":0}' "${AUTH[@]}")" 42501
check "fenêtre de limite non lisible" "$(curl -s "$API/rest/v1/rate_windows" -H "apikey: $ANON" "${AUTH[@]}")" 42501
check "anonyme : aucun accès aux profils" "$(curl -s "$API/rest/v1/profiles" -H "apikey: $ANON")" 42501
check "chat sans connexion → 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$CHAT_URL" -H 'Content-Type: application/json' -d '{}')" 401

say() { json_post "$CHAT_URL" "{\"messages\":[{\"role\":\"user\",\"content\":\"$1\"}]}" "${AUTH[@]}"; }
check "message banal : réponse" "$(say 'Bonjour, journée difficile.')" '"reply"'
check "message à risque : drapeau crise" "$(say 'je suis un fardeau pour tout le monde')" '"crisis":true'
check "ressources belges + jeunesse" "$(say 'je suis un fardeau')" "0800 32 123.*116 111"

for i in 1 2 3 4 5 6 7 8; do say "message $i" >/dev/null; done
check "limite par minute → 429" "$(say 'encore un message')" rate_limited
check "la limite ne bloque JAMAIS une crise" "$(say 'je veux en finir')" '"crisis":true'

DEL_URL=${DELETE_ACCOUNT_URL:-$API/functions/v1/delete-account}
if [ "$(curl -s -X OPTIONS --max-time 3 "$DEL_URL")" = "ok" ]; then
  check "suppression du compte" "$(json_post "$DEL_URL" '{}' "${AUTH[@]}")" '"deleted":true'
  check "connexion impossible après suppression" \
    "$(json_post "$API/auth/v1/token?grant_type=password" "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")" invalid_credentials
else
  echo "⏭️  delete-account non lancé : test de suppression ignoré"
fi
exit $FAIL
