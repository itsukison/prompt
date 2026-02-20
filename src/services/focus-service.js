const { exec, execSync } = require('child_process');
const { IS_MAC, IS_WINDOWS } = require('../utils/platform');

// Apps that need 'open -a' on macOS due to sandboxing
const OPEN_A_APPS = ['Google Chrome', 'Chrome', 'Brave Browser', 'Microsoft Edge', 'Arc'];

/**
 * Get the name and front window title of the currently frontmost application.
 * @returns {{ appName: string|null, windowTitle: string|null }}
 */
function getFrontmostApp() {
    if (IS_MAC) {
        try {
            const appScript = 'tell application "System Events" to get name of first process whose frontmost is true';
            const appName = execSync(`osascript -e '${appScript}'`, { encoding: 'utf-8' }).trim();

            let windowTitle = null;
            try {
                const winScript = 'tell application "System Events" to get name of front window of (first process whose frontmost is true)';
                windowTitle = execSync(`osascript -e '${winScript}'`, { encoding: 'utf-8' }).trim();
            } catch {
                // App doesn't expose window names via Accessibility — not fatal
            }

            return { appName, windowTitle };
        } catch (error) {
            console.error('[Focus] Failed to get frontmost app:', error.message);
            return { appName: null, windowTitle: null };
        }
    } else if (IS_WINDOWS) {
        try {
            const psScript = `Add-Type @"\nusing System;\nusing System.Runtime.InteropServices;\npublic class FocusHelper {\n    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();\n    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);\n    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);\n}\n"@\n$hwnd = [FocusHelper]::GetForegroundWindow()\n$pid = 0\n[FocusHelper]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null\n$appName = (Get-Process -Id $pid).ProcessName\n$sb = New-Object System.Text.StringBuilder 256\n[FocusHelper]::GetWindowText($hwnd, $sb, 256) | Out-Null\n$windowTitle = $sb.ToString()\n"$appName|$windowTitle"`;
            const raw = execSync(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, { encoding: 'utf-8', timeout: 2000 }).trim();
            const [appName, windowTitle] = raw.split('|');
            return { appName: appName || null, windowTitle: windowTitle || null };
        } catch (error) {
            console.error('[Focus] Failed to get frontmost app:', error.message);
            return { appName: null, windowTitle: null };
        }
    }
    return { appName: null, windowTitle: null };
}

/**
 * Activate (bring to front) a specific application
 * @param {string} appName
 * @returns {Promise<boolean>}
 */
function activateApp(appName) {
    return new Promise((resolve) => {
        if (!appName) { resolve(false); return; }

        if (IS_MAC) {
            const needsOpenA = OPEN_A_APPS.some(name =>
                appName.toLowerCase().includes(name.toLowerCase())
            );

            if (needsOpenA) {
                exec(`open -a "${appName}"`, (error) => {
                    if (error) {
                        console.error(`[Focus] Failed to activate "${appName}":`, error.message);
                        resolve(false);
                    } else {
                        console.log(`[Focus] Activated "${appName}"`);
                        resolve(true);
                    }
                });
            } else {
                const script = `tell application "${appName}" to activate`;
                exec(`osascript -e '${script}'`, (error) => {
                    if (error) {
                        console.warn(`[Focus] AppleScript failed for "${appName}", falling back to 'open -a'`);
                        exec(`open -a "${appName}"`, (fallbackError) => {
                            if (fallbackError) {
                                console.error(`[Focus] Fallback also failed for "${appName}":`, fallbackError.message);
                                resolve(false);
                            } else {
                                console.log(`[Focus] Activated "${appName}" via fallback`);
                                resolve(true);
                            }
                        });
                    } else {
                        console.log(`[Focus] Activated "${appName}"`);
                        resolve(true);
                    }
                });
            }
        } else if (IS_WINDOWS) {
            const safeName = appName.replace(/'/g, "''");
            exec(`powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).AppActivate('${safeName}')"`, { timeout: 2000 }, (error) => {
                if (error) {
                    console.error(`[Focus] Failed to activate "${appName}":`, error.message);
                    resolve(false);
                } else {
                    console.log(`[Focus] Activated "${appName}"`);
                    resolve(true);
                }
            });
        } else {
            resolve(false);
        }
    });
}

/**
 * Simulate Cmd+V (macOS), Ctrl+V (Windows), or xdotool (Linux)
 * @returns {Promise<boolean>}
 */
function simulatePaste() {
    return new Promise((resolve) => {
        if (IS_MAC) {
            exec('osascript -e \'tell application "System Events" to keystroke "v" using command down\'', (error) => {
                if (error) console.error('[Paste] Failed to simulate paste:', error.message);
                resolve(!error);
            });
        } else if (IS_WINDOWS) {
            exec('powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"', (error) => {
                resolve(!error);
            });
        } else {
            exec('xdotool key ctrl+v', (error) => { resolve(!error); });
        }
    });
}

/**
 * Get the currently selected text by simulating Cmd+C and reading clipboard
 * @param {Electron.Clipboard} clipboard - Electron clipboard module
 * @returns {Promise<string>}
 */
async function getSelectedText(clipboard) {
    const originalClipboard = clipboard.readText();
    clipboard.writeText('');

    console.log('[Selection] Simulating copy...');
    await new Promise((resolve) => {
        if (IS_MAC) {
            exec('osascript -e \'tell application "System Events" to keystroke "c" using command down\'', (error) => {
                if (error) console.error('[Selection] Copy failed:', error.message);
                resolve();
            });
        } else if (IS_WINDOWS) {
            exec('powershell -NoProfile -Command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^c\')"', (error) => {
                if (error) console.error('[Selection] Copy failed:', error.message);
                resolve();
            });
        } else {
            exec('xdotool key ctrl+c', (error) => {
                if (error) console.error('[Selection] Copy failed:', error.message);
                resolve();
            });
        }
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    const selectedText = clipboard.readText();
    console.log(`[Selection] Captured ${selectedText.length} chars`);

    clipboard.writeText(originalClipboard);
    return selectedText || '';
}

// Maps lowercase substrings to the canonical app name used in AppleScript
const BROWSER_SCRIPT_MAP = {
    'google chrome': 'Google Chrome',
    'chrome': 'Google Chrome',
    'arc': 'Arc',
    'brave': 'Brave Browser',
    'microsoft edge': 'Microsoft Edge',
    'safari': 'Safari',
};

/**
 * Get the active tab URL and title from a browser app (macOS only).
 * Firefox is excluded — it has no AppleScript tab URL access.
 * @param {string|null} appName
 * @returns {{ url: string, title: string } | null}
 */
function getBrowserContext(appName) {
    if (!IS_MAC || !appName) return null;

    const lower = appName.toLowerCase();
    const canonicalEntry = Object.entries(BROWSER_SCRIPT_MAP).find(([key]) => lower.includes(key));
    if (!canonicalEntry) return null;

    const canonical = canonicalEntry[1];
    const isSafari = canonical === 'Safari';

    try {
        let url, title;
        if (isSafari) {
            url   = execSync(`osascript -e 'tell application "Safari" to return URL of current tab of front window'`,   { encoding: 'utf-8', timeout: 1500 }).trim();
            title = execSync(`osascript -e 'tell application "Safari" to return name of current tab of front window'`, { encoding: 'utf-8', timeout: 1500 }).trim();
        } else {
            url   = execSync(`osascript -e 'tell application "${canonical}" to return URL of active tab of front window'`,   { encoding: 'utf-8', timeout: 1500 }).trim();
            title = execSync(`osascript -e 'tell application "${canonical}" to return name of active tab of front window'`, { encoding: 'utf-8', timeout: 1500 }).trim();
        }
        console.log(`[Browser] Context: ${url} — "${title}"`);
        return { url, title };
    } catch (error) {
        console.warn(`[Browser] Could not get context from "${appName}":`, error.message);
        return null;
    }
}

module.exports = { getFrontmostApp, activateApp, simulatePaste, getSelectedText, getBrowserContext };
