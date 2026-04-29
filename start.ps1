$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

. (Join-Path $repoRoot 'scripts\runtime.ps1')

$port = Get-ProphecyPort
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if ($listener) {
	$process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
	if ($process) {
		Write-Host "Prophecy is already running on http://localhost:$port (PID $($process.Id), $($process.ProcessName))."
	} else {
		Write-Host "Port $port is already in use by PID $($listener.OwningProcess)."
	}
	exit 0
}

Write-Host "Starting Prophecy on http://localhost:$port ..."
node .\backend\src\index.js
