$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $repoRoot 'scripts\runtime.ps1')

$port = Get-ProphecyPort
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $listener) {
  Write-Host "Prophecy is not listening on port $port."
  exit 0
}

$process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
$healthUrl = "http://localhost:$port/api/health"

try {
  $health = Invoke-RestMethod $healthUrl
  $status = $health.data.status
  $timestamp = $health.data.now
} catch {
  $status = 'unreachable'
  $timestamp = 'n/a'
}

if ($process) {
  Write-Host "Prophecy is running on http://localhost:$port"
  Write-Host "PID: $($process.Id)"
  Write-Host "Process: $($process.ProcessName)"
  Write-Host "Health: $status"
  Write-Host "Reported At: $timestamp"
} else {
  Write-Host "Port $port is listening, but the owning process could not be resolved."
  Write-Host "Health: $status"
  Write-Host "Reported At: $timestamp"
}
