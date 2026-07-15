#!/usr/bin/env bash
# WorkPilot — one-command local setup (macOS / Linux / Git Bash / WSL)
# Usage:
#   chmod +x setup.sh && ./setup.sh
#   ./setup.sh --skip-docker     # use existing DATABASE_URL (e.g. Supabase)
#   ./setup.sh --no-seed         # schema only, no demo data
#   ./setup.sh --help

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SKIP_DOCKER=0
NO_SEED=0
YES=0

for arg in "$@"; do
  case "$arg" in
    --skip-docker) SKIP_DOCKER=1 ;;
    --no-seed) NO_SEED=1 ;;
    -y|--yes) YES=1 ;;
    -h|--help)
      cat <<'EOF'
WorkPilot setup

  ./setup.sh              Start Docker Postgres+Redis, install, db push, seed, then tip for npm run dev
  ./setup.sh --skip-docker   Skip Docker (you already set DATABASE_URL / DIRECT_URL in .env)
  ./setup.sh --no-seed       Do not run prisma seed
  ./setup.sh -y              Non-interactive (overwrite nothing if .env exists)

Requires: Node.js 20+, npm, and (unless --skip-docker) Docker Desktop
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (try --help)"
      exit 1
      ;;
  esac
done

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1m[%s]\033[0m %s\n' "$1" "$2"; }

bold "WorkPilot setup"
echo "  Project: $ROOT"

# —— 1. Node ——
step "1/6" "Checking Node.js…"
command -v node >/dev/null 2>&1 || die "Node.js not found. Install Node 20+ from https://nodejs.org"
command -v npm >/dev/null 2>&1 || die "npm not found"
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  die "Need Node.js 20+. Found: $(node -v)"
fi
ok "Node $(node -v) · npm $(npm -v)"

# —— 2. .env ——
step "2/6" "Environment file…"
if [[ -f .env ]]; then
  ok ".env already exists (left as-is)"
else
  if [[ ! -f .env.example ]]; then
    die ".env.example missing"
  fi
  cp .env.example .env
  # Local secret
  if command -v openssl >/dev/null 2>&1; then
    SECRET="$(openssl rand -base64 32 | tr -d '\n' | tr '+/' '-_')"
  else
    SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"
  fi
  # Portable replace of placeholder secret (macOS/BSD & GNU)
  if grep -q 'BETTER_AUTH_SECRET=' .env; then
    if [[ "$(uname -s)" == "Darwin" ]]; then
      sed -i '' "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=\"${SECRET}\"|" .env
    else
      sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=\"${SECRET}\"|" .env
    fi
  fi
  ok "Created .env from .env.example + generated BETTER_AUTH_SECRET"
fi

# —— 3. Docker ——
if [[ "$SKIP_DOCKER" -eq 1 ]]; then
  step "3/6" "Docker skipped"
  warn "Ensure DATABASE_URL and DIRECT_URL in .env point to a live Postgres"
else
  step "3/6" "Starting Postgres + Redis (Docker)…"
  command -v docker >/dev/null 2>&1 || die "Docker not found. Install Docker Desktop, or re-run with --skip-docker"
  if ! docker info >/dev/null 2>&1; then
    die "Docker is not running. Start Docker Desktop, then re-run ./setup.sh"
  fi
  if [[ -f docker-compose.yml ]] || [[ -f compose.yaml ]]; then
    docker compose up -d
    ok "docker compose up -d"
    # Wait for Postgres briefly
    echo "  Waiting for Postgres…"
    for i in {1..30}; do
      if docker compose exec -T postgres pg_isready -U workpilot -d workpilot >/dev/null 2>&1; then
        ok "Postgres is ready"
        break
      fi
      if [[ "$i" -eq 30 ]]; then
        warn "Could not confirm pg_isready — continuing anyway"
      fi
      sleep 1
    done
  else
    die "docker-compose.yml not found"
  fi
fi

# —— 4. Install ——
step "4/6" "Installing npm dependencies…"
npm install
ok "npm install done"

# —— 5. Prisma ——
step "5/6" "Prisma generate + db push…"
npx prisma generate
npx prisma db push
ok "Schema synced"

if [[ "$NO_SEED" -eq 0 ]]; then
  step "6/6" "Seeding demo data…"
  if npm run db:seed; then
    ok "Seed complete"
  else
    warn "Seed failed — you can still register a new company at /register"
  fi
else
  step "6/6" "Seed skipped (--no-seed)"
fi

cat <<'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WorkPilot is ready

  Start app:     npm run dev
  Open:          http://localhost:3000

  Demo (if seeded):
    Email        admin@demo.local
    Password     password123

  Optional later:
    npm run worker          # Redis jobs (digests / notifications)
    Admin → MCP             # Claude tokens
    See README.md + DEPLOY.md for Vercel / Supabase

  Supabase instead of Docker:
    Put pooler URL in DATABASE_URL (:6543)
    Put session/direct URL in DIRECT_URL (:5432)
    Then:  ./setup.sh --skip-docker
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
