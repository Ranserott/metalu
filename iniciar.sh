#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "========================================"
echo "  METALU v0.2.0 LAN - Iniciando"
echo "========================================"
echo

if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js no esta instalado."
    echo "Instalalo con: brew install node@20  (macOS)"
    echo "              o descarga desde https://nodejs.org"
    exit 1
fi

NODE_VERSION="$(node -v)"
echo "Node.js detectado: $NODE_VERSION"
echo

# First-time install
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias (puede tardar 2-3 minutos)..."
    npm install
    echo
fi

# Prisma generate
echo "Generando Prisma client..."
npx prisma generate
echo

# Create and reuse a per-installation Auth.js secret
node -e "const fs=require('node:fs'),crypto=require('node:crypto'),p='.metalu-auth-secret';let s='';try{s=fs.readFileSync(p,'utf8').trim()}catch{}if(!/^[0-9a-f]{64}$/.test(s)){s=crypto.randomBytes(32).toString('hex');fs.writeFileSync(p,s)}"
AUTH_SECRET="$(<".metalu-auth-secret")"
export AUTH_SECRET
export NEXTAUTH_SECRET="$AUTH_SECRET"
chmod 600 ".metalu-auth-secret"

echo "Iniciando Metalu en http://localhost:3000"
echo "Usuario inicial: admin / admin123"
echo
echo "Presiona Ctrl+C para detener el servidor."
echo "========================================"
echo

export METALU_RUNTIME=tauri
npm run dev
