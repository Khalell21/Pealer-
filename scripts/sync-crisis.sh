#!/bin/sh
# Copie la table de crise serveur dans l'app (bouton « Aide urgente » utilisable hors ligne).
# --check : échoue si la copie n'est pas à jour (utilisé en CI).
set -e
cd "$(git rev-parse --show-toplevel)"
SRC=supabase/functions/_shared/crisis.ts
DST=app/src/crisis.ts
TMP=$(mktemp)
{ echo "// ⚠️ FICHIER GÉNÉRÉ par scripts/sync-crisis.sh depuis $SRC — ne pas modifier ici."; cat "$SRC"; } > "$TMP"
if [ "${1:-}" = "--check" ]; then
  cmp -s "$TMP" "$DST" || { echo "❌ $DST n'est pas à jour : lance scripts/sync-crisis.sh"; rm -f "$TMP"; exit 1; }
  rm -f "$TMP"; echo "✅ table de crise synchronisée"
else
  mkdir -p app/src && mv "$TMP" "$DST" && echo "✅ $DST mis à jour"
fi
