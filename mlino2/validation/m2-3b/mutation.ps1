$ErrorActionPreference = 'Stop'
$app = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\app'))
$dependencyItem = Get-Item -LiteralPath (Join-Path $app 'node_modules')
$dependencies = if ($dependencyItem.LinkType -eq 'Junction') { $dependencyItem.Target } else { $dependencyItem.FullName }
if ($dependencies -is [array]) { $dependencies = $dependencies[0] }
$cases = @(
  @{ Name='reload-guard'; File='src/publicExport/versionCheck.ts'; Old='if (deps.storage.getItem(LAST_RELOAD_KEY) === next) return false'; New='if (false) return false'; Test='reloads at most once per new build_id' },
  @{ Name='spa-fallback'; File='nginx.conf'; Old='if (!-f /srv/mlino-public-export/public-business.v1.json) { return 404; }'; New='if (!-f /srv/mlino-public-export/public-business.v1.json) { rewrite ^ /index.html last; }'; Test='serves the signed artifact from its read-only directory with a real 404, no SPA fallback' },
  @{ Name='no-store'; File='nginx.conf'; Old='add_header Cache-Control "no-store, max-age=0" always;'; New='add_header Cache-Control "public, max-age=60" always;'; Test='sets JSON, no-store, nosniff and all security headers' }
)
foreach ($case in $cases) {
  $scratch = Join-Path $env:TEMP ('mlino-m2-3b-mutation-' + [guid]::NewGuid().ToString('N'))
  try {
    New-Item -ItemType Directory -Path (Join-Path $scratch 'src/publicExport') -Force | Out-Null
    foreach ($name in @('vite.config.ts','package.json','nginx.conf','docker-compose.yml','Dockerfile')) {
      Copy-Item -LiteralPath (Join-Path $app $name) -Destination (Join-Path $scratch $name)
    }
    foreach ($name in @('versionCheck.ts','versionCheck.test.ts','nginxRoute.test.ts')) {
      Copy-Item -LiteralPath (Join-Path $app ('src/publicExport/' + $name)) -Destination (Join-Path $scratch ('src/publicExport/' + $name))
    }
    New-Item -ItemType Junction -Path (Join-Path $scratch 'node_modules') -Target $dependencies | Out-Null
    $target = Join-Path $scratch $case.File
    $body = [System.IO.File]::ReadAllText($target)
    if (-not $body.Contains($case.Old)) { throw "MUTATION_SOURCE_MISSING $($case.Name)" }
    if ($case.Name -eq 'no-store') {
      $position = $body.IndexOf($case.Old)
      $body = $body.Substring(0, $position) + $case.New + $body.Substring($position + $case.Old.Length)
    } else { $body = $body.Replace($case.Old, $case.New) }
    [System.IO.File]::WriteAllText($target, $body)
    Push-Location $scratch
    try {
      $output = & node ./node_modules/vitest/vitest.mjs run --configLoader runner --reporter=verbose --testNamePattern $case.Test 2>&1 | Out-String
      $status = $LASTEXITCODE
    } finally { Pop-Location }
    if ($status -eq 0 -or -not $output.Contains($case.Test) -or -not $output.Contains('failed')) { throw "MUTATION_NOT_PROVEN $($case.Name)" }
    "MUTATION $($case.Name) EXPECTED_TEST_FAILED=true" | Write-Output
  } finally {
    $resolved = [System.IO.Path]::GetFullPath($scratch)
    $tempRoot = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd('\','/') + [System.IO.Path]::DirectorySeparatorChar
    if (-not $resolved.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'UNSAFE_CLEANUP_PATH' }
    $link = Join-Path $scratch 'node_modules'
    if (Test-Path -LiteralPath $link) { Remove-Item -LiteralPath $link -Force }
    if (Test-Path -LiteralPath $scratch) { Remove-Item -LiteralPath $scratch -Recurse -Force }
  }
}
exit 0
