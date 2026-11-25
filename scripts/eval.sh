#!/bin/sh
# Lance les conversations types (evals/scenarios.json) contre la stack locale.
#   ./scripts/eval.sh                  → tous les scénarios
#   ./scripts/eval.sh crise-belgique   → un seul
# CHAT_URL=http://127.0.0.1:8000 si la fonction tourne via scripts/dev-function.sh
set -e
cd "$(git rev-parse --show-toplevel)"
STATUS=$(npx supabase status -o json)
get() { echo "$STATUS" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
export SUPABASE_URL="$(get API_URL)" SUPABASE_ANON_KEY="$(get ANON_KEY)" SUPABASE_SERVICE_ROLE_KEY="$(get SERVICE_ROLE_KEY)"
cd evals && exec deno run --allow-net --allow-env --allow-read --allow-write=results run.ts "$@"
