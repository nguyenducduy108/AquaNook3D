# Aqua Nook 3D one-command installer for Windows 10/11.
$ErrorActionPreference = 'Stop'
$repo = 'nguyenducduy108/AquaNook3D'
$installRoot = Join-Path $env:LOCALAPPDATA 'AquaNook3D'
$tempRoot = Join-Path $env:TEMP ('AquaNook3D-' + [Guid]::NewGuid().ToString('N'))
$zipPath = Join-Path $env:TEMP ('AquaNook3D-' + [Guid]::NewGuid().ToString('N') + '.zip')
try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    Write-Host 'Downloading Aqua Nook 3D...' -ForegroundColor Cyan
    Invoke-WebRequest -Uri "https://github.com/$repo/archive/refs/heads/main.zip" -OutFile $zipPath
    Expand-Archive -LiteralPath $zipPath -DestinationPath $tempRoot -Force
    $extracted = Get-ChildItem -LiteralPath $tempRoot -Directory | Select-Object -First 1
    if (-not $extracted) { throw 'The GitHub archive did not contain a project directory.' }
    New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
    Get-ChildItem -LiteralPath $extracted.FullName -Force | Where-Object { $_.Name -notin @('.git','.github') } | Copy-Item -Destination $installRoot -Recurse -Force
    $exe = Join-Path $installRoot 'AquaNook3D.exe'
    if (-not (Test-Path -LiteralPath $exe)) { throw 'AquaNook3D.exe was not found after extraction.' }
    $shortcutDir = Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs'
    $shortcut = Join-Path $shortcutDir 'Aqua Nook 3D.lnk'
    New-Item -ItemType Directory -Path $shortcutDir -Force | Out-Null
    $shell = New-Object -ComObject WScript.Shell
    $link = $shell.CreateShortcut($shortcut)
    $link.TargetPath = $exe
    $link.WorkingDirectory = $installRoot
    $link.Description = 'Interactive live desktop aquarium'
    $link.Save()
    Write-Host 'Starting Aqua Nook 3D...' -ForegroundColor Green
    Start-Process -FilePath $exe -WorkingDirectory $installRoot
    Write-Host "Installed to $installRoot" -ForegroundColor Green
} finally {
    Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

