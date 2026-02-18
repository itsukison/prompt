# Electron + Vite Architecture Rules

## Problem Files
- `src/main.js` (1,848 lines) — monolithic, needs splitting into core/ipc/services
- `src/renderer/components/main-window/SettingsPage.tsx` (860 lines) — needs tab extraction

## Do Not Touch (Already Correct)
- `src/preload.js` — clean IPC bridge
- `src/embedding.js` — focused module
- `src/supabase.js` — minimal client init
- `src/renderer/contexts/PromptOSContext.tsx` — this IS the renderer API layer
- `src/renderer/hooks/useWindowEvents.ts` — correct hook pattern
- `src/renderer/components/overlay/OverlayWindow.tsx` — reference implementation for React patterns

## Process Boundary Rule
Main process and renderer are separate runtimes. Communication only through IPC.
- Never import Electron APIs in renderer files
- Never import renderer code in main process
- `preload.js` is the only file bridging both sides

## Main Process Layer Structure

```
src/
├── main.js                    # Orchestration only (~150 lines)
├── preload.js                 # IPC bridge (keep as-is)
├── embedding.js               # Keep as-is
├── supabase.js                # Keep as-is
├── core/
│   ├── window-manager.js      # createMainWindow, createOverlayWindow, show/hide overlay
│   └── shortcuts-manager.js   # registerShortcuts, unregisterShortcuts
├── ipc/
│   ├── index.js               # Registers all handler modules
│   ├── generation-handlers.js # generate-text, check-context-need, screenshot:capture
│   ├── auth-handlers.js       # auth:* handlers
│   ├── profile-handlers.js    # profile:*, onboarding:*, analyze-writing-style
│   ├── memory-handlers.js     # memory:* handlers
│   └── usage-handlers.js      # usage:get-stats
├── services/
│   ├── gemini-service.js      # generateText, generateWithRetry, checkContextWithLLM
│   ├── memory-service.js      # analyzeSessionForMemories, getRelevantMemories, getWritingStyleGuide
│   ├── focus-service.js       # getFrontmostApp, activateApp, simulatePaste, getSelectedText
│   └── context-service.js     # checkContextNeed (heuristics), captureScreenshot
└── utils/
    ├── platform.js            # IS_MAC, IS_WINDOWS, IS_LINUX
    └── ipc-response.js        # ok(data) and fail(message) helpers
```

## Service Layer Rules
- Services accept all dependencies as parameters — never read globals internally
- Services have zero Electron API imports
- One domain per file

```javascript
// Wrong
async function generateText(prompt) { /* reads genAI global */ }

// Correct
async function generateText(genAI, prompt, userProfile, options) { ... }
```

## IPC Handler Rules
Handlers must be thin: receive → validate → call service → return response.
Max 30 lines per handler. Use `ok(data)` / `fail(message)` from `utils/ipc-response.js`.

```javascript
ipcMain.handle('memory:add', async (event, content, category) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail('Not authenticated');
    const memory = await memoryService.addMemory(supabase, user.id, content, category);
    return ok({ memory });
  } catch (err) {
    return fail(err.message);
  }
});
```

## Renderer Structure — SettingsPage Split

```
components/main-window/
├── SettingsPage.tsx           # Sidebar + tab shell only (~150 lines after split)
└── settings/
    ├── GeneralTab.tsx         # Profile, writing style
    ├── AccountTab.tsx         # Email, security
    ├── MemoryTab.tsx          # Memory CRUD
    ├── BillingTab.tsx         # Usage stats
    ├── ShortcutsTab.tsx       # Keyboard shortcuts
    └── hooks/
        ├── useProfile.ts      # Profile state + updates
        └── useMemory.ts       # Memory operations
```

## React Patterns (From OverlayWindow.tsx — Apply Everywhere)
- Hoist static JSX outside component
- `useCallback` for stable event handlers
- `useRef` for sync reads in handlers
- `setState(prev => ...)` for state depending on previous value
- Derive booleans in render: `const hasResult = !!result`
- Cancellation flag in async effects: `let cancelled = false`
- Narrow `useEffect` dependencies

## File Size Limits

| Type | Target | Hard Limit |
|------|--------|------------|
| main.js entry | ≤150 | 300 |
| Service file | ≤250 | 400 |
| IPC module | ≤150 | 250 |
| React component | ≤300 | 450 |
| Custom hook | ≤100 | 150 |

## Vite Rules
- Main process: CommonJS (`require`/`module.exports`)
- Renderer: ESM (`import`/`export`)
- Path alias: always use `@/` instead of relative `../../` paths
- Static assets: put in `/public/`, reference as `"logo.png"` in JSX

## Error Handling
Every `ipcMain.handle` must have try/catch. Return `{ success: true, ...data }` or `{ success: false, error }`.
Never use `alert()` in renderer — use inline error state instead.
