param(
    [Parameter(Mandatory = $true)]
    [string[]] $Specs
)

$ErrorActionPreference = 'Stop'
$safeDirectory = 'safe.directory=C:/Users/galexy/mlino code/core-prisma-foundation'

function Get-GitContentHash([string] $spec) {
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = 'git'
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    [void] $psi.ArgumentList.Add('-c')
    [void] $psi.ArgumentList.Add($safeDirectory)
    [void] $psi.ArgumentList.Add('show')
    [void] $psi.ArgumentList.Add($spec)

    $process = [System.Diagnostics.Process]::Start($psi)
    $sha256 = [Security.Cryptography.SHA256]::Create()
    $bytes = $sha256.ComputeHash($process.StandardOutput.BaseStream)
    $errorText = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    $sha256.Dispose()

    if ($process.ExitCode -ne 0) {
        throw "git show failed for ${spec}: $errorText"
    }

    return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

foreach ($spec in $Specs) {
    Write-Output "$(Get-GitContentHash $spec)  $spec"
}
