# Aqua Nook 3D — live desktop aquarium for Windows

A realistic, interactive aquarium that lives beneath your desktop icons. Six fish species, coral scenery, mini bay details and animated lighting run as a native Windows desktop layer while the taskbar, icons and other windows remain usable.

## Features

- Native Windows desktop hosting through the Progman/WorkerW layer.
- Six fish species with schooling motion, fin animation and click-to-feed reactions.
- Coral reef, river and betta scenes with a mini bay, shadows, water scattering and suspended particles.
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


## Scene screenshots

### Riverscape

![Riverscape desktop scene](docs/riverscape-desktop.png)

### Betta

![Betta desktop scene](docs/bettascape-desktop.png)

## Resource usage and hardware

Aqua Nook uses WebView2 and WebGL, so the main rendering load is on the GPU; the CPU handles the desktop host, fish simulation, and state updates. RAM and VRAM vary with resolution, scene, and quality, so a number measured on one machine is not a guarantee for every machine. Watch `AquaNook3D.exe` in Task Manager > Processes and the GPU engine/dedicated memory in Task Manager > Performance > GPU.

- **Practical minimum:** Windows 10/11 64-bit, 4 GB RAM, a 4-thread CPU, a WebGL2-capable GPU with about 1 GB available VRAM, .NET Framework 4.8, and WebView2 Runtime.
- **Recommended:** 8 GB RAM, a 4-core CPU, and a discrete GPU or recent integrated GPU with about 2 GB available VRAM for 2560×1440 at Sharp quality.
- **For lower-power or background use:** choose **Economy** (20 fps) or **Balanced** (30 fps), reduce the WebView2/render quality if needed, and use **Pause** when animation is unnecessary. When a foreground window fully covers the desktop or the machine is locked, the host automatically reduces or pauses rendering; it resumes when the desktop is visible.
- **On battery:** the host caps rendering at 30 fps. Sharp quality and multiple high-resolution monitors use more GPU time.

These are practical starting points; lower quality if Task Manager shows high GPU temperature, full VRAM, or stutter.
