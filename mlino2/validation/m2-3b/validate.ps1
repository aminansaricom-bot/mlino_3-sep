$ErrorActionPreference = 'Stop'
$app = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\app'))
$env:NPM_CONFIG_UPDATE_NOTIFIER = 'false'
$env:V2_NESHAN_MAP_KEY = ''
$env:V2_DEEPSEEK_API_KEY = ''
$env:V2_GEMINI_API_KEY = ''
$env:V2_DEV_HTTPS = ''
$env:VITE_PUBLIC_EXPORT_TRUST_BUNDLE = ''
$env:VITE_PUBLIC_EXPORT_URL = '/public-export/public-business.v1.json'
$previous = ''
$versionLines = @()
Push-Location $app
try {
  for ($i = 1; $i -le 3; $i++) {
    npm run build -- --configLoader runner *> (Join-Path $PSScriptRoot "build-$i.log")
    if ($LASTEXITCODE -ne 0) { throw "BUILD_FAILED_$i" }
    $version = Get-Content -LiteralPath 'dist/version.json' -Raw | ConvertFrom-Json
    $id = $version.build_id
    if ($id -notmatch '^[A-Za-z0-9._:-]{1,128}$') { throw "BUILD_ID_INVALID_$i" }
    $bundles = @(Get-ChildItem -LiteralPath 'dist/assets' -Filter '*.js' -File)
    if (-not ($bundles | Where-Object { [System.IO.File]::ReadAllText($_.FullName).Contains($id) })) { throw "BUILD_ID_NOT_EMBEDDED_$i" }
    if ($previous -eq $id) { throw "BUILD_ID_NOT_UNIQUE_$i" }
    $previous = $id
    $versionLines += "RUN_$i EMBEDDED=true UNIQUE=true SHA256=$((Get-FileHash -LiteralPath 'dist/version.json' -Algorithm SHA256).Hash.ToLowerInvariant())"
    npm test -- --configLoader runner *> (Join-Path $PSScriptRoot "test-$i.log")
    if ($LASTEXITCODE -ne 0) { throw "TEST_FAILED_$i" }
    "RUN_$i BUILD=PASS TEST=PASS" | Write-Output
  }
} finally { Pop-Location }
$versionLines -join "`n" | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'version.log') -Encoding utf8NoBOM
