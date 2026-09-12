param(
    [string] $CcrPath = 'implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CORE_FOUNDATION_SCHEMA.md',
    [string] $OutputDirectory = 'mlino2/validation/g3/prisma'
)

$ErrorActionPreference = 'Stop'
$text = Get-Content -Raw -LiteralPath $CcrPath
$utf8 = [Text.UTF8Encoding]::new($false)
$lineFeed = [char] 10
[IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null

$prismaMatch = [regex]::Match($text, '(?s)```prisma\r?\n// BEGIN CCR_CORE_MODELS\r?\n(.*?)// END CCR_CORE_MODELS\r?\n```')
if (-not $prismaMatch.Success) { throw 'CCR Prisma markers not found' }
$sqlMatch = [regex]::Match($text, '(?s)```sql\r?\n-- BEGIN CCR_CORE_MANUAL_SQL\r?\n(.*?)-- END CCR_CORE_MANUAL_SQL\r?\n```')
if (-not $sqlMatch.Success) { throw 'CCR SQL markers not found' }

[IO.File]::WriteAllText((Join-Path $OutputDirectory 'core-models.prisma'), ($prismaMatch.Groups[1].Value -replace '\r?\n', $lineFeed), $utf8)
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'manual-constraints.sql'), ($sqlMatch.Groups[1].Value -replace '\r?\n', $lineFeed), $utf8)
Write-Output 'CCR_EXTRACT_PASS'
