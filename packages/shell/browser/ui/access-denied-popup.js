const { BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { PATHS } = require('../config/paths')

class AccessDeniedPopup {
  constructor() {
    this.popupWindow = null
    this.setupIpcHandlers()
  }

  setupIpcHandlers() {
    // Handle popup close request from renderer
    ipcMain.handle('close-access-denied-popup', () => {
      this.closePopup()
    })
  }

  showPopup(domain, sourceUrl = '') {
    // Close existing popup if any
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.close()
    }

    // HTML content as data URL to avoid file path issues
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Denied</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh; display: flex; align-items: center; justify-content: center;
            overflow: hidden; user-select: none;
        }
        .popup-container {
            background: white; border-radius: 8px; padding: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            width: 340px; max-width: 90vw; text-align: center;
            animation: slideIn 0.3s ease-out;
            margin: 12px;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .icon-container {
            width: 40px; height: 40px; margin: 0 auto 8px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            animation: pulse 2s infinite;
            flex-shrink: 0;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .icon { color: white; font-size: 18px; font-weight: bold; }
        h1 { 
            color: #2c3e50; font-size: 16px; margin-bottom: 6px; font-weight: 600;
            line-height: 1.2; word-wrap: break-word;
        }
        .message {
            color: #5a6c7d; font-size: 11px; line-height: 1.2; margin-bottom: 10px;
            word-wrap: break-word;
        }
        .domain-info {
            background: #f8f9fa; border-radius: 4px; padding: 8px; margin-bottom: 10px;
        }
        .domain-label {
            font-size: 9px; color: #6c757d; text-transform: uppercase;
            letter-spacing: 0.5px; margin-bottom: 2px;
        }
        .domain-name {
            font-size: 11px; color: #2c3e50; font-weight: 600; 
            word-break: break-all; line-height: 1.1;
        }
        .button-container { display: flex; gap: 6px; justify-content: center; }
        .btn {
            padding: 4px 10px; border: none; border-radius: 3px; font-size: 11px;
            font-weight: 500; cursor: pointer; transition: all 0.2s ease; outline: none;
        }
        .btn-close { background: #6c757d; color: white; }
        .btn-close:hover { background: #5a6268; transform: translateY(-1px); }
        .btn-close:active { transform: translateY(0); }
        .countdown {
            position: absolute; top: 8px; right: 8px;
            background: rgba(255, 255, 255, 0.9); border-radius: 50%;
            width: 18px; height: 18px; display: flex; align-items: center;
            justify-content: center; font-size: 9px; color: #6c757d; font-weight: 600;
        }
        .warning-strip {
            position: absolute; top: 0; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, #ff6b6b, #ee5a24, #ff6b6b);
            background-size: 200% 100%; animation: warning 2s linear infinite;
        }
        @keyframes warning {
            0% { background-position: 0% 0%; }
            100% { background-position: 200% 0%; }
        }
    </style>
</head>
<body>
    <div class="warning-strip"></div>
    <div class="countdown" id="countdown">5</div>
    <div class="popup-container">
        <div class="icon-container">
            <div class="icon">🚫</div>
        </div>
        <h1>Access Denied</h1>
        <p class="message">
            You are not authorized to access this domain. This website has been blocked for security reasons.
        </p>
        <div class="domain-info">
            <div class="domain-label">Blocked Domain</div>
            <div class="domain-name" id="blocked-domain">${domain}</div>
        </div>
        <div class="button-container">
            <button class="btn btn-close" id="close-btn">Close</button>
        </div>
    </div>
    <script>
        let countdownInterval, countdownValue = 5;
        function startCountdown() {
            countdownValue = 5; updateCountdown();
            countdownInterval = setInterval(() => {
                countdownValue--; updateCountdown();
                if (countdownValue <= 0) clearInterval(countdownInterval);
            }, 1000);
        }
        function updateCountdown() {
            const countdownEl = document.getElementById('countdown');
            countdownEl.textContent = countdownValue;
            if (countdownValue <= 2) {
                countdownEl.style.background = '#ff6b6b';
                countdownEl.style.color = 'white';
            }
        }
        document.getElementById('close-btn').addEventListener('click', () => {
            window.close();
        });
        startCountdown();
        setTimeout(() => window.close(), 5000);
    </script>
</body>
</html>`

    // Create popup window
    this.popupWindow = new BrowserWindow({
      width: 360,
      height: 190,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      modal: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        worldSafeExecuteJavaScript: true
      }
    })

    // Load the popup HTML from data URL
    this.popupWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

    // Show popup when ready
    this.popupWindow.once('ready-to-show', () => {
      // Safety check before centering
      if (this.popupWindow && !this.popupWindow.isDestroyed()) {
        // Center the popup on the primary display
        this.popupWindow.center()
        this.popupWindow.show()
        
        // Auto-close after 5 seconds (backup, also handled in JS)
        setTimeout(() => {
          this.closePopup()
        }, 5000)
      }
    })

    // Handle popup closed
    this.popupWindow.on('closed', () => {
      this.popupWindow = null
    })

    // Focus lost handling
    this.popupWindow.on('blur', () => {
      // Keep popup on top even when focus is lost
      if (this.popupWindow && !this.popupWindow.isDestroyed()) {
        this.popupWindow.focus()
      }
    })
  }

  closePopup() {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.close()
      this.popupWindow = null
    }
  }

  isPopupOpen() {
    return this.popupWindow && !this.popupWindow.isDestroyed()
  }
}

// Singleton instance
let accessDeniedPopup = null

function getAccessDeniedPopup() {
  if (!accessDeniedPopup) {
    accessDeniedPopup = new AccessDeniedPopup()
  }
  return accessDeniedPopup
}

module.exports = { AccessDeniedPopup, getAccessDeniedPopup }
