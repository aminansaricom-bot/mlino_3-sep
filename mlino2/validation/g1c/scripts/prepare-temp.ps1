param(
  [Parameter(Mandatory = $true)]
  [string]$TempRoot
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$fixtureRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$prismaRoot = Join-Path $TempRoot 'prisma'
$migrationsRoot = Join-Path $prismaRoot 'migrations'
$nl = [Environment]::NewLine

New-Item -ItemType Directory -Force -Path $migrationsRoot | Out-Null

$migrationPaths = @(
  'implementation/prisma/migrations/20260814065924_init/migration.sql',
  'implementation/prisma/migrations/20260815033018_add_situation_key/migration.sql',
  'implementation/prisma/migrations/20260815113714_rename_actor_core_entity_id_to_actor_id/migration.sql',
  'implementation/prisma/migrations/20260906001500_add_ownership_type/migration.sql',
  'implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql'
)

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

foreach ($sourcePath in $migrationPaths) {
  $migrationName = Split-Path (Split-Path $sourcePath -Parent) -Leaf
  $destinationDirectory = Join-Path $migrationsRoot $migrationName
  New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
  $content = (git -C $repoRoot -c "safe.directory=$repoRoot" show "origin/main:$sourcePath") -join $nl
  [System.IO.File]::WriteAllText(
    (Join-Path $destinationDirectory 'migration.sql'),
    $content + $nl,
    $utf8NoBom
  )
}

$lockContent = (git -C $repoRoot -c "safe.directory=$repoRoot" show 'origin/main:implementation/prisma/migrations/migration_lock.toml') -join $nl
[System.IO.File]::WriteAllText(
  (Join-Path $migrationsRoot 'migration_lock.toml'),
  $lockContent + $nl,
  $utf8NoBom
)

$coreMigrationDirectory = Join-Path $migrationsRoot '20260912000100_g1c_core_fixture'
New-Item -ItemType Directory -Force -Path $coreMigrationDirectory | Out-Null
$coreSql = Get-Content -Raw -LiteralPath (Join-Path $fixtureRoot 'sql\00_core_fixture.sql')
$manualSql = Get-Content -Raw -LiteralPath (Join-Path $fixtureRoot 'sql\01_manual_constraints.sql')
[System.IO.File]::WriteAllText(
  (Join-Path $coreMigrationDirectory 'migration.sql'),
  $coreSql + $nl + $manualSql,
  $utf8NoBom
)

$mainSchema = (git -C $repoRoot -c "safe.directory=$repoRoot" show 'origin/main:implementation/prisma/schema.prisma') -join $nl
$mainSchema = $mainSchema.Replace('url      = env("DATABASE_URL")', 'url      = env("G1C_DATABASE_URL")')

$coreSchema = Get-Content -Raw -LiteralPath (Join-Path $fixtureRoot 'prisma\core.prisma')
$coreBody = [regex]::Replace(
  $coreSchema,
  '(?ms)^generator client \{.*?^\}\s*^datasource db \{.*?^\}\s*',
  ''
)

$mainSchema = $mainSchema.Replace(
  '  note             String?',
  @'
  note             String?
  organization     Organization @relation("ExternalWorkspaceOrganization", fields: [organizationId], references: [id], onDelete: Restrict, onUpdate: Restrict)
'@
)

$coreBody = $coreBody.Replace(
  '  publications                        Publication[]',
  @'
  publications                        Publication[]
  externalWorkspaceLinks              ExternalWorkspaceLink[] @relation("ExternalWorkspaceOrganization")
'@
)

$coreBody = $coreBody.Replace(
  '  profiles        BusinessProfile[]      @relation("ProfileIdentityClaim")',
  @'
  profiles        BusinessProfile[]      @relation("ProfileIdentityClaim")
  controlProfiles ProfileClaimMatchSimpleControl[] @relation("ControlProfileIdentityClaim")
'@
)

$validationSupportModels = @'

model ProfileClaimMatchSimpleControl {
  id                          String                 @id @db.Text
  identityClaimId             String?                @map("identity_claim_id") @db.Text
  identityClaimOrganizationId String?                @map("identity_claim_organization_id") @db.Text
  identityClaim               BusinessIdentityClaim? @relation("ControlProfileIdentityClaim", fields: [identityClaimId, identityClaimOrganizationId], references: [id, organizationId], onDelete: Restrict, onUpdate: Restrict, map: "profile_claim_control_fkey")

  @@map("profile_claim_match_simple_control")
}

model DepthOfferVersion {
  id                String             @id @db.Text
  publicationStatus String             @default("UNPUBLISHED") @map("publication_status") @db.Text
  publications      DepthPublication[]

  @@map("depth_offer_versions")
}

model DepthPublication {
  id             String            @id @db.Text
  offerVersionId String            @map("offer_version_id") @db.Text
  offerVersion   DepthOfferVersion @relation(fields: [offerVersionId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "depth_publications_offer_version_id_fkey")

  @@map("depth_publications")
}
'@

$combined = $mainSchema + $nl + $nl + $coreBody + $validationSupportModels
[System.IO.File]::WriteAllText(
  (Join-Path $prismaRoot 'schema.prisma'),
  $combined,
  $utf8NoBom
)

$followup = $combined.Replace(
  '  id                                  String                  @id @db.Text',
  @'
  id                                  String                  @id @db.Text
  validationNote                      String?                 @map("validation_note") @db.Text
'@
)
[System.IO.File]::WriteAllText(
  (Join-Path $prismaRoot 'schema-followup.prisma'),
  $followup,
  $utf8NoBom
)

$migrationPaths | Set-Content -Encoding utf8NoBOM -LiteralPath (Join-Path $TempRoot 'origin-main-migration-paths.txt')
Write-Output 'TEMP_FIXTURE_PREPARED'
Write-Output "MIGRATION_COUNT=$($migrationPaths.Count)"
Write-Output 'CORE_FIXTURE_MIGRATION=1'
