$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$evidence = $PSScriptRoot
$sourceModules = 'C:\Users\galexy\mlino code\core-g14a-published-content\implementation\node_modules'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('mlino-g15-1-' + [guid]::NewGuid().ToString('N'))
$cleanup = Join-Path $evidence 'cleanup.log'
$summaryPath = Join-Path $evidence 'diagnostic-summary.json'
$headSha = 'd20ad7cfeff48ca8b3f28bb0bdc284b4588139b3'

function Redact([string]$text) {
  if ($null -eq $text) { return '' }
  $text = [regex]::Replace($text, '(?i)postgres(?:ql)?://[^\s"''<>]+', '[REDACTED_URL]')
  $text = [regex]::Replace($text, '(?i)(DATABASE_URL|POSTGRES_PASSWORD)=[^\s"''<>]+', '$1=[REDACTED]')
  return $text
}
function Write-Log([string]$path, [string]$text) {
  [IO.File]::AppendAllText($path, (Redact $text) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
}
function Host-Context([string]$label, [string]$log) {
  $containers = @(& docker ps -q 2>$null)
  $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
  Write-Log $log "HOST_CONTEXT label=$label running_container_count=$($containers.Count) cpu_load_percent=$cpu"
}
function Invoke-Captured([string]$workdir, [string]$file, [string[]]$arguments, [hashtable]$environment) {
  $old = @{}
  foreach ($key in $environment.Keys) {
    $old[$key] = [Environment]::GetEnvironmentVariable($key)
    [Environment]::SetEnvironmentVariable($key, [string]$environment[$key])
  }
  try {
    Push-Location $workdir
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & $file @arguments 2>&1 | Out-String
    $exit = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    Pop-Location
    return [pscustomobject]@{ ExitCode = $exit; Output = $output }
  } finally {
    if ($null -ne $previousErrorActionPreference) { $ErrorActionPreference = $previousErrorActionPreference }
    foreach ($key in $environment.Keys) { [Environment]::SetEnvironmentVariable($key, $old[$key]) }
    if ((Get-Location).Path -ne $repo) { Set-Location $repo }
  }
}
function Instrument([string]$root, [string]$mode) {
  $adapter = Join-Path $root 'core\error-adapter.ts'
  $text = [IO.File]::ReadAllText($adapter)
  $needle = "  return new CoreDomainError('INTERNAL_ERROR', 'Core operation failed');"
  $insert = @'
  if (code === 'P2028' || code === 'P2034') {
    const rawMeta = typeof error === 'object' && error !== null && 'meta' in error ? (error as { meta?: unknown }).meta : undefined;
    const rawMessage = error instanceof Error ? error.message.slice(0, 300).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[REDACTED_URL]') : '';
    process.stderr.write('G15_1_RAW code=' + String(code) + ' meta=' + JSON.stringify(rawMeta) + ' message=' + rawMessage + '\n');
  }
'@
  if (($text | Select-String -SimpleMatch $needle).Count -ne 1) { throw "adapter instrumentation needle mismatch ($mode)" }
  [IO.File]::WriteAllText($adapter, $text.Replace($needle, $insert + [Environment]::NewLine + $needle), [Text.UTF8Encoding]::new($false))

  $repositories = Join-Path $root 'core\repositories.ts'
  $text = [IO.File]::ReadAllText($repositories)
  $queryNeedle = '  const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM organizations WHERE id = ${organizationId} FOR UPDATE`);'
  $queryInsert = @'
  const g15LockStart = Date.now();
  process.stderr.write('G15_1_LOCK_START organization_lock\n');
'@
  $queryReplacement = $queryInsert + $queryNeedle + @'
  process.stderr.write('G15_1_LOCK_END organization_lock elapsed_ms=' + String(Date.now() - g15LockStart) + '\n');
'@
  if (($text | Select-String -SimpleMatch $queryNeedle).Count -ne 1) { throw "repository instrumentation needle mismatch ($mode)" }
  [IO.File]::WriteAllText($repositories, $text.Replace($queryNeedle, $queryReplacement), [Text.UTF8Encoding]::new($false))

  if ($mode -eq 'extended') {
    $client = Join-Path $root 'foundation\prisma-client.ts'
    $clientText = [IO.File]::ReadAllText($client)
    $clientNeedle = 'export const prisma = new PrismaClient();'
    $clientReplacement = "export const prisma = new PrismaClient({ transactionOptions: { maxWait: 10000, timeout: 15000 } });"
    if (($clientText | Select-String -SimpleMatch $clientNeedle).Count -ne 1) { throw 'client instrumentation needle mismatch' }
    [IO.File]::WriteAllText($client, $clientText.Replace($clientNeedle, $clientReplacement), [Text.UTF8Encoding]::new($false))
  }
}
function Start-TestDb([string]$name) {
  $password = 'g15-' + ([guid]::NewGuid().ToString('N'))
  $id = & docker run -d --name $name --tmpfs /var/lib/postgresql/data -p 127.0.0.1:5499:5432 -e POSTGRES_USER=postgres -e "POSTGRES_PASSWORD=$password" -e POSTGRES_DB=postgres postgres:16-alpine 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw "docker run failed: $(Redact $id)" }
  for ($i = 0; $i -lt 60; $i++) {
    & docker exec $name pg_isready -U postgres -d postgres *> $null
    if ($LASTEXITCODE -eq 0) { return $password }
    Start-Sleep -Milliseconds 500
  }
  throw 'database did not become ready'
}
function Stop-TestDb([string]$name, [string]$log) {
  & docker rm -f $name 2>&1 | Out-Null
  Write-Log $log "REMOVED_CONTAINER name=$name exit=$LASTEXITCODE"
}
function Prepare-Copy([string]$name, [string]$mode) {
  $root = Join-Path $tempRoot "$name\implementation"
  New-Item -ItemType Directory -Path $root -Force | Out-Null
  Get-ChildItem -LiteralPath (Join-Path $repo 'implementation') -Force | Copy-Item -Destination $root -Recurse -Force
  if (-not (Test-Path -LiteralPath $sourceModules)) { throw 'diagnostic source node_modules is missing' }
  Copy-Item -LiteralPath $sourceModules -Destination $root -Recurse -Force
  Instrument $root $mode
  return $root
}
function Run-Setting([string]$name, [string]$mode, [string]$connectionLimit) {
  $root = Prepare-Copy $name $mode
  $log = Join-Path $evidence "$name.log"
  [IO.File]::WriteAllText($log, "BEGIN setting=$name head=$headSha mode=$mode`n", [Text.UTF8Encoding]::new($false))
  $container = "mlino-g15-1-$name"
  Host-Context "before-$name" $log
  $password = Start-TestDb $container
  try {
    $url = if ($connectionLimit) { "postgresql://postgres:$password@127.0.0.1:5499/postgres?connection_limit=$connectionLimit" } else { "postgresql://postgres:$password@127.0.0.1:5499/postgres" }
    $envs = @{ DATABASE_URL = $url; MLINO_JWT_SECRET = 'g15-1-diagnostic'; CHECKPOINT_DISABLE = '1'; PRISMA_GENERATE_SKIP_AUTOINSTALL = '1' }
    $prisma = Join-Path $root 'node_modules\.bin\prisma.cmd'
    $migrate = Invoke-Captured $root $prisma @('migrate','deploy','--schema',(Join-Path $root 'prisma\schema.prisma')) $envs
    Write-Log $log "MIGRATE_EXIT=$($migrate.ExitCode)`n$($migrate.Output)"
    if ($migrate.ExitCode -ne 0) { throw "migrate failed: $name" }
    $jest = Invoke-Captured $root (Join-Path $root 'node_modules\.bin\jest.cmd') @('--runInBand') $envs
    Write-Log $log "JEST_EXIT=$($jest.ExitCode)`n$($jest.Output)"
    $raw = ($jest.Output -split "`r?`n" | Where-Object { $_ -match 'G15_1_RAW|G15_1_LOCK_' }) -join "`n"
    $fail = ($jest.Output -split "`r?`n" | Where-Object { $_ -match '^FAIL|^Test Suites:|^Tests:|^●' }) -join "`n"
    Write-Log $log "RAW_AND_LOCK_LINES`n$raw"
    Write-Log $log "SUMMARY_LINES`n$fail"
    return [pscustomobject]@{ setting=$name; mode=$mode; connection_limit=if($connectionLimit){$connectionLimit}else{'default'}; exit_code=$jest.ExitCode; raw_lines=if($raw){$raw}else{'none'}; summary_lines=if($fail){$fail}else{'none'}; log=[IO.Path]::GetFileName($log) }
  } finally {
    Stop-TestDb $container $log
    Host-Context "after-$name" $log
  }
}

try {
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  [IO.File]::WriteAllText($cleanup, "G15_1_START head=$headSha`n", [Text.UTF8Encoding]::new($false))
  $beforeContainers = @(docker ps -a --format '{{.Names}}' 2>$null)
  $beforeVolumes = @(docker volume ls --format '{{.Name}}' 2>$null)
  Write-Log $cleanup "BEFORE_CONTAINERS`n$($beforeContainers -join "`n")"
  Write-Log $cleanup "BEFORE_VOLUMES`n$($beforeVolumes -join "`n")"
  $results = @(
    (Run-Setting 'default' 'default' ''),
    (Run-Setting 'extended' 'extended' ''),
    (Run-Setting 'pool1' 'default' '1')
  )
  $afterContainers = @(docker ps -a --format '{{.Names}}' 2>$null)
  $afterVolumes = @(docker volume ls --format '{{.Name}}' 2>$null)
  Write-Log $cleanup "AFTER_CONTAINERS`n$($afterContainers -join "`n")"
  Write-Log $cleanup "AFTER_VOLUMES`n$($afterVolumes -join "`n")"
  $results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $summaryPath -Encoding utf8
  Write-Log $cleanup 'THROWAWAY_COPIES_REMOVED_PENDING'
} finally {
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
  Write-Log $cleanup 'THROWAWAY_COPIES_REMOVED=True'
}
