#!/bin/sh
# Lance une Edge Function directement avec Deno (hors conteneur), contre la stack Supabase LOCALE.
# Utile quand le conteneur edge-runtime n'a pas accès au réseau.
#   ./scripts/dev-function.sh                 → chat sur http://127.0.0.1:8000
#   DENO_SERVE_ADDRESS=tcp:127.0.0.1:8001 ./scripts/dev-function.sh delete-account
set -e
cd "$(git rev-parse --show-toplevel)"
STATUS=$(npx supabase status -o json)
get() { echo "$STATUS" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
export SUPABASE_URL="$(get API_URL)"
export SUPABASE_ANON_KEY="$(get ANON_KEY)"
# Clé service_role de la stack LOCALE (clé de démo), injectée comme le fait le runtime Supabase.
export SUPABASE_SERVICE_ROLE_KEY="$(get SERVICE_ROLE_KEY)"
FN=${1:-chat}
cd supabase/functions
exec deno run --allow-net --allow-env --allow-read --env-file=.env "$FN/index.ts"
