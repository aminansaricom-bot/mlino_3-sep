$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$evidence = $PSScriptRoot
$head = '1dc6818482fca53607a96be0a63b4b45b18126e0'
$cleanup = Join-Path $evidence 'cleanup.log'
$summaryPath = Join-Path $evidence 'ten-run-summary.json'

function Redact([string]$text) {
  if ($null -eq $text) { return '' }
  $text = [regex]::Replace($text, '(?i)postgres(?:ql)?://[^\s"''<>]+', '[REDACTED_URL]')
  $text = [regex]::Replace($text, '(?i)(DATABASE_URL|POSTGRES_PASSWORD)=[^\s"''<>]+', '$1=[REDACTED]')
  return $text
}
function Write-Log([string]$path, [string]$text) {
  [IO.File]::AppendAllText($path, (Redact $text) + "`n", [Text.UTF8Encoding]::new($false))
}
function Host-Context([string]$label, [string]$log) {
  $containers = @(& docker ps -q 2>$null)
  $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
  Write-Log $log "HOST_CONTEXT label=$label running_container_count=$($containers.Count) cpu_load_percent=$cpu"
  return [pscustomobject]@{ Cpu=$cpu; Containers=$containers.Count }
}
function Invoke-Captured([string]$workdir, [string]$file, [string[]]$arguments, [hashtable]$envs) {
  $old = @{}
  foreach ($key in $envs.Keys) { $old[$key] = [Environment]::GetEnvironmentVariable($key); [Environment]::SetEnvironmentVariable($key, [string]$envs[$key]) }
  try {
    Push-Location $workdir
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & $file @arguments 2>&1 | Out-String
    $exit = $LASTEXITCODE
    $ErrorActionPreference = $previous
    Pop-Location
    return [pscustomobject]@{ ExitCode=$exit; Output=$output }
  } finally {
    if ($null -ne $previous) { $ErrorActionPreference = $previous }
    foreach ($key in $envs.Keys) { [Environment]::SetEnvironmentVariable($key, $old[$key]) }
    if ((Get-Location).Path -ne $repo) { Set-Location $repo }
  }
}
function Start-TestDb([string]$name) {
  $password = 'g15-2-' + ([guid]::NewGuid().ToString('N'))
  $out = & docker run -d --name $name --tmpfs /var/lib/postgresql/data -p 127.0.0.1:5499:5432 -e POSTGRES_USER=postgres -e "POSTGRES_PASSWORD=$password" postgres:16-alpine 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw "docker run failed: $(Redact $out)" }
  for ($i=0; $i -lt 60; $i++) {
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

try {
  New-Item -ItemType Directory -Path $evidence -Force | Out-Null
  [IO.File]::WriteAllText($cleanup, "G15_2_START head=$head`n", [Text.UTF8Encoding]::new($false))
  $beforeContainers = @(docker ps -a --format '{{.Names}}' 2>$null)
  $beforeVolumes = @(docker volume ls --format '{{.Name}}' 2>$null)
  Write-Log $cleanup "BEFORE_CONTAINERS`n$($beforeContainers -join "`n")"
  Write-Log $cleanup "BEFORE_VOLUMES`n$($beforeVolumes -join "`n")"
  $results = New-Object System.Collections.Generic.List[object]
  for ($run=1; $run -le 10; $run++) {
    $name = "mlino-g15-2-run-$run"
    $log = Join-Path $evidence ("run-$run.log")
    [IO.File]::WriteAllText($log, "BEGIN run=$run head=$head`n", [Text.UTF8Encoding]::new($false))
    $context = Host-Context "before-run-$run" $log
    $password = Start-TestDb $name
    try {
      $envs = @{ DATABASE_URL = "postgresql://postgres:$password@127.0.0.1:5499/postgres?connection_limit=10"; MLINO_JWT_SECRET='g15-2-acceptance'; CHECKPOINT_DISABLE='1'; PRISMA_GENERATE_SKIP_AUTOINSTALL='1' }
      $prisma = Join-Path $repo 'implementation\node_modules\.bin\prisma.cmd'
      $jest = Join-Path $repo 'implementation\node_modules\.bin\jest.cmd'
      $migrate = Invoke-Captured (Join-Path $repo 'implementation') $prisma @('migrate','deploy','--schema',(Join-Path $repo 'implementation\prisma\schema.prisma')) $envs
      Write-Log $log "MIGRATE_EXIT=$($migrate.ExitCode)`n$($migrate.Output)"
      if ($migrate.ExitCode -ne 0) { throw "migrate failed run=$run" }
      $tests = Invoke-Captured (Join-Path $repo 'implementation') $jest @('--runInBand') $envs
      Write-Log $log "JEST_EXIT=$($tests.ExitCode)`n$($tests.Output)"
      $suite = ($tests.Output -split "`r?`n" | Where-Object { $_ -match '^Test Suites:' }) -join ' | '
      $count = ($tests.Output -split "`r?`n" | Where-Object { $_ -match '^Tests:' }) -join ' | '
      Write-Log $log "TOTALS suite=[$suite] tests=[$count]"
      $results.Add([pscustomobject]@{ run=$run; cpu=$context.Cpu; running_containers=$context.Containers; migrate_exit=$migrate.ExitCode; jest_exit=$tests.ExitCode; suites=$suite; tests=$count; log=[IO.Path]::GetFileName($log) })
      if ($tests.ExitCode -ne 0) { throw "jest failed run=$run" }
    } finally {
      Stop-TestDb $name $log
    }
  }
  $afterContainers = @(docker ps -a --format '{{.Names}}' 2>$null)
  $afterVolumes = @(docker volume ls --format '{{.Name}}' 2>$null)
  Write-Log $cleanup "AFTER_CONTAINERS`n$($afterContainers -join "`n")"
  Write-Log $cleanup "AFTER_VOLUMES`n$($afterVolumes -join "`n")"
  $results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $summaryPath -Encoding utf8
  Write-Log $cleanup 'THROWAWAY_COPIES_REMOVED=True'
} finally {
  if (Get-Variable name -ErrorAction SilentlyContinue) {
    if ($name -and (@(docker ps -a --format '{{.Names}}' 2>$null) -contains $name)) { & docker rm -f $name 2>$null | Out-Null }
  }
}
