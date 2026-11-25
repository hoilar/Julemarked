# Starter produksjonsserveren og Cloudflare-tunnelen (julemarked.bagel.no) i hvert sitt vindu.
# Bruk:  powershell -ExecutionPolicy Bypass -File tools\start-prod.ps1
# Se DRIFT.md. Serveren bruker prod.env (port 8080, data/prod/julemarked.db).
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host 'Bygger klienten og starter spillserveren på port 8080 ...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root'; npm run prod" -WindowStyle Normal

# cloudflared fra winget havner ikke alltid i PATH: finn den i winget-mappa.
$cf = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cf) { $cf = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter cloudflared.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName }
if (-not $cf) { throw 'Fant ikke cloudflared. Installer med: winget install Cloudflare.cloudflared' }

Write-Host 'Starter Cloudflare-tunnelen (julemarked) ...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "& '$cf' tunnel --config '$env:USERPROFILE\.cloudflared\julemarked.yml' run julemarked" -WindowStyle Normal

Write-Host 'Ferdig. Spillet er på https://julemarked.bagel.no når begge vinduene har startet.'
