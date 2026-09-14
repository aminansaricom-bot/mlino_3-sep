$ErrorActionPreference = 'Stop'

$evidence = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$rootFile = Join-Path $evidence 'mlino2\validation\g14a2c\prepared-temp-root.txt'
if (-not (Test-Path -LiteralPath $rootFile)) { throw 'prepared-temp-root.txt is missing' }
$tempRoot = (Get-Content -LiteralPath $rootFile -Raw).Trim()
$head = Join-Path $tempRoot 'head\implementation'
$baseline = Join-Path $tempRoot 'baseline\implementation'
if (-not (Test-Path -LiteralPath $head) -or -not (Test-Path -LiteralPath $baseline)) { throw 'prepared copies are missing' }

$fullPaths = @('')
$focusedPaths = @(
  'test/core/identity-claim-verification.spec.ts',
  'test/core/g10c-profile-capability.spec.ts',
  'test/core/g10d-offer.spec.ts',
  'test/core/core-authority.spec.ts'
)
$allLogFiles = New-Object System.Collections.Generic.List[string]
$summary = New-Object System.Collections.Generic.List[object]
$d4Summary = New-Object System.Collections.Generic.List[object]
$cleanupLog = Join-Path $evidence 'mlino2\validation\g14a2c\run-cleanup.log'
$runLog = Join-Path $evidence 'mlino2\validation\g14a2c\execution.log'

function Redact([string]$text) {
  if ($null -eq $text) { return '' }
  $text = [regex]::Replace($text, '(?i)postgres(?:ql)?://[^\s"''<>]+', '[REDACTED_URL]')
  $text = [regex]::Replace($text, '(?i)(DATABASE_URL|POSTGRES_PASSWORD)=[^\s"''<>]+', '$1=[REDACTED]')
  return $text
}

function Write-Log([string]$path, [string]$text) {
  [IO.File]::AppendAllText($path, (Redact $text) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
}

function Host-Context([string]$label) {
  $containers = @(& docker ps -q 2>$null)
  $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
  $line = "HOST_CONTEXT label=$label running_container_count=$($containers.Count) cpu_load_percent=$cpu"
  Write-Log $runLog $line
  return $line
}

function Invoke-Captured([string]$workdir, [string]$file, [string[]]$arguments, [hashtable]$environment) {
  $old = @{}
  foreach ($key in $environment.Keys) { $old[$key] = [Environment]::GetEnvironmentVariable($key); [Environment]::SetEnvironmentVariable($key, [string]$environment[$key]) }
  try {
    Push-Location $workdir
    $output = & $file @arguments 2>&1 | Out-String
    $exit = $LASTEXITCODE
    Pop-Location
    return [pscustomobject]@{ ExitCode = $exit; Output = $output }
  } finally {
    foreach ($key in $environment.Keys) { [Environment]::SetEnvironmentVariable($key, $old[$key]) }
    if ((Get-Location).Path -ne $evidence) { Set-Location $evidence }
  }
}

function Start-TestDb([string]$name) {
  if (@(docker ps -a --format '{{.Names}}' 2>$null) -contains $name) { throw "container name already exists: $name" }
  $password = 'g14a2c-' + ([guid]::NewGuid().ToString('N'))
  $id = & docker run -d --name $name --tmpfs /var/lib/postgresql/data -p 127.0.0.1:5499:5432 -e "POSTGRES_PASSWORD=$password" postgres:16-alpine 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw "docker run failed for ${name}: $(Redact $id)" }
  for ($i = 0; $i -lt 60; $i++) {
    & docker exec $name pg_isready -U postgres -d postgres *> $null
    if ($LASTEXITCODE -eq 0) { return $password }
    Start-Sleep -Milliseconds 500
  }
  throw "database did not become ready: ${name}"
}

function Stop-TestDb([string]$name) {
  & docker rm -f $name 2>&1 | Out-Null
  Write-Log $cleanupLog "REMOVED_CONTAINER name=$name exit=$LASTEXITCODE"
}

function Run-Database([string]$copyName, [string]$copyRoot, [string]$label, [string[]]$jestArgs) {
  $container = "mlino-g14a2c-$copyName-$label".ToLowerInvariant()
  $log = Join-Path $evidence ("$copyName-$label.log")
  [IO.File]::WriteAllText($log, "BEGIN copy=$copyName label=$label`r`n", [Text.UTF8Encoding]::new($false))
  $allLogFiles.Add($log)
  Write-Log $runLog "BEGIN copy=$copyName label=$label"
  Host-Context "before-$copyName-$label" | Out-Null
  $password = Start-TestDb $container
  try {
    $envs = @{
      DATABASE_URL = "postgresql://postgres:$password@localhost:5499/postgres"
      MLINO_JWT_SECRET = 'g14a2c-diagnosis'
      CHECKPOINT_DISABLE = '1'
      PRISMA_GENERATE_SKIP_AUTOINSTALL = '1'
    }
    $prisma = Join-Path $copyRoot 'node_modules\.bin\prisma.cmd'
    $npm = Join-Path $copyRoot 'node_modules\.bin\npm.cmd'
    $migrate = Invoke-Captured $copyRoot $prisma @('migrate','deploy','--schema',(Join-Path $copyRoot 'prisma\schema.prisma')) $envs
    Write-Log $runLog "MIGRATE_EXIT copy=$copyName label=$label exit=$($migrate.ExitCode)`n$($migrate.Output)"
    if ($migrate.ExitCode -ne 0) { throw "migrate failed: $copyName/$label" }
    $test = if ($jestArgs.Count -eq 0) { Invoke-Captured $copyRoot (Join-Path $copyRoot 'node_modules\.bin\jest.cmd') @('--runInBand') $envs } else { Invoke-Captured $copyRoot (Join-Path $copyRoot 'node_modules\.bin\jest.cmd') $jestArgs $envs }
    Write-Log $runLog "JEST_EXIT copy=$copyName label=$label exit=$($test.ExitCode)`n$($test.Output)"
    $raw = ($test.Output -split "`r?`n" | Where-Object { $_ -match 'G14A2C_RAW' }) -join "`n"
    if ($raw) { Write-Log $runLog "RAW_LINES copy=$copyName label=$label`n$raw" }
    $failNames = ($test.Output -split "`r?`n" | Where-Object { $_ -match 'FAIL(\s+|$)|●|Test Suites:' }) -join "`n"
    if ($failNames) { Write-Log $runLog "FAILURE_LINES copy=$copyName label=$label`n$failNames" }
    $summary.Add([pscustomobject]@{ Copy=$copyName; Run=$label; ExitCode=$test.ExitCode; Log=[IO.Path]::GetFileName($log); Raw=if($raw){$raw}else{'none'}; FailureLines=if($failNames){$failNames}else{'none'} })
  } finally {
    Stop-TestDb $container
  }
}

try {
  New-Item -ItemType File -Path $runLog -Force | Out-Null
  New-Item -ItemType File -Path $cleanupLog -Force | Out-Null
  Write-Log $runLog 'G14A2C_START'
  $beforeContainers = @(docker ps -a --format '{{.Names}}' 2>$null)
  $beforeVolumes = @(docker volume ls --format '{{.Name}}' 2>$null)
  Write-Log $runLog "BEFORE_CONTAINERS`n$($beforeContainers -join "`n")"
  Write-Log $runLog "BEFORE_VOLUMES`n$($beforeVolumes -join "`n")"
  foreach ($copy in @(@{Name='head'; Root=$head}, @{Name='baseline'; Root=$baseline})) {
    foreach ($run in 1..3) { Run-Database $copy.Name $copy.Root "full-$run" @() }
  }
  foreach ($copy in @(@{Name='head'; Root=$head}, @{Name='baseline'; Root=$baseline})) {
    for ($run = 1; $run -le 5; $run++) { Run-Database $copy.Name $copy.Root "focused-$run" (@('--runInBand','--runTestsByPath') + $focusedPaths) }
  }
  $afterContainers = @(docker ps -a --format '{{.Names}}' 2>$null)
  $afterVolumes = @(docker volume ls --format '{{.Name}}' 2>$null)
  Write-Log $runLog "AFTER_CONTAINERS`n$($afterContainers -join "`n")"
  Write-Log $runLog "AFTER_VOLUMES`n$($afterVolumes -join "`n")"
  Write-Log $runLog 'THROWAWAY_COPIES_REMOVED_PENDING'
  $summaryJson = $summary | ConvertTo-Json -Depth 5
  Write-Log $runLog "SUMMARY_JSON`n$summaryJson"
  Write-Output $summaryJson
} finally {
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
  Remove-Item -LiteralPath $rootFile -Force -ErrorAction SilentlyContinue
  Add-Content -LiteralPath $cleanupLog -Value 'THROWAWAY_COPIES_REMOVED=True'
}
