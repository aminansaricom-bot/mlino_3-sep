param(
  [string]$Workspace = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path,
  [Parameter(Mandatory=$true)][string]$WorktreeHead
)
$ErrorActionPreference = 'Stop'
$evidence = $PSScriptRoot
$container = 'mlino-g14b2-testdb'
$priorDatabaseUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Process')
$password = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(24)).TrimEnd('=').Replace('+','A').Replace('/','B')
$env:DATABASE_URL = "postgresql://postgres:$password@localhost:5499/mlino_export_test"

function Save-Lines([string]$file, [string[]]$lines) {
  [IO.File]::WriteAllText((Join-Path $evidence $file), (($lines -join "`n") + "`n"), [Text.UTF8Encoding]::new($false))
}
function Capture([string]$file, [scriptblock]$action) {
  $output = @(& $action 2>&1 | ForEach-Object {
    ((([string]$_).Replace($password, '[REDACTED]') -replace 'postgres(?:ql)?://\S+', '[REDACTED]') -replace 'https?://\S+', '[URL]') -replace '(?i)password', '[FIELD]'
  })
  $exit = $LASTEXITCODE
  Save-Lines $file ($output + "EXIT_CODE=$exit")
  if ($exit -ne 0) { throw "VALIDATION_FAILED: $file" }
}

Push-Location $Workspace
try {
  Save-Lines 'head.log' @("HEAD=$WorktreeHead", 'Verified with GW2-P in the sandboxed Git context; elevated Docker context cannot read Git ownership.')
  Capture 'containers-before.log' { docker ps --format '{{.Names}}' }
  Capture 'volumes-before.log' { docker volume ls --format '{{.Name}}' }
  try {
    $cpu = (Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average
    Save-Lines 'cpu.log' @("CPU_LOAD_PERCENT=$cpu")
  } catch { Save-Lines 'cpu.log' @('CPU_LOAD_PERCENT=UNAVAILABLE') }
  Push-Location implementation
  try {
    Capture 'tsc.log' { & .\node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit }
    for ($run = 1; $run -le 3; $run++) {
      $created = $false
      try {
        $existing = docker ps -a --filter "name=^/$container$" --format '{{.Names}}'
        if ($existing) { throw "CONTAINER_NAME_IN_USE: run $run" }
        $id = docker run --rm -d --name $container --tmpfs /var/lib/postgresql/data -p 127.0.0.1:5499:5432 -e "POSTGRES_PASSWORD=$password" -e POSTGRES_DB=mlino_export_test postgres:16-alpine
        if ($LASTEXITCODE -ne 0) { throw "CONTAINER_START_FAILED: run $run" }
        $created = $true
        Save-Lines "container-$run.log" @("CONTAINER_ID=$id", 'HOST=127.0.0.1 PORT=5499', 'TMPFS=true')
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
          docker exec $container pg_isready -U postgres -d mlino_export_test *> $null
          if ($LASTEXITCODE -eq 0) { $ready = $true; break }
          Start-Sleep -Seconds 1
        }
        if (-not $ready) { throw "CONTAINER_NOT_READY: run $run" }
        Capture "migration-$run.log" { & .\node_modules\.bin\prisma.cmd migrate deploy --schema prisma/schema.prisma }
        if ($run -eq 1) { Capture 'focused.log' { & .\node_modules\.bin\jest.cmd --runInBand test/public-export/public-export.spec.ts } }
        Capture "suite-$run.log" { & .\node_modules\.bin\jest.cmd --runInBand }
      } finally {
        if ($created) {
          docker rm -f $container *> $null
          Save-Lines "cleanup-$run.log" @("REMOVED=$container", "EXIT_CODE=$LASTEXITCODE")
        }
      }
    }
  } finally { Pop-Location }
  Capture 'containers-after.log' { docker ps --format '{{.Names}}' }
  Capture 'volumes-after.log' { docker volume ls --format '{{.Name}}' }
  $before = Get-Content (Join-Path $evidence 'volumes-before.log')
  $after = Get-Content (Join-Path $evidence 'volumes-after.log')
  if (@(Compare-Object $before $after).Count -ne 0) { throw 'VOLUME_LIST_CHANGED' }
  if ((Get-ChildItem $evidence -Filter '*.log' | Select-String -Pattern '://|(?i)password').Count -gt 0) { throw 'EVIDENCE_REDACTION_FAILED' }
} finally {
  Pop-Location
  [Environment]::SetEnvironmentVariable('DATABASE_URL', $priorDatabaseUrl, 'Process')
}
