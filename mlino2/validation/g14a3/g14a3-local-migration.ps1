$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$worktree = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$evidence = $PSScriptRoot
$backupDir = 'C:\Users\galexy\mlino-backups'
$dbContainer = 'mlino-v1-local-db'
$apiContainer = 'mlino-v1-read-api'
$migration = '20260914010000_add_publication_published_content'
$schema = Join-Path $worktree 'implementation\prisma\schema.prisma'
$prisma = Join-Path $worktree 'implementation\node_modules\.bin\prisma.cmd'
$envFiles = @(
    (Join-Path $worktree 'implementation\.env'),
    (Join-Path $worktree 'implementation\prisma\.env')
)
$env:CHECKPOINT_DISABLE = '1'
$env:PRISMA_GENERATE_SKIP_AUTOINSTALL = '1'

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

function Docker([string[]]$args) {
    $old = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = @(& docker @args 2>&1 | ForEach-Object { $_.ToString() }) -join "`n"
    $code = $LASTEXITCODE
    $ErrorActionPreference = $old
    if ($code -ne 0) { throw "docker command failed ($code): $(Redact $out)" }
    return $out
}

function Psql([string]$sql) {
    $out = Docker @('exec', $dbContainer, 'psql', '-U', 'mlino', '-d', 'mlino_v1', '-v', 'ON_ERROR_STOP=1', '-At', '-c', $sql)
    return ($out -split "`r?`n" | Where-Object { $_ -ne '' })
}

function Inspect([string]$container) {
    $raw = Docker @('inspect', $container)
    $item = $raw | ConvertFrom-Json | Select-Object -First 1
    $health = if ($item.State.Health) { $item.State.Health.Status } else { 'none' }
    return [pscustomobject]@{
        Container = $container
        Image = [string]$item.Config.Image
        ImageId = [string]$item.Image
        StartedAt = [string]$item.State.StartedAt
        RestartCount = [string]$item.RestartCount
        Health = [string]$health
    }
}

function Write-ObjectLog([string]$name, [object[]]$items) {
    Save-Log $name (($items | ForEach-Object { $_ | Out-String -Stream }) -join "`n")
}

New-Item -ItemType Directory -Force -Path $evidence | Out-Null
$envFileState = $envFiles | ForEach-Object { "$_ exists=$(Test-Path $_)" }
Save-Log 'execution.log' ((@("WORKTREE=$worktree", "PROCESS_DATABASE_URL_SET=$([bool]$env:DATABASE_URL)") + $envFileState) -join "`n")
Save-Log 'pre-implementation-status.log' 'NOT_RUN: existing DB connection value was unavailable before Prisma status.'

$pre = $null
$backupName = $null
$backupPath = $null
$migrationAttempted = $false
$resolved = $false
$status = 'NOT_STARTED'

try {
    # Step 1 was completed before this script by the caller; preserve its evidence separately.
    if (-not $env:DATABASE_URL -and -not (@($envFiles | Where-Object { Test-Path $_ }).Count -gt 0)) {
        throw 'HARD_STOP: existing DB connection value is unavailable in the process or allowed worktree env files'
    }
    $preStatus = Run-Command 'pre-implementation-status.log' { & $prisma 'migrate' 'status' '--schema' $schema }

    $pre = @(Inspect $dbContainer; Inspect $apiContainer)
    Write-ObjectLog 'pre-containers.log' $pre

    $migrationRows = @(Psql "SELECT migration_name || '|' || CASE WHEN finished_at IS NULL THEN 'UNFINISHED' ELSE 'FINISHED' END || '|' || CASE WHEN rolled_back_at IS NULL THEN 'NOT_ROLLED_BACK' ELSE 'ROLLED_BACK' END FROM public._prisma_migrations ORDER BY started_at, migration_name;")
    Save-Log 'pre-migrations.log' (($migrationRows -join "`n") + "`n")
    if ($migrationRows.Count -ne 6 -or @($migrationRows | Where-Object { $_ -notmatch '\|FINISHED\|NOT_ROLLED_BACK$' }).Count -ne 0) { throw 'HARD_STOP: migration pre-state is not exactly six finished, non-rolled-back rows' }

    $tables = @(Psql "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;")
    $preCounts = foreach ($table in $tables) {
        $quoted = $table.Replace('"', '""')
        "$table=$((Psql "SELECT count(*) FROM public.`"$quoted`";")[0])"
    }
    Save-Log 'pre-table-counts.log' (($preCounts -join "`n") + "`n")
    $pubCount = [int](Psql 'SELECT count(*) FROM public.publications;')[0]
    $publishedContentColumns = [int](Psql "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='publications' AND column_name='published_content';")[0]
    $triggerCount = [int](Psql "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal;")[0]
    $checkCount = [int](Psql "SELECT count(*) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND c.contype='c';")[0]
    Save-Log 'preflight.log' ("publications=$pubCount`npublished_content_columns=$publishedContentColumns`nnon_internal_triggers=$triggerCount`ncheck_constraints=$checkCount")
    if ($pubCount -ne 0) { throw 'HARD_STOP: publications is not empty' }
    if ($publishedContentColumns -ne 0) { throw 'HARD_STOP: publications.published_content already exists' }
    if ($triggerCount -ne 13) { throw "HARD_STOP: expected 13 non-internal triggers, found $triggerCount" }

    if ($preStatus.Output -notmatch [regex]::Escape($migration)) { throw 'HARD_STOP: migrate status does not identify the required pending migration' }
    $pendingNames = [regex]::Matches($preStatus.Output, '\b20\d{12}_[A-Za-z0-9_-]+\b') | ForEach-Object { $_.Value } | Select-Object -Unique
    if (@($pendingNames).Count -ne 1 -or $pendingNames[0] -ne $migration) { throw "HARD_STOP: migrate status does not show exactly one pending migration ($migration)" }

    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    $ts = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmss'Z'")
    if ($ts -notmatch '^20[0-9]{6}T[0-9]{6}Z$') { throw 'HARD_STOP: invalid backup timestamp' }
    $backupName = "mlino_v1_pre_g14a_$ts.dump"
    $backupPath = Join-Path $backupDir $backupName
    $dumpInside = "/tmp/$backupName"
    $b3 = Run-Command 'backup-b3.log' { & docker 'exec' $dbContainer 'pg_dump' '-U' 'mlino' '-d' 'mlino_v1' '-Fc' '-f' $dumpInside }
    if ($b3.Code -ne 0) { throw 'HARD_STOP: B3 pg_dump failed' }
    $b4 = Run-Command 'backup-b4.log' { & docker 'exec' $dbContainer 'sh' '-c' "sha256sum $dumpInside; pg_restore --list $dumpInside | wc -l" }
    if ($b4.Code -ne 0) { throw 'HARD_STOP: B4 verification failed' }
    $insideHash = ([regex]::Match($b4.Output, '(?m)^([0-9a-f]{64})\s+')).Groups[1].Value
    $restoreLine = @($b4.Output -split "`r?`n" | Where-Object { $_ -match '^\d+$' }) | Select-Object -Last 1
    if (-not $insideHash -or [int]$restoreLine -le 0) { throw 'HARD_STOP: backup hash or restore-list count invalid' }
    $b5 = Run-Command 'backup-b5.log' { & docker 'cp' "$dbContainer`:$dumpInside" $backupPath }
    if ($b5.Code -ne 0) { throw 'HARD_STOP: B5 docker cp failed' }
    $hostHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $backupPath).Hash.ToLowerInvariant()
    $size = (Get-Item -LiteralPath $backupPath).Length
    if ($hostHash -ne $insideHash) { throw 'HARD_STOP: backup SHA-256 mismatch' }
    $b6 = Run-Command 'backup-b6.log' { & docker 'exec' $dbContainer 'rm' '-f' $dumpInside }
    if ($b6.Code -ne 0) { throw 'HARD_STOP: B6 cleanup failed' }
    Save-Log 'backup-summary.log' ("file=$backupName`nsize_bytes=$size`ncontainer_sha256=$insideHash`nhost_sha256=$hostHash`nrestore_list_count=$restoreLine")

    $migrationAttempted = $true
    $deploy = Run-Command 'migrate-deploy.log' { & $prisma 'migrate' 'deploy' '--schema' $schema }
    if ($deploy.Code -ne 0) {
        $failedRow = @(Psql "SELECT migration_name || '|' || CASE WHEN finished_at IS NULL THEN 'UNFINISHED' ELSE 'FINISHED' END || '|' || CASE WHEN rolled_back_at IS NULL THEN 'NOT_ROLLED_BACK' ELSE 'ROLLED_BACK' END FROM public._prisma_migrations WHERE migration_name='$migration';")
        $columnAfterFailure = [int](Psql "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='publications' AND column_name='published_content';")[0]
        Save-Log 'deploy-failure-state.log' (("failed_migration_row=" + ($failedRow -join ';') + "`npublished_content_columns=$columnAfterFailure`n") )
        if ($columnAfterFailure -eq 0) {
            $resolve = Run-Command 'migrate-resolve-rolled-back.log' { & $prisma 'migrate' 'resolve' '--rolled-back' $migration '--schema' $schema }
            if ($resolve.Code -ne 0) { throw 'HARD_STOP: deploy failed and rollback resolution failed' }
            $resolved = $true
        }
        throw 'DEPLOY_FAILED: migration deploy failed; report and stop'
    }

    $post = @(Inspect $dbContainer; Inspect $apiContainer)
    Write-ObjectLog 'post-containers.log' $post
    $postRows = @(Psql "SELECT migration_name || '|' || CASE WHEN finished_at IS NULL THEN 'UNFINISHED' ELSE 'FINISHED' END || '|' || CASE WHEN rolled_back_at IS NULL THEN 'NOT_ROLLED_BACK' ELSE 'ROLLED_BACK' END FROM public._prisma_migrations ORDER BY started_at, migration_name;")
    Save-Log 'post-migrations.log' (($postRows -join "`n") + "`n")
    if ($postRows.Count -ne 7 -or @($postRows | Where-Object { $_ -notmatch '\|FINISHED\|NOT_ROLLED_BACK$' }).Count -ne 0) { throw 'POST_VERIFY_FAILED: migrations are not exactly seven finished, non-rolled-back rows' }
    $postCounts = foreach ($table in $tables) {
        $quoted = $table.Replace('"', '""')
        "$table=$((Psql "SELECT count(*) FROM public.`"$quoted`";")[0])"
    }
    Save-Log 'post-table-counts.log' (($postCounts -join "`n") + "`n")
    if ((Compare-Object $preCounts $postCounts)) { throw 'POST_VERIFY_FAILED: table counts changed' }
    $postPubCount = [int](Psql 'SELECT count(*) FROM public.publications;')[0]
    $columnType = [string](Psql "SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='publications' AND column_name='published_content';")[0]
    $constraint = [string](Psql "SELECT conname || '|validated=' || convalidated FROM pg_constraint WHERE conname='publication_published_content_event_kind_check';")[0]
    $postTriggerCount = [int](Psql "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal;")[0]
    $postCheckCount = [int](Psql "SELECT count(*) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND c.contype='c';")[0]
    Save-Log 'post-constraints.log' ("publications=$postPubCount`npublished_content_type=$columnType`nconstraint=$constraint`nnon_internal_triggers=$postTriggerCount`ncheck_constraints=$postCheckCount")
    if ($postPubCount -ne 0 -or $columnType -ne 'jsonb' -or $constraint -ne 'publication_published_content_event_kind_check|validated=true' -or $postTriggerCount -ne $triggerCount -or $postCheckCount -ne ($checkCount + 1)) { throw 'POST_VERIFY_FAILED: constraint or count verification failed' }
    if ($pre[0].Image -ne $post[0].Image -or $pre[0].ImageId -ne $post[0].ImageId -or $pre[0].StartedAt -ne $post[0].StartedAt -or $pre[0].RestartCount -ne $post[0].RestartCount -or $pre[1].Image -ne $post[1].Image -or $pre[1].ImageId -ne $post[1].ImageId -or $pre[1].StartedAt -ne $post[1].StartedAt -or $pre[1].RestartCount -ne $post[1].RestartCount) { throw 'POST_VERIFY_FAILED: container runtime metadata changed' }
    $http = Run-Command 'read-api-http.log' { & curl.exe '-s' '-o' 'NUL' '-w' 'HTTP_STATUS=%{http_code}`n' 'http://localhost:3000/' }
    if ($http.Code -ne 0 -or $http.Output -notmatch 'HTTP_STATUS=401') { throw 'POST_VERIFY_FAILED: unauthenticated read-api request was not 401' }
    $status = 'PASS'
}
catch {
    $status = if ($migrationAttempted) { 'FAIL_OR_HARD_STOP' } else { 'HARD_STOP_BEFORE_MIGRATION' }
    Save-Log 'execution-error.log' ((Redact $_.Exception.Message) + "`nSTATUS=$status`nRESOLVED_ROLLED_BACK=$resolved")
    Write-Output "STATUS=$status"
    exit 1
}
finally {
    Save-Log 'execution-summary.log' ("STATUS=$status`nMIGRATION=$migration`nBACKUP_FILE=$backupName`nBACKUP_PATH=$backupPath`nMIGRATION_ATTEMPTED=$migrationAttempted`nROLLED_BACK_RESOLUTION=$resolved")
}

Write-Output "STATUS=$status"
