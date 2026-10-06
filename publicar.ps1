# Publica a versão atual do Sistema no GitHub Pages.
# Uso: clique com o botão direito > "Executar com o PowerShell"
#      ou no terminal:  .\publicar.ps1 "descrição da mudança"
param([string]$mensagem = "Atualização do Sistema")

Set-Location $PSScriptRoot

# 1. Aumenta a versão do service worker (faz os celulares baixarem a versão nova)
$sw = Join-Path $PSScriptRoot "sw.js"
$txt = [IO.File]::ReadAllText($sw)
if ($txt -match 'sistema-v(\d+)') {
  $nova = [int]$Matches[1] + 1
  $txt = $txt -replace 'sistema-v\d+', "sistema-v$nova"
  [IO.File]::WriteAllText($sw, $txt, (New-Object Text.UTF8Encoding $false))
  Write-Host "Versão: sistema-v$nova" -ForegroundColor Cyan
}

# 2. Salva e envia
git add -A
git commit -m $mensagem | Out-Null
git push 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
  Write-Host "Publicado! Em ~1 minuto o app atualiza: https://gabriel071coder.github.io/Repository-de-GABRIEL/" -ForegroundColor Green
} else {
  Write-Host "Falha ao enviar. Verifique a internet/login do GitHub." -ForegroundColor Red
}
Read-Host "Pressione Enter para fechar"
