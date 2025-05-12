#!/bin/bash
set -e

# Instalar dependências do sistema necessárias para o Playwright
echo "Instalando dependências do sistema para o Playwright..."
apt-get update
apt-get install -y curl wget gnupg ca-certificates \
    libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxcb1 libxkbcommon0 libx11-6 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    libwayland-client0
apt-get clean
rm -rf /var/lib/apt/lists/*

# Instalar o Playwright e o navegador Chromium
echo "Instalando o Playwright e o navegador Chromium..."
npx playwright install chromium

# Construir a aplicação Next.js
echo "Construindo a aplicação Next.js..."
npm run build

# Iniciar o servidor Next.js
echo "Iniciando o servidor Next.js..."
exec "$@"
