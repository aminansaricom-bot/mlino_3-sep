$ErrorActionPreference = 'Continue'

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$implementation = Join-Path $repo 'implementation'
$logPath = Join-Path $PSScriptRoot 'test-suites.log'
$container = 'mlino-g14a2-suites'
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

try {
  Write-Log 'G14A2_TEST_SUITES=START'
  Write-Block 'CONTAINERS_BEFORE' (& docker ps -a --format '{{.Names}}')
  Write-Block 'VOLUMES_BEFORE' (& docker volume ls --format '{{.Name}}')
  if (@(& docker ps -a --filter "name=^$container$" --format '{{.Names}}').Count -gt 0) { throw 'suite container already exists' }
  & docker run -d --name $container --tmpfs /var/lib/postgresql/data -p 127.0.0.1:5499:5432 -e "POSTGRES_PASSWORD=$dbPassword" postgres:16-alpine *> $null
  if ($LASTEXITCODE -ne 0) { throw 'docker run failed' }
  for ($i = 0; $i -lt 30; $i++) {
    & docker exec $container pg_isready -U postgres *> $null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
  }
  if ($LASTEXITCODE -ne 0) { throw 'postgres did not become ready' }
  Push-Location $implementation
  try {
    $migrate = & npm.cmd run prisma:migrate:deploy 2>&1
    $migrateExit = $LASTEXITCODE
    Write-Block 'MIGRATE_DEPLOY' $migrate
    Write-Log "MIGRATE_EXIT=$migrateExit"
    if ($migrateExit -ne 0) { throw 'migrate deploy failed' }
    $full = & npm.cmd test -- --runInBand 2>&1
    $fullExit = $LASTEXITCODE
    Write-Block 'FULL_V1_AND_CORE' $full
    Write-Log "FULL_EXIT=$fullExit"
    $focused = & npm.cmd test -- --runInBand test/core/g14a2-published-content.spec.ts 2>&1
    $focusedExit = $LASTEXITCODE
    Write-Block 'FOCUSED_G14A2' $focused
    Write-Log "FOCUSED_EXIT=$focusedExit"
    if ($fullExit -ne 0 -or $focusedExit -ne 0) { throw 'one or more test suites failed' }
  }
  finally { Pop-Location }
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
  } else { Write-Log 'CONTAINER_REMOVED=already absent' }
  Write-Block 'CONTAINERS_AFTER' (& docker ps -a --format '{{.Names}}')
  Write-Block 'VOLUMES_AFTER' (& docker volume ls --format '{{.Name}}')
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
