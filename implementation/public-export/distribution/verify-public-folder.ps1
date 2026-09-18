param(
  [Parameter(Mandatory = $true)][string]$Path,
  [Parameter(Mandatory = $true)][string]$ProducerAccount,
  [Parameter(Mandatory = $true)][string]$ReaderPrincipal
)
$ErrorActionPreference = 'Stop'
try {
  if ($Path -notmatch '^([A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+)') { throw 'PUBLIC_FOLDER_PATH' }
  $folder = [System.IO.Path]::GetFullPath($Path).TrimEnd('\','/')
  $repo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..')).TrimEnd('\','/')
  if ($folder.Equals($repo, [System.StringComparison]::OrdinalIgnoreCase) -or $folder.StartsWith($repo + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'PUBLIC_FOLDER_PATH' }
  $producer = $env:MLINO_EXPORT_OUTPUT_DIR
  if (-not $producer -or $producer -notmatch '^([A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+)' -or $folder.Equals([System.IO.Path]::GetFullPath($producer).TrimEnd('\','/'), [System.StringComparison]::OrdinalIgnoreCase)) { throw 'PUBLIC_FOLDER_PRODUCER_PATH' }
  $acl = Get-Acl -LiteralPath $folder
  if (-not $acl.AreAccessRulesProtected) { throw 'PUBLIC_FOLDER_INHERITANCE' }
  $expected = @{}
  $expected[(New-Object System.Security.Principal.NTAccount($ProducerAccount)).Translate([System.Security.Principal.SecurityIdentifier]).Value] = [System.Security.AccessControl.FileSystemRights]::Modify
  $readerSid = (New-Object System.Security.Principal.NTAccount($ReaderPrincipal)).Translate([System.Security.Principal.SecurityIdentifier]).Value
  if (-not $expected.ContainsKey($readerSid)) { $expected[$readerSid] = [System.Security.AccessControl.FileSystemRights]::ReadAndExecute }
  $expected['S-1-5-18'] = [System.Security.AccessControl.FileSystemRights]::FullControl
  $expected['S-1-5-32-544'] = [System.Security.AccessControl.FileSystemRights]::FullControl
  $actual = @($acl.GetAccessRules($true, $false, [System.Security.Principal.SecurityIdentifier]))
  if ($actual.Count -ne $expected.Count) { throw 'PUBLIC_FOLDER_ACL' }
  foreach ($rule in $actual) {
    $sid = $rule.IdentityReference.Value
    if (-not $expected.ContainsKey($sid) -or $rule.AccessControlType -ne 'Allow' -or $rule.IsInherited) { throw 'PUBLIC_FOLDER_ACL' }
    $mask = [int]$rule.FileSystemRights -band (-bnot [int][System.Security.AccessControl.FileSystemRights]::Synchronize)
    $wanted = [int]$expected[$sid] -band (-bnot [int][System.Security.AccessControl.FileSystemRights]::Synchronize)
    if ($mask -ne $wanted) { throw 'PUBLIC_FOLDER_ACL' }
    Write-Output "$sid $($expected[$sid])"
  }
} catch {
  [Console]::Error.WriteLine('PUBLIC_FOLDER_ACL_INVALID')
  exit 1
}
