const { app, session, BrowserWindow, globalShortcut } = require('electron')
const { setupMenu } = require('../menu')
const { PATHS } = require('../config/paths')
const { SECURITY_CONFIG } = require('../config/security')
const { APP_VARIANT, VARIANT_CONFIG } = require('../config/variant')
const { getExitPassword } = require('../security/exit-code')
const { getParentWindowOfTab } = require('../utils/helpers')
const { setupIpcHandlers } = require('../handlers/ipc-handlers')
const { initSession, registerPreloadScripts, getDomainInterceptor } = require('../session/session-manager')
const { setupExtensions, loadExtensions } = require('../extensions/extension-manager')
const { TabbedBrowserWindow, setWebuiExtensionId } = require('../windows/TabbedBrowserWindow')
const { setupContextMenu } = require('../handlers/context-menu-handler')
const { setupWindowOpenHandler } = require('../handlers/window-open-handler')
const { checkAndBlockIfMultipleMonitors } = require('../utils/monitor-detector')
const { disableAllSystemShortcuts, enableAllSystemShortcuts } = require('../utils/disable-alttab')
const touchpadGestures = require('../utils/touchpad-gestures')
const macScreenshotShortcuts = require('../utils/mac-screenshot-shortcuts')
const zoom = require('../utils/zoom')
const focusGuard = require('../utils/focus-guard')
const processBlocker = require('../utils/process-blocker')
const diag = require('../utils/diag-log')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Separate native hook and JS blocker so we can reliably fallback
let nativeKeyboardHook = null
let keyboardBlocker = null

try {
  nativeKeyboardHook = require('../utils/keyboard-hook')
} catch (error) {
  console.warn('Browser: Native keyboard hook module not available, will use JavaScript blocker only')
}

keyboardBlocker = require('../utils/keyboard-blocker')

class Browser {
  windows = []
  isQuitting = false

  // Start page depends on the build variant (peserta / penguji), see config/variant.js
  urls = {
    newtab: VARIANT_CONFIG.newtabUrl,
  }

  constructor() {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })

    // Set custom User-Agent globally BEFORE the app is ready
    // This ensures every window and network request uses this identifier
    // to restrict access to frontend and API
    app.userAgentFallback = SECURITY_CONFIG.ALLOWED_USER_AGENT
    console.log('Browser: Custom User-Agent set to:', SECURITY_CONFIG.ALLOWED_USER_AGENT)
    console.log('Browser: Build variant:', APP_VARIANT, '->', this.urls.newtab)

    app.whenReady().then(() => {
      try {
        const accelerator = process.platform === 'darwin' ? 'Command+Shift+Q' : 'Ctrl+Shift+Q'
        globalShortcut.register(accelerator, () => this.promptExitPassword())
      } catch (error) {
        console.warn('Browser: Failed to register quit shortcut:', error.message)
      }

      this.init()
    })

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.destroy()
      }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) this.createInitialWindow()
    })

    app.on('web-contents-created', this.onWebContentsCreated.bind(this))

    // Setup IPC handlers with browser instance
    setupIpcHandlers(this)
  }

  /**
   * Kept as a method because it is the entry point the rest of the app knows
   * about. The sweep itself lives in utils/process-blocker.js, which matches on
   * the Authenticode signature of each running image as well as on its name -
   * renaming TeamViewer.exe is enough to defeat a name-only taskkill.
   */
  checkAndKillBlockedProcesses() {
    return processBlocker.scanOnce()
  }

  async promptExitPassword() {
    const { dialog, ipcMain } = require('electron')

    try {
      // Fetch the exit code from the API up front so the network round trip
      // overlaps with the proctor typing instead of delaying the prompt.
      const correctPasswordPromise = getExitPassword()

      const focusedWindow = this.getFocusedWindow()
      if (!focusedWindow || !focusedWindow.window) {
        console.warn('No focused window found for password prompt')
        return
      }

      // Loop untuk retry password tanpa recursive call
      let attempts = 0
      const maxAttempts = 10

      while (attempts < maxAttempts) {
        const password = await this.promptPasswordInput(focusedWindow)

        if (password === null) {
          // User cancelled
          return
        }

        const correctPassword = await correctPasswordPromise

        if (password === correctPassword) {
          // Password correct, exit app
          this.destroy()
          return
        } else {
          // Password wrong, show error and retry
          attempts++
          await this.showPasswordError(focusedWindow)
          // Loop will continue to prompt again
        }
      }

      console.warn('Max password attempts reached')
    } catch (error) {
      console.error('Error prompting exit password:', error)
    }
  }

  async showPasswordError(parentWindow) {
    return new Promise((resolve) => {
      const focusedTab = parentWindow.getFocusedTab()
      if (!focusedTab || !focusedTab.webContents) {
        resolve()
        return
      }
      const webContents = focusedTab.webContents

      if (!webContents || webContents.isDestroyed()) {
        resolve()
        return
      }

      const script = `
        (function() {
          const existing = document.getElementById('exit-password-overlay');
          if (existing) existing.remove();
          
          const overlayDiv = document.createElement('div');
          overlayDiv.id = 'exit-password-overlay';
          overlayDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif';
          
          const dialog = document.createElement('div');
          dialog.style.cssText = 'background:white;padding:30px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.3);width:420px;max-width:90%';
          
          dialog.innerHTML = \`
            <div style="display:flex;align-items:center;margin-bottom:20px">
              <div style="width:48px;height:48px;border-radius:50%;background:#fee;display:flex;align-items:center;justify-content:center;margin-right:16px">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c33" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div>
                <h3 style="margin:0 0 4px 0;color:#333;font-size:18px;font-weight:600">Password Salah</h3>
                <p style="margin:0;color:#666;font-size:14px">Password yang Anda masukkan tidak benar.</p>
              </div>
            </div>
            <button id="error-ok-btn" style="width:100%;padding:12px 24px;border:none;border-radius:6px;cursor:pointer;font-size:15px;font-weight:500;background:#007bff;color:white">OK</button>
          \`;
          
          overlayDiv.appendChild(dialog);
          document.body.appendChild(overlayDiv);
          
          const okBtn = document.getElementById('error-ok-btn');
          okBtn.onclick = () => {
            overlayDiv.remove();
            window.__errorDismissed = true;
          };
        })();
      `

      webContents.executeJavaScript(script).then(() => {
        let pollCount = 0
        const maxPolls = 600 // 1 minute
        const checkDismiss = setInterval(async () => {
          pollCount++

          // Check if webContents is still valid
          if (!webContents || webContents.isDestroyed()) {
            clearInterval(checkDismiss)
            resolve()
            return
          }

          // Timeout
          if (pollCount >= maxPolls) {
            clearInterval(checkDismiss)
            try {
              await webContents.executeJavaScript(`
                const overlay = document.getElementById('exit-password-overlay');
                if (overlay) overlay.remove();
                delete window.__errorDismissed;
              `)
            } catch (e) { }
            resolve()
            return
          }

          try {
            const dismissed = await webContents.executeJavaScript('window.__errorDismissed')
            if (dismissed) {
              clearInterval(checkDismiss)
              try {
                await webContents.executeJavaScript('delete window.__errorDismissed')
              } catch (e) { }
              resolve()
            }
          } catch (error) {
            clearInterval(checkDismiss)
            resolve()
          }
        }, 100)
      }).catch(() => resolve())
    })
  }

  async promptPasswordInput(parentWindow) {
    const { ipcMain } = require('electron')

    return new Promise((resolve) => {
      // Get the active tab's webContents, not the window's webContents
      const focusedTab = parentWindow.getFocusedTab()
      if (!focusedTab || !focusedTab.webContents) {
        console.error('No focused tab found for password overlay')
        resolve(null)
        return
      }
      const webContents = focusedTab.webContents

      // Check if webContents is valid and not destroyed
      if (!webContents || webContents.isDestroyed()) {
        console.error('WebContents is destroyed or invalid')
        resolve(null)
        return
      }

      // Inject password overlay directly into the main window
      const overlayHTML = `
        <div id="exit-password-overlay" style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        ">
          <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            width: 420px;
            max-width: 90%;
          ">
            <h3 style="
              margin: 0 0 10px 0;
              color: #333;
              font-size: 20px;
              font-weight: 600;
            ">Exit Application</h3>
            <p style="
              margin: 0 0 24px 0;
              color: #666;
              font-size: 14px;
              line-height: 1.5;
            ">Masukkan password untuk keluar dari aplikasi:</p>
            <div style="position: relative; margin-bottom: 24px;">
              <input 
                type="password" 
                id="exit-password-input" 
                placeholder="Password"
                autocomplete="off"
                style="
                  width: 100%;
                  padding: 12px 45px 12px 12px;
                  border: 2px solid #ddd;
                  border-radius: 6px;
                  font-size: 15px;
                  transition: border-color 0.2s;
                  box-sizing: border-box;
                  outline: none;
                "
                onfocus="this.style.borderColor='#007bff'"
                onblur="this.style.borderColor='#ddd'"
              >
              <button 
                type="button"
                id="toggle-password-btn"
                style="
                  position: absolute;
                  right: 8px;
                  top: 50%;
                  transform: translateY(-50%);
                  background: none;
                  border: none;
                  cursor: pointer;
                  padding: 8px;
                  color: #666;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                  border-radius: 4px;
                  transition: background-color 0.2s;
                "
                onmouseover="this.style.backgroundColor='#f0f0f0'"
                onmouseout="this.style.backgroundColor='transparent'"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
            <div style="display: flex; gap: 12px;">
              <button 
                id="cancel-password-btn"
                style="
                  flex: 1;
                  padding: 12px 24px;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 15px;
                  font-weight: 500;
                  background: #6c757d;
                  color: white;
                  transition: background-color 0.2s;
                "
                onmouseover="this.style.backgroundColor='#5a6268'"
                onmouseout="this.style.backgroundColor='#6c757d'"
              >Batal</button>
              <button 
                id="submit-password-btn"
                style="
                  flex: 1;
                  padding: 12px 24px;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 15px;
                  font-weight: 500;
                  background: #007bff;
                  color: white;
                  transition: background-color 0.2s;
                "
                onmouseover="this.style.backgroundColor='#0056b3'"
                onmouseout="this.style.backgroundColor='#007bff'"
              >OK</button>
            </div>
          </div>
        </div>
      `

      const script = `
        (function() {
          // Remove any existing overlay
          const existing = document.getElementById('exit-password-overlay');
          if (existing) existing.remove();
          
          // Create overlay container
          const overlayDiv = document.createElement('div');
          overlayDiv.id = 'exit-password-overlay';
          overlayDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif';
          
          // Create dialog
          const dialog = document.createElement('div');
          dialog.style.cssText = 'background:white;padding:30px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.3);width:420px;max-width:90%';
          
          dialog.innerHTML = \`
            <h3 style="margin:0 0 10px 0;color:#333;font-size:20px;font-weight:600">Exit Application</h3>
            <p style="margin:0 0 24px 0;color:#666;font-size:14px;line-height:1.5">Masukkan password untuk keluar dari aplikasi:</p>
            <div id="error-message" style="display:none;margin:0 0 16px 0;padding:12px;background:#fee;border:1px solid #fcc;border-radius:6px;color:#c33;font-size:14px"></div>
            <div style="position:relative;margin-bottom:24px">
              <input type="password" id="exit-password-input" placeholder="Password" autocomplete="off" style="width:100%;padding:12px 45px 12px 12px;border:2px solid #ddd;border-radius:6px;font-size:15px;box-sizing:border-box;outline:none">
              <button type="button" id="toggle-password-btn" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:8px;color:#666;width:32px;height:32px;border-radius:4px">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
            <div style="display:flex;gap:12px">
              <button id="cancel-password-btn" style="flex:1;padding:12px 24px;border:none;border-radius:6px;cursor:pointer;font-size:15px;font-weight:500;background:#6c757d;color:white">Batal</button>
              <button id="submit-password-btn" style="flex:1;padding:12px 24px;border:none;border-radius:6px;cursor:pointer;font-size:15px;font-weight:500;background:#007bff;color:white">OK</button>
            </div>
          \`;
          
          overlayDiv.appendChild(dialog);
          document.body.appendChild(overlayDiv);
          
          const input = document.getElementById('exit-password-input');
          const toggleBtn = document.getElementById('toggle-password-btn');
          const cancelBtn = document.getElementById('cancel-password-btn');
          const submitBtn = document.getElementById('submit-password-btn');
          
          let isVisible = false;
          const eyeOpenSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
          const eyeClosedSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
          
          setTimeout(() => input.focus(), 100);
          
          toggleBtn.onclick = () => {
            isVisible = !isVisible;
            input.type = isVisible ? 'text' : 'password';
            toggleBtn.innerHTML = isVisible ? eyeOpenSvg : eyeClosedSvg;
          };
          
          input.onkeypress = (e) => {
            if (e.key === 'Enter') {
              window.__exitPasswordResult = input.value;
              overlayDiv.remove();
            }
          };
          
          cancelBtn.onclick = () => {
            window.__exitPasswordResult = null;
            overlayDiv.remove();
          };
          
          submitBtn.onclick = () => {
            window.__exitPasswordResult = input.value;
            overlayDiv.remove();
          };
          
          overlayDiv.onclick = (e) => {
            if (e.target === overlayDiv) {
              e.stopPropagation();
            }
          };
        })();
      `

      webContents.executeJavaScript(script).then(() => {
        // Poll for result with webContents validity check
        let pollCount = 0
        const maxPolls = 3000 // 5 minutes (100ms * 3000)
        const checkResult = setInterval(async () => {
          pollCount++

          // Check if webContents is still valid
          if (!webContents || webContents.isDestroyed()) {
            clearInterval(checkResult)
            resolve(null)
            return
          }

          // Timeout after max polls
          if (pollCount >= maxPolls) {
            clearInterval(checkResult)
            try {
              await webContents.executeJavaScript(`
                const overlay = document.getElementById('exit-password-overlay');
                if (overlay) overlay.remove();
                delete window.__exitPasswordResult;
              `)
            } catch (e) { }
            resolve(null)
            return
          }

          try {
            const result = await webContents.executeJavaScript('window.__exitPasswordResult')
            if (result !== undefined) {
              clearInterval(checkResult)
              try {
                await webContents.executeJavaScript('delete window.__exitPasswordResult')
              } catch (e) { }
              resolve(result)
            }
          } catch (error) {
            clearInterval(checkResult)
            resolve(null)
          }
        }, 100)
      }).catch((error) => {
        console.error('Failed to inject password overlay:', error)
        resolve(null)
      })
    })
  }

  destroy() {
    if (this.isQuitting) return
    this.isQuitting = true
    console.log('Browser: Cleaning up before exit...')

    // Stop process killer sweeps
    processBlocker.stop()

    // Stop native keyboard helper
    this.stopNativeKeyboardHelper()

    // Uninstall keyboard hooks
    try {
      if (nativeKeyboardHook && nativeKeyboardHook.isInstalled && nativeKeyboardHook.isInstalled()) {
        console.log('Browser: Uninstalling native keyboard hook...')
        nativeKeyboardHook.uninstall()
      }
    } catch (error) {
      console.warn('Browser: Failed to uninstall native keyboard hook:', error.message)
    }

    try {
      if (keyboardBlocker && keyboardBlocker.isInstalled && keyboardBlocker.isInstalled()) {
        console.log('Browser: Uninstalling keyboard blocker...')
        keyboardBlocker.uninstall()
      }
    } catch (error) {
      console.warn('Browser: Failed to uninstall keyboard blocker:', error.message)
    }

    // Stop pulling focus back before the windows go away
    try {
      focusGuard.uninstall()
    } catch (error) {
      console.warn('Browser: Failed to uninstall focus guard:', error.message)
    }

    // Re-enable system shortcuts via Registry
    try {
      enableAllSystemShortcuts()
    } catch (error) {
      console.warn('Browser: Failed to re-enable system shortcuts:', error.message)
    }

    // Give the student their touchpad gestures back
    try {
      touchpadGestures.restore()
    } catch (error) {
      console.warn('Browser: Failed to restore touchpad gestures:', error.message)
    }

    // ...and their macOS screenshot shortcuts
    try {
      macScreenshotShortcuts.restore()
    } catch (error) {
      console.warn('Browser: Failed to restore macOS screenshot shortcuts:', error.message)
    }

    console.log('Browser: Cleanup completed, quitting app...')

    // Force-destroy windows because we intentionally prevent user-driven closes.
    // app.quit() triggers BrowserWindow close events; if those are prevented the app won't quit.
    this.windows.forEach((win) => {
      try {
        if (win.window && !win.window.isDestroyed()) {
          win.window.destroy()
        }
      } catch (error) {
        console.warn('Browser: Failed to destroy window during quit:', error.message)
      }
    })

    app.quit()
  }

  getFocusedWindow() {
    return this.windows.find((w) => w.window.isFocused()) || this.windows[0]
  }

  getWindowFromBrowserWindow(window) {
    return !window.isDestroyed() ? this.windows.find((win) => win.id === window.id) : null
  }

  getWindowFromWebContents(webContents) {
    let window

    if (this.popup && webContents === this.popup.browserWindow?.webContents) {
      window = this.popup.parent
    } else {
      window = getParentWindowOfTab(webContents)
    }

    return window ? this.getWindowFromBrowserWindow(window) : null
  }

  async init() {
    console.log('Browser: init() called')
    console.log('Browser: BLOCKED_PROCESSES config:', SECURITY_CONFIG.BLOCKED_PROCESSES)
    console.log('Browser: Platform:', process.platform)

    // Check for multiple monitors and block if detected
    if (checkAndBlockIfMultipleMonitors()) {
      return // Exit if blocked
    }

    this.initSession()
    setupMenu(this)

    registerPreloadScripts(this.session)

    try {
      this.extensions = await setupExtensions(this)
    } catch (error) {
      console.warn('Browser: Failed to setup extensions:', error.message)
      this.extensions = null
    }

    try {
      const webuiExtensionId = await loadExtensions(this.session)
      if (webuiExtensionId) {
        setWebuiExtensionId(webuiExtensionId)
      } else {
        console.warn('Browser: Extensions not loaded, continuing without extensions')
      }
    } catch (error) {
      console.warn('Browser: Failed to load extensions:', error.message)
      // Continue without extensions - not critical for core functionality
    }

    // Install keyboard hook for kiosk mode security (unless disabled for development)
    if (process.env.DISABLE_WIN_KEY_BLOCK) {
      diag.write('Kiosk', 'Keyboard blocking DISABLED (DISABLE_WIN_KEY_BLOCK=true)')
    } else {
      diag.write('Kiosk', 'Installing keyboard blocking system')

      // Primary: Start native helper (handles Windows key effectively)
      this.startNativeKeyboardHelper()

      // Backup: Install Electron addon (handles key combinations)
      this.installElectronKeyboardHook()

      // Additional: Disable system shortcuts via Registry (Win+L, Win+G, Ctrl+Alt+Del Task Manager)
      disableAllSystemShortcuts()

      // macOS counterpart: the screen capture shortcuts are consumed by
      // WindowServer before the app sees them, so they have to be switched off
      // in com.apple.symbolichotkeys rather than swallowed like on Windows.
      macScreenshotShortcuts.restoreStaleBackup()
      macScreenshotShortcuts.disable()
    }

    // Touchpad: 3/4 finger swipe switches apps below the app level, so it has to be
    // turned off in the Precision Touchpad settings themselves. Kept separate from
    // DISABLE_WIN_KEY_BLOCK so a dev run can still exercise it.
    if (process.env.DISABLE_TOUCHPAD_BLOCK) {
      diag.write('Kiosk', 'Touchpad gesture blocking DISABLED (DISABLE_TOUCHPAD_BLOCK=true)')
      diag.write('Kiosk', 'Touchpad gesture state:', touchpadGestures.readCurrentState())
    } else {
      touchpadGestures.restoreStaleBackup()
      touchpadGestures.disable()
    }

    // Connectivity probe: puts the exit-code API result in the diag log at every
    // launch, so a failure is visible without waiting for a proctor to open the
    // exit prompt. getExitPassword() never rejects - it falls back internally.
    getExitPassword()

    // Kill everything the exam does not need - remote control, browsers, PDF
    // readers, text editors, office suites, chat and conferencing - by signing
    // certificate as well as by process name. Sweeps on its own interval from
    // here on.
    processBlocker.start(SECURITY_CONFIG, {
      intervalMs: 5000,
      onDetection: (hit) =>
        diag.write('Kiosk', `Blocked application killed: ${hit.name} (${hit.reason})`, hit.path),
    })

    this.createInitialWindow()
    this.resolveReady()
  }

  installElectronKeyboardHook() {
    // This method manages both native hook (Windows) and JS-only blocker as fallback.
    // It is designed to NEVER throw, so that Browser.init() always continues.

    // Try native hook first on Windows, but ignore all errors.
    if (process.platform === 'win32' && nativeKeyboardHook && typeof nativeKeyboardHook.install === 'function') {
      try {
        console.log('Browser: Installing native keyboard hook (backup for combinations)...')
        const nativeInstalled = nativeKeyboardHook.install()
        if (nativeInstalled) {
          console.log('Browser: Native keyboard hook installed successfully')
        } else {
          console.warn('Browser: Native keyboard hook installation returned false')
        }
      } catch (error) {
        console.warn('Browser: Native keyboard hook error (expected, will fallback to JS blocker):', error.message)
      }
    }

    // Always ensure JS blocker is installed as safety net
    if (keyboardBlocker && keyboardBlocker.isAvailable && keyboardBlocker.isAvailable()) {
      try {
        console.log('Browser: Installing JavaScript keyboard blocker...')
        const blockerResult = keyboardBlocker.install()
        if (blockerResult) {
          console.log('Browser: Keyboard blocker installed successfully (shortcuts like Alt+Tab will be blocked)')
        } else {
          console.warn('Browser: Keyboard blocker installation returned false')
        }
      } catch (error) {
        console.warn('Browser: Keyboard blocker installation error:', error.message)
      }
    } else {
      console.warn('Browser: Keyboard blocker not available - keyboard security may be reduced')
    }
  }

  startNativeKeyboardHelper() {
    if (process.platform !== 'win32') return

    try {
      const candidates = []

      // Packaged app: helper is placed next to app resources
      if (app.isPackaged && process.resourcesPath) {
        candidates.push(path.join(process.resourcesPath, 'keyhook-helper.exe'))
      }

      // Dev / direct run: helper lives in shell package native folder
      candidates.push(path.join(__dirname, '..', '..', 'native', 'keyhook-helper.exe'))
      candidates.push(path.join(__dirname, '..', '..', 'keyhook-helper.exe'))

      const helperPath = candidates.find((p) => fs.existsSync(p))

      if (!helperPath) {
        diag.write('Kiosk', 'WARN keyhook-helper.exe not found in any known path', candidates)
        return
      }

      diag.write('Kiosk', 'Starting native keyboard helper:', helperPath)

      this.nativeHelperProcess = spawn(helperPath, [], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      })

      // Keep process alive - don't unref
      // this.nativeHelperProcess.unref()

      // Log any output from helper
      if (this.nativeHelperProcess.stdout) {
        this.nativeHelperProcess.stdout.on('data', (data) => {
          console.log('[KeyboardHelper]', data.toString().trim())
        })
      }

      if (this.nativeHelperProcess.stderr) {
        this.nativeHelperProcess.stderr.on('data', (data) => {
          console.warn('[KeyboardHelper Error]', data.toString().trim())
        })
      }

      this.nativeHelperProcess.on('exit', (code) => {
        console.warn('[KeyboardHelper] Process exited with code:', code)
        this.nativeHelperProcess = null
      })

      console.log('Browser: Native keyboard helper started successfully (PID:', this.nativeHelperProcess.pid, ')')
    } catch (error) {
      console.warn('KeyboardHelper: Failed to start:', error.message)
    }
  }

  stopNativeKeyboardHelper() {
    if (this.nativeHelperProcess) {
      console.log('Browser: Stopping native keyboard helper...')
      try {
        this.nativeHelperProcess.kill()
      } catch (_) {
        // ignore
      }
      this.nativeHelperProcess = null
    }
  }

  initSession() {
    this.session = session.defaultSession
    initSession(this.session)

    if (process.env.SHELL_DEBUG) {
      this.session.serviceWorkers.once('running-status-changed', () => {
        const tab = this.windows[0]?.getFocusedTab()
        if (tab) {
          tab.webContents.inspectServiceWorker()
        }
      })
    }
  }

  createWindow(options) {
    const win = new TabbedBrowserWindow({
      ...options,
      urls: this.urls,
      extensions: this.extensions,
      browserInstance: this,
      window: {
        frame: false,
        kiosk: true,
        icon: PATHS.APP_ICON,
        webPreferences: {
          sandbox: true,
          nodeIntegration: false,
          enableRemoteModule: false,
          contextIsolation: true,
          worldSafeExecuteJavaScript: true,
        },
      },
    })
    this.windows.push(win)

    // Prevent closing window
    win.window.on('close', (event) => {
      if (this.isQuitting) return
      event.preventDefault()
    })

    // Catch app switching that never reaches us as a keystroke (3-finger swipe,
    // task view, taskbar click) and pull the window back to the front
    if (process.env.DISABLE_FOCUS_GUARD) {
      diag.write('Kiosk', 'Focus guard DISABLED (DISABLE_FOCUS_GUARD=true)')
    } else {
      focusGuard.guardWindow(win.window, {
        isQuitting: () => this.isQuitting,
      })
    }

    // Last line of defence against screen capture: mark the window as protected
    // content. On Windows this is SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE),
    // on macOS NSWindowSharingNone - the window is skipped by PrintScreen, the
    // Snipping Tool, Game Bar, screen recorders and remote desktop alike, so a
    // shortcut we failed to swallow still yields a blank capture rather than the
    // exam paper. Costs nothing on screen; the student sees the window normally.
    if (process.env.DISABLE_SCREENSHOT_PROTECTION) {
      diag.write('Kiosk', 'Screenshot content protection DISABLED (DISABLE_SCREENSHOT_PROTECTION=true)')
    } else {
      try {
        win.window.setContentProtection(true)
        diag.write('Kiosk', 'Screenshot content protection enabled on window', win.window.id)
      } catch (error) {
        diag.write('Kiosk', 'WARN failed to enable content protection:', error.message)
      }
    }

    // Block all Command key combinations on macOS inside the app
    if (process.platform === 'darwin') {
      win.webContents.on('before-input-event', (event, input) => {
        // metaKey on macOS corresponds to the Command key
        if (input.meta) {
          event.preventDefault()
        }
      })
    }

    if (process.env.SHELL_DEBUG) {
      win.webContents.openDevTools({ mode: 'detach' })
    }

    return win
  }

  createInitialWindow() {
    // Create browser window with external welcome page as initial URL,
    // resolved from the build variant (peserta / penguji)
    const welcomeUrl = VARIANT_CONFIG.newtabUrl
    this.createWindow({ initialUrl: welcomeUrl })

    // Test domain whitelist system in debug mode
    if (process.env.SHELL_DEBUG) {
      setTimeout(() => {
        this.testDomainWhitelist()
      }, 2000) // Wait 2 seconds after window creation
    }
  }

  testDomainWhitelist() {
    const domainInterceptor = getDomainInterceptor()
    if (domainInterceptor) {
      console.log('=== BROWSER: TESTING DOMAIN WHITELIST ===')
      domainInterceptor.testInterception()
      console.log('=== BROWSER: END DOMAIN WHITELIST TEST ===')
    }
  }

  async onWebContentsCreated(event, webContents) {
    const type = webContents.getType()
    const url = webContents.getURL()
    console.log(`'web-contents-created' event [type:${type}, url:${url}]`)

    if (process.env.SHELL_DEBUG && ['backgroundPage', 'remote'].includes(webContents.getType())) {
      webContents.openDevTools({ mode: 'detach', activate: true })
    }

    setupWindowOpenHandler(webContents, this)
    setupContextMenu(webContents, this)
    this.blockScreenCaptureKeys(webContents)
    this.setupZoomShortcuts(webContents)
  }

  /**
   * Ctrl+= / Ctrl+Plus / Ctrl+- / Ctrl+0 page zoom.
   *
   * Handled here rather than left to the menu roles because the zoomIn role's
   * accelerator misses the unshifted '=' and the keypad '+' - see utils/zoom.js.
   * Attached per webContents so it works from a tab and from the shell chrome
   * alike; either way the zoom lands on the tab the student is reading, which is
   * what the menu items do too.
   */
  setupZoomShortcuts(webContents) {
    webContents.on('before-input-event', (event, input) => {
      const window = this.getWindowFromWebContents(webContents) || this.getFocusedWindow()
      const tabContents = window?.getFocusedTab()?.webContents
      const target = tabContents && !tabContents.isDestroyed() ? tabContents : webContents

      zoom.handleZoomInput(target, event, input)
    })
  }

  /**
   * Swallow capture keys that reach Chromium as ordinary input.
   *
   * The low-level hook normally eats these before they get this far; this is the
   * layer that still holds when the hook could not be installed (no admin
   * rights, helper .exe missing), and it is the only keyboard-level screenshot
   * block that works on macOS. Attached per webContents so tabs are covered as
   * well as the shell window.
   */
  blockScreenCaptureKeys(webContents) {
    webContents.on('before-input-event', (event, input) => {
      const key = input.key

      // PrintScreen in any modifier combination - the vk does not change
      if (key === 'PrintScreen' || key === 'Print') {
        event.preventDefault()
        return
      }

      // Win+S / Win+Shift+S (Snipping Tool). input.meta is the Windows key on
      // Windows and Command on macOS.
      if (input.meta && (key === 'S' || key === 's')) {
        event.preventDefault()
        return
      }

      // Cmd+Shift+3/4/5/6 (macOS capture family)
      if (input.meta && input.shift && ['3', '4', '5', '6'].includes(key)) {
        event.preventDefault()
      }
    })
  }
}

module.exports = Browser
