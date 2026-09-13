param()
$databaseUrl = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($databaseUrl)) { throw 'DATABASE_URL is required' }
if ($databaseUrl.Contains(':5435') -or $databaseUrl.Contains('@db:')) { throw 'unsafe DATABASE_URL target' }
try { $uri = [System.Uri]$databaseUrl } catch { throw 'DATABASE_URL is not a valid URI' }
if ($uri.Host -notin @('localhost', '127.0.0.1', '::1') -or $uri.Port -ne 5499) { throw 'DATABASE_URL must target disposable localhost:5499 only' }
if (Test-Path (Join-Path $PSScriptRoot '..\..\..\implementation\.env')) { throw 'implementation/.env is forbidden for G10a' }
Write-Output "DATABASE_URL guard passed for disposable localhost:$($uri.Port); credentials were not printed"
