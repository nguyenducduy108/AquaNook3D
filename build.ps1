param([string]$SdkPath = (Join-Path $PSScriptRoot '..\..\work\webview2'))
$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$managed = Join-Path $SdkPath 'lib\net462'
Copy-Item -LiteralPath (Join-Path $managed 'Microsoft.Web.WebView2.Core.dll') -Destination $PSScriptRoot
Copy-Item -LiteralPath (Join-Path $managed 'Microsoft.Web.WebView2.WinForms.dll') -Destination $PSScriptRoot
Copy-Item -LiteralPath (Join-Path $SdkPath 'runtimes\win-x64\native\WebView2Loader.dll') -Destination $PSScriptRoot
Copy-Item -LiteralPath (Join-Path $SdkPath 'LICENSE.txt') -Destination (Join-Path $PSScriptRoot 'WebView2-LICENSE.txt')
Copy-Item -LiteralPath (Join-Path $SdkPath 'NOTICE.txt') -Destination (Join-Path $PSScriptRoot 'WebView2-NOTICE.txt')
& $compiler /nologo /target:winexe /platform:x64 /optimize+ /utf8output "/out:$PSScriptRoot\AquaNook3D.exe" "/win32manifest:$PSScriptRoot\src\app.manifest" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.Extensions.dll "/r:$PSScriptRoot\Microsoft.Web.WebView2.Core.dll" "/r:$PSScriptRoot\Microsoft.Web.WebView2.WinForms.dll" "$PSScriptRoot\src\AquaNook.cs"
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }

