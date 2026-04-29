function Get-ProphecyRepoRoot {
  Split-Path -Parent $PSScriptRoot
}

function Load-ProphecyEnv {
  $repoRoot = Get-ProphecyRepoRoot
  $envFile = Join-Path $repoRoot '.env'

  if (-not (Test-Path $envFile)) {
    return
  }

  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()

    if (-not $line -or $line.StartsWith('#')) {
      return
    }

    $parts = $line -split '=', 2
    if ($parts.Count -ne 2) {
      return
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')

    if (-not $name) {
      return
    }

    if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
      [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
  }
}

function Get-ProphecyPort {
  Load-ProphecyEnv

  $resolvedPort = $env:PORT
  if (-not $resolvedPort) {
    $resolvedPort = '3000'
  }

  return [int]$resolvedPort
}
