$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $repoRoot 'scripts\runtime.ps1')

$port = Get-ProphecyPort
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $listener) {
  Write-Host "Nothing is listening on port $port."
  exit 0
}

$process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue

if (-not $process) {
  Write-Host "Could not resolve the process behind port $port (PID $($listener.OwningProcess))."
  exit 1
}

Stop-Process -Id $process.Id -Force
Write-Host "Stopped Prophecy process PID $($process.Id) on port $port."