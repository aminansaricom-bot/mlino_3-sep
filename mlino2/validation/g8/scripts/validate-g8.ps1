$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..'
$logs = Join-Path $root 'logs'
$failures = [System.Collections.Generic.List[string]]::new()
function Require([bool]$Condition, [string]$Message) { if (-not $Condition) { $failures.Add($Message) } }

$preCounts = @(Get-Content (Join-Path $logs 'pre-table-counts.log') | Where-Object { $_ -match '^[^|]+\|\d+$' })
$postCounts = @(Get-Content (Join-Path $logs 'post-table-counts.log') | Where-Object { $_ -match '^[^|]+\|\d+$' })
$countDiff = Compare-Object $preCounts $postCounts
Require (@($countDiff).Count -eq 0) 'table row counts changed after rebuild'
Require ($postCounts.Count -eq 22) "expected 22 public tables, found $($postCounts.Count)"

$migrations = @(Get-Content (Join-Path $logs 'post-migrations.log') | Where-Object { $_ -match '^20[0-9]{12}_.+\|' })
Require ($migrations.Count -eq 6) "expected 6 migrations, found $($migrations.Count)"
Require ((@($migrations | Where-Object { $_ -match '\|$' })).Count -eq 6) 'migration ledger contains non-empty rollback marker'

$migrateLogs = Get-Content (Join-Path $logs 'v1-migrate-logs.log')
Require ((@($migrateLogs | Select-String -SimpleMatch 'No pending migrations to apply').Count) -eq 1) 'v1-migrate was not a no-op'

$preRuntime = Get-Content (Join-Path $logs 'pre-runtime-state.log')
$afterRuntime = Get-Content (Join-Path $logs 'runtime-state-after.log')
$oldImage = ($preRuntime | Where-Object { $_ -like 'READ_API_IMAGE=*' }).Substring(15)
$newImage = ($afterRuntime | Where-Object { $_ -like 'READ_API_IMAGE=*' }).Substring(15)
$oldDbStart = ($preRuntime | Where-Object { $_ -like 'DB_STARTED=*' }).Substring(11)
$newDbStart = ($afterRuntime | Where-Object { $_ -like 'DB_STARTED=*' }).Substring(11)
$oldVolume = ($preRuntime | Where-Object { $_ -like 'DB_VOLUME=*' }).Substring(10)
$newVolume = ($afterRuntime | Where-Object { $_ -like 'DB_VOLUME=*' }).Substring(10).Trim()
Require ($newImage -ne $oldImage) 'read API image did not change'
Require ($newImage -ne '') 'new read API image is empty'
Require ($newDbStart -eq $oldDbStart) 'database container was recreated'
Require ($newVolume -like "*$oldVolume*") 'database volume changed'
Require ((($afterRuntime | Where-Object { $_ -like 'DB_RESTARTS=*' }).Substring(12)) -eq '0') 'database restart count changed'

$apiLogs = Get-Content (Join-Path $logs 'read-api-logs.log')
Require ((@($apiLogs | Select-String -Pattern 'Prisma|P[0-9]{4}|schema engine|migration' -CaseSensitive:$false)).Count -eq 0) 'Prisma error pattern in read API logs'
$http = (Get-Content (Join-Path $logs 'read-api-http.log') -Raw).Trim()
Require ($http -eq 'HTTP_STATUS=401') "unexpected unauthenticated API response: $http"
$tag = Get-Content (Join-Path $logs 'pre-g8-tag.log')
Require (($tag -match 'sha256:6e092dddeeecbd09579005db577204338b4d9e67d3f1271d5baf3416f6283c84')) 'pre-g8 tag verification missing'

$result = if ($failures.Count -eq 0) { 'PASS' } else { 'FAIL' }
$summary = @(
  "RESULT=$result",
  "COUNTS_IDENTICAL=$(@($countDiff).Count -eq 0)",
  'MIGRATIONS=6_FINISHED_NO_PENDING',
  "READ_API_IMAGE_CHANGED=$($newImage -ne $oldImage)",
  "DB_CONTAINER_RECREATED=$($newDbStart -ne $oldDbStart)",
  "DB_VOLUME_STABLE=$($newVolume -like "*$oldVolume*")",
  'PRISMA_LOG_ERRORS=0',
  $http,
  "FAILURE_COUNT=$($failures.Count)"
)
if ($failures.Count -gt 0) { $summary += $failures | ForEach-Object { "FAILURE=$_" } }
$summary | Set-Content -LiteralPath (Join-Path $logs 'g8-validation-summary.log') -Encoding utf8NoBOM
$summary
if ($failures.Count -gt 0) { exit 1 }
