#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEFAULT_POLICY_FILE="${REPO_ROOT}/ops/ops_backup_policy.json"
OPS_BACKUP_POLICY_FILE="${OPS_BACKUP_POLICY_FILE:-${DEFAULT_POLICY_FILE}}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-${REPO_ROOT}/artifacts}"
BACKUP_ID_INPUT="${BACKUP_ID:-LATEST}"

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

require_cmd() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || fail "Required command not found: ${cmd}"
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    fail "Missing required environment variable: ${name}"
  fi
}

resolve_path() {
  local path_value="$1"
  if [[ "${path_value}" = /* ]]; then
    printf '%s\n' "${path_value}"
  else
    printf '%s\n' "${REPO_ROOT}/${path_value}"
  fi
}

WORK_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

require_cmd jq
require_cmd aws
require_cmd psql
require_cmd pg_restore
require_cmd tar
require_cmd sha256sum

require_env TARGET_DIRECT_URL
require_env R2_ACCOUNT_ID
require_env R2_BUCKET
require_env R2_ACCESS_KEY_ID
require_env R2_SECRET_ACCESS_KEY

POLICY_PATH="$(resolve_path "${OPS_BACKUP_POLICY_FILE}")"
[[ -f "${POLICY_PATH}" ]] || fail "Policy file not found: ${POLICY_PATH}"

ARTIFACT_PREFIX="$(jq -r '.artifact_prefix // empty' "${POLICY_PATH}")"
[[ -n "${ARTIFACT_PREFIX}" ]] || fail "artifact_prefix is empty in policy file ${POLICY_PATH}"

export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="${R2_REGION:-auto}"
R2_ENDPOINT="${R2_ENDPOINT:-https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com}"

RUN_TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
STARTED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STARTED_EPOCH="$(date -u +%s)"
mkdir -p "${ARTIFACTS_DIR}"

if [[ "${BACKUP_ID_INPUT}" == "LATEST" ]]; then
  log "Resolving latest backup manifest in R2"
  LIST_JSON="$(aws s3api list-objects-v2 \
    --bucket "${R2_BUCKET}" \
    --prefix "${ARTIFACT_PREFIX%/}/manifests/" \
    --endpoint-url "${R2_ENDPOINT}" \
    --output json)"
  MANIFEST_OBJECT_KEY="$(printf '%s' "${LIST_JSON}" | jq -r '.Contents // [] | sort_by(.LastModified) | last | .Key // empty')"
  [[ -n "${MANIFEST_OBJECT_KEY}" ]] || fail "No manifest found under prefix ${ARTIFACT_PREFIX%/}/manifests/"
else
  MANIFEST_OBJECT_KEY="${ARTIFACT_PREFIX%/}/manifests/backup-manifest-${BACKUP_ID_INPUT}.json"
fi

MANIFEST_LOCAL="${WORK_DIR}/manifest.json"
log "Downloading manifest: ${MANIFEST_OBJECT_KEY}"
aws s3 cp "s3://${R2_BUCKET}/${MANIFEST_OBJECT_KEY}" "${MANIFEST_LOCAL}" \
  --endpoint-url "${R2_ENDPOINT}" \
  --only-show-errors

BACKUP_ID="$(jq -r '.backup_id // empty' "${MANIFEST_LOCAL}")"
[[ -n "${BACKUP_ID}" ]] || fail "Manifest missing backup_id"

BACKUP_OBJECT_KEY="$(jq -r '.storage.backup_object_key // empty' "${MANIFEST_LOCAL}")"
[[ -n "${BACKUP_OBJECT_KEY}" ]] || fail "Manifest missing storage.backup_object_key"

MANIFEST_SHA256="$(jq -r '.storage.payload_sha256 // empty' "${MANIFEST_LOCAL}")"
ENCRYPTED="$(jq -r '.storage.encrypted // false' "${MANIFEST_LOCAL}")"

PAYLOAD_LOCAL="${WORK_DIR}/payload.bin"
log "Downloading backup payload: ${BACKUP_OBJECT_KEY}"
aws s3 cp "s3://${R2_BUCKET}/${BACKUP_OBJECT_KEY}" "${PAYLOAD_LOCAL}" \
  --endpoint-url "${R2_ENDPOINT}" \
  --only-show-errors

if [[ -n "${MANIFEST_SHA256}" ]]; then
  DOWNLOADED_SHA256="$(sha256sum "${PAYLOAD_LOCAL}" | awk '{print $1}')"
  [[ "${DOWNLOADED_SHA256}" == "${MANIFEST_SHA256}" ]] || fail "Payload checksum mismatch"
fi

ARCHIVE_PATH="${PAYLOAD_LOCAL}"
if [[ "${ENCRYPTED}" == "true" ]]; then
  require_cmd openssl
  require_env BACKUP_ENCRYPTION_PASSPHRASE
  log "Decrypting payload"
  ARCHIVE_PATH="${WORK_DIR}/payload.tar.gz"
  openssl enc -d -aes-256-cbc -pbkdf2 \
    -in "${PAYLOAD_LOCAL}" \
    -out "${ARCHIVE_PATH}" \
    -pass env:BACKUP_ENCRYPTION_PASSPHRASE
fi

EXTRACT_DIR="${WORK_DIR}/extracted"
mkdir -p "${EXTRACT_DIR}"
tar -xzf "${ARCHIVE_PATH}" -C "${EXTRACT_DIR}"

DUMP_FILE="${EXTRACT_DIR}/database.dump"
GLOBALS_FILE="${EXTRACT_DIR}/globals.sql"
[[ -f "${DUMP_FILE}" ]] || fail "database.dump not found in backup payload"

if [[ "${ALLOW_GLOBALS_RESTORE:-0}" == "1" ]] && [[ -f "${GLOBALS_FILE}" ]]; then
  log "Applying globals.sql before restore (ALLOW_GLOBALS_RESTORE=1)"
  if ! psql "${TARGET_DIRECT_URL}" -v ON_ERROR_STOP=1 -f "${GLOBALS_FILE}"; then
    log "WARN: Failed to apply globals.sql; continuing with database restore"
  fi
fi

log "Restoring backup ${BACKUP_ID} into target database"
PGAPPNAME="simulation-restore-pg-restore" \
  pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname "${TARGET_DIRECT_URL}" \
  "${DUMP_FILE}"

org_count="$(psql "${TARGET_DIRECT_URL}" -Atqc 'SELECT COUNT(*) FROM "Organization";' 2>/dev/null || true)"
event_count="$(psql "${TARGET_DIRECT_URL}" -Atqc 'SELECT COUNT(*) FROM "Event";' 2>/dev/null || true)"
workflow_count="$(psql "${TARGET_DIRECT_URL}" -Atqc 'SELECT COUNT(*) FROM "Workflow";' 2>/dev/null || true)"
user_count="$(psql "${TARGET_DIRECT_URL}" -Atqc 'SELECT COUNT(*) FROM "User";' 2>/dev/null || true)"

FINISHED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
FINISHED_EPOCH="$(date -u +%s)"
DURATION_SECONDS="$((FINISHED_EPOCH - STARTED_EPOCH))"

RESTORE_RESULT_FILE="${RESTORE_OUTPUT_PATH:-${ARTIFACTS_DIR}/restore-result-${RUN_TIMESTAMP}.json}"
RESTORE_RESULT_FILE="$(resolve_path "${RESTORE_RESULT_FILE}")"
mkdir -p "$(dirname "${RESTORE_RESULT_FILE}")"

jq -n \
  --arg status "success" \
  --arg backup_id "${BACKUP_ID}" \
  --arg backup_id_input "${BACKUP_ID_INPUT}" \
  --arg started_at_utc "${STARTED_AT_UTC}" \
  --arg finished_at_utc "${FINISHED_AT_UTC}" \
  --arg manifest_object_key "${MANIFEST_OBJECT_KEY}" \
  --arg backup_object_key "${BACKUP_OBJECT_KEY}" \
  --arg target_direct_url_redacted "$(printf '%s' "${TARGET_DIRECT_URL}" | sed 's#://[^@]*@#://***:***@#')" \
  --argjson encrypted "${ENCRYPTED}" \
  --argjson duration_seconds "${DURATION_SECONDS}" \
  --arg org_count "${org_count:-unknown}" \
  --arg event_count "${event_count:-unknown}" \
  --arg workflow_count "${workflow_count:-unknown}" \
  --arg user_count "${user_count:-unknown}" \
  '{
    status: $status,
    backup_id: $backup_id,
    requested_backup_id: $backup_id_input,
    started_at_utc: $started_at_utc,
    finished_at_utc: $finished_at_utc,
    duration_seconds: $duration_seconds,
    source: {
      provider: "cloudflare_r2",
      manifest_object_key: $manifest_object_key,
      backup_object_key: $backup_object_key,
      encrypted: $encrypted
    },
    target: {
      direct_url_redacted: $target_direct_url_redacted
    },
    post_restore_smoke_checks: {
      organization_count: $org_count,
      event_count: $event_count,
      workflow_count: $workflow_count,
      user_count: $user_count
    }
  }' > "${RESTORE_RESULT_FILE}"

if command -v psql >/dev/null 2>&1; then
  AUDIT_METADATA="$(jq -cn \
    --arg backup_id "${BACKUP_ID}" \
    --arg manifest_object_key "${MANIFEST_OBJECT_KEY}" \
    --arg backup_object_key "${BACKUP_OBJECT_KEY}" \
    '{
      operation: "restore",
      backupId: $backup_id,
      manifestObjectKey: $manifest_object_key,
      backupObjectKey: $backup_object_key
    }')"

  if ! psql "${TARGET_DIRECT_URL}" -v ON_ERROR_STOP=1 -v backup_id="${BACKUP_ID}" -v metadata="${AUDIT_METADATA}" <<'SQL'
DO $$
BEGIN
  IF to_regclass('public."AuditLog"') IS NOT NULL THEN
    INSERT INTO "AuditLog" (
      "id",
      "organizationId",
      "userId",
      "action",
      "entityType",
      "entityId",
      "description",
      "metadata",
      "createdAt"
    ) VALUES (
      concat('dbres_', to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'), '_', substr(md5(random()::text), 1, 8)),
      NULL,
      NULL,
      'EXECUTE',
      'DatabaseRestore',
      :'backup_id',
      'Database restore completed',
      :'metadata'::jsonb,
      NOW()
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Restore audit log write skipped: %', SQLERRM;
END $$;
SQL
  then
    log "WARN: Failed to write restore audit log entry"
  fi
fi

log "Restore completed successfully"
log "Restore result: ${RESTORE_RESULT_FILE}"
