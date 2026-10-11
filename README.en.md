# Aqua Nook 3D — live desktop aquarium for Windows

A realistic, interactive aquarium that lives beneath your desktop icons. Six fish species, coral scenery, mini bay details and animated lighting run as a native Windows desktop layer while the taskbar, icons and other windows remain usable.

## Features

- Native Windows desktop hosting through the Progman/WorkerW layer.
- Six fish species with schooling motion, fin animation and click-to-feed reactions.
- Coral reef, river and betta scenes with a mini bay, sun-wheel accent, shadows, water scattering and suspended particles.
- Tray controls for scene switching, pause/resume, quality, reload, logs, startup and exit.
- No CDN, HTTP server, Python or Node runtime is required by the compiled build.

## One-command install

Open PowerShell and run:

```powershell
irm https://raw.githubusercontent.com/nguyenducduy108/AquaNook3D/main/install.ps1 | iex
```

The installer downloads the latest public archive, installs to `%LOCALAPPDATA%\\AquaNook3D`, creates a Start Menu shortcut and launches the tray host. Requirements are Windows 10/11 64-bit, .NET Framework 4.8 and Microsoft Edge WebView2 Runtime. If WebView2 is missing, the script prints Microsoft's official download page.

For a local checkout:

```powershell
powershell -ExecutionPolicy Bypass -File .\\install.ps1
```

## Controls

- Move the pointer over the desktop to make fish notice and turn.
- Hold **Ctrl** and left-click the desktop to drop food; fish swim toward the sinking pellets.
- Use the tray menu to switch **Coral reef**, **Riverscape** and **Betta** scenes, pause/resume, change quality, reload the wallpaper, open logs or exit.
- `start-wallpaper.bat` starts the host; `stop-wallpaper.bat` stops it and reveals the underlying Windows wallpaper.
- **Start with Windows** is optional and off by default.

## Desktop behavior

The host attaches below `SHELLDLL_DefView` using the Progman/WorkerW desktop layer. This preserves desktop icons, the taskbar, drag-and-drop and Win+D. The aquarium pauses rendering when a foreground window fully covers it. It does not replace the Windows wallpaper or create a fake always-on-top window.

## Build and test

```powershell
.\\build.ps1 -SdkPath 'C:\\path\\to\\dotnet-sdk'
cd site
npm test
```

`AquaNook3D.exe --diagnostic <output-directory>` checks rendering, click-to-feed interaction, motion, pause, scene switching and desktop-layer recovery. See `VALIDATION.md` for the recorded checks and known limits.

## Credits and licensing

The desktop-hosting architecture was informed by [Lively Wallpaper](https://github.com/rocksdanister/lively). Aqua Nook 3D is an independent project and is not a Lively fork or bundled copy.

The WebGL scene is adapted from [Deskworlds](https://github.com/chaseleantj/deskworlds) under MIT; third-party notices remain in `site/`. The original host, bridge, realistic rendering changes and added species are included here under the [Apache License 2.0](LICENSE).


