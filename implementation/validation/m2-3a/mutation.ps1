$ErrorActionPreference = 'Stop'
$source = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$cases = @(
  @{ Name='signature'; File='public-export/distribution/distribute.ts'; Old='if (!valid) fail(''DISTRIBUTION_SIGNATURE'');'; New='if (false) fail(''DISTRIBUTION_SIGNATURE'');'; Test='dist-rejects-tampered-signature-preserves-public' },
  @{ Name='rollback'; File='public-export/distribution/distribute.ts'; Old='if (timestamp(old.generated_at) > generated) fail(''DISTRIBUTION_ROLLBACK'');'; New='if (false) fail(''DISTRIBUTION_ROLLBACK'');'; Test='dist-rejects-rollback-preserves-public' },
  @{ Name='current-only'; File='public-export/distribution/distribute.ts'; Old="const FILE = 'public-business.v1.json';"; New="const FILE = 'previous-1.json';"; Test='dist-current-only-copies-canonical-bytes' },
  @{ Name='inheritance'; File='public-export/distribution/setup-public-folder.ps1'; Old='$acl.SetAccessRuleProtection($true, $false)'; New='$acl.SetAccessRuleProtection($false, $false)'; Test='acl-script-explicitly-disables-inheritance' }
)
foreach ($case in $cases) {
  $scratch = Join-Path $env:TEMP ('mlino-m2-3a-mutation-' + [guid]::NewGuid().ToString('N'))
  try {
    New-Item -ItemType Directory -Path $scratch | Out-Null
    Copy-Item -LiteralPath (Join-Path $source 'public-export') -Destination $scratch -Recurse
    $test = Join-Path $scratch 'test/public-export/distribution'
    New-Item -ItemType Directory -Path (Split-Path $test) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $source 'test/public-export/distribution') -Destination $test -Recurse
    Copy-Item -LiteralPath (Join-Path $source 'test/setup-env.ts') -Destination (Join-Path $scratch 'test/setup-env.ts')
    Copy-Item -LiteralPath (Join-Path $source 'test/test-db-guard.ts') -Destination (Join-Path $scratch 'test/test-db-guard.ts')
    Copy-Item -LiteralPath (Join-Path $source 'jest.config.js') -Destination $scratch
    [System.IO.File]::WriteAllText((Join-Path $scratch 'jest.config.js'), "module.exports = { preset: 'ts-jest', testEnvironment: 'node', rootDir: '.', testMatch: ['<rootDir>/test/**/*.spec.ts'] };`n")
    if (-not (Test-Path -LiteralPath (Join-Path $scratch 'test/setup-env.ts'))) { throw 'MUTATION_SETUP_MISSING' }
    $nodeExists = & node -e "process.stdout.write(String(require('fs').existsSync(process.argv[1])))" (Join-Path $scratch 'test/setup-env.ts')
    if ($nodeExists -ne 'true') { throw 'MUTATION_NODE_SETUP_MISSING' }
    New-Item -ItemType Junction -Path (Join-Path $scratch 'node_modules') -Target (Join-Path $source 'node_modules') | Out-Null
    $target = Join-Path $scratch $case.File
    $body = [System.IO.File]::ReadAllText($target)
    if (-not $body.Contains($case.Old)) { throw "MUTATION_SOURCE_MISSING $($case.Name)" }
    [System.IO.File]::WriteAllText($target, $body.Replace($case.Old, $case.New))
    Push-Location $scratch
    try { $output = & node ./node_modules/jest/bin/jest.js --runInBand --config ./jest.config.js --testNamePattern $case.Test 2>&1 | Out-String; $status = $LASTEXITCODE }
    finally { Pop-Location }
    if ($status -eq 0 -or -not $output.Contains($case.Test)) { Write-Output ($output.Substring(0, [Math]::Min($output.Length, 1200))); throw "MUTATION_NOT_PROVEN $($case.Name)" }
    "MUTATION $($case.Name) EXPECTED_TEST_FAILED=true" | Write-Output
  } finally {
    if (Test-Path -LiteralPath $scratch) { Remove-Item -LiteralPath $scratch -Recurse -Force }
  }
}
exit 0
