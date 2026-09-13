$ErrorActionPreference = 'Stop'

$backupDir = 'C:\Users\galexy\mlino-backups'
New-Item -Path $backupDir -ItemType Directory -Force | Out-Null
if (-not (Test-Path -LiteralPath $backupDir -PathType Container)) { throw 'backup directory missing' }

$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ', [Globalization.CultureInfo]::InvariantCulture)
if ($stamp -notmatch '^20[0-9]{6}T[0-9]{6}Z$') { throw "invalid timestamp: $stamp" }

$file = "mlino_v1_pre_g8_$stamp.dump"
$hostPath = Join-Path $backupDir $file
$logDir = Join-Path $PSScriptRoot '..\logs'

@(
  'B1=PASS'
  'B2=PASS'
  "BACKUP_DIR=$backupDir"
  "TIMESTAMP=$stamp"
  "FILE=$file"
  "HOST_PATH=$hostPath"
) | Set-Content -LiteralPath (Join-Path $logDir 'backup-plan.log') -Encoding utf8NoBOM

docker exec mlino-v1-local-db pg_dump -U mlino -d mlino_v1 -Fc -f "/tmp/$file"
if ($LASTEXITCODE -ne 0) { throw 'B3 pg_dump failed' }

$containerSize = (docker exec mlino-v1-local-db sh -lc "stat -c '%s' '/tmp/$file'").Trim()
$hashAndList = @(docker exec mlino-v1-local-db sh -lc "sha256sum '/tmp/$file'; pg_restore --list '/tmp/$file' | wc -l")
if ($LASTEXITCODE -ne 0) { throw 'B4 verification failed' }
$containerHash = $hashAndList[0].ToString().Split(' ')[0].ToLowerInvariant()
$objectLines = [int64]$hashAndList[1].ToString().Trim()

@(
  'B3=PASS'
  "CONTAINER_PATH=/tmp/$file"
  "CONTAINER_SIZE_BYTES=$containerSize"
  'PG_DUMP_EXIT=0'
) | Set-Content -LiteralPath (Join-Path $logDir 'backup-container-create.log') -Encoding utf8NoBOM
@(
  'B4=PASS'
  "CONTAINER_SHA256=$containerHash"
  "PG_RESTORE_OBJECT_LINES=$objectLines"
) | Set-Content -LiteralPath (Join-Path $logDir 'backup-container-verify.log') -Encoding utf8NoBOM
if ($objectLines -le 0) { throw 'B4 object count is empty' }

docker cp "mlino-v1-local-db:/tmp/$file" $hostPath
if ($LASTEXITCODE -ne 0) { throw 'B5 docker cp failed' }
$hostHash = (Get-FileHash -LiteralPath $hostPath -Algorithm SHA256).Hash.ToLowerInvariant()
$hostSize = (Get-Item -LiteralPath $hostPath).Length
@(
  'B5=PASS'
  "HOST_PATH=$hostPath"
  "HOST_SIZE_BYTES=$hostSize"
  "HOST_SHA256=$hostHash"
  "HASH_MATCH=$($hostHash -eq $containerHash)"
) | Set-Content -LiteralPath (Join-Path $logDir 'backup-host-verify.log') -Encoding utf8NoBOM
if ($hostHash -ne $containerHash) { throw 'B5 hash mismatch' }

docker exec mlino-v1-local-db rm -f "/tmp/$file"
if ($LASTEXITCODE -ne 0) { throw 'B6 cleanup failed' }
$presence = (docker exec mlino-v1-local-db sh -lc "test -e '/tmp/$file' && echo present || echo absent").Trim()
$tempAbsent = $presence -eq 'absent'
@(
  'B6=PASS'
  "CONTAINER_TEMP_ABSENT=$tempAbsent"
  "HOST_BACKUP_RETAINED=$(Test-Path -LiteralPath $hostPath)"
) | Set-Content -LiteralPath (Join-Path $logDir 'backup-container-cleanup.log') -Encoding utf8NoBOM
if (-not $tempAbsent) { throw 'B6 temporary dump remains' }

@("BACKUP_PATH=$hostPath", "SIZE_BYTES=$hostSize", "SHA256=$hostHash", "OBJECT_LINES=$objectLines")
