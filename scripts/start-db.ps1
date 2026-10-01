# Start local Postgres for rentairportcars.com, then sync Prisma schema.
# Prerequisites: Docker Desktop OR a local PostgreSQL install listening on :5432
# Usage (from repo root):  powershell -ExecutionPolicy Bypass -File .\scripts\start-db.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "==> Checking for Docker..." -ForegroundColor Cyan
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
  Write-Host "Starting Postgres with docker compose..." -ForegroundColor Cyan
  docker compose up -d
  Write-Host "Waiting for Postgres to become healthy..." -ForegroundColor Cyan
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    $status = docker compose ps --format json 2>$null
    if ($LASTEXITCODE -eq 0) {
      try {
        $health = docker inspect --format="{{.State.Health.Status}}" rentairportcars-postgres 2>$null
        if ($health -eq "healthy") { $ready = $true; break }
      } catch {}
    }
    # Fallback: try TCP connect
    try {
      $tcp = New-Object System.Net.Sockets.TcpClient
      $tcp.Connect("127.0.0.1", 5432)
      $tcp.Close()
      $ready = $true
      break
    } catch {
      Write-Host "  still waiting... ($($i + 1)/30)"
    }
  }
  if (-not $ready) {
    Write-Host "Postgres container did not become ready in time." -ForegroundColor Yellow
    exit 1
  }
} else {
  Write-Host "Docker not found. Looking for a local PostgreSQL Windows service..." -ForegroundColor Yellow
  $svc = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($svc) {
    if ($svc.Status -ne "Running") {
      Write-Host "Starting service $($svc.Name)..." -ForegroundColor Cyan
      Start-Service $svc.Name
    } else {
      Write-Host "Service $($svc.Name) is already running." -ForegroundColor Green
    }
  } else {
    Write-Host ""
    Write-Host "Neither Docker nor PostgreSQL is installed on this machine." -ForegroundColor Red
    Write-Host "Install one of the following, then re-run this script:" -ForegroundColor Yellow
    Write-Host "  1) Docker Desktop: https://www.docker.com/products/docker-desktop/"
    Write-Host "     then: docker compose up -d"
    Write-Host "  2) PostgreSQL via winget:"
    Write-Host "     winget install --id PostgreSQL.PostgreSQL.17"
    Write-Host "     (create DB 'rentairportcars', user/password postgres/postgres, port 5432)"
    Write-Host ""
    Write-Host "Expected DATABASE_URL:"
    Write-Host '  postgresql://postgres:postgres@localhost:5432/rentairportcars'
    exit 1
  }
}

Write-Host "==> Syncing Prisma schema (npx prisma db push)..." -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) {
  Write-Host "prisma db push failed." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Database is ready. Refresh /admin505/financials" -ForegroundColor Green
