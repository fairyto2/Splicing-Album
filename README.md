# Splicing Album · 拼图相册

Import photos from a camera or phone, arrange them freely on a **masked multi-layer canvas**, design and apply **layout templates**, and export **high-resolution CMYK print-ready** images. One React core, packaged for **desktop (Electron)** and **mobile (Capacitor)**.

> 导入相机或手机拍摄的图片，在画布中自由排版（每张照片按遮罩裁切），可编辑/导入/导出布局模板，并导出可供 **CMYK 打印**的高分辨率图片。桌面端基于 Electron，移动端基于 Capacitor，共用一套 React 核心。界面支持**中英文切换**。

---

## Features

- **Multi-layer canvas with correct masking** — every photo is a layer whose visible pixels are exactly `image ∩ frame` (clipped via Konva `clipFunc`). Add, drag, resize, reorder, and set opacity/fit per layer. Undo/redo included.
- **Layout templates**
  - Built-in grids (1/2/3/4/6-up).
  - **Author your own**: add empty slots (`+ Slot`), drag/resize them freely, then **Save**.
  - Saved templates persist across restarts and appear under **My templates**.
  - Import / export template JSON.
  - Applying a template **locks frame positions** — you only fill slots and reframe images.
- **Image library (待选图库)** — import images into a palette, then **drag** them onto template slots. Reframe any image by **drag (pan)** + **scroll (zoom)** within its locked frame.
- **Export**
  - Composite at a target DPI with bleed.
  - **CMYK** → uncompressed CMYK **TIFF** (print-ready), or **RGB PNG**.
  - CMYK separation is offline (matrix/UCR) behind a swappable `ColorConverter`; `lcms-wasm` ICC conversion is the documented upgrade path.
  - Cross-platform save: Electron IPC dialogs (desktop) / Capacitor Filesystem (mobile) / browser download.
- **Multi-language UI** — English and 简体中文, switchable from the toolbar.

## Tech stack

| Area | Choice |
| --- | --- |
| Core UI | React 19 + TypeScript |
| Canvas / scene graph | react-konva + Konva |
| State / history | Zustand + Zundo |
| Desktop | Electron + electron-vite + electron-builder |
| Mobile | Capacitor 8 |
| Build | Vite 7 (pinned — electron-vite v5 supports Vite ≤ 7) |
| Tests | Vitest + Testing Library |

## Getting started

```bash
npm install
npm run dev          # desktop app (Electron) with HMR
npm run dev:web      # the same editor in a browser
```

> **Restricted networks (e.g. mainland China):** GitHub-hosted binaries (Electron) may time out. Set a mirror before installing/running the first time:
> ```bash
> export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> ```

Generate demo photos to try the editor immediately:

```bash
node samples/gen.js     # writes samples/*.png
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Electron desktop app with HMR |
| `npm run dev:web` | Editor in a browser (also used for mobile dev) |
| `npm run build` | Web build → `dist/` (Capacitor + static host) |
| `npm run build:desktop` | Electron build → `out/{main,preload,renderer}` |
| `npm run package:mac` | Build + package a macOS `.app` |
| `npm run cap:sync` | `build` then `cap sync` (after adding a native platform) |
| `npm run test` / `test:run` | Vitest (watch / single run) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

Run a single test file: `npx vitest run src/data/geometry.test.ts`.

## Architecture

**One React core, two build targets.** `src/` is a normal React + Vite + react-konva app consumed twice:
- `vite build` → `dist/` (Capacitor `webDir`, `base: './'` for relative asset URLs).
- `electron-vite build` → `out/`, reusing the same root `index.html` + `src/`.

**The data model drives everything; the scene graph is never serialized.** `src/data/types.ts` (`Rect`, `Layer`, `CanvasSpec`, `Template`, `Document`) is plain JSON. Konva nodes are derived from it at render time (`stage.toJSON()` drops `clipFunc` + images, so the model is the source of truth for templates and undo/redo).

**Layer = masked image** (`src/editor/PhotoLayer.tsx`): a clipped `Group` holding the image, plus an interactive frame handle. Two modes:
- *Unlocked (design / free layout)*: drag/resize the frame.
- *Locked (template mode)*: frame is fixed; the image is pannable (drag) + zoomable (scroll), always covering the frame.

**Export pipeline** (`src/export/`): `render.ts` composites the document (with bleed) to an offscreen canvas at the export DPI; `color.ts` → CMYK; `tiff/writeCmykTiff.ts` → CMYK TIFF. All behind a swappable `ColorConverter` / `exportDocument` seam.

**i18n** (`src/i18n/`): a lightweight Zustand-backed dictionary with `{placeholder}` interpolation; language persists in `localStorage`. Add a language by adding a key set to `translations`.

```
src/
  data/        # plain serializable model + geometry (tested)
  state/       # Zustand store (document, library, templates) + Zundo history
  editor/      # react-konva canvas editor + panels/dialogs
  export/      # offscreen render → CMYK → TIFF (tested)
  lib/         # image cache
  i18n/        # dictionaries + useT() hook
  platform.ts  # cross-platform file save/open
electron/      # main / preload / ipc
```

## Status & limitations

- CMYK separation is offline matrix/UCR (not ICC-profile-managed yet); `lcms-wasm` integration is the next step behind the existing seam.
- Layer rotation and tiled (oversized, >32k px) export are deferred.
- Native Capacitor builds (`cap add ios/android`) require local Xcode / Android SDK — config + `cap sync` are scaffolded only.
- Desktop packaging is unsigned (no Apple Developer ID); right-click → Open on first launch if macOS warns.

## License

See [LICENSE](./LICENSE).
