#!/usr/bin/env bash
set -euo pipefail

# Restaura o e-mail do administrador para o valor antigo.
# Exige: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL

USER_ID="fc449ef5-79e9-4826-96dd-5cb87c567377"
OLD_EMAIL="jose.lima@treslagoas.ms.gov.br"

if [[ -z "${SUPABASE_URL:-}" ]]; then echo "ERROR: SUPABASE_URL not set" >&2; exit 1; fi
if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then echo "ERROR: SUPABASE_SERVICE_ROLE_KEY not set" >&2; exit 1; fi
if [[ -z "${DATABASE_URL:-}" ]]; then echo "ERROR: DATABASE_URL not set" >&2; exit 1; fi

read -r -p "Confirm rollback: restaurar e-mail para '${OLD_EMAIL}' no usuário ${USER_ID}? Digite YES para prosseguir: " CONFIRM
if [[ "$CONFIRM" != "YES" ]]; then echo "Abortado."; exit 1; fi

resp_file="$(mktemp)"
http_code=$(curl -s -o "$resp_file" -w "%{http_code}" -X PUT "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$OLD_EMAIL\",\"email_confirm\":true}")

if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
  echo "ERRO: Admin API retornou HTTP $http_code" >&2
  cat "$resp_file" >&2
  exit 1
fi

psql "$DATABASE_URL" -c "UPDATE public.profiles SET email = '$OLD_EMAIL' WHERE id = '$USER_ID'"

echo "Rollback concluído. Verifique auth.users e public.profiles para confirmar." 

exit 0
