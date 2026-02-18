const { exec, execSync } = require('child_process');
const { IS_MAC, IS_WINDOWS } = require('../utils/platform');

// Apps that need 'open -a' on macOS due to sandboxing
const OPEN_A_APPS = ['Google Chrome', 'Chrome', 'Brave Browser', 'Microsoft Edge', 'Arc'];

/**
 * Get the name of the currently frontmost application (macOS only)
 * @returns {string|null}
 */
function getFrontmostApp() {
    if (!IS_MAC) return null;
    try {
        const script = 'tell application "System Events" to get name of first process whose frontmost is true';
        return execSync(`osascript -e '${script}'`, { encoding: 'utf-8' }).trim();
    } catch (error) {
        console.error('[Focus] Failed to get frontmost app:', error.message);
        return null;
    }
}

/**
 * Activate (bring to front) a specific application
 * @param {string} appName
 * @returns {Promise<boolean>}
 */
function activateApp(appName) {
    return new Promise((resolve) => {
        if (!IS_MAC || !appName) { resolve(false); return; }

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
        } else {
            resolve();
        }
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    const selectedText = clipboard.readText();
    console.log(`[Selection] Captured: "${selectedText.substring(0, 20)}..."`);

    clipboard.writeText(originalClipboard);
    return selectedText || '';
}

module.exports = { getFrontmostApp, activateApp, simulatePaste, getSelectedText };
