param(
    [string] $BaseSchema = 'implementation/prisma/schema.prisma',
    [string] $CoreModels = 'mlino2/validation/g3/prisma/core-models.prisma',
    [string] $OutputSchema = 'C:/Users/galexy/mlino code/g3-tooling/core-schema.prisma',
    [string] $GeneratedClientOutput = 'C:/Users/galexy/mlino code/g3-tooling/generated-client'
)

$ErrorActionPreference = 'Stop'
$base = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $BaseSchema).Path)
$models = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $CoreModels).Path)
$generatorPattern = '(?ms)^generator client \{\r?\n  provider = "prisma-client-js"\r?\n\}'
if ([regex]::Matches($base, $generatorPattern).Count -ne 1) {
    throw 'Expected exactly one unmodified client generator in the base schema'
}
$generatorReplacement = "generator client {`n  provider = `"prisma-client-js`"`n  output   = `"$GeneratedClientOutput`"`n}"
$base = [regex]::Replace($base, $generatorPattern, $generatorReplacement)
$outputParent = Split-Path -Parent $OutputSchema
[IO.Directory]::CreateDirectory($outputParent) | Out-Null
$utf8 = [Text.UTF8Encoding]::new($false)
$lineFeed = [char] 10
[IO.File]::WriteAllText($OutputSchema, $base.TrimEnd([char]13, [char]10) + $lineFeed + $models.Trim([char]13, [char]10) + $lineFeed, $utf8)
Write-Output "TEMP_SCHEMA=$OutputSchema"
Write-Output "GENERATED_CLIENT_OUTPUT=$GeneratedClientOutput"
Write-Output "TEMP_SCHEMA_SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $OutputSchema).Hash.ToLowerInvariant())"
