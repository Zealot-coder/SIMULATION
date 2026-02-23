#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEFAULT_POLICY_FILE="${REPO_ROOT}/ops/ops_backup_policy.json"
OPS_BACKUP_POLICY_FILE="${OPS_BACKUP_POLICY_FILE:-${DEFAULT_POLICY_FILE}}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-${REPO_ROOT}/artifacts}"

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
require_cmd pg_dump
require_cmd psql
require_cmd tar
require_cmd sha256sum

[[ -f "${OPS_BACKUP_POLICY_FILE}" ]] || fail "Policy file not found: ${OPS_BACKUP_POLICY_FILE}"

require_env PROD_DIRECT_URL
require_env R2_ACCOUNT_ID
require_env R2_BUCKET
require_env R2_ACCESS_KEY_ID
require_env R2_SECRET_ACCESS_KEY

POLICY_PATH="$(resolve_path "${OPS_BACKUP_POLICY_FILE}")"
[[ -f "${POLICY_PATH}" ]] || fail "Resolved policy path not found: ${POLICY_PATH}"

ARTIFACT_PREFIX="$(jq -r '.artifact_prefix // empty' "${POLICY_PATH}")"
POLICY_VERSION="$(jq -r '.policy_version // "unknown"' "${POLICY_PATH}")"
PRIMARY_MODE="$(jq -r '.primary_mode // "unknown"' "${POLICY_PATH}")"
RETENTION_DAYS="$(jq -r '.retention_days // 30' "${POLICY_PATH}")"
LOGICAL_EXPORT_MINUTES="$(jq -r '.logical_export_frequency_minutes // 360' "${POLICY_PATH}")"
RPO_MINUTES="$(jq -r '.rpo_minutes // 60' "${POLICY_PATH}")"
RTO_MINUTES="$(jq -r '.rto_minutes // 240' "${POLICY_PATH}")"

[[ -n "${ARTIFACT_PREFIX}" ]] || fail "artifact_prefix is empty in policy file ${POLICY_PATH}"

export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="${R2_REGION:-auto}"
R2_ENDPOINT="${R2_ENDPOINT:-https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com}"

BACKUP_ID="$(date -u +"%Y%m%dT%H%M%SZ")"
STARTED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STARTED_EPOCH="$(date -u +%s)"

mkdir -p "${ARTIFACTS_DIR}"
MANIFEST_FILE="${BACKUP_MANIFEST_PATH:-${ARTIFACTS_DIR}/backup-manifest-${BACKUP_ID}.json}"
MANIFEST_FILE="$(resolve_path "${MANIFEST_FILE}")"

PAYLOAD_DIR="${WORK_DIR}/payload"
mkdir -p "${PAYLOAD_DIR}"

DUMP_FILE="${WORK_DIR}/database.dump"
GLOBALS_FILE="${WORK_DIR}/globals.sql"
GLOBALS_STATUS="skipped"
GLOBALS_NOTE=""

log "Running pg_dump for backup ${BACKUP_ID}"
PGAPPNAME="simulation-backup-pg-dump" \
  pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "${DUMP_FILE}" \
  "${PROD_DIRECT_URL}"
cp "${DUMP_FILE}" "${PAYLOAD_DIR}/database.dump"

if [[ "${SKIP_GLOBALS_DUMP:-0}" != "1" ]] && command -v pg_dumpall >/dev/null 2>&1; then
  log "Attempting pg_dumpall --globals-only (best effort)"
  if PGAPPNAME="simulation-backup-pg-dumpall" pg_dumpall --globals-only --dbname "${PROD_DIRECT_URL}" > "${GLOBALS_FILE}" 2>"${WORK_DIR}/globals.err"; then
    GLOBALS_STATUS="ok"
    cp "${GLOBALS_FILE}" "${PAYLOAD_DIR}/globals.sql"
  else
    GLOBALS_STATUS="failed"
    GLOBALS_NOTE="$(tr '\n' ' ' < "${WORK_DIR}/globals.err" | sed 's/  */ /g')"
    log "WARN: globals dump failed; continuing (details in manifest)"
  fi
elif [[ "${SKIP_GLOBALS_DUMP:-0}" == "1" ]]; then
  GLOBALS_STATUS="disabled"
else
  GLOBALS_STATUS="unavailable"
fi

cp "${POLICY_PATH}" "${PAYLOAD_DIR}/ops_backup_policy.json"

jq -n \
  --arg backup_id "${BACKUP_ID}" \
  --arg started_at_utc "${STARTED_AT_UTC}" \
  --arg policy_version "${POLICY_VERSION}" \
  --arg primary_mode "${PRIMARY_MODE}" \
  --arg globals_status "${GLOBALS_STATUS}" \
  --arg globals_note "${GLOBALS_NOTE}" \
  '{
    backup_id: $backup_id,
    started_at_utc: $started_at_utc,
    policy_version: $policy_version,
    primary_mode: $primary_mode,
    globals_dump: {
      status: $globals_status,
      note: $globals_note
    }
  }' > "${PAYLOAD_DIR}/backup-meta.json"

ARCHIVE_PATH="${WORK_DIR}/backup-${BACKUP_ID}.tar.gz"
tar -C "${PAYLOAD_DIR}" -czf "${ARCHIVE_PATH}" .

ENCRYPTED=false
PAYLOAD_PATH="${ARCHIVE_PATH}"
PAYLOAD_EXTENSION="tar.gz"
if [[ -n "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]]; then
  require_cmd openssl
  ENCRYPTED=true
  PAYLOAD_EXTENSION="tar.gz.enc"
  ENCRYPTED_PATH="${WORK_DIR}/backup-${BACKUP_ID}.tar.gz.enc"
  log "Encrypting backup payload with client-side passphrase"
  openssl enc -aes-256-cbc -pbkdf2 -salt \
    -in "${ARCHIVE_PATH}" \
    -out "${ENCRYPTED_PATH}" \
    -pass env:BACKUP_ENCRYPTION_PASSPHRASE
  PAYLOAD_PATH="${ENCRYPTED_PATH}"
fi

PAYLOAD_SIZE_BYTES="$(wc -c < "${PAYLOAD_PATH}" | tr -d '[:space:]')"
PAYLOAD_SHA256="$(sha256sum "${PAYLOAD_PATH}" | awk '{print $1}')"

BACKUP_OBJECT_KEY="${ARTIFACT_PREFIX%/}/backups/${BACKUP_ID}/payload.${PAYLOAD_EXTENSION}"
MANIFEST_OBJECT_KEY="${ARTIFACT_PREFIX%/}/manifests/backup-manifest-${BACKUP_ID}.json"

log "Uploading payload to Cloudflare R2: s3://${R2_BUCKET}/${BACKUP_OBJECT_KEY}"
aws s3 cp "${PAYLOAD_PATH}" "s3://${R2_BUCKET}/${BACKUP_OBJECT_KEY}" \
  --endpoint-url "${R2_ENDPOINT}" \
  --only-show-errors

FINISHED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
FINISHED_EPOCH="$(date -u +%s)"
DURATION_SECONDS="$((FINISHED_EPOCH - STARTED_EPOCH))"

mkdir -p "$(dirname "${MANIFEST_FILE}")"
jq -n \
  --arg backup_id "${BACKUP_ID}" \
  --arg started_at_utc "${STARTED_AT_UTC}" \
  --arg finished_at_utc "${FINISHED_AT_UTC}" \
  --arg policy_file "${OPS_BACKUP_POLICY_FILE}" \
  --arg policy_version "${POLICY_VERSION}" \
  --arg primary_mode "${PRIMARY_MODE}" \
  --arg backup_object_key "${BACKUP_OBJECT_KEY}" \
  --arg manifest_object_key "${MANIFEST_OBJECT_KEY}" \
  --arg r2_bucket "${R2_BUCKET}" \
  --arg r2_endpoint "${R2_ENDPOINT}" \
  --arg payload_sha256 "${PAYLOAD_SHA256}" \
  --arg globals_status "${GLOBALS_STATUS}" \
  --arg globals_note "${GLOBALS_NOTE}" \
  --argjson encrypted "${ENCRYPTED}" \
  --argjson payload_size_bytes "${PAYLOAD_SIZE_BYTES}" \
  --argjson duration_seconds "${DURATION_SECONDS}" \
  --argjson retention_days "${RETENTION_DAYS}" \
  --argjson logical_export_frequency_minutes "${LOGICAL_EXPORT_MINUTES}" \
  --argjson rpo_minutes "${RPO_MINUTES}" \
  --argjson rto_minutes "${RTO_MINUTES}" \
  '{
    backup_id: $backup_id,
    status: "success",
    started_at_utc: $started_at_utc,
    finished_at_utc: $finished_at_utc,
    duration_seconds: $duration_seconds,
    policy: {
      file: $policy_file,
      version: $policy_version,
      primary_mode: $primary_mode,
      retention_days: $retention_days,
      logical_export_frequency_minutes: $logical_export_frequency_minutes,
      rpo_minutes: $rpo_minutes,
      rto_minutes: $rto_minutes
    },
    storage: {
      provider: "cloudflare_r2",
      bucket: $r2_bucket,
      endpoint: $r2_endpoint,
      backup_object_key: $backup_object_key,
      manifest_object_key: $manifest_object_key,
      encrypted: $encrypted,
      payload_size_bytes: $payload_size_bytes,
      payload_sha256: $payload_sha256
    },
    globals_dump: {
      status: $globals_status,
      note: $globals_note
    }
  }' > "${MANIFEST_FILE}"

log "Uploading manifest to Cloudflare R2: s3://${R2_BUCKET}/${MANIFEST_OBJECT_KEY}"
aws s3 cp "${MANIFEST_FILE}" "s3://${R2_BUCKET}/${MANIFEST_OBJECT_KEY}" \
  --endpoint-url "${R2_ENDPOINT}" \
  --content-type "application/json" \
  --only-show-errors

if command -v psql >/dev/null 2>&1; then
  AUDIT_METADATA="$(jq -cn \
    --arg backup_id "${BACKUP_ID}" \
    --arg manifest_object_key "${MANIFEST_OBJECT_KEY}" \
    --arg backup_object_key "${BACKUP_OBJECT_KEY}" \
    --arg provider "cloudflare_r2" \
    --arg encrypted "${ENCRYPTED}" \
    '{
      operation: "backup",
      backupId: $backup_id,
      manifestObjectKey: $manifest_object_key,
      backupObjectKey: $backup_object_key,
      provider: $provider,
      encrypted: ($encrypted == "true")
    }')"

  if ! psql "${PROD_DIRECT_URL}" -v ON_ERROR_STOP=1 -v backup_id="${BACKUP_ID}" -v metadata="${AUDIT_METADATA}" <<'SQL'
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
      concat('dbbak_', to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'), '_', substr(md5(random()::text), 1, 8)),
      NULL,
      NULL,
      'EXECUTE',
      'DatabaseBackup',
      :'backup_id',
      'Automated database backup completed',
      :'metadata'::jsonb,
      NOW()
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Backup audit log write skipped: %', SQLERRM;
END $$;
SQL
  then
    log "WARN: Failed to write backup audit log entry"
  fi
fi

log "Backup completed successfully"
log "Manifest: ${MANIFEST_FILE}"
