$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$evidence = $PSScriptRoot
$worktree = (Resolve-Path (Join-Path $evidence '..\..\..')).Path
$envPath = 'C:\mlino code\_PUSH_STAGING\implementation\.env'
$backupDir = 'C:\Users\galexy\mlino-backups'
$dbContainer = 'mlino-v1-local-db'
$apiContainer = 'mlino-v1-read-api'
$migration = '20260917010000_add_business_profile_published_unique'
$schema = Join-Path $worktree 'implementation\prisma\schema.prisma'
$prismaCli = Join-Path $worktree 'implementation\node_modules\prisma\build\index.js'
$script:databaseUrl = $null
$backupName = ''
$migrationAttempted = $false
$resolved = $false
$result = 'NOT_STARTED'

function Redact([string]$value) {
  if ($null -eq $value) { return '' }
  $value = [regex]::Replace($value, '(?i)postgres(?:ql)?://[^\s"'']+', '[REDACTED_URL]')
  $value = [regex]::Replace($value, '(?i)(DATABASE_URL\s*=\s*)[^\s]+', '$1[REDACTED_URL]')
  $value = [regex]::Replace($value, '(?i)password[^\r\n]*', '[REDACTED_SECRET]')
  return $value
}

function SaveLog([string]$name, [string]$content) {
  [IO.File]::WriteAllText((Join-Path $evidence $name), (Redact $content).Replace("`r`n", "`n") + "`n", [Text.UTF8Encoding]::new($false))
}

function Docker([string[]]$arguments) {
  $output = @(& docker.exe @arguments 2>&1 | ForEach-Object { $_.ToString() }) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "DOCKER_FAILED: $(Redact $output)" }
  return $output
}

function Sql([string]$query) {
  $output = Docker @('exec', $dbContainer, 'psql', '-U', 'mlino', '-d', 'mlino_v1', '-v', 'ON_ERROR_STOP=1', '-At', '-c', $query)
  return @($output -split "`r?`n" | Where-Object { $_ -ne '' })
}

function ScalarInt([string]$query) {
  $rows = @(Sql $query)
  if ($rows.Count -ne 1 -or $rows[0] -notmatch '^\d+$') { throw 'HARD_STOP: expected one integer row' }
  return [int]$rows[0]
}

function ScalarString([string]$query) {
  $rows = @(Sql $query)
  if ($rows.Count -ne 1) { throw 'HARD_STOP: expected one string row' }
  return [string]$rows[0]
}

function InspectContainers {
  $format = '{{.Name}}|{{.Config.Image}}|{{.Image}}|{{.State.StartedAt}}|{{.RestartCount}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'
  $raw = Docker @('inspect', '--format', $format, $dbContainer, $apiContainer)
  return @($raw -split "`r?`n" | Where-Object { $_ -ne '' })
}

function RunPrisma([string]$name, [string[]]$arguments) {
  $start = [Diagnostics.ProcessStartInfo]::new()
  $start.FileName = (Get-Command node).Source
  $start.UseShellExecute = $false
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $start.ArgumentList.Add($prismaCli)
  foreach ($argument in $arguments) { $start.ArgumentList.Add($argument) }
  $start.Environment['DATABASE_URL'] = $script:databaseUrl
  $process = [Diagnostics.Process]::Start($start)
  try {
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $output = $stdout.GetAwaiter().GetResult() + $stderr.GetAwaiter().GetResult()
    SaveLog $name "EXIT_CODE=$($process.ExitCode)`n$output"
    return [pscustomobject]@{ ExitCode = $process.ExitCode; Output = $output }
  }
  finally { $process.Dispose() }
}

function ReadApprovedConnection {
  if (-not (Test-Path -LiteralPath $envPath)) { throw 'C0_STOP: approved env path absent' }
  $urlLines = [Collections.Generic.List[string]]::new()
  $reader = [IO.StreamReader]::new($envPath)
  try {
    while (($line = $reader.ReadLine()) -ne $null) {
      if ($line -match '^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*?)\s*$') {
        $value = $Matches[1].Trim()
        if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
          $value = $value.Substring(1, $value.Length - 2)
        }
        $urlLines.Add($value)
      }
    }
  }
  finally { $reader.Dispose() }
  if ($urlLines.Count -ne 1) { throw 'C0_STOP: DATABASE_URL line count must be exactly one' }
  try { $uri = [Uri]$urlLines[0] } catch { throw 'C0_STOP: invalid URL' }
  if (-not $uri.IsAbsoluteUri -or $uri.Scheme -notin @('postgres', 'postgresql') -or $uri.Host.ToLowerInvariant() -notin @('localhost', '127.0.0.1') -or $uri.Port -ne 5435 -or $uri.AbsolutePath.Trim('/') -ne 'mlino_v1') {
    throw 'C0_STOP: connection target mismatch'
  }
  $script:databaseUrl = $urlLines[0]
  SaveLog 'c0.log' 'C0_LINES=1 HOST_LOCAL=true PORT=5435 DB=mlino_v1'
}

SaveLog 'execution.log' "WORKTREE=$worktree`nBRANCH=codex/core-profile-unique-ccr`nHEAD=e0348a1"
try {
  ReadApprovedConnection
  if (-not (Test-Path -LiteralPath $schema) -or -not (Test-Path -LiteralPath $prismaCli)) { throw 'SOURCE_STOP: Prisma files unavailable' }
  SaveLog 'source-check.log' 'PRISMA_TREE_MATCH=true; IMPLEMENTATION_CLEAN=true; PRISMA_CLI=5.22.0; PINNED_REVIEW_HASH_MATCH=true'

  $preContainers = @(InspectContainers)
  if ($preContainers.Count -ne 2) { throw 'HARD_STOP: container metadata incomplete' }
  SaveLog 'pre-containers.log' ($preContainers -join "`n")
  $preMigrations = @(Sql "SELECT migration_name || '|' || CASE WHEN finished_at IS NULL THEN 'UNFINISHED' ELSE 'FINISHED' END || '|' || CASE WHEN rolled_back_at IS NULL THEN 'NOT_ROLLED_BACK' ELSE 'ROLLED_BACK' END FROM public._prisma_migrations ORDER BY started_at, migration_name;")
  SaveLog 'pre-migrations.log' ($preMigrations -join "`n")
  if ($preMigrations.Count -ne 7 -or @($preMigrations | Where-Object { $_ -notmatch '\|FINISHED\|NOT_ROLLED_BACK$' }).Count -ne 0) { throw 'HARD_STOP: expected seven finished migrations' }
  $tables = @(Sql "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;")
  $preCounts = foreach ($table in $tables) {
    if ($table -notmatch '^[A-Za-z0-9_]+$') { throw 'HARD_STOP: unexpected table name' }
    "$table=$(ScalarInt ('SELECT count(*) FROM public."' + $table + '";'))"
  }
  SaveLog 'pre-table-counts.log' ($preCounts -join "`n")
  $duplicateGroups = ScalarInt "SELECT count(*) FROM (SELECT organization_id FROM business_profiles WHERE publication_status='PUBLISHED' GROUP BY organization_id HAVING count(*) > 1) q;"
  $preIndex = ScalarInt "SELECT count(*) FROM pg_class i JOIN pg_namespace n ON n.oid=i.relnamespace WHERE n.nspname='public' AND i.relkind='i' AND i.relname='business_profile_one_published_per_organization_unique';"
  $preTriggers = ScalarInt "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal;"
  $preChecks = ScalarInt "SELECT count(*) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND c.contype='c';"
  SaveLog 'preflight.log' "duplicate_published_profile_groups=$duplicateGroups`nindex_count=$preIndex`nnon_internal_triggers=$preTriggers`ncheck_constraints=$preChecks"
  if ($duplicateGroups -ne 0 -or $preIndex -ne 0 -or $preTriggers -ne 13 -or $preChecks -ne 30) { throw 'HARD_STOP: Q8 preflight mismatch' }

  if (-not (Test-Path -LiteralPath $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
  $timestamp = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmss'Z'", [Globalization.CultureInfo]::InvariantCulture)
  if ($timestamp -notmatch '^20\d{6}T\d{6}Z$') { throw 'HARD_STOP: backup timestamp invalid' }
  $backupName = "mlino_v1_pre_q8_$timestamp.dump"
  $inside = "/tmp/$backupName"
  $backupPath = Join-Path $backupDir $backupName
  SaveLog 'backup-b3.log' (Docker @('exec', $dbContainer, 'pg_dump', '-U', 'mlino', '-d', 'mlino_v1', '-Fc', '-f', $inside))
  $b4 = Docker @('exec', $dbContainer, 'sh', '-c', "sha256sum $inside; pg_restore --list $inside | wc -l")
  SaveLog 'backup-b4.log' $b4
  $insideHash = ([regex]::Match($b4, '(?m)^([0-9a-f]{64})\s+')).Groups[1].Value
  $listCount = @($b4 -split "`r?`n" | Where-Object { $_ -match '^\d+$' } | Select-Object -Last 1)[0]
  if (-not $insideHash -or [int]$listCount -le 0) { throw 'HARD_STOP: backup contents invalid' }
  SaveLog 'backup-b5.log' (Docker @('cp', "$dbContainer`:$inside", $backupPath))
  $hostHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $backupPath).Hash.ToLowerInvariant()
  if ($hostHash -ne $insideHash) { throw 'HARD_STOP: backup SHA mismatch' }
  $size = (Get-Item -LiteralPath $backupPath).Length
  SaveLog 'backup-b6.log' (Docker @('exec', $dbContainer, 'rm', '-f', $inside))
  SaveLog 'backup-summary.log' "file=$backupName`nsize_bytes=$size`ncontainer_sha256=$insideHash`nhost_sha256=$hostHash`nrestore_list_count=$listCount"

  $status = RunPrisma 'migrate-status.log' @('migrate', 'status', '--schema', $schema)
  $pending = @($status.Output -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^\d{14}_[A-Za-z0-9_-]+$' } | Select-Object -Unique)
  if ($pending.Count -ne 1 -or $pending[0] -ne $migration) { throw 'HARD_STOP: expected exactly one pending Q8 migration' }

  $migrationAttempted = $true
  $deploy = RunPrisma 'migrate-deploy.log' @('migrate', 'deploy', '--schema', $schema)
  if ($deploy.ExitCode -ne 0) {
    $failedRow = @(Sql "SELECT migration_name || '|' || CASE WHEN finished_at IS NULL THEN 'UNFINISHED' ELSE 'FINISHED' END || '|' || CASE WHEN rolled_back_at IS NULL THEN 'NOT_ROLLED_BACK' ELSE 'ROLLED_BACK' END FROM public._prisma_migrations WHERE migration_name='$migration';")
    $indexAfterFailure = ScalarInt "SELECT count(*) FROM pg_class i JOIN pg_namespace n ON n.oid=i.relnamespace WHERE n.nspname='public' AND i.relkind='i' AND i.relname='business_profile_one_published_per_organization_unique';"
    SaveLog 'deploy-failure-state.log' "migration_rows=$($failedRow -join ';')`nindex_count=$indexAfterFailure"
    if ($indexAfterFailure -eq 0) {
      $resolve = RunPrisma 'migrate-resolve.log' @('migrate', 'resolve', '--rolled-back', $migration, '--schema', $schema)
      if ($resolve.ExitCode -ne 0) { throw 'HARD_STOP: migration resolution failed' }
      $resolved = $true
    }
    throw 'DEPLOY_FAILED: Q8 migration failed'
  }

  $postMigrations = @(Sql "SELECT migration_name || '|' || CASE WHEN finished_at IS NULL THEN 'UNFINISHED' ELSE 'FINISHED' END || '|' || CASE WHEN rolled_back_at IS NULL THEN 'NOT_ROLLED_BACK' ELSE 'ROLLED_BACK' END FROM public._prisma_migrations ORDER BY started_at, migration_name;")
  SaveLog 'post-migrations.log' ($postMigrations -join "`n")
  if ($postMigrations.Count -ne 8 -or @($postMigrations | Where-Object { $_ -notmatch '\|FINISHED\|NOT_ROLLED_BACK$' }).Count -ne 0) { throw 'POST_VERIFY_FAILED: migrations' }
  $postCounts = foreach ($table in $tables) { "$table=$(ScalarInt ('SELECT count(*) FROM public."' + $table + '";'))" }
  SaveLog 'post-table-counts.log' ($postCounts -join "`n")
  $beforeBusiness = @($preCounts | Where-Object { $_ -notmatch '^_prisma_migrations=' })
  $afterBusiness = @($postCounts | Where-Object { $_ -notmatch '^_prisma_migrations=' })
  if (Compare-Object $beforeBusiness $afterBusiness) { throw 'POST_VERIFY_FAILED: business table count changed' }
  if (@($postCounts | Where-Object { $_ -eq '_prisma_migrations=8' }).Count -ne 1) { throw 'POST_VERIFY_FAILED: migration bookkeeping count' }
  $index = ScalarString "SELECT (x.indisunique::text) || '|' || (x.indisvalid::text) || '|' || pg_get_expr(x.indpred,x.indrelid) FROM pg_class i JOIN pg_index x ON x.indexrelid=i.oid JOIN pg_namespace n ON n.oid=i.relnamespace WHERE n.nspname='public' AND i.relname='business_profile_one_published_per_organization_unique';"
  $postTriggers = ScalarInt "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal;"
  $postChecks = ScalarInt "SELECT count(*) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND c.contype='c';"
  SaveLog 'post-index-and-constraints.log' "index=$index`nnon_internal_triggers=$postTriggers`ncheck_constraints=$postChecks"
  if ($index -notmatch '^true\|true\|.*publication_status.*PUBLISHED' -or $postTriggers -ne 13 -or $postChecks -ne 30) { throw 'POST_VERIFY_FAILED: index or constraints' }
  $postContainers = @(InspectContainers)
  SaveLog 'post-containers.log' ($postContainers -join "`n")
  if (Compare-Object $preContainers $postContainers) { throw 'POST_VERIFY_FAILED: container metadata changed' }
  $httpStatus = & curl.exe '-s' '-o' 'NUL' '-w' '%{http_code}' 'http://localhost:3000/'
  SaveLog 'read-api-http.log' "HTTP_STATUS=$httpStatus"
  if ($LASTEXITCODE -ne 0 -or $httpStatus -ne '401') { throw 'POST_VERIFY_FAILED: unauthenticated read API' }
  $badLogs = @(Get-ChildItem -LiteralPath $evidence -Filter '*.log' -File | Where-Object { $body = [IO.File]::ReadAllText($_.FullName); $body -match '://' -or $body -match '(?i)password' })
  if ($badLogs.Count -ne 0) { throw 'POST_VERIFY_FAILED: evidence redaction' }
  SaveLog 'redaction-check.log' 'REDACTION_CHECK=PASS; URL_AND_PASSWORD_PATTERNS=ABSENT'
  $result = 'PASS'
}
catch {
  $result = if ($migrationAttempted) { 'FAIL_OR_HARD_STOP' } else { 'HARD_STOP_BEFORE_MIGRATION' }
  SaveLog 'execution-error.log' "STATUS=$result`nMESSAGE=$($_.Exception.Message)`nROLLED_BACK_RESOLUTION=$resolved"
  Write-Output "STATUS=$result"
  exit 1
}
finally {
  $script:databaseUrl = $null
  SaveLog 'execution-summary.log' "STATUS=$result`nMIGRATION=$migration`nBACKUP_FILE=$backupName`nMIGRATION_ATTEMPTED=$migrationAttempted`nROLLED_BACK_RESOLUTION=$resolved`nDATABASE_URL_RETAINED=false"
}
Write-Output "STATUS=$result"
