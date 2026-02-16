# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development - build renderer with watch mode
npm run dev

# Start app (builds renderer first, then launches Electron)
npm start

# Package for local testing (creates unpacked build)
npm run package

# Build distributable (DMG/ZIP on macOS, NSIS on Windows, AppImage on Linux)
npm run build
```

## Architecture

promptOS is an Electron-based global AI writing assistant that uses Google's Gemini API. Press `Cmd+/` (macOS) or `Ctrl+/` (Windows/Linux) to open an overlay anywhere in the system.

### Process Architecture

- **Main Process** (`src/main.js`): Handles Electron lifecycle, global shortcuts, window management, Gemini API calls, and OS-level focus management via AppleScript
- **Preload** (`src/preload.js`): Exposes `window.promptOS` API to renderer via contextBridge
- **Renderer** (`src/renderer/`): UI layer built with React + TypeScript + Vite + Tailwind CSS

### Renderer Architecture (React)

#### Entry Points
- `src/renderer/overlay.tsx` - Overlay window entry point
- `src/renderer/main-window.tsx` - Main window entry point

#### Core Infrastructure
- `src/renderer/contexts/PromptOSContext.tsx` - IPC wrapper using React Context
- `src/renderer/hooks/useWindowEvents.ts` - Window lifecycle management
- `src/renderer/types/promptos.d.ts` - TypeScript type definitions

#### Components
- **Overlay**: `components/overlay/OverlayWindow.tsx`
- **Main Window**:
  - `components/main-window/MainWindowApp.tsx` - Router
  - `components/main-window/AuthPage.tsx` - Authentication
  - `components/main-window/OnboardingStep1.tsx` - Name input
  - `components/main-window/OnboardingStep2.tsx` - Writing style selection
  - `components/main-window/SettingsPage.tsx` - Settings with tabs

#### Best Practices Applied
- Stable event handlers with refs
- Functional setState updates
- Derived state during render
- Lazy state initialization
- Narrow effect dependencies
- Hoisted static JSX
- Init-once pattern for app-wide initialization

### Key Flows

1. **Overlay Toggle**: Global shortcut → captures frontmost app name → shows transparent overlay window
2. **Text Generation**: Renderer calls `promptOS.generate()` → IPC to main → Gemini API → returns result
3. **Insert Text**: Copies result to clipboard → hides overlay → activates previous app via AppleScript → simulates `Cmd+V` paste

### IPC Channels

- `generate-text`: Invoke to generate text with Gemini
- `insert-text`: Invoke to paste text into previous app
- `dismiss`: Send to hide overlay
- `window-shown` / `window-hidden`: Events from main to renderer

## Configuration

- **API Key**: Set `GEMINI_API_KEY` in `.env` file
- **Model**: Uses `gemini-2.0-flash` (configured in `src/main.js`)

## Platform Notes

- macOS requires Accessibility permissions for focus management and paste simulation (System Settings > Privacy & Security > Accessibility)
- The app uses hardened runtime with entitlements for AppleScript automation (`entitlements.plist`)
