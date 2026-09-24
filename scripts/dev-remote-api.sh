#!/usr/bin/env bash
# Levanta SOLO la Web (Vite) contra la API YA desplegada.
# No toca ni arranca PragmaCRM-Api.
#
# Uso:
#   1. cp .env.remote.example .env.remote.local
#   2. Completá VITE_API_URL (URL de la API desplegada, sin / final),
#      VITE_API_KEY y Supabase del MISMO entorno desplegado.
#   3. npm run dev:remote
#
# Env var que controla la URL de la API: VITE_API_URL
# (mode=remote → Vite carga .env.remote y .env.remote.local)

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.remote.local && ! -f .env.remote ]]; then
  echo "Falta .env.remote.local (o .env.remote)."
  echo "Copiá: cp .env.remote.example .env.remote.local y completá VITE_API_URL."
  exit 1
fi

api_url=""
for f in .env.remote .env.remote.local; do
  [[ -f "$f" ]] || continue
  line="$(grep -E '^[[:space:]]*VITE_API_URL=' "$f" | tail -1 || true)"
  [[ -n "$line" ]] || continue
  api_url="${line#VITE_API_URL=}"
  api_url="${api_url%%#*}"
  api_url="$(printf '%s' "$api_url" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'\'']//' -e 's/["'\'']$//')"
done

if [[ -z "$api_url" || "$api_url" == https://api.\<dominio\> || "$api_url" == *"dominio"* ]]; then
  echo "VITE_API_URL vacío o placeholder. Poné la URL real de la API desplegada en .env.remote.local."
  exit 1
fi

case "$api_url" in
  *localhost*|*127.0.0.1*)
    echo "VITE_API_URL parece local ($api_url). Este script es para API desplegada."
    exit 1
    ;;
esac

echo "Web local → API $api_url (vite --mode remote). Api local NO se levanta."
exec npx vite --mode remote
