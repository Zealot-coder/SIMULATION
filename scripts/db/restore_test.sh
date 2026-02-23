#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEFAULT_POLICY_FILE="${REPO_ROOT}/ops/ops_backup_policy.json"
OPS_BACKUP_POLICY_FILE="${OPS_BACKUP_POLICY_FILE:-${DEFAULT_POLICY_FILE}}"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-${REPO_ROOT}/artifacts}"
BACKUP_ID="${BACKUP_ID:-LATEST}"

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

require_cmd jq
require_cmd psql

require_env STAGING_DIRECT_URL

if [[ -n "${PROD_DIRECT_URL:-}" && "${STAGING_DIRECT_URL}" == "${PROD_DIRECT_URL}" ]]; then
  fail "Safety check failed: STAGING_DIRECT_URL matches PROD_DIRECT_URL"
fi

POLICY_PATH="$(resolve_path "${OPS_BACKUP_POLICY_FILE}")"
[[ -f "${POLICY_PATH}" ]] || fail "Policy file not found: ${POLICY_PATH}"
VERIFICATION_FILE_FROM_POLICY="$(jq -r '.verification_queries_file // "scripts/db/verification.sql"' "${POLICY_PATH}")"
VERIFICATION_FILE="$(resolve_path "${VERIFICATION_FILE_FROM_POLICY}")"
[[ -f "${VERIFICATION_FILE}" ]] || fail "Verification SQL file not found: ${VERIFICATION_FILE}"

RUN_ID="$(date -u +"%Y%m%dT%H%M%SZ")"
mkdir -p "${ARTIFACTS_DIR}"
RESTORE_RESULT_FILE="${ARTIFACTS_DIR}/restore-result-${RUN_ID}.json"
RESTORE_LOG_FILE="${ARTIFACTS_DIR}/restore-test-${RUN_ID}.log"
RESTORE_PROOF_FILE="${ARTIFACTS_DIR}/restore-proof-${RUN_ID}.json"

STARTED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STARTED_EPOCH="$(date -u +%s)"

log "Running restore test using backup id: ${BACKUP_ID}"
TARGET_DIRECT_URL="${STAGING_DIRECT_URL}" \
  RESTORE_OUTPUT_PATH="${RESTORE_RESULT_FILE}" \
  BACKUP_ID="${BACKUP_ID}" \
  OPS_BACKUP_POLICY_FILE="${OPS_BACKUP_POLICY_FILE}" \
  ARTIFACTS_DIR="${ARTIFACTS_DIR}" \
  "${REPO_ROOT}/scripts/db/restore.sh" | tee "${RESTORE_LOG_FILE}"

log "Executing verification SQL: ${VERIFICATION_FILE}"
psql "${STAGING_DIRECT_URL}" -v ON_ERROR_STOP=1 -f "${VERIFICATION_FILE}" | tee -a "${RESTORE_LOG_FILE}"

migrations_ok="$(psql "${STAGING_DIRECT_URL}" -Atqc 'SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM "_prisma_migrations";')"
org_count="$(psql "${STAGING_DIRECT_URL}" -Atqc 'SELECT COUNT(*) FROM "Organization";')"
event_count="$(psql "${STAGING_DIRECT_URL}" -Atqc 'SELECT COUNT(*) FROM "Event";')"
workflow_count="$(psql "${STAGING_DIRECT_URL}" -Atqc 'SELECT COUNT(*) FROM "Workflow";')"
user_count="$(psql "${STAGING_DIRECT_URL}" -Atqc 'SELECT COUNT(*) FROM "User";')"
rls_enabled_count="$(psql "${STAGING_DIRECT_URL}" -Atqc "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname IN ('Organization','Event','Workflow','WorkflowExecution','WorkflowStep') AND c.relkind = 'r' AND c.relrowsecurity;")"
policy_table_count="$(psql "${STAGING_DIRECT_URL}" -Atqc "SELECT COUNT(*) FROM (SELECT tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('Organization','Event','Workflow','WorkflowExecution','WorkflowStep') GROUP BY tablename HAVING COUNT(*) > 0) t;")"
org_scope_query_ok="$(psql "${STAGING_DIRECT_URL}" -Atqc 'SELECT CASE WHEN COUNT(*) >= 0 THEN 1 ELSE 0 END FROM "OrganizationMember" om JOIN "Organization" o ON o.id = om."organizationId" WHERE om."isActive" = true;')"

table_counts_ok=true
for value in "${org_count}" "${event_count}" "${workflow_count}" "${user_count}"; do
  if ! [[ "${value}" =~ ^[0-9]+$ ]] || (( value <= 0 )); then
    table_counts_ok=false
  fi
done

rls_ok=false
if [[ "${rls_enabled_count}" =~ ^[0-9]+$ ]] && (( rls_enabled_count == 5 )); then
  rls_ok=true
fi

policies_ok=false
if [[ "${policy_table_count}" =~ ^[0-9]+$ ]] && (( policy_table_count == 5 )); then
  policies_ok=true
fi

migrations_pass=false
if [[ "${migrations_ok}" == "1" ]]; then
  migrations_pass=true
fi

org_scope_pass=false
if [[ "${org_scope_query_ok}" == "1" ]]; then
  org_scope_pass=true
fi

overall_success=true
if [[ "${migrations_pass}" != "true" || "${table_counts_ok}" != "true" || "${rls_ok}" != "true" || "${policies_ok}" != "true" || "${org_scope_pass}" != "true" ]]; then
  overall_success=false
fi

FINISHED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
FINISHED_EPOCH="$(date -u +%s)"
DURATION_SECONDS="$((FINISHED_EPOCH - STARTED_EPOCH))"
BACKUP_VERSION_ID="$(jq -r '.backup_id // "unknown"' "${RESTORE_RESULT_FILE}")"

jq -n \
  --arg restore_timestamp "${FINISHED_AT_UTC}" \
  --arg backup_version_id "${BACKUP_VERSION_ID}" \
  --arg started_at_utc "${STARTED_AT_UTC}" \
  --arg finished_at_utc "${FINISHED_AT_UTC}" \
  --arg restore_result_file "${RESTORE_RESULT_FILE}" \
  --arg restore_log_file "${RESTORE_LOG_FILE}" \
  --arg migrations_ok "${migrations_ok}" \
  --arg org_count "${org_count}" \
  --arg event_count "${event_count}" \
  --arg workflow_count "${workflow_count}" \
  --arg user_count "${user_count}" \
  --arg rls_enabled_count "${rls_enabled_count}" \
  --arg policy_table_count "${policy_table_count}" \
  --arg org_scope_query_ok "${org_scope_query_ok}" \
  --argjson duration_seconds "${DURATION_SECONDS}" \
  --argjson success "${overall_success}" \
  --argjson migrations_pass "${migrations_pass}" \
  --argjson table_counts_ok "${table_counts_ok}" \
  --argjson rls_ok "${rls_ok}" \
  --argjson policies_ok "${policies_ok}" \
  --argjson org_scope_pass "${org_scope_pass}" \
  '{
    restore_timestamp: $restore_timestamp,
    backup_version_id: $backup_version_id,
    started_at_utc: $started_at_utc,
    finished_at_utc: $finished_at_utc,
    duration_seconds: $duration_seconds,
    success: $success,
    verification: {
      migrations: {
        value: $migrations_ok,
        pass: $migrations_pass
      },
      key_table_counts: {
        organization: $org_count,
        event: $event_count,
        workflow: $workflow_count,
        user: $user_count,
        pass: $table_counts_ok
      },
      rls_enabled_tables: {
        count: $rls_enabled_count,
        expected: 5,
        pass: $rls_ok
      },
      policy_coverage: {
        table_count_with_policies: $policy_table_count,
        expected: 5,
        pass: $policies_ok
      },
      org_scope_query: {
        value: $org_scope_query_ok,
        pass: $org_scope_pass
      }
    },
    artifacts: {
      restore_result_file: $restore_result_file,
      restore_log_file: $restore_log_file
    }
  }' > "${RESTORE_PROOF_FILE}"

log "Restore proof generated: ${RESTORE_PROOF_FILE}"

if [[ "${overall_success}" != "true" ]]; then
  fail "Restore verification failed. See ${RESTORE_PROOF_FILE}"
fi

log "Restore verification passed"
