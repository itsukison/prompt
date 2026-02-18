⏺ All four files have been updated. Here's a summary of what was done:                                 
                                                                                                                                                                        
  src/services/focus-service.js                                                                                                                                         
  - Added BROWSER_SCRIPT_MAP matching Chrome/Arc/Brave/Edge/Safari (Firefox excluded)                                                                                   
  - Added getBrowserContext(appName) — synchronous, execSync-based, macOS-only, returns { url, title } or null on any failure                                           
  - Exported getBrowserContext                                                                                                                                          
                                                                                                       
  src/main.js
  - Imported getBrowserContext
  - Added let previousBrowserContext = null state variable
  - Added get previousBrowserContext() getter to appState proxy
  - Called getBrowserContext(previousApp) in both handleShowOverlay() and handleUpdateContext()

  src/ipc/generation-handlers.js
  - Passed state.previousBrowserContext as the 9th argument to generateText()

  src/services/gemini-service.js
  - Added browserContext = null as the 9th parameter to generateText()
  - Injected Current browser page: URL / Page title block into the system instruction when a browser context is present (both text and vision paths share the same
  systemInstruction)
  - Replaced the single-line screenshot rule with the improved multi-panel spatial attention rule
  - Added browserHint inline in the vision imageParts text when a browser context is available