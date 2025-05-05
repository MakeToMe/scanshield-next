# Script para construir e publicar a imagem Docker do ScanShield

# Carrega variáveis de ambiente do arquivo .env se existir
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value)
        }
    }
}

# Configurações padrão
$registry = if ($env:DOCKER_REGISTRY) { $env:DOCKER_REGISTRY } else { "fmguardia" }
$tag = if ($env:TAG) { $env:TAG } else { "latest" }
$imageName = "${registry}/scanshield:${tag}"

Write-Host "🔒 Iniciando build da imagem Docker do ScanShield..." -ForegroundColor Cyan

# Constrói a imagem Docker
Write-Host "🏗️ Construindo imagem: $imageName" -ForegroundColor Yellow
docker build -t $imageName .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falha ao construir a imagem Docker." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Imagem Docker construída com sucesso: $imageName" -ForegroundColor Green

# Pergunta se deseja publicar a imagem
$publish = Read-Host "Deseja publicar a imagem no Docker Registry? (s/n)"

if ($publish -eq "s") {
    Write-Host "🚀 Publicando imagem no Docker Registry..." -ForegroundColor Yellow
    docker push $imageName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha ao publicar a imagem Docker." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Imagem publicada com sucesso: $imageName" -ForegroundColor Green
}

Write-Host "🎉 Processo concluído!" -ForegroundColor Cyan
