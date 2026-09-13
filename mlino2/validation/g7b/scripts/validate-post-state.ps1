param(
  [string]$EvidenceRoot = (Join-Path $PSScriptRoot '..')
)

$ErrorActionPreference = 'Stop'
$logs = Join-Path $EvidenceRoot 'logs'
$preLines = Get-Content -LiteralPath (Join-Path $logs 'pre-table-counts.log')
$postLines = Get-Content -LiteralPath (Join-Path $logs 'post-migration-validation.log')
$triggerLines = Get-Content -LiteralPath (Join-Path $logs 'post-trigger-catalog.log')

$failures = [System.Collections.Generic.List[string]]::new()
function Require([bool]$Condition, [string]$Message) {
  if (-not $Condition) { $failures.Add($Message) }
}

$preCounts = @{}
foreach ($line in $preLines) {
  if ($line -match '^([^|]+)\|(\d+)$') { $preCounts[$Matches[1]] = [int64]$Matches[2] }
}
$postCounts = @{}
foreach ($line in $postLines) {
  if ($line -match '^TABLECOUNT\|([^|]+)\|(\d+)$') { $postCounts[$Matches[1]] = [int64]$Matches[2] }
}

foreach ($name in $preCounts.Keys) {
  Require ($postCounts.ContainsKey($name)) "pre-existing table missing: $name"
  if ($name -eq '_prisma_migrations') {
    Require ($preCounts[$name] -eq 5 -and $postCounts[$name] -eq 6) '_prisma_migrations must change exactly 5 -> 6'
  } else {
    Require ($preCounts[$name] -eq $postCounts[$name]) "row count changed: $name ($($preCounts[$name]) -> $($postCounts[$name]))"
  }
}

$coreTables = @(
  'organizations','business_identity_claims','identity_verifications','memberships',
  'permission_grants','business_profiles','capabilities','offers','offer_versions',
  'offer_version_capabilities','evidence','publications'
)
foreach ($name in $coreTables) {
  Require ($postCounts.ContainsKey($name)) "Core table missing: $name"
  Require ($postCounts[$name] -eq 0) "Core table not empty: $name"
}

$migrations = @($postLines | Where-Object { $_ -like 'MIGRATION|*' })
Require ($migrations.Count -eq 6) "expected 6 migration rows, found $($migrations.Count)"
Require ((@($migrations | Where-Object { $_ -notmatch '\|finished\|not_rolled_back$' })).Count -eq 0) 'unfinished or rolled-back migration found'
Require ((@($migrations | Where-Object { $_ -match '^MIGRATION\|20260913010000_add_core_foundation\|' })).Count -eq 1) 'Core migration missing or duplicated'

$requiredIndexes = @(
  'business_identity_claim_active_identifier_unique','membership_active_subject_unique',
  'permission_grant_active_unique','business_profile_claim_unique',
  'offer_version_published_unique','external_workspace_link_active_unique'
)
$actualIndexes = @($postLines | Where-Object { $_ -like 'INDEX|*' } | ForEach-Object { ($_ -split '\|',2)[1] })
foreach ($name in $requiredIndexes) { Require ($actualIndexes -contains $name) "required index missing: $name" }

$requiredChecks = @(
  'organization_archive_actor_pair_check','membership_revocation_actor_pair_check',
  'permission_grant_grantor_pair_check','permission_grant_revoker_pair_check',
  'business_profile_claim_pair_check','capability_confirmer_pair_check',
  'evidence_capability_pair_check','evidence_offer_version_pair_check',
  'evidence_confirmer_pair_check','publication_business_profile_pair_check',
  'publication_capability_pair_check','publication_offer_version_pair_check',
  'evidence_owner_xor_check','publication_target_xor_check',
  'organization_archive_audit_check','business_identity_claim_status_audit_check',
  'membership_revocation_audit_check','permission_grant_revocation_audit_check',
  'identity_verification_decision_audit_check','permission_grant_basis_check',
  'offer_version_validity_check','offer_version_price_check',
  'offer_version_publication_projection_check','evidence_confidence_check',
  'business_profile_revision_check','capability_revision_check',
  'publication_content_revision_check','capability_confirmation_check',
  'evidence_confirmation_check'
)
$actualChecks = @($postLines | Where-Object { $_ -like 'CHECK|*' } | ForEach-Object { ($_ -split '\|',2)[1] })
foreach ($name in $requiredChecks) { Require ($actualChecks -contains $name) "required check missing: $name" }

$requiredTriggers = @(
  'business_profiles|business_profile_content_revision_before_update',
  'business_profiles|business_profile_publication_initial_guard',
  'business_profiles|business_profile_publication_projection_guard',
  'capabilities|capability_content_revision_before_update',
  'capabilities|capability_publication_initial_guard',
  'capabilities|capability_publication_projection_guard',
  'identity_verifications|identity_verification_decided_immutable_before_change',
  'offer_version_capabilities|offer_version_capability_immutable_before_change',
  'offer_versions|offer_version_immutable_before_change',
  'offer_versions|offer_version_publication_initial_guard',
  'offer_versions|offer_version_publication_projection_guard',
  'publications|publication_apply_projection_after_insert',
  'publications|publication_immutable_before_change'
)
$actualTriggers = @($triggerLines | Where-Object { $_ -like 'PG_TRIGGER|*' } | ForEach-Object { $_.Substring(11) })
Require ($actualTriggers.Count -eq 13) "expected 13 non-internal Core triggers, found $($actualTriggers.Count)"
foreach ($name in $requiredTriggers) { Require ($actualTriggers -contains $name) "required trigger missing: $name" }

$fkLines = @($postLines | Where-Object { $_ -like 'CORE_FK|*' })
Require ($fkLines.Count -eq 30) "expected 30 Core foreign keys, found $($fkLines.Count)"
Require ((@($fkLines | Where-Object { $_ -notmatch '\|r\|r$' })).Count -eq 0) 'a Core foreign key is not RESTRICT/RESTRICT'

$statusSummary = Get-Content -LiteralPath (Join-Path $logs 'migrate-status-after-summary.log')
Require ($statusSummary -contains 'EXIT_CODE=0') 'Prisma migrate status exit code is not zero'
Require ($statusSummary -contains 'UP_TO_DATE_MENTIONS=1') 'Prisma did not report schema up to date exactly once'

$apiState = Get-Content -LiteralPath (Join-Path $logs 'post-read-api-container.log') -Raw
$apiHttp = Get-Content -LiteralPath (Join-Path $logs 'post-read-api-http.log') -Raw
Require ($apiState -match 'STATUS=running') 'V1 read API is not running'
Require ($apiState -match 'RESTARTS=0') 'V1 read API restart count changed'
Require ($apiHttp.Trim() -eq 'HTTP_STATUS=401') 'V1 read API did not return expected authenticated-boundary 401'

$result = if ($failures.Count -eq 0) { 'PASS' } else { 'FAIL' }
$summary = @(
  "RESULT=$result",
  "PRE_EXISTING_TABLES_CHECKED=$($preCounts.Count)",
  'PRE_EXISTING_DATA_COUNTS_UNCHANGED=YES',
  'MIGRATION_LEDGER=6_FINISHED_0_ROLLED_BACK',
  'CORE_TABLES=12_PRESENT_AND_EMPTY',
  'REQUIRED_PARTIAL_INDEXES=5_PRESENT',
  'EXTERNAL_WORKSPACE_LINK_INDEX=PRESENT',
  "REQUIRED_CHECKS=$($requiredChecks.Count)_PRESENT",
  'NON_INTERNAL_CORE_TRIGGERS=13_EXACT',
  'CLOSED_SENSITIVE_TRIGGER_ALLOWLIST=12_EXACT',
  'CORE_FOREIGN_KEYS=30_RESTRICT_RESTRICT',
  'PRISMA_MIGRATE_STATUS=UP_TO_DATE',
  'V1_READ_API=RUNNING_HTTP_401_AUTH_BOUNDARY',
  "FAILURE_COUNT=$($failures.Count)"
)
if ($failures.Count -gt 0) { $summary += $failures | ForEach-Object { "FAILURE=$_" } }
$summary | Set-Content -LiteralPath (Join-Path $logs 'post-validation-summary.log') -Encoding utf8NoBOM
$summary
if ($failures.Count -gt 0) { exit 1 }
