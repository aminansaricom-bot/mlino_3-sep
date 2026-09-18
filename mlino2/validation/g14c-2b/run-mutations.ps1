$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

$app = (Resolve-Path (Join-Path $PSScriptRoot '../../app')).Path
$tempRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\')
$throwaway = Join-Path $tempRoot ('mlino-g14c2b-' + [Guid]::NewGuid().ToString('N'))
$copy = Join-Path $throwaway 'app'
$log = Join-Path $PSScriptRoot 'mutation.log'
if (-not ([IO.Path]::GetFullPath($throwaway).StartsWith($tempRoot + '\', [StringComparison]::OrdinalIgnoreCase))) {
  throw 'Unsafe temporary path'
}

$mutations = @(
  @{ Name = 'algorithm'; File = 'src/publicExport/verify.ts';
     From = "signature.algorithm !== 'Ed25519' || "; To = '';
     Expected = 'rejects a non-Ed25519 algorithm even when its declared bytes have a valid Ed25519 signature' },
  @{ Name = 'signature-value'; File = 'src/publicExport/verify.ts';
     From = 'return recoded === value && bytes.length === 64 ? bytes : null;'; To = 'return bytes;';
     Expected = 'rejects a signature value with wrong decoded length' },
  @{ Name = 'revocation'; File = 'src/publicExport/trustBundle.ts';
     From = 'return this.revoked.has(keyId) || !key ? null : new Uint8Array(key);';
     To = 'return !key ? null : new Uint8Array(key);';
     Expected = 'rejects unknown and revoked key ids with their exact error code' }
)

try {
  New-Item -ItemType Directory -Path $copy -Force | Out-Null
  & robocopy $app $copy /E /XD (Join-Path $app 'dist') /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) { throw "Temporary copy failed: $LASTEXITCODE" }
  $summary = New-Object System.Collections.Generic.List[string]
  $summary.Add('G14c-2b mutation proof: independent temporary app copy; product worktree untouched.')
  foreach ($mutation in $mutations) {
    $source = Join-Path $app $mutation.File
    $target = Join-Path $copy $mutation.File
    $original = [IO.File]::ReadAllText($source)
    if ($original.Split(@($mutation.From), [StringSplitOptions]::None).Count -ne 2) {
      throw "Mutation anchor not unique: $($mutation.Name)"
    }
    [IO.File]::WriteAllText($target, $original.Replace($mutation.From, $mutation.To), [Text.UTF8Encoding]::new($false))
    Push-Location $copy
    try {
      $output = (& npm test -- src/publicExport/publicExport.test.ts 2>&1 | Out-String)
      $exitCode = $LASTEXITCODE
    } finally { Pop-Location }
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot ('mutation-' + $mutation.Name + '.log')),
      $output, [Text.UTF8Encoding]::new($false))
    $found = $output.Contains($mutation.Expected)
    $ok = $exitCode -ne 0 -and $found -and $output -match 'Tests\s+\d+ failed'
    $summary.Add("MUTATION=$($mutation.Name) EXIT=$exitCode EXPECTED_TEST_FAILED=$found RESULT=$(if ($ok) { 'PASS' } else { 'FAIL' })")
    [IO.File]::WriteAllText($target, $original, [Text.UTF8Encoding]::new($false))
    if (-not $ok) { throw "Mutation proof failed: $($mutation.Name)" }
  }
  $summary.Add('THROWAWAY_REMOVED=true')
  [IO.File]::WriteAllLines($log, $summary, [Text.UTF8Encoding]::new($false))
} finally {
  $resolved = [IO.Path]::GetFullPath($throwaway)
  if (-not $resolved.StartsWith($tempRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Unsafe temporary cleanup path'
  }
  if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
