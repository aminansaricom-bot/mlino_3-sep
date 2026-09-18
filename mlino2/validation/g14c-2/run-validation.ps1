$ErrorActionPreference = 'Stop'
$app = (Resolve-Path (Join-Path $PSScriptRoot '../../app')).Path
$env:npm_config_offline = 'true'
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'validation-summary.log') -Value @() -Encoding utf8
for ($i = 1; $i -le 3; $i++) {
  Push-Location $app
  try {
    $build = & npm.cmd run build 2>&1
    $buildCode = $LASTEXITCODE
    $build | Set-Content -LiteralPath (Join-Path $PSScriptRoot "build-$i.log") -Encoding utf8
    if ($buildCode -ne 0) { throw "G14C2_BUILD_RUN_$i`_FAILED exit=$buildCode" }
    $tests = & npm.cmd test 2>&1
    $testCode = $LASTEXITCODE
    $tests | Set-Content -LiteralPath (Join-Path $PSScriptRoot "test-$i.log") -Encoding utf8
    if ($testCode -ne 0) { throw "G14C2_TEST_RUN_$i`_FAILED exit=$testCode" }
  } finally { Pop-Location }
  "RUN=$i BUILD=PASS TEST=PASS" | Add-Content -LiteralPath (Join-Path $PSScriptRoot 'validation-summary.log') -Encoding utf8
}
