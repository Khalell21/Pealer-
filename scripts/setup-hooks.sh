#!/bin/sh
# Active les hooks versionnés du dépôt (.githooks) — à lancer une fois après chaque clone.
set -e
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/*
echo "✅ Hooks actifs (core.hooksPath=.githooks)"
