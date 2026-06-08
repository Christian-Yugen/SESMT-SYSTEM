#!/usr/bin/env bash
set -euo pipefail

# Atualiza o e-mail do administrador (Supabase Auth Admin API) com backup e auditoria.
# Requisitos de ambiente: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# Uso (ex):
#   export DATABASE_URL="postgres://user:pass@host:5432/dbname"
#   export SUPABASE_URL="https://<project>.supabase.co"
#   export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
#   export ACTOR_UID="<seu-uid>" # opcional, para auditoria
#   ./scripts/update_admin_email.sh

USER_ID="fc449ef5-79e9-4826-96dd-5cb87c567377"
OLD_EMAIL="jose.lima@treslagoas.ms.gov.br"
NEW_EMAIL="jcristianolima@yahoo.com.br"
BACKUP_DIR="$(pwd)/scripts/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL environment variable is not set" >&2
  exit 1
fi
if [[ -z "${SUPABASE_URL:-}" ]]; then
  echo "ERROR: SUPABASE_URL environment variable is not set" >&2
  exit 1
fi
if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set" >&2
  exit 1
fi

echo "[1/8] Criando backups em: $BACKUP_DIR"
psql "$DATABASE_URL" -c "\copy (SELECT * FROM auth.users WHERE id='${USER_ID}') TO '${BACKUP_DIR}/auth_user_${USER_ID}.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy (SELECT * FROM public.profiles WHERE id='${USER_ID}') TO '${BACKUP_DIR}/profile_${USER_ID}.csv' CSV HEADER" || true
psql "$DATABASE_URL" -c "\copy (SELECT * FROM auth.identities WHERE user_id='${USER_ID}') TO '${BACKUP_DIR}/identities_${USER_ID}.csv' CSV HEADER" || true

echo "[2/8] Obtendo dump JSON do usuário via Admin API"
curl -sS -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" > "$BACKUP_DIR/auth_user_${USER_ID}.json"

echo "Backups gerados"
echo "Arquivo JSON (Admin API): $BACKUP_DIR/auth_user_${USER_ID}.json"

read -r -p "Confirmar atualização do e-mail '${OLD_EMAIL}' -> '${NEW_EMAIL}' para o usuário ${USER_ID}? Digite YES para prosseguir: " CONFIRM
if [[ "$CONFIRM" != "YES" ]]; then
  echo "Abortado pelo usuário."; exit 1
fi

echo "[3/8] Atualizando e-mail via Admin API..."
resp_file="${BACKUP_DIR}/adminapi_response_${USER_ID}.json"
http_code=$(curl -s -o "$resp_file" -w "%{http_code}" -X PUT "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$NEW_EMAIL\",\"email_confirm\":true}")

if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
  echo "ERRO: Admin API retornou HTTP $http_code" >&2
  cat "$resp_file" >&2
  echo "Verifique o arquivo de backup em $BACKUP_DIR e execute rollback se necessário." >&2
  exit 1
fi

echo "[4/8] Atualizando public.profiles..."
psql "$DATABASE_URL" -c "UPDATE public.profiles SET email = '$NEW_EMAIL' WHERE id = '$USER_ID'"

echo "[5/8] Registrando auditoria (admin_audit.user_changes)..."
psql "$DATABASE_URL" -c "CREATE SCHEMA IF NOT EXISTS admin_audit; CREATE TABLE IF NOT EXISTS admin_audit.user_changes (id BIGSERIAL PRIMARY KEY, actor_id UUID, target_user_id UUID, change_type TEXT, details JSONB, created_at TIMESTAMPTZ DEFAULT NOW());"
ACTOR_UID="${ACTOR_UID:-unknown}"
psql "$DATABASE_URL" -c "INSERT INTO admin_audit.user_changes (actor_id, target_user_id, change_type, details) VALUES ('$ACTOR_UID', '$USER_ID', 'email_update', jsonb_build_object('old', '$OLD_EMAIL', 'new', '$NEW_EMAIL'))"

echo "[6/8] Verificando resultado final..."
psql "$DATABASE_URL" -c "SELECT id, email, email_confirm FROM auth.users WHERE id='$USER_ID'"
psql "$DATABASE_URL" -c "SELECT id, email FROM public.profiles WHERE id='$USER_ID'"

echo "[7/8] Recomendações pós-alteração: peça ao administrador usar 'Esqueci a senha' para registrar senha segura no novo e-mail ou setar senha temporária via Admin API se necessário."
echo "[8/8] Operação concluída. Backups: $BACKUP_DIR"
echo "Caso precise reverter, execute scripts/rollback_admin_email.sh (forneça SUPABASE env vars)."

exit 0
