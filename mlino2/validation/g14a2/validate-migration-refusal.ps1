$ErrorActionPreference = 'Continue'

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$logPath = Join-Path $PSScriptRoot 'migration-refusal.log'
$container = 'mlino-g14a2-refusal'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('mlino-g14a2-refusal-' + [guid]::NewGuid().ToString('N'))
$dbPassword = [guid]::NewGuid().ToString('N')
$env:DATABASE_URL = "postgresql://postgres:$dbPassword@localhost:5499/postgres?schema=public"

Remove-Item -LiteralPath $logPath -Force -ErrorAction SilentlyContinue
function Write-Log([string]$line) {
  $safe = [regex]::Replace($line, 'postgres(?:ql)?://[^\s\"'']+', '[REDACTED_URL]')
  Add-Content -LiteralPath $logPath -Value $safe
}
function Write-Block([string]$title, [object[]]$lines) {
  Write-Log("[$title]")
  foreach ($line in $lines) { Write-Log(([string]$line)) }
}
function Invoke-Psql([string]$sql) {
  $output = & docker exec -e "PGPASSWORD=$dbPassword" $container psql -U postgres -d postgres -qAt -c $sql 2>&1
  $exit = $LASTEXITCODE
  return [pscustomobject]@{ ExitCode = $exit; Output = @($output) }
}

try {
  Write-Log 'G14A2_REFUSAL_VALIDATION=START'
  Write-Block 'CONTAINERS_BEFORE' (& docker ps -a --format '{{.Names}}')
  Write-Block 'VOLUMES_BEFORE' (& docker volume ls --format '{{.Name}}')
  $existing = @(& docker ps -a --filter "name=^$container$" --format '{{.Names}}')
  if ($existing.Count -gt 0) { throw 'refusal container already exists' }

  & docker run -d --name $container --tmpfs /var/lib/postgresql/data -p 127.0.0.1:5499:5432 -e "POSTGRES_PASSWORD=$dbPassword" postgres:16-alpine *> $null
  if ($LASTEXITCODE -ne 0) { throw 'docker run failed' }
  for ($i = 0; $i -lt 30; $i++) {
    & docker exec $container pg_isready -U postgres *> $null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
  }
  if ($LASTEXITCODE -ne 0) { throw 'postgres did not become ready' }

  New-Item -ItemType Directory -Path (Join-Path $tempRoot 'prisma') -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $repo 'implementation\prisma\schema.prisma') -Destination (Join-Path $tempRoot 'prisma\schema.prisma')
  $migrationSource = Join-Path $repo 'implementation\prisma\migrations'
  $migrationTarget = Join-Path $tempRoot 'prisma\migrations'
  New-Item -ItemType Directory -Path $migrationTarget -Force | Out-Null
  $firstSix = @(Get-ChildItem -LiteralPath $migrationSource -Directory | Sort-Object Name | Select-Object -First 6)
  foreach ($migration in $firstSix) { Copy-Item -LiteralPath $migration.FullName -Destination $migrationTarget -Recurse }
  Write-Block 'PRE_CORE_MIGRATIONS' ($firstSix.Name)

  $prisma = Join-Path $repo 'implementation\node_modules\.bin\prisma.cmd'
  $deployBefore = & $prisma migrate deploy --schema (Join-Path $tempRoot 'prisma\schema.prisma') 2>&1
  $deployBeforeExit = $LASTEXITCODE
  Write-Block 'DEPLOY_UP_TO_CORE_FOUNDATION_OUTPUT' $deployBefore
  Write-Log "DEPLOY_UP_TO_CORE_FOUNDATION_EXIT=$deployBeforeExit"
  if ($deployBeforeExit -ne 0) { throw 'first six migrations failed' }

  $seedSql = @'
INSERT INTO organizations (id, display_name, created_at, updated_at)
VALUES ('g14a2-refusal-org', 'Refusal test organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO memberships (id, organization_id, identity_provider, external_subject, created_at)
VALUES ('g14a2-refusal-member', 'g14a2-refusal-org', 'g14a2', 'refusal-member', CURRENT_TIMESTAMP);
INSERT INTO business_profiles (id, organization_id, name, created_at, updated_at)
VALUES ('g14a2-refusal-profile', 'g14a2-refusal-org', 'Refusal profile', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO publications (id, organization_id, business_profile_id, business_profile_organization_id, event_kind, content_revision, performed_by_membership_id, permission_key, gate_snapshot, reason, occurred_at)
VALUES ('g14a2-refusal-publication', 'g14a2-refusal-org', 'g14a2-refusal-profile', 'g14a2-refusal-org', 'PUBLISHED', 1, 'g14a2-refusal-member', 'publication.manage', jsonb_build_object('policyVersion', 'core-publication-v1'), 'refusal seed', CURRENT_TIMESTAMP);
'@
  $seedResult = Invoke-Psql $seedSql
  Write-Block 'SEED_OUTPUT' $seedResult.Output
  Write-Log "SEED_EXIT=$($seedResult.ExitCode)"
  if ($seedResult.ExitCode -ne 0) { throw 'seed failed' }

  $targetDeploy = & $prisma migrate deploy --schema (Join-Path $repo 'implementation\prisma\schema.prisma') 2>&1
  $targetDeployExit = $LASTEXITCODE
  Write-Block 'TARGET_DEPLOY_FULL_ERROR' $targetDeploy
  Write-Log "TARGET_DEPLOY_EXIT=$targetDeployExit"
  if ($targetDeployExit -eq 0) { throw 'target migration unexpectedly succeeded' }

  $failedRow = Invoke-Psql "SELECT migration_name || '|finished_at=' || COALESCE(finished_at::text, 'NULL') || '|rolled_back_at=' || COALESCE(rolled_back_at::text, 'NULL') FROM _prisma_migrations WHERE migration_name = '20260914010000_add_publication_published_content';"
  $columnCount = Invoke-Psql "SELECT count(*)::text FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'publications' AND column_name = 'published_content';"
  $migrationLog = Invoke-Psql "SELECT COALESCE(logs, '') FROM _prisma_migrations WHERE migration_name = '20260914010000_add_publication_published_content';"
  Write-Block 'FAILED_MIGRATION_ROW' $failedRow.Output
  Write-Block 'PUBLISHED_CONTENT_COLUMN_COUNT' $columnCount.Output
  Write-Block 'PRISMA_MIGRATION_LOGS_AND_P0001_IF_VISIBLE' $migrationLog.Output
  Write-Log "FAILED_MIGRATION_ROW_EXIT=$($failedRow.ExitCode)"
  Write-Log "COLUMN_COUNT_EXIT=$($columnCount.ExitCode)"
  Write-Log "P0001_VISIBLE_IN_CAPTURED_LOG=$([bool](($migrationLog.Output -join "`n") -match 'P0001|empty publications'))"
  if (($failedRow.Output -join "`n") -notmatch '20260914010000_add_publication_published_content') { throw 'failed migration row missing' }
  if (($columnCount.Output -join "`n").Trim() -ne '0') { throw 'published_content column was created unexpectedly' }
  Write-Log 'RESULT=PASS'
}
catch {
  Write-Log "RESULT=FAIL: $($_.Exception.Message)"
  throw
}
finally {
  if (@(& docker ps -a --filter "name=^$container$" --format '{{.Names}}').Count -gt 0) {
    & docker rm -f $container *> $null
    Write-Log "CONTAINER_REMOVED=$($LASTEXITCODE -eq 0)"
  } else {
    Write-Log 'CONTAINER_REMOVED=already absent'
  }
  Write-Block 'CONTAINERS_AFTER' (& docker ps -a --format '{{.Names}}')
  Write-Block 'VOLUMES_AFTER' (& docker volume ls --format '{{.Name}}')
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
