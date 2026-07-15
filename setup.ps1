# WorkPilot — one-command local setup (Windows PowerShell)
# Usage:
#   .\setup.ps1
#   .\setup.ps1 -SkipDocker
#   .\setup.ps1 -NoSeed

param(
  [switch]$SkipDocker,
  [switch]$NoSeed,
  [switch]$Help
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if ($Help) {
  Write-Host @"
WorkPilot setup (PowerShell)

  .\setup.ps1              Docker Postgres+Redis, install, db push, seed
  .\setup.ps1 -SkipDocker  Use DATABASE_URL / DIRECT_URL already in .env
  .\setup.ps1 -NoSeed      Skip demo seed
"@
  exit 0
}

function Ok($msg) { Write-Host "  OK  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  !   $msg" -ForegroundColor Yellow }
function Die($msg) { Write-Host "  ERR $msg" -ForegroundColor Red; exit 1 }
function Step($n, $msg) { Write-Host ""; Write-Host "[$n] $msg" -ForegroundColor Cyan }

Write-Host "WorkPilot setup" -ForegroundColor White
Write-Host "  Project: $PSScriptRoot"

Step "1/6" "Checking Node.js…"
try {
  $nodeVer = node -v
  $npmVer = npm -v
} catch {
  Die "Node.js / npm not found. Install Node 20+ from https://nodejs.org"
}
$major = [int]((node -p "process.versions.node.split('.')[0]"))
if ($major -lt 20) { Die "Need Node 20+. Found: $nodeVer" }
Ok "Node $nodeVer · npm $npmVer"

Step "2/6" "Environment file…"
if (Test-Path .env) {
  Ok ".env already exists (left as-is)"
} else {
  if (-not (Test-Path .env.example)) { Die ".env.example missing" }
  Copy-Item .env.example .env
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = [Convert]::ToBase64String($bytes)
  (Get-Content .env) -replace '^BETTER_AUTH_SECRET=.*', "BETTER_AUTH_SECRET=`"$secret`"" |
    Set-Content .env -Encoding utf8
  Ok "Created .env from .env.example + generated BETTER_AUTH_SECRET"
}

if ($SkipDocker) {
  Step "3/6" "Docker skipped"
  Warn "Ensure DATABASE_URL and DIRECT_URL in .env point to a live Postgres"
} else {
  Step "3/6" "Starting Postgres + Redis (Docker)…"
  try { docker info | Out-Null } catch { Die "Docker not running. Start Docker Desktop or use -SkipDocker" }
  docker compose up -d
  Ok "docker compose up -d"
  Start-Sleep -Seconds 3
}

Step "4/6" "Installing npm dependencies…"
npm install
Ok "npm install done"

Step "5/6" "Prisma generate + db push…"
npx prisma generate
npx prisma db push
Ok "Schema synced"

if (-not $NoSeed) {
  Step "6/6" "Seeding demo data…"
  try {
    npm run db:seed
    Ok "Seed complete"
  } catch {
    Warn "Seed failed — you can still register at /register"
  }
} else {
  Step "6/6" "Seed skipped (-NoSeed)"
}

Write-Host @"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WorkPilot is ready

  Start app:     npm run dev
  Open:          http://localhost:3000

  Demo (if seeded):
    Email        admin@demo.local
    Password     password123

  Optional:      npm run worker
  Docs:          README.md · DEPLOY.md · MCP.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"@
