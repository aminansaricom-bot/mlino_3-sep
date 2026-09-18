$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$app = (Resolve-Path (Join-Path $PSScriptRoot '../../app')).Path
$summary = New-Object System.Collections.Generic.List[string]

Push-Location $app
try {
  for ($run = 1; $run -le 3; $run++) {
    $buildOutput = (& npm run build 2>&1 | Out-String)
    $buildExit = $LASTEXITCODE
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot "build-$run.log"), $buildOutput, [Text.UTF8Encoding]::new($false))
    if ($buildExit -ne 0) { throw "Build run $run failed with exit $buildExit" }

    $testOutput = (& npm test 2>&1 | Out-String)
    $testExit = $LASTEXITCODE
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot "test-$run.log"), $testOutput, [Text.UTF8Encoding]::new($false))
    if ($testExit -ne 0) { throw "Test run $run failed with exit $testExit" }
    $summary.Add("RUN=$run BUILD=PASS TEST=PASS")
  }
} finally { Pop-Location }

[IO.File]::WriteAllLines((Join-Path $PSScriptRoot 'validation-summary.log'), $summary, [Text.UTF8Encoding]::new($false))
