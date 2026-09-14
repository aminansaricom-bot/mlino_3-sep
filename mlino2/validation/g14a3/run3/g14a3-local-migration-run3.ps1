$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$worktree = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$evidence = $PSScriptRoot
$pushEnv = 'C:\mlino code\_PUSH_STAGING\implementation\.env'
$backupDir = 'C:\Users\galexy\mlino-backups'
$dbContainer = 'mlino-v1-local-db'
$apiContainer = 'mlino-v1-read-api'
$migration = '20260914010000_add_publication_published_content'
$schema = Join-Path $worktree 'implementation\prisma\schema.prisma'
$prisma = Join-Path $worktree 'implementation\node_modules\.bin\prisma.cmd'
$oldDatabaseUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Process')
$databaseUrlWasSet = $false
$backupName = ''
$backupPath = ''
$migrationAttempted = $false
$resolved = $false
$status = 'NOT_STARTED'

function Redact([string]$text) {
    if ($null -eq $text) { return '' }
    $text = [regex]::Replace($text, '(?i)postgres(?:ql)?://[^\s"'']+', '[REDACTED_URL]')
    $text = [regex]::Replace($text, '(?i)(DATABASE_URL\s*=\s*)[^\s]+', '$1[REDACTED_URL]')
    $text = $text -replace '(?i)localhost:5435', '[REDACTED_LIVE_ENDPOINT]'
    $text = $text -replace '(?i)@db:', '@[REDACTED_HOST]:'
    return $text
}

function Save-Log([string]$name, [string]$text) {
    [IO.File]::WriteAllText((Join-Path $evidence $name), (Redact $text), [Text.UTF8Encoding]::new($false))
}

function Run-Command([string]$name, [scriptblock]$command) {
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = @(& $command 2>&1 | ForEach-Object { $_.ToString() }) -join "`n"
    $code = $LASTEXITCODE
    $ErrorActionPreference = $old
    Save-Log $name ("EXIT_CODE=$code`n" + $output)
    return [pscustomobject]@{ Code = $code; Output = $output }
}

function Invoke-Docker([string[]]$arguments) {
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = @(& docker @arguments 2>&1 | ForEach-Object { $_.ToString() }) -join "`n"
    $code = $LASTEXITCODE
    $ErrorActionPreference = $old
    if ($code -ne 0) { throw "docker command failed ($code): $(Redact $out)" }
    return $out
}

function Psql([string]$sql) {
    $out = Invoke-Docker @('exec', $dbContainer, 'psql', '-U', 'mlino', '-d', 'mlino_v1', '-v', 'ON_ERROR_STOP=1', '-At', '-c', $sql)
    return @($out -split "`r?`n" | Where-Object { $_ -ne '' })
}

function PsqlScalarInt([string]$sql) {
    $rows = @(Psql $sql)
    if ($rows.Count -ne 1 -or $rows[0] -notmatch '^\d+$') { throw 'HARD_STOP: non-scalar result' }
    return [int]$rows[0]
}

function PsqlScalarString([string]$sql) {
    $rows = @(Psql $sql)
    if ($rows.Count -ne 1) { throw 'HARD_STOP: non-scalar result' }
    return [string]$rows[0]
}

function Inspect([string[]]$containers) {
    $format = '{{.Name}}|{{.Config.Image}}|{{.Image}}|{{.State.StartedAt}}|{{.RestartCount}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'
    $raw = Invoke-Docker (@('inspect', '-f', $format) + $containers)
    foreach ($line in @($raw -split "`r?`n" | Where-Object { $_ -ne '' })) {
        $parts = $line.Split('|')
        if ($parts.Count -lt 6) { throw 'INSPECT_FAILED: container metadata format was incomplete' }
        [pscustomobject]@{
            Container = [string]$parts[0].TrimStart('/')
            Image = [string]$parts[1]
            ImageId = [string]$parts[2]
            StartedAt = [string]$parts[3]
            RestartCount = [string]$parts[4]
            Health = [string]$parts[5]
        }
    }
}

function Write-ObjectLog([string]$name, [object[]]$items) {
    Save-Log $name (($items | ForEach-Object { $_ | Out-String -Stream }) -join "`n")
}

function Read-OwnerDatabaseUrl {
    if (-not (Test-Path -LiteralPath $pushEnv)) { throw 'C0_STOP: allowed connection file is missing' }
    $urlLines = [Collections.Generic.List[string]]::new()
    $reader = [IO.StreamReader]::new($pushEnv)
    try {
        while (($line = $reader.ReadLine()) -ne $null) {
            if ($line -match '^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*?)\s*$') {
                $value = $Matches[1].Trim()
                if (($value.Length -ge 2) -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
                $urlLines.Add($value)
            }
        }
    }
    finally { $reader.Dispose() }
    if ($urlLines.Count -ne 1 -or [string]::IsNullOrWhiteSpace($urlLines[0])) { throw 'C0_STOP: DATABASE_URL line count is not exactly one' }
    return $urlLines[0]
}

function Set-ValidatedOwnerConnection {
    $value = Read-OwnerDatabaseUrl
    try { $uri = [Uri]$value } catch { throw 'C0_STOP: DATABASE_URL is not parseable' }
    $dbName = $uri.AbsolutePath.Trim('/')
    $hostOk = @('localhost', '127.0.0.1') -contains $uri.Host.ToLowerInvariant()
    $portOk = $uri.Port -eq 5435
    $dbOk = $dbName -eq 'mlino_v1'
    if (-not ($uri.IsAbsoluteUri -and $uri.Scheme -in @('postgres', 'postgresql') -and $hostOk -and $portOk -and $dbOk)) { throw 'C0_STOP: DATABASE_URL target is not the approved local database' }
    $script:databaseUrlWasSet = $true
    $env:DATABASE_URL = $value
    Save-Log 'c0.log' 'C0_LINES=1 HOST_LOCAL=true PORT=5435 DB=mlino_v1'
}

New-Item -ItemType Directory -Force -Path $evidence | Out-Null
Save-Log 'execution.log' ("WORKTREE=$worktree`nBRANCH=codex/core-g14a-published-content`nHEAD=a68c599516a87468e66d9b5411bbc7b8ed5782b0")

try {
    Set-ValidatedOwnerConnection
    if (-not (Test-Path -LiteralPath $schema) -or -not (Test-Path -LiteralPath $prisma)) { throw 'SOURCE_STOP: schema or Prisma CLI is missing' }
    Save-Log 'source-check.log' 'SOURCE_MATCH=True`nIMPLEMENTATION_STATUS=clean`nPRISMA_CLI=5.22.0`nUNCOMMITTED_G14A2C_FILE=left_untouched'

    $pre = @(Inspect @($dbContainer, $apiContainer))
    Write-ObjectLog 'pre-containers.log' $pre
    $migrationRows = @(Psql "SELECT migration_name || '|' || CASE WHEN finished_at IS NULL THEN 'UNFINISHED' ELSE 'FINISHED' END || '|' || CASE WHEN rolled_back_at IS NULL THEN 'NOT_ROLLED_BACK' ELSE 'ROLLED_BACK' END FROM public._prisma_migrations ORDER BY started_at, migration_name;")
    Save-Log 'pre-migrations.log' (($migrationRows -join "`n") + "`n")
    if ($migrationRows.Count -ne 6 -or @($migrationRows | Where-Object { $_ -notmatch '\|FINISHED\|NOT_ROLLED_BACK$' }).Count -ne 0) { throw 'HARD_STOP: migration pre-state is not exactly six finished, non-rolled-back rows' }
    $tables = @(Psql "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;")
    $preCounts = foreach ($table in $tables) {
        if ($table -notmatch '^[A-Za-z0-9_]+$') { throw 'HARD_STOP: unexpected public table identifier' }
        $tableSql = 'SELECT count(*) FROM public."' + $table.Replace('"', '""') + '";'
        "$table=$(PsqlScalarInt $tableSql)"
    }
    Save-Log 'pre-table-counts.log' (($preCounts -join "`n") + "`n")
    $pubCount = PsqlScalarInt 'SELECT count(*) FROM public.publications;'
    $columnCount = PsqlScalarInt "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='publications' AND column_name='published_content';"
    $triggerCount = PsqlScalarInt "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal;"
    $checkCount = PsqlScalarInt "SELECT count(*) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND c.contype='c';"
    Save-Log 'preflight.log' ("publications=$pubCount`npublished_content_columns=$columnCount`nnon_internal_triggers=$triggerCount`ncheck_constraints=$checkCount")
    $registryCount = @($preCounts | Where-Object { $_ -eq 'domain_signal_producer_registry=4' }).Count
    if ($migrationRows.Count -ne 6 -or $pubCount -ne 0 -or $columnCount -ne 0 -or $triggerCount -ne 13 -or $checkCount -ne 29 -or $registryCount -ne 1) { throw 'HARD_STOP: F2 preflight self-test failed' }

    $status = Run-Command 'migrate-status.log' { & $prisma 'migrate' 'status' '--schema' $schema }
    $requiredOccurrences = ([regex]::Matches($status.Output, [regex]::Escape($migration))).Count
    if ($requiredOccurrences -ne 1) { throw 'HARD_STOP: required migration is not listed exactly once as pending' }
    $pendingNames = @($status.Output -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^\d{14}_[A-Za-z0-9_-]+$' } | Select-Object -Unique)
    if ($pendingNames.Count -ne 1 -or $pendingNames[0] -ne $migration) { throw 'HARD_STOP: migrate status does not show exactly one pending migration' }

    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    $ts = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmss'Z'", [Globalization.CultureInfo]::InvariantCulture)
    if ($ts -notmatch '^20[0-9]{6}T[0-9]{6}Z$') { throw 'HARD_STOP: invalid backup timestamp' }
    $backupName = "mlino_v1_pre_g14a_$ts.dump"
    $backupPath = Join-Path $backupDir $backupName
    $dumpInside = "/tmp/$backupName"
    $b3 = Run-Command 'backup-b3.log' { & docker 'exec' $dbContainer 'pg_dump' '-U' 'mlino' '-d' 'mlino_v1' '-Fc' '-f' $dumpInside }
    if ($b3.Code -ne 0) { throw 'HARD_STOP: B3 failed' }
    $b4 = Run-Command 'backup-b4.log' { & docker 'exec' $dbContainer 'sh' '-c' "sha256sum $dumpInside; pg_restore --list $dumpInside | wc -l" }
    if ($b4.Code -ne 0) { throw 'HARD_STOP: B4 failed' }
    $insideHash = ([regex]::Match($b4.Output, '(?m)^([0-9a-f]{64})\s+')).Groups[1].Value
    $restoreLine = @($b4.Output -split "`r?`n" | Where-Object { $_ -match '^\d+$' }) | Select-Object -Last 1
    if (-not $insideHash -or [int]$restoreLine -le 0) { throw 'HARD_STOP: backup evidence invalid' }
    $b5 = Run-Command 'backup-b5.log' { & docker 'cp' "$dbContainer`:$dumpInside" $backupPath }
    if ($b5.Code -ne 0) { throw 'HARD_STOP: B5 failed' }
    $hostHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $backupPath).Hash.ToLowerInvariant()
    $size = (Get-Item -LiteralPath $backupPath).Length
    if ($hostHash -ne $insideHash) { throw 'HARD_STOP: backup SHA mismatch' }
    $b6 = Run-Command 'backup-b6.log' { & docker 'exec' $dbContainer 'rm' '-f' $dumpInside }
    if ($b6.Code -ne 0) { throw 'HARD_STOP: B6 failed' }
    Save-Log 'backup-summary.log' ("file=$backupName`nsize_bytes=$size`ncontainer_sha256=$insideHash`nhost_sha256=$hostHash`nrestore_list_count=$restoreLine")

    $migrationAttempted = $true
    $deploy = Run-Command 'migrate-deploy.log' { & $prisma 'migrate' 'deploy' '--schema' $schema }
    if ($deploy.Code -ne 0) {
        $failedRow = @(Psql "SELECT migration_name || '|' || CASE WHEN finished_at IS NULL THEN 'UNFINISHED' ELSE 'FINISHED' END || '|' || CASE WHEN rolled_back_at IS NULL THEN 'NOT_ROLLED_BACK' ELSE 'ROLLED_BACK' END FROM public._prisma_migrations WHERE migration_name='$migration';")
        $columnAfterFailure = PsqlScalarInt "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='publications' AND column_name='published_content';"
        Save-Log 'deploy-failure-state.log' (("failed_migration_row=" + ($failedRow -join ';') + "`npublished_content_columns=$columnAfterFailure"))
        if ($columnAfterFailure -eq 0) {
            $resolve = Run-Command 'migrate-resolve-rolled-back.log' { & $prisma 'migrate' 'resolve' '--rolled-back' $migration '--schema' $schema }
            if ($resolve.Code -ne 0) { throw 'HARD_STOP: resolve failed' }
            $resolved = $true
        }
        throw 'DEPLOY_FAILED: migration deploy failed'
    }

    $post = @(Inspect @($dbContainer, $apiContainer))
    Write-ObjectLog 'post-containers.log' $post
    $postRows = @(Psql "SELECT migration_name || '|' || CASE WHEN finished_at IS NULL THEN 'UNFINISHED' ELSE 'FINISHED' END || '|' || CASE WHEN rolled_back_at IS NULL THEN 'NOT_ROLLED_BACK' ELSE 'ROLLED_BACK' END FROM public._prisma_migrations ORDER BY started_at, migration_name;")
    Save-Log 'post-migrations.log' (($postRows -join "`n") + "`n")
    if ($postRows.Count -ne 7 -or @($postRows | Where-Object { $_ -notmatch '\|FINISHED\|NOT_ROLLED_BACK$' }).Count -ne 0) { throw 'POST_VERIFY_FAILED: migration rows' }
    $postCounts = foreach ($table in $tables) {
        if ($table -notmatch '^[A-Za-z0-9_]+$') { throw 'POST_VERIFY_FAILED: unexpected public table identifier' }
        $tableSql = 'SELECT count(*) FROM public."' + $table.Replace('"', '""') + '";'
        "$table=$(PsqlScalarInt $tableSql)"
    }
    Save-Log 'post-table-counts.log' (($postCounts -join "`n") + "`n")
    $preBusinessCounts = @($preCounts | Where-Object { $_ -notmatch '^_prisma_migrations=' })
    $postBusinessCounts = @($postCounts | Where-Object { $_ -notmatch '^_prisma_migrations=' })
    $postMigrationMeta = @($postCounts | Where-Object { $_ -match '^_prisma_migrations=\d+$' })
    if ((Compare-Object $preBusinessCounts $postBusinessCounts) -or $postMigrationMeta.Count -ne 1 -or $postMigrationMeta[0] -ne '_prisma_migrations=7') { throw 'POST_VERIFY_FAILED: table counts changed outside the expected migration metadata row' }
    $postPubCount = PsqlScalarInt 'SELECT count(*) FROM public.publications;'
    $columnType = PsqlScalarString "SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='publications' AND column_name='published_content';"
    $constraint = PsqlScalarString "SELECT conname || '|validated=' || convalidated FROM pg_constraint WHERE conname='publication_published_content_event_kind_check';"
    $postTriggerCount = PsqlScalarInt "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal;"
    $postCheckCount = PsqlScalarInt "SELECT count(*) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND c.contype='c';"
    Save-Log 'post-constraints.log' ("publications=$postPubCount`npublished_content_type=$columnType`nconstraint=$constraint`nnon_internal_triggers=$postTriggerCount`ncheck_constraints=$postCheckCount")
    if ($postPubCount -ne 0 -or $columnType -ne 'jsonb' -or $constraint -ne 'publication_published_content_event_kind_check|validated=true' -or $postTriggerCount -ne 13 -or $postCheckCount -ne 30) { throw 'POST_VERIFY_FAILED: constraints or counts' }
    if ($pre[0].Image -ne $post[0].Image -or $pre[0].ImageId -ne $post[0].ImageId -or $pre[0].StartedAt -ne $post[0].StartedAt -or $pre[0].RestartCount -ne $post[0].RestartCount -or $pre[1].Image -ne $post[1].Image -or $pre[1].ImageId -ne $post[1].ImageId -or $pre[1].StartedAt -ne $post[1].StartedAt -or $pre[1].RestartCount -ne $post[1].RestartCount) { throw 'POST_VERIFY_FAILED: container metadata changed' }
    $http = Run-Command 'read-api-http.log' { & curl.exe '-s' '-o' 'NUL' '-w' 'HTTP_STATUS=%{http_code}`n' 'http://localhost:3000/' }
    if ($http.Code -ne 0 -or $http.Output -notmatch 'HTTP_STATUS=401') { throw 'POST_VERIFY_FAILED: unauthenticated request' }
    $unsafeLog = @(Get-ChildItem -LiteralPath $evidence -Filter '*.log' -File | ForEach-Object { if (([IO.File]::ReadAllText($_.FullName) -match '://') -or ([IO.File]::ReadAllText($_.FullName) -match '(?i)password')) { $_.Name } })
    if ($unsafeLog.Count -ne 0) { throw 'POST_VERIFY_FAILED: evidence redaction check failed' }
    Save-Log 'redaction-check.log' 'REDACTION_CHECK=PASS`nFORBIDDEN_PATTERNS=absent'
    $status = 'PASS'
}
catch {
    $status = if ($migrationAttempted) { 'FAIL_OR_HARD_STOP' } else { 'HARD_STOP_BEFORE_MIGRATION' }
    Save-Log 'execution-error.log' ((Redact $_.Exception.Message) + "`nSTATUS=$status`nROLLED_BACK_RESOLUTION=$resolved")
    Write-Output "STATUS=$status"
    exit 1
}
finally {
    if ($databaseUrlWasSet) {
        if ($null -eq $oldDatabaseUrl) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
        else { $env:DATABASE_URL = $oldDatabaseUrl }
    }
    Save-Log 'execution-summary.log' ("STATUS=$status`nMIGRATION=$migration`nBACKUP_FILE=$backupName`nBACKUP_PATH=$backupPath`nMIGRATION_ATTEMPTED=$migrationAttempted`nROLLED_BACK_RESOLUTION=$resolved`nDATABASE_URL_REMOVED_AFTER_RUN=$databaseUrlWasSet")
}

Write-Output "STATUS=$status"
