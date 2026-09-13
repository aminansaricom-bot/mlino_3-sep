param(
    [string] $Commit = 'origin/main',
    [string] $OutputDirectory = 'C:/Users/galexy/mlino code/g3b-tooling/origin-migrations'
)

$ErrorActionPreference = 'Stop'
$paths = @(
    'implementation/prisma/migrations/migration_lock.toml',
    'implementation/prisma/migrations/20260814065924_init/migration.sql',
    'implementation/prisma/migrations/20260815033018_add_situation_key/migration.sql',
    'implementation/prisma/migrations/20260815113714_rename_actor_core_entity_id_to_actor_id/migration.sql',
    'implementation/prisma/migrations/20260906001500_add_ownership_type/migration.sql',
    'implementation/prisma/migrations/20260910020000_add_external_workspace_link/migration.sql'
)

foreach ($path in $paths) {
    $relative = $path.Substring('implementation/prisma/migrations/'.Length)
    $destination = Join-Path $OutputDirectory $relative
    [IO.Directory]::CreateDirectory((Split-Path -Parent $destination)) | Out-Null

    $psi = [Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = 'git'
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    [void] $psi.ArgumentList.Add('cat-file')
    [void] $psi.ArgumentList.Add('blob')
    [void] $psi.ArgumentList.Add("${Commit}:$path")
    $process = [Diagnostics.Process]::Start($psi)
    $stream = [IO.File]::Create($destination)
    $process.StandardOutput.BaseStream.CopyTo($stream)
    $stream.Dispose()
    $errorText = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
        throw "git cat-file failed for ${Commit}:$path — $errorText"
    }
    Write-Output "PASS $relative"
}
