$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$evidence = $PSScriptRoot
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('mlino-g14a2c-' + [guid]::NewGuid().ToString('N'))
$headRoot = Join-Path $tempRoot 'head\implementation'
$baselineRoot = Join-Path $tempRoot 'baseline\implementation'
$pathFile = Join-Path $evidence 'prepared-temp-root.txt'

function Git-BlobBytes([string]$revision, [string]$path) {
  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = 'git'
  $psi.WorkingDirectory = $repo
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  [void]$psi.ArgumentList.Add('show')
  [void]$psi.ArgumentList.Add(('{0}:{1}' -f $revision, $path))
  $proc = [System.Diagnostics.Process]::Start($psi)
  $stream = [System.IO.MemoryStream]::new()
  $proc.StandardOutput.BaseStream.CopyTo($stream)
  $proc.WaitForExit()
  if ($proc.ExitCode -ne 0) { throw "git show failed: $revision $path" }
  return $stream.ToArray()
}
function Write-GitBlob([string]$revision, [string]$path, [string]$destination) {
  [System.IO.File]::WriteAllBytes($destination, (Git-BlobBytes $revision $path))
}
function Copy-Directory([string]$source, [string]$destination) {
  New-Item -ItemType Directory -Path $destination -Force | Out-Null
  Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $destination -Recurse -Force
}
function Sha([string]$path) {
  return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
}
function Verify-Copy([string]$name, [string]$revision, [string]$root) {
  $manifest = Join-Path $evidence "$name-manifest.txt"
  Remove-Item -LiteralPath $manifest -Force -ErrorAction SilentlyContinue
  foreach ($directory in @('core', 'prisma', 'test/core')) {
    $tracked = @(git ls-tree -r --name-only $revision -- "implementation/$directory" | ForEach-Object { $_ -replace '^implementation/', '' })
    foreach ($relative in $tracked) {
      $actual = Join-Path $root $relative
      if (-not (Test-Path -LiteralPath $actual)) { Add-Content $manifest "$relative MISSING"; continue }
      $expectedBytes = Git-BlobBytes $revision "implementation/$relative"
      $expectedHash = [Convert]::ToHexString(([System.Security.Cryptography.SHA256]::Create().ComputeHash($expectedBytes))).ToLowerInvariant()
      $actualHash = Sha $actual
      $result = if ($expectedHash -eq $actualHash) { 'MATCH' } else { 'MISMATCH' }
      Add-Content $manifest "$relative expected=$expectedHash actual=$actualHash $result"
    }
  }
  if (@(Get-Content $manifest | Where-Object { $_ -notmatch ' MATCH$' }).Count -gt 0) { throw "$name manifest mismatch" }
}
function Canonicalize-Tracked([string]$revision, [string]$root) {
  foreach ($directory in @('core', 'prisma', 'test/core')) {
    $tracked = @(git ls-tree -r --name-only $revision -- "implementation/$directory" | ForEach-Object { $_ -replace '^implementation/', '' })
    foreach ($relative in $tracked) {
      Write-GitBlob $revision "implementation/$relative" (Join-Path $root $relative)
    }
  }
}
function Instrument([string]$root) {
  $path = Join-Path $root 'core\error-adapter.ts'
  $text = [System.IO.File]::ReadAllText($path)
  $needle = "  return new CoreDomainError('INTERNAL_ERROR', 'Core operation failed');"
  $insert = @'
  const rawMeta = typeof error === 'object' && error !== null && 'meta' in error ? (error as { meta?: unknown }).meta : undefined;
  const rawConstructor = typeof error === 'object' && error !== null && 'constructor' in error ? (error as { constructor?: { name?: unknown } }).constructor?.name : undefined;
  const rawMessage = error instanceof Error ? error.message.slice(0, 300).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[REDACTED_URL]') : '';
  process.stderr.write('G14A2C_RAW constructor=' + String(rawConstructor ?? '') + ' code=' + String(code ?? '') + ' meta=' + JSON.stringify(rawMeta) + ' msg=' + rawMessage + '\n');
'@
  if (($text | Select-String -SimpleMatch $needle).Count -ne 1) { throw "instrumentation needle mismatch: $path" }
  [System.IO.File]::WriteAllText($path, $text.Replace($needle, $insert + [Environment]::NewLine + $needle), [System.Text.UTF8Encoding]::new($false))
}

Push-Location $repo
Remove-Item -LiteralPath $pathFile -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
Copy-Directory (Join-Path $repo 'implementation') $headRoot
Copy-Directory (Join-Path $repo 'implementation') $baselineRoot
Canonicalize-Tracked 'a4d9a75' $headRoot
Canonicalize-Tracked 'ee25ead' $baselineRoot
Remove-Item -LiteralPath (Join-Path $baselineRoot 'prisma\migrations\20260914010000_add_publication_published_content') -Recurse -Force
Remove-Item -LiteralPath (Join-Path $baselineRoot 'test\core\g14a2-published-content.spec.ts') -Force
$generate = & (Join-Path $baselineRoot 'node_modules\.bin\prisma.cmd') generate --schema (Join-Path $baselineRoot 'prisma\schema.prisma') 2>&1
if ($LASTEXITCODE -ne 0) { throw "baseline prisma generate failed: $generate" }
Verify-Copy 'head' 'a4d9a75' $headRoot
Verify-Copy 'baseline' 'ee25ead' $baselineRoot
Instrument $headRoot
Instrument $baselineRoot
[System.IO.File]::WriteAllText($pathFile, $tempRoot, [System.Text.UTF8Encoding]::new($false))
"PREPARED_TEMP_ROOT=$tempRoot"
"HEAD_MANIFEST=$(Get-FileHash (Join-Path $evidence 'head-manifest.txt') -Algorithm SHA256).Hash.ToLowerInvariant()"
"BASELINE_MANIFEST=$(Get-FileHash (Join-Path $evidence 'baseline-manifest.txt') -Algorithm SHA256).Hash.ToLowerInvariant()"
Pop-Location
