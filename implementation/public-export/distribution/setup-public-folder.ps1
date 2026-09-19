[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [Parameter(Mandatory = $true)][string]$ProducerAccount,
  [Parameter(Mandatory = $true)][string]$ReaderPrincipal
)
$ErrorActionPreference = 'Stop'
function Resolve-SafeFolder([string]$Candidate) {
  if ($Candidate -notmatch '^([A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+)') { throw 'PUBLIC_FOLDER_PATH' }
  $resolved = [System.IO.Path]::GetFullPath($Candidate).TrimEnd('\','/')
  $repo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..')).TrimEnd('\','/')
  if ($resolved.Equals($repo, [System.StringComparison]::OrdinalIgnoreCase) -or $resolved.StartsWith($repo + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'PUBLIC_FOLDER_PATH' }
  $producer = $env:MLINO_EXPORT_OUTPUT_DIR
  if (-not $producer -or $producer -notmatch '^([A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+)') { throw 'PUBLIC_FOLDER_PRODUCER_PATH' }
  $producer = [System.IO.Path]::GetFullPath($producer).TrimEnd('\','/')
  if ($resolved.Equals($producer, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'PUBLIC_FOLDER_PRODUCER_PATH' }
  return $resolved
}
$folder = Resolve-SafeFolder $Path
if ($PSCmdlet.ShouldProcess($folder, 'Create and set explicit public-export ACL')) {
  [System.IO.Directory]::CreateDirectory($folder) | Out-Null
  $acl = New-Object System.Security.AccessControl.DirectorySecurity
  $acl.SetAccessRuleProtection($true, $false)
  $allow = [System.Security.AccessControl.AccessControlType]::Allow
  $inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
  $propagate = [System.Security.AccessControl.PropagationFlags]::None
  $rules = @{}
  $rules[$ProducerAccount] = [System.Security.AccessControl.FileSystemRights]::Modify
  if (-not $rules.ContainsKey($ReaderPrincipal)) { $rules[$ReaderPrincipal] = [System.Security.AccessControl.FileSystemRights]::ReadAndExecute }
  $rules['S-1-5-18'] = [System.Security.AccessControl.FileSystemRights]::FullControl
  $rules['S-1-5-32-544'] = [System.Security.AccessControl.FileSystemRights]::FullControl
  foreach ($principal in $rules.Keys) {
    $identity = if ($principal -match '^S-1-') { New-Object System.Security.Principal.SecurityIdentifier($principal) } else { New-Object System.Security.Principal.NTAccount($principal) }
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($identity, $rules[$principal], $inherit, $propagate, $allow)
    $acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $folder -AclObject $acl
  & (Join-Path $PSScriptRoot 'verify-public-folder.ps1') -Path $folder -ProducerAccount $ProducerAccount -ReaderPrincipal $ReaderPrincipal
}
