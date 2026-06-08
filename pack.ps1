$env:ELECTRON_CACHE = "d:\02-lxb\100\05\.electron-cache"
$env:ELECTRON_BUILDER_CACHE = "d:\02-lxb\100\05\.electron-cache"
$env:LOCALAPPDATA = "d:\02-lxb\100\05\.cache-appdata"
$env:APPDATA = "d:\02-lxb\100\05\.cache-appdata"

New-Item -ItemType Directory -Force -Path $env:ELECTRON_CACHE | Out-Null
New-Item -ItemType Directory -Force -Path $env:LOCALAPPDATA | Out-Null
New-Item -ItemType Directory -Force -Path "$env:LOCALAPPDATA\electron" | Out-Null

Write-Host "ELECTRON_CACHE: $env:ELECTRON_CACHE"
Write-Host "LOCALAPPDATA: $env:LOCALAPPDATA"

Set-Location "d:\02-lxb\100\05"
npx electron-builder --win
