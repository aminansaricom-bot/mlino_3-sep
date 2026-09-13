param(
    [string] $BaseSchema = 'implementation/prisma/schema.prisma',
    [string] $OutputSchema = 'C:/Users/galexy/mlino code/g4-tooling/core-schema.prisma',
    [string] $GeneratedClientOutput = 'C:/Users/galexy/mlino code/g4-tooling/generated-client'
)

$ErrorActionPreference = 'Stop'
$base = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $BaseSchema).Path)
$generatorPattern = '(?ms)^generator client \{\r?\n  provider = "prisma-client-js"\r?\n\}'
if ([regex]::Matches($base, $generatorPattern).Count -ne 1) {
    throw 'Expected exactly one unmodified client generator in the production schema'
}
$replacement = "generator client {`n  provider = `"prisma-client-js`"`n  output   = `"$GeneratedClientOutput`"`n}"
$temporary = [regex]::Replace($base, $generatorPattern, $replacement)
$parent = Split-Path -Parent $OutputSchema
[IO.Directory]::CreateDirectory($parent) | Out-Null
[IO.File]::WriteAllText($OutputSchema, $temporary, [Text.UTF8Encoding]::new($false))
Write-Output "TEMP_SCHEMA=$OutputSchema"
Write-Output "GENERATED_CLIENT_OUTPUT=$GeneratedClientOutput"
Write-Output "TEMP_SCHEMA_SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $OutputSchema).Hash.ToLowerInvariant())"
