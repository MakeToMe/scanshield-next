# Script para substituir a função scanScriptsForSecrets pela nova função scanScriptsForSecretsUniversal
# Este script faz a substituição com segurança, mantendo uma cópia de backup

# Verifica se já existe um backup e cria um novo se necessário
if (-not (Test-Path "route.ts.bak")) {
    Copy-Item "route.ts" "route.ts.bak"
    Write-Host "Backup criado: route.ts.bak"
}

# Lê o conteúdo do arquivo original
$content = Get-Content "route.ts" -Raw

# Define o padrão para encontrar a função antiga
$oldFunctionPattern = '(?s)async function scanScriptsForSecrets\(\) \{.*?return \{.*?urlsFound,.*?keysFound,.*?paths: \[\].*?\};.*?\}'

# Lê o novo código do arquivo new-script.js
$newFunction = Get-Content "new-script.js" -Raw

# Prepara o novo código para substituição
$replacement = "async function scanScriptsForSecretsUniversal() {" + $newFunction.Substring($newFunction.IndexOf("{") + 1)

# Faz a substituição
$newContent = $content -replace $oldFunctionPattern, $replacement

# Substitui a chamada da função
$newContent = $newContent -replace "return await scanScriptsForSecrets\(\);", "return await scanScriptsForSecretsUniversal();"

# Salva o novo conteúdo em um arquivo temporário
$newContent | Set-Content "route.ts.new"

Write-Host "Substituição concluída. Novo arquivo criado: route.ts.new"
Write-Host "Verifique o arquivo route.ts.new e, se estiver correto, substitua o arquivo original:"
Write-Host "Copy-Item 'route.ts.new' 'route.ts' -Force"
