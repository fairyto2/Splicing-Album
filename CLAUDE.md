# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Splicing Album** — import photos (camera/phone), arrange them freely on a masked multi-layer canvas, edit/import/export layout templates, and export high-resolution **CMYK print-ready** images. One React core, two targets: **desktop (Electron)** and **mobile (Capacitor)**.

Status: scaffolded functional MVP. Build/test gates pass (typecheck, 28 unit tests, web build, desktop build).

## Hard requirements (shape every decision)

1. **Editable/importable templates** — pure data (`Template` = canvas + slot rects), serialized as JSON.
2. **Multi-layer canvas with correct masking** — each photo's visible pixels are exactly `image ∩ frame`. Mask correctness is verified by unit tests.
3. **Cross-platform packaging** — one React core wrapped for Electron (desktop) and Capacitor (mobile).

## Architecture

**One shared core, two build targets.** `src/` is a normal React + Vite + react-konva app. It is consumed twice:
- `vite build` → `dist/` (used by Capacitor, `webDir: 'dist'`, and any static host). `base: './'` keeps asset URLs relative for `capacitor://localhost`.
- `electron-vite build` → `out/{main,preload,renderer}`, where the renderer reuses the same root `index.html` + `src/`.

Avoid `@capacitor-community/electron` (known Vite breakage) — Electron is driven directly by electron-vite.

**The data model drives everything; the scene graph is never serialized.** `src/data/types.ts` (`Rect`, `Layer`, `CanvasSpec`, `Template`, `Document`) is plain JSON. Konva's `stage.toJSON()` drops `clipFunc` + images, so the editor derives Konva nodes from the model at render time and serializes the *model* for templates/undo. Geometry is in canvas **design pixels** (mm × `canvas.dpi`).

**Layer = masked image.** A photo renders as two nodes (`src/editor/PhotoLayer.tsx`): a clipped `Group` (clipFunc = frame rect) holding the image, plus an interactive `Rect` (the frame handle) that is draggable + resizeable via `Transformer`. `clipFunc` is derived from the frame at render — never stored. Interactions commit to the store only on drag/transform END (one undo entry per gesture).

**State:** `src/state/editorStore.ts` — `zustand` + `zundo` (`temporal` middleware). Only `document` is undo-tracked (`partialize`); selection/zoom are transient. Undo/redo via `useEditorStore.temporal` (subscribe through zustand's `useStore`).

**Export pipeline (`src/export/`)** is behind a swappable `ColorConverter` / `exportDocument` seam:
- `render.ts` composites the document (with bleed) to an offscreen Canvas2D at the export DPI — independent of Konva, not capped by the on-screen viewport.
- `color.ts` → CMYK; `tiff/writeCmykTiff.ts` → uncompressed CMYK TIFF (PhotometricInterpretation=5).
- `ExportService.ts` ties it together; raises if output exceeds the ~32k px single-canvas cap (tiled export for oversized formats is the deferred path).

**Platform file I/O:** `src/platform.ts` — `saveBytes` / `openJsonText` work on desktop (Electron IPC via the `desktop` contextBridge), mobile (Capacitor Filesystem, dynamic-imported so it stays a lazy chunk on web), and plain web (browser download / file input).

### CMYK: what shipped vs. the goal
MVP ships `MatrixCmykConverter` — a pure-JS, fully offline RGB→CMYK separation with under-color removal. It is **not ICC-profile-managed** but produces valid, deterministic 4-channel CMYK with zero native deps (so it runs on desktop *and* mobile). `src/export/lcms.ts` (`LcmsWasmConverter`) is the documented upgrade to real ICC conversion via `lcms-wasm`; it implements the same `ColorConverter` interface and drops into `ExportService` once wired. This was the chosen direction; the seam is in place.

## Commands

```
npm run dev          # electron-vite dev — desktop app with HMR (needs the Electron binary)
npm run dev:web      # vite — the same editor in a browser (also used for mobile dev)
npm run build        # vite build → dist/ (Capacitor + web)
npm run build:desktop# electron-vite build → out/{main,preload,renderer}
npm run cap:sync     # build && cap sync (after adding a native platform)
npm run typecheck    # tsc --noEmit
npm run test         # vitest (watch)
npm run test:run     # vitest run (CI)
npm run lint         # eslint .
```
Run a single test file: `npx vitest run src/data/geometry.test.ts` (or `npx vitest run -t "covers the frame"`).

**Electron binary:** `npm install` should fetch it via postinstall; if `npx electron` says "Downloading…", run `node node_modules/electron/install.js`. Native Capacitor builds (`cap add ios/android`, `cap open`) require local Xcode / Android SDK — only the config + `cap sync` are scaffolded.

## Toolchain notes (pinned for peer-compat)
The ecosystem is mid-migration to Vite 8, but **electron-vite v5 only supports Vite ≤ 7**, so this project pins the Vite-7 set: `vite@^7`, `@vitejs/plugin-react@^5`, `vitest@^3`. React 19 + react-konva 19 + konva 10. TypeScript here is new enough that `baseUrl` is removed — `paths` use relative entries (`"@/*": ["./src/*"]`); the `@` alias is also set in all three Vite configs.

## Verification
`npm run typecheck && npm run test:run && npm run build && npm run build:desktop` — all green. Manual: `npm run dev` (or `dev:web`) → add photos, drag/resize (each clipped to its frame), apply a template, then Export → CMYK TIFF (open in an image tool to confirm 4-channel CMYK).
