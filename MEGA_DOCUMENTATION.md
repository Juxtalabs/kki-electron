# 📚 Mega Documentation - Sejati Electron Browser

## 🎯 Overview

**Sejati** adalah browser web minimalis berbasis Electron dengan dukungan Chrome extensions yang dikembangkan sebagai fork dari `electron-browser-shell`. Proyek ini dirancang khusus untuk mode kiosk dengan fitur keamanan tinggi, termasuk keyboard hook untuk mencegah keluar dari aplikasi.

### 🏗️ Arsitektur High-Level

```
Sejati Electron Browser
├── Main Process (Node.js Environment)
│   ├── Browser.js - Entry point & lifecycle management
│   ├── TabbedBrowserWindow.js - Window management
│   ├── Extension Manager - Chrome extensions support
│   └── Keyboard Security - Native hooks & blockers
├── Renderer Process (Browser Environment)
│   ├── WebUI - Custom browser interface
│   ├── Tab System - Multi-tab management
│   └── Extension UI - Browser actions & popups
└── Native Addons
    └── keyhook.node - Windows keyboard hook (C++)
```

---

## 📦 Package Structure & Fungsi

### 🎯 Root Package (`package.json`)

**Main Configuration:**
- **Name**: `electron-browser-shell` (Branding: "Sejati")
- **Version**: `1.0.0`
- **App ID**: `io.sejati.app`
- **Main Entry**: `.webpack/main` (compiled output)

**Key Scripts:**
```json
{
  "user:build": "Build semua packages",
  "user:start": "Build & start browser",
  "start:debug": "Debug mode dengan logging",
  "package": "Build untuk distribusi",
  "test": "Run extension tests"
}
```

**Dependencies:**
- `electron-log`: Logging system
- `electron`: Runtime engine v32.2.7
- `electron-builder`: Packaging & distribution

---

### 🖥️ Shell Package (`packages/shell/`)

**Core browser implementation dengan struktur modular:**

#### 📁 `browser/` - Main Browser Logic

**🎯 `main.js`** - Entry Point
- Fungsi: Import dan export Browser class
- Mengarah ke `core/Browser.js` untuk implementasi utama

**🎯 `core/Browser.js`** - Browser Class Utama
```javascript
class Browser {
  // Lifecycle management
  constructor()    // Initialize browser instance
  init()          // Setup session, extensions, keyboard security
  destroy()       // Cleanup & quit application
  
  // Window management
  createWindow()     // Create new browser window
  getFocusedWindow() // Get active window
  createInitialWindow() // Welcome screen
  
  // Extension integration
  setupExtensions()  // Initialize Chrome extension support
  onWebContentsCreated() // Handle new web contents
}
```
**Fitur Utama:**
- Kiosk mode enforcement
- Chrome extensions integration
- Keyboard security hooks
- Multi-window support

**🎯 `windows/TabbedBrowserWindow.js`** - Window Management
```javascript
class TabbedBrowserWindow {
  constructor(options) // Create tabbed browser window
  getFocusedTab()      // Get current active tab
  destroy()           // Cleanup window resources
}
```
**Fitur:**
- Tab management integration
- WebUI hosting
- Extension popup handling

**🎯 `tabs.js`** - Tab System
```javascript
class Tab {
  constructor()    // Single tab instance
  loadURL()       // Navigate to URL
  show()/hide()   // Visibility management
  destroy()       // Cleanup resources
}

class Tabs extends EventEmitter {
  create()        // Create new tab
  select()        // Switch active tab
  remove()        // Close tab
  get()           // Find tab by ID
}
```
**Fitur:**
- WebContentsView-based tabs
- Layout management
- Event-driven architecture

#### 🔧 `utils/` - Utility Functions

**🎯 `keyboard-hook.js`** - Native Keyboard Security
```javascript
function loadNativeAddon() {
  // Load keyhook.node (Windows only)
  // Multiple path resolution
  // Fallback handling
}

function install() {
  // Install low-level keyboard hook
  // Block system shortcuts
}

function uninstall() {
  // Cleanup keyboard hook
}
```
**Fitur:**
- Windows native keyboard hook
- Low-level key interception
- System shortcut blocking

**🎯 `keyboard-blocker.js`** - JavaScript Fallback
```javascript
const BLOCKED_SHORTCUTS = [
  'Alt+Tab', 'Alt+F4', 'F11', 'Super+D',
  'CommandOrControl+Q', 'F12', // ...60+ shortcuts
]
```
**Fitur:**
- Electron globalShortcut API
- Cross-platform compatibility
- Comprehensive shortcut blocking

**🎯 `helpers.js`** - General Utilities
- Window/tab lookup functions
- Common helper methods

**🎯 `monitor-detector.js`** - Monitor Detection System
```javascript
function getConnectedMonitorCount() {
  // Get number of connected monitors
  // Uses Electron screen API for cross-platform support
}

function hasExternalMonitorConnected() {
  // Check if external monitor is connected (>1 monitor)
}

function shouldBlockBrowser() {
  // Check if browser should be blocked due to multiple monitors
  // Respects environment variable flags for development
}

function checkAndBlockIfMultipleMonitors() {
  // Execute monitor check and block browser if needed
  // Shows warning message and exits application
}
```
**Fitur:**
- Cross-platform monitor detection
- Development bypass with environment variables
- Automatic browser blocking when multiple monitors detected
- Console logging for debugging

#### 🧩 `extensions/` - Chrome Extension Support

**🎯 `extension-manager.js`** - Extension Management
```javascript
async function setupExtensions(browserInstance) {
  // Initialize ElectronChromeExtensions
  // Setup tab/window callbacks
  // Handle browser action popups
}

async function loadExtensions(browserSession) {
  // Load WebUI extension
  // Install Chrome Web Store support
  // Load local unpacked extensions
  // Start MV3 service workers
}
```
**Fitur:**
- Chrome extension API bridge
- Web Store integration
- Local extension loading
- Manifest V3 support

#### 🎮 `handlers/` - Event Handlers

**🎯 `ipc-handlers.js`** - IPC Communication
```javascript
function setupIpcHandlers() {
  // Handle renderer process requests
  // User info for welcome page
  // System information access
}
```

**🎯 `context-menu-handler.js`** - Context Menu
- Chrome-style context menus
- Extension menu integration

**🎯 `window-open-handler.js`** - Window Management
- Handle popup windows
- Extension window creation

#### 🎨 `ui/` - User Interface

**🎯 `webui.js`** - Browser Interface
- Custom browser UI implementation
- Tab bar and controls
- Extension integration

#### ⚙️ `config/` & `session/`

**🎯 `paths.js`** - Path Configuration
- File system paths
- Extension directories
- Resource locations

**🎯 `session-manager.js`** - Session Management
- Electron session setup
- Preload script registration
- Security configurations

---

### 🔌 Chrome Extensions Packages

#### `packages/electron-chrome-extensions/`
**Purpose**: Chrome extension API bridge untuk Electron

**Key Features:**
- `chrome.*` API implementation
- Browser action support
- Tab management API
- Background script handling
- Manifest V2 & V3 support

**Architecture:**
```javascript
// Main extension API bridge
class ElectronChromeExtensions {
  // Tab operations
  createTab()
  selectTab()
  removeTab()
  
  // Window operations  
  createWindow()
  removeWindow()
  
  // Extension events
  on('browser-action-popup-created')
  on('url-overrides-updated')
}
```

#### `packages/electron-chrome-context-menu/`
**Purpose**: Chrome-style context menu implementation

**Features:**
- Native context menu integration
- Extension menu items
- Context-aware menus

#### `packages/electron-chrome-web-store/`
**Purpose**: Chrome Web Store integration

**Features:**
- .CRX file installation
- Extension updates
- Web Store API bridge
- Permission handling

---

## 🔧 Build System & Configuration

### 📋 `package.json` Scripts

**Development Commands:**
```bash
yarn user:start      # Build & run browser
yarn start:debug     # Debug mode with logging
yarn start:skip-build # Skip build step
```

**Build Commands:**
```bash
yarn user:build      # Build all packages
yarn build:shell     # Build shell package
yarn build:extensions # Build extension packages
```

**Testing & Quality:**
```bash
yarn test            # Run extension tests
yarn lint            # ESLint checking
yarn format          # Prettier formatting
```

### ⚙️ Configuration Files

#### `tsconfig.json` - TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS", 
    "outDir": "dist",
    "strict": true,
    "moduleResolution": "Node"
  }
}
```

#### `eslint.config.mjs` - Linting Rules
- TypeScript ESLint configuration
- Custom rule overrides
- Ignore patterns for build outputs

#### `forge.config.js` - Electron Forge Configuration
```javascript
module.exports = {
  packagerConfig: {
    name: 'Shell',
    asar: true,
    extraResource: ['browser/ui']
  },
  makers: [
    '@electron-forge/maker-zip',
    '@electron-forge/maker-dmg'
  ],
  plugins: [
    '@electron-forge/plugin-webpack'
  ]
}
```

### 🏗️ Webpack Configuration

#### `webpack.main.config.js` - Main Process Bundle
```javascript
module.exports = {
  entry: './index.js',
  externals: {
    // Exclude native addon from bundling
    '../native/build/Release/keyhook.node': 'commonjs ../native/build/Release/keyhook.node'
  },
  plugins: [
    // Copy preload scripts and native addons
    new CopyWebpackPlugin({
      patterns: [
        'electron-chrome-extensions/preload',
        'electron-chrome-web-store/preload',
        'native/build/Release/keyhook.node'
      ]
    })
  ]
}
```

#### `webpack.renderer.config.js` - Renderer Process Bundle
- Minimal configuration for renderer
- Extension resolution

---

## 🛠️ Native Addons

### 🔒 `packages/shell/native/keyhook.cc` - Windows Keyboard Hook

**Purpose**: Low-level keyboard interception untuk Windows

**Key Features:**
```cpp
// Block specific key combinations
bool isBlockedCombo = 
  ((vk == VK_TAB) && keyDown(VK_MENU)) ||           // Alt+Tab
  ((vk == VK_F4) && keyDown(VK_MENU)) ||            // Alt+F4  
  ((vk == 'S') && keyDown(VK_LWIN) && keyDown(VK_SHIFT)) || // Win+Shift+S
  (vk == VK_SNAPSHOT);                              // PrintScreen
```

**API Functions:**
- `Install()`: Install keyboard hook
- `Uninstall()`: Remove keyboard hook
- Cross-platform stub implementations

**Build Configuration:**
- `binding.gyp`: Native addon build configuration
- Node-API (N-API) for ABI stability
- Windows-only implementation

---

## 🚀 Application Flow

### 🏁 Startup Sequence

1. **Main Process Launch**
   ```javascript
   // main.js
   const Browser = require('./core/Browser')
   module.exports = Browser
   ```

2. **Browser Initialization**
   ```javascript
   // Browser.js
   constructor() {
     app.whenReady().then(this.init.bind(this))
   }
   
   async init() {
     // Check for multiple monitors and block if detected
     if (checkAndBlockIfMultipleMonitors()) {
       return // Exit if blocked
     }
     
     this.initSession()           // Setup Electron session
     setupMenu(this)              // Create application menu
     registerPreloadScripts()     // Register security preloads
     this.extensions = await setupExtensions(this) // Setup Chrome extensions
     await loadExtensions()       // Load WebUI & local extensions
     keyboardHook.install()       // Install keyboard security
     this.createInitialWindow()   // Show welcome screen
   }
   ```

3. **Window Creation**
   ```javascript
   // TabbedBrowserWindow.js
   constructor(options) {
     this.window = new BrowserWindow({
       frame: false,           // No window decorations
       kiosk: true,           // Kiosk mode
       webPreferences: {
         sandbox: true,       // Security sandbox
         contextIsolation: true
       }
     })
     
     this.tabs = new Tabs(this.window)  // Setup tab system
     this.webContents.loadURL(webuiUrl) // Load custom UI
   }
   ```

### 🔄 Runtime Operations

**Tab Management:**
```javascript
// Create new tab
const tab = win.tabs.create()
tab.loadURL('https://example.com')

// Switch tabs
win.tabs.select(tabId)

// Close tab
win.tabs.remove(tabId)
```

**Extension Integration:**
```javascript
// Extension creates tab
extensions.createTab({
  url: 'https://example.com',
  active: true
})

// Extension popup handling
extensions.on('browser-action-popup-created', (popup) => {
  browserInstance.popup = popup
})
```

**Keyboard Security:**
```javascript
// Native hook (Windows)
keyboardHook.install()  // Block Alt+Tab, Alt+F4, etc.

// Fallback (Cross-platform)
keyboardBlocker.install() // Use Electron globalShortcut
```

### 🔑 Windows Key Blocking Implementation

**Native Windows Hook (Primary):**
```cpp
// keyhook.cc - Native C++ addon
LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode == HC_ACTION) {
    KBDLLHOOKSTRUCT* pKeyboard = (KBDLLHOOKSTRUCT*)lParam;
    
    // Block Windows key (VK_LWIN, VK_RWIN)
    if (pKeyboard->vkCode == VK_LWIN || pKeyboard->vkCode == VK_RWIN) {
      return 1; // Block the key
    }
    
    // Block Alt+Tab, Alt+F4, Ctrl+Alt+Del, etc.
    // 60+ combinations blocked
  }
  return CallNextHookEx(NULL, nCode, wParam, lParam);
}
```

**JavaScript Fallback (Secondary):**
```javascript
// keyboard-blocker.js - Electron globalShortcut fallback
const { globalShortcut } = require('electron')

function installKeyboardBlocker() {
  // Block common shortcuts
  const blockedShortcuts = [
    'Alt+Tab', 'Alt+F4', 'Alt+Space', 'F11',
    'Ctrl+Shift+I', 'Ctrl+Shift+J', 'Ctrl+Shift+C',
    'F12', 'Ctrl+R', 'Ctrl+Shift+R',
    // Print screen combinations
    'PrintScreen', 'Alt+PrintScreen', 'Ctrl+PrintScreen'
  ]
  
  blockedShortcuts.forEach(shortcut => {
    globalShortcut.register(shortcut, () => {
      console.log(`Blocked shortcut: ${shortcut}`)
    })
  })
}
```

**Browser.js Integration:**
```javascript
// Browser.js - Main application entry point
class Browser {
  constructor() {
    this.keyboardHelperProcess = null
    this.electronKeyboardHook = null
  }
  
  async initializeSecurity() {
    // Check development flag first
    if (process.env.DISABLE_WIN_KEY_BLOCK) {
      console.log('Browser: Windows key blocking DISABLED for development')
      return
    }
    
    console.log('Browser: Installing keyboard blocking system...')
    
    // Primary: Start native helper (handles Windows key effectively)
    await this.startNativeKeyboardHelper()
    
    // Backup: Install Electron addon (handles key combinations)
    this.installElectronKeyboardHook()
  }
  
  async startNativeKeyboardHelper() {
    const { spawn } = require('child_process')
    const path = require('path')
    
    try {
      const helperPath = path.join(__dirname, '..', 'keyhook-helper.exe')
      
      console.log('Browser: Starting native keyboard helper:', helperPath)
      
      this.keyboardHelperProcess = spawn(helperPath, [], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      
      this.keyboardHelperProcess.stdout.on('data', (data) => {
        console.log('KeyboardHelper:', data.toString().trim())
      })
      
      this.keyboardHelperProcess.stderr.on('data', (data) => {
        console.error('KeyboardHelper Error:', data.toString().trim())
      })
      
      this.keyboardHelperProcess.on('exit', (code) => {
        console.log('KeyboardHelper: Process exited with code', code)
        this.keyboardHelperProcess = null
      })
      
    } catch (error) {
      console.error('Failed to start native keyboard helper:', error)
    }
  }
  
  installElectronKeyboardHook() {
    try {
      const keyboardHook = require('./utils/keyboard-hook')
      
      if (keyboardHook.isAvailable()) {
        console.log('Browser: Installing Electron hook for key combinations...')
        const result = keyboardHook.install()
        
        if (result) {
          console.log('Browser: Electron hook installed successfully (backup for combinations)')
        } else {
          console.warn('Browser: Electron hook installation failed (expected limitation)')
        }
      } else {
        console.warn('Browser: Electron hook not available on this platform')
      }
    } catch (error) {
      console.warn('Browser: Electron hook error (expected):', error.message)
    }
  }
  
  cleanup() {
    // Kill native helper process
    if (this.keyboardHelperProcess) {
      this.keyboardHelperProcess.kill()
      this.keyboardHelperProcess = null
    }
    
    // Uninstall hooks
    if (this.electronKeyboardHook) {
      this.electronKeyboardHook.uninstall()
      this.electronKeyboardHook = null
    }
  }
}
```

**Development Flags:**
```javascript
// Environment variable check
if (process.env.DISABLE_WIN_KEY_BLOCK) {
  console.log('Browser: Windows key blocking DISABLED for development (DISABLE_WIN_KEY_BLOCK=true)')
} else {
  // Install keyboard blocking
  this.initializeSecurity()
}
```


## 🔒 Security Features

### 🖥️ Monitor Detection & Blocking

**Purpose**: Prevent browser from running when multiple monitors are detected

**Implementation:**
```javascript
// Monitor detection using Electron screen API
const { screen } = require('electron')
const displays = screen.getAllDisplays()
const monitorCount = displays.length

// Block browser if >1 monitor detected
if (monitorCount > 1 && !process.env.DISABLE_MONITOR_CHECK) {
  console.error('BROWSER DIBLOKIR - Multiple Monitor Detected')
  app.quit()
}
```

**Environment Variable Flags:**
- `DISABLE_MONITOR_CHECK=true`: Disable monitor detection for development
- `SHELL_DEBUG=true`: Debug mode automatically bypasses monitor check

### 🛡️ Kiosk Mode Security

**Window Configuration:**
```javascript
{
  frame: false,           // No window controls
  kiosk: true,           // Fullscreen kiosk mode
  webPreferences: {
    sandbox: true,       // Process isolation
    nodeIntegration: false,      // No Node.js access
    contextIsolation: true,      // Isolated contexts
    enableRemoteModule: false,   // No remote module
    worldSafeExecuteJavaScript: true
  }
}
```

**Keyboard Shortcut Blocking:**
- **Native Hook**: Windows low-level keyboard interception
- **JavaScript Fallback**: Electron globalShortcut API
- **60+ Blocked Combinations**: See Windows Key Blocking Implementation section above

### 🔐 Administrator Elevation (Windows)

**Purpose**: Menjalankan kiosk dengan hak administrator, karena tanpa elevation
sebagian proteksi tidak bekerja:

- `taskkill` terhadap service yang berjalan sebagai SYSTEM (mis. `TeamViewer_Service.exe`) ditolak
- image path proses milik user lain tidak terbaca, sehingga tier signature/metadata di `process-blocker.js` buta terhadap aplikasi yang di-rename
- low-level keyboard hook tidak menerima input yang ditujukan ke window high-integrity (UIPI)

**Dua lapis, keduanya aktif:**

1. **Manifest** - `forge.config.js` menyetel
   `win32metadata['requested-execution-level'] = 'requireAdministrator'`, sehingga
   exe hasil package meminta UAC sebelum aplikasi jalan. Ini jalur normal.
   (`package.json` root juga menyetel `build.win.requestedExecutionLevel` untuk
   installer NSIS electron-builder.)
2. **Runtime fallback** - `browser/utils/elevation.js` dipanggil dari `index.js`
   sebelum apa pun yang lain. Ia memeriksa integrity level lewat `fltmc.exe`, dan
   bila belum elevated me-relaunch dirinya sendiri via `Start-Process -Verb RunAs`
   lalu keluar. Menutup kasus di mana manifest tidak berlaku: development run,
   atau exe yang resource-nya sudah diubah orang.

**Catatan deployment**: dengan `requireAdministrator`, user standar (bukan
administrator) akan diminta kredensial admin dan tidak bisa menjalankan aplikasi
sama sekali. Bila mesin ujian memakai akun standar, ganti nilainya ke
`highestAvailable`: administrator tetap naik otomatis, user standar tetap bisa
jalan (dengan proteksi terbatas).

**Bila UAC ditolak**: aplikasi tetap jalan dengan proteksi terbatas dan menulis
peringatan ke `%TEMP%/kki-kiosk-diag.log`. Untuk mewajibkan admin, set
`REQUIRE_ELEVATION = true` di `browser/utils/elevation.js`.

**Environment Variable Flags:**
- `DISABLE_ELEVATION=true`: lewati elevation sepenuhnya
- `FORCE_ELEVATION=true`: aktifkan elevation pada run yang belum di-package (default: hanya build packaged)

### 🍽️ Application Menu System

**Menu Structure:**
```javascript
// menu.js - Application menu configuration
const template = [
  ...(isMac ? [{ role: 'appMenu' }] : []),
  {
    label: 'File',
    submenu: [{
      label: 'Exit Kiosk Mode',
      accelerator: 'CmdOrCtrl+Shift+Q',
      click: () => {
        // Force destroy all windows and quit
        browser.windows.forEach(win => {
          if (win.window && !win.window.isDestroyed()) {
            win.window.destroy()
          }
        })
        app.quit()
      }
    }]
  },
  { role: 'editMenu' },
  {
    label: 'View',
    submenu: [{
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: () => tabWc().reload()
    }, {
      label: 'Force Reload',
      accelerator: 'Shift+CmdOrCtrl+R',
      click: () => tabWc().reloadIgnoringCache()
    }, {
      label: 'Toggle Developer Tools',
      accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
      click: () => tabWc().toggleDevTools()
    }]
  }
]
```

**Menu Features:**
- **Exit Kiosk Mode**: `Ctrl+Shift+Q` - Emergency exit from kiosk mode
- **Navigation**: Reload, Force Reload, Developer Tools
- **Standard Menus**: Edit menu, Zoom controls
- **Platform Specific**: Different accelerators for macOS vs Windows/Linux

---

**Preload Scripts:**
- Chrome extension API injection
- Security context isolation
- Controlled API exposure

**Extension Sandboxing:**
- Manifest permission validation
- Isolated extension contexts
- Service worker management (MV3)

---

## 📁 File Structure Summary

```
sejati-electron/
├── 📄 package.json              # Main project configuration
├── 📄 README.md                 # Project documentation  
├── 📄 tsconfig.json            # TypeScript configuration
├── 📄 eslint.config.mjs        # ESLint rules
├── 📁 packages/                # Monorepo packages
│   ├── 📁 shell/               # Main browser application
│   │   ├── 📄 package.json     # Shell package configuration
│   │   ├── 📄 forge.config.js  # Electron Forge config
│   │   ├── 📄 webpack.*.js     # Build configurations
│   │   ├── 📁 browser/         # Browser implementation
│   │   │   ├── 📄 main.js      # Entry point
│   │   │   ├── 📁 core/        # Core browser logic
│   │   │   │   └── 📄 Browser.js
│   │   │   ├── 📁 windows/     # Window management
│   │   │   │   └── 📄 TabbedBrowserWindow.js
│   │   │   ├── 📄 tabs.js      # Tab system
│   │   │   ├── 📄 menu.js      # Application menu
│   │   │   ├── 📁 extensions/  # Extension support
│   │   │   │   └── 📄 extension-manager.js
│   │   │   ├── 📁 handlers/    # Event handlers
│   │   │   │   ├── 📄 ipc-handlers.js
│   │   │   │   ├── 📄 context-menu-handler.js
│   │   │   │   └── 📄 window-open-handler.js
│   │   │   ├── 📁 utils/       # Utility functions
│   │   │   │   ├── 📄 keyboard-hook.js
│   │   │   │   ├── 📄 keyboard-blocker.js
│   │   │   │   ├── 📄 monitor-detector.js
│   │   │   │   └── 📄 helpers.js
│   │   │   ├── 📁 ui/          # User interface
│   │   │   │   └── 📄 webui.js
│   │   │   ├── 📁 config/      # Configuration
│   │   │   │   └── 📄 paths.js
│   │   │   └── 📁 session/     # Session management
│   │   │       └── 📄 session-manager.js
│   │   └── 📁 native/          # Native addons
│   │       ├── 📄 binding.gyp  # Build configuration
│   │       └── 📄 keyhook.cc   # C++ keyboard hook
│   ├── 📁 electron-chrome-extensions/     # Extension API bridge
│   ├── 📁 electron-chrome-context-menu/   # Context menu implementation  
│   └── 📁 electron-chrome-web-store/      # Web Store integration
├── 📁 build/                   # Build system configurations
├── 📁 scripts/                 # Build and utility scripts
├── 📁 assets/                  # Application assets
├── 📁 dist/                    # Build output directory
└── 📁 extensions/              # Local extensions directory
```

## 🚀 Quick Start

```bash
# Quick development start (recommended)
cd packages/shell
npm run start:dev-direct

# Full development mode with all flags disabled
npm run start:dev

# Production mode with all security enabled
npm start

# See Development Guide section below for detailed instructions
```

---

## 🚪 Application Entry Points

### 📄 Main Entry Point

**index.js (Shell Package):**
```javascript
const Browser = require('./browser/main')
new Browser()
```

**browser/main.js (Browser Module):**
```javascript
/**
 * Sejati Browser - Main Entry Point
 * 
 * This is the main entry point for the Sejati browser application.
 * The actual Browser implementation has been modularized into separate files
 * for better maintainability and organization.
 * 
 * Structure:
 * - core/Browser.js: Main Browser class
 * - windows/TabbedBrowserWindow.js: Browser window management
 * - config/paths.js: Path configurations
 * - session/session-manager.js: Session initialization and management
 * - extensions/extension-manager.js: Chrome extension handling
 * - handlers/: IPC, context menu, and window handlers
 * - utils/: Helper functions
 */

const Browser = require('./core/Browser')
module.exports = Browser
```

**Purpose:**
- **Modular Architecture**: Separates concerns into logical modules
- **Clean Entry Point**: Simple initialization without complex logic
- **Maintainable Structure**: Easy to locate and modify specific functionality

---

Panduan untuk development aplikasi Sejati Browser dengan berbagai flag dan mode development.

### 🔧 Environment Variables

#### Security Flags

##### `DISABLE_WIN_KEY_BLOCK`
Menonaktifkan Windows key blocking untuk memudahkan development.

```bash
# Set environment variable
set DISABLE_WIN_KEY_BLOCK=true

# Atau gunakan script npm
npm run start:no-winkey
```

**Kapan digunakan:**
- Saat development dan perlu akses Windows key
- Testing tanpa keyboard restrictions
- Debugging keyboard-related issues

##### `DISABLE_MONITOR_CHECK`
Menonaktifkan pengecekan multiple monitor.

```bash
# Set environment variable  
set DISABLE_MONITOR_CHECK=true

# Atau gunakan script npm
npm run start:no-monitor-check
```

**Kapan digunakan:**
- Development dengan multiple monitor setup
- Testing di environment dengan banyak monitor

##### `DISABLE_ELEVATION` / `FORCE_ELEVATION`
Mengatur elevation administrator di Windows (lihat Administrator Elevation di atas).

```bash
# Lewati elevation sepenuhnya
set DISABLE_ELEVATION=true

# Paksa elevation walau belum di-package (untuk menguji jalur UAC)
set FORCE_ELEVATION=true
```

**Kapan digunakan:**
- Development di mesin tanpa hak administrator
- Menguji perilaku aplikasi saat prompt UAC ditolak

##### `SHELL_DEBUG`
Mengaktifkan debug mode dengan developer tools.

```bash
# Set environment variable
set SHELL_DEBUG=true

# Atau gunakan script npm
npm run start:debug
```

**Kapan digunakan:**
- Debugging aplikasi
- Inspecting web contents
- Development dengan DevTools

### 📜 NPM Scripts

#### Production Scripts
```bash
npm start                    # Normal start dengan semua security
npm run build               # Build aplikasi untuk production
npm run package            # Package aplikasi
```

#### Development Scripts
```bash
npm run start:dev           # Development mode (no winkey + no monitor check)
npm run start:dev-direct    # Development mode dengan direct electron
npm run start:no-winkey     # Disable Windows key blocking only
npm run start:no-winkey-direct # Disable Windows key blocking (direct)
npm run start:no-monitor-check  # Disable monitor check only
npm run start:debug         # Debug mode dengan DevTools
```

#### Utility Scripts
```bash
npm run rebuild-native      # Rebuild native keyboard hook addon
npm run start:trace         # Start dengan performance tracing
```

### 🔄 Development Workflow

#### 1. Setup Development Environment
```bash
# Clone repository
git clone <repo-url>
cd sejati-electron/packages/shell

# Install dependencies
npm install

# Start development mode
npm run start:dev-direct
```

#### 2. Development dengan Hot Reload
```bash
# Start dengan webpack hot reload (bisa stuck)
npm run start:dev

# Alternatif yang lebih reliable
npm run start:dev-direct

# Untuk debugging
npm run start:debug
```

#### 3. Testing Security Features
```bash
# Test dengan semua security enabled
npm start

# Test tanpa Windows key blocking
npm run start:no-winkey-direct

# Test tanpa monitor check
npm run start:no-monitor-check
```

### 🐛 Debugging Tips

#### 1. Keyboard Hook Issues
```bash
# Rebuild native addon
npm run rebuild-native

# Start tanpa keyboard blocking
npm run start:no-winkey-direct
```

#### 2. Extension Issues
```bash
# Start dengan debug mode
npm run start:debug

# Check console untuk extension errors
```

#### 3. Monitor Detection Issues
```bash
# Bypass monitor check
npm run start:no-monitor-check

# Atau set environment variable
set DISABLE_MONITOR_CHECK=true
npm start
```

#### 4. Webpack Stuck Issues
```bash
# Kill node processes
taskkill /f /im node.exe

# Clear webpack cache
Remove-Item -Recurse -Force .webpack -ErrorAction SilentlyContinue

# Use direct electron instead
npm run start:dev-direct
```

### 🔀 Environment Variable Combinations

#### Full Development Mode
```bash
set DISABLE_WIN_KEY_BLOCK=true
set DISABLE_MONITOR_CHECK=true
set SHELL_DEBUG=true
npm start
```

#### Production Testing
```bash
# Unset semua development flags
set DISABLE_WIN_KEY_BLOCK=
set DISABLE_MONITOR_CHECK=
set SHELL_DEBUG=
npm start
```

#### Selective Testing
```bash
# Test hanya keyboard blocking
set DISABLE_MONITOR_CHECK=true
set SHELL_DEBUG=true
npm start

# Test hanya monitor check
set DISABLE_WIN_KEY_BLOCK=true
set SHELL_DEBUG=true
npm start
```

### 🔧 Development vs Production
- **Development**: Gunakan flags untuk disable security features
- **Production**: Semua security features harus enabled
- **Testing**: Kombinasi flags sesuai kebutuhan testing

### 🚨 Troubleshooting

#### Native Addon Build Failures
```bash
# Install build tools
npm install --global windows-build-tools

# Rebuild addon
npm run rebuild-native
```

#### Permission Issues
```bash
# Run as administrator jika diperlukan
# Atau disable security features untuk development
npm run start:dev-direct
```

#### Multiple Monitor Detection
```bash
# Disable untuk development
npm run start:no-monitor-check

# Atau set permanent untuk development
set DISABLE_MONITOR_CHECK=true
```

### ✅ Best Practices

1. **Development**: Selalu gunakan `npm run start:dev-direct` (lebih reliable)
2. **Testing**: Test dengan dan tanpa security flags
3. **Production**: Pastikan semua flags disabled
4. **Debugging**: Gunakan `npm run start:debug` untuk DevTools
5. **Native Addon**: Rebuild setelah update dependencies
6. **Webpack Issues**: Gunakan `-direct` scripts untuk menghindari webpack stuck

---

## 🔨 Native Helper Compilation

### 📁 Native Keyboard Hook Helper

**Source Files:**
- `native/keyhook-helper.cpp` - Standalone Windows executable
- `native/keyhook.cc` - Node.js addon for Electron integration
- `native/binding.gyp` - Build configuration for node-gyp

**Compilation Script:**
```bat
:: compile-helper.bat - Automated compilation
@echo off
echo Compiling native keyboard hook helper...

:: Compile dengan Visual Studio Build Tools
cl.exe /EHsc native\keyhook-helper.cpp /Fe:keyhook-helper.exe user32.lib kernel32.lib

:: Atau compile dengan MinGW jika tersedia
:: g++ -o keyhook-helper.exe native/keyhook-helper.cpp -luser32 -lkernel32

echo Native helper compiled successfully!
echo Run keyhook-helper.exe to test Windows key blocking.
pause
```

**Manual Compilation:**
```bash
# Dengan Visual Studio Build Tools
cl.exe /EHsc native/keyhook-helper.cpp /Fe:keyhook-helper.exe user32.lib kernel32.lib

# Dengan MinGW
g++ -o keyhook-helper.exe native/keyhook-helper.cpp -luser32 -lkernel32
```

**Purpose:**
- **Standalone Executable**: `keyhook-helper.exe` - Independent Windows key blocker
- **Node.js Integration**: `keyhook.node` - Native addon for Electron
- **Dual Implementation**: Fallback system for keyboard security

---

## 🏗️ Build System Configuration

### ⚙️ Electron Forge Configuration

**forge.config.js:**
```javascript
module.exports = {
  packagerConfig: {
    name: 'Shell',
    asar: true,
    extraResource: ['browser/ui'],
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
  ],
  plugins: [{
    name: '@electron-forge/plugin-webpack',
    config: {
      mainConfig: './webpack.main.config.js',
      renderer: {
        config: './webpack.renderer.config.js',
        entryPoints: [{
          name: 'browser',
          preload: { js: './preload.ts' },
        }],
      },
    },
  }],
}
```

### 📦 Webpack Configuration

**Main Process (webpack.main.config.js):**
```javascript
module.exports = {
  entry: './index.js',
  externals: {
    // Exclude native modules from webpack bundling
    '../native/build/Release/keyhook.node': 'commonjs ../native/build/Release/keyhook.node',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        require.resolve('electron-chrome-extensions/preload'),
        // Copy native addon to webpack output
        {
          from: path.resolve(__dirname, 'native/build/Release/keyhook.node'),
          to: 'native/build/Release/keyhook.node',
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
}
```

**Renderer Process (webpack.renderer.config.js):**
```javascript
module.exports = {
  target: 'web',
  entry: './browser/ui/webui.js',
}
```

### 🚀 Preload Script Integration

**preload.ts:**
```typescript
import { injectBrowserAction } from 'electron-chrome-extensions/browser-action'

// Inject <browser-action-list> element into WebUI
if (location.protocol === 'chrome-extension:' && location.pathname === '/webui.html') {
  injectBrowserAction()
}
```

**Purpose:**
- **Extension API Injection**: Adds browser action buttons to UI
- **Security Isolation**: Controlled API exposure to renderer
- **Chrome Compatibility**: Mimics Chrome extension environment

---

## 🎨 UI System Components

### 🌐 WebUI Interface

**webui.html:**
- Main browser interface with toolbar
- Tab management UI
- App buttons container
- Extension browser actions integration

**webui.js:**
- Tab creation and management
- Navigation controls
- App buttons dynamic loading
- IPC communication with main process

**Key Features:**
- **Responsive Design**: Adapts to different screen sizes
- **Extension Integration**: Browser action buttons from extensions
- **Dynamic Components**: App buttons loaded from configuration
- **Accessibility**: Keyboard navigation support

### 🚫 Access Control UI

**access-denied.html:**
- Blocked website notification page
- User-friendly error messages
- Retry and navigation options

**access-denied-popup.js:**
- Domain blocking popup management
- User interaction handling
- Bypass request processing

**Purpose:**
- **User Communication**: Clear messaging when access is blocked
- **Fallback Options**: Allow navigation to alternative content
- **Security Awareness**: Educate users about domain restrictions

### 📑 Tab Management

**new-tab.html:**
- Default new tab page
- Quick access to frequently used sites
- Search functionality

**tabs.js:**
- Tab creation, switching, and closing
- Tab state management
- Navigation history per tab

**Features:**
- **Multi-Tab Support**: Unlimited tabs
- **Independent Navigation**: Each tab maintains separate history
- **Resource Management**: Proper cleanup on tab close

---

## 🎨 App Buttons Configuration

Sistem ini memungkinkan Anda untuk menambah, mengedit, dan mengelola tombol aplikasi di browser toolbar melalui file konfigurasi JSON.

### 📁 File Konfigurasi

File konfigurasi utama: `packages/shell/browser/config/app-buttons.json`

### 🏗️ Struktur Konfigurasi

```json
{
  "appButtons": [
    {
      "id": "unique-app-id",
      "name": "App Name",
      "enabled": true,
      "style": {
        "backgroundColor": "#5865F2",
        "hoverColor": "#4752C4", 
        "activeColor": "#3C45A5",
        "textColor": "#ffffff"
      },
      "detection": {
        "type": "executable",
        "paths": [
          "%USERPROFILE%\\AppData\\Local\\App\\App.exe",
          "%PROGRAMFILES%\\App\\App.exe"
        ],
        "fallbackCommand": "where appname"
      },
      "launch": {
        "executable": "auto-detected",
        "arguments": []
      },
      "fallback": {
        "type": "url",
        "url": "https://app.com/download",
        "message": "App installer opened in browser"
      }
    }
  ]
}
```

### 📋 Properti Konfigurasi

#### Root Object
- `appButtons`: Array berisi konfigurasi tombol aplikasi

#### App Button Object
- `id` (string): ID unik untuk aplikasi
- `name` (string): Nama yang ditampilkan di tombol
- `enabled` (boolean): Apakah tombol diaktifkan atau tidak

#### Style Object
- `backgroundColor` (string): Warna background tombol
- `hoverColor` (string): Warna saat hover
- `activeColor` (string): Warna saat diklik
- `textColor` (string): Warna teks

#### Detection Object
- `type` (string): Tipe deteksi ("executable")
- `paths` (array): Daftar path untuk mencari executable
- `fallbackCommand` (string): Command fallback untuk mencari aplikasi

#### Launch Object
- `executable` (string): Path executable atau "auto-detected"
- `arguments` (array): Argumen command line

#### Fallback Object
- `type` (string): Tipe fallback ("url")
- `url` (string): URL installer atau download page
- `message` (string): Pesan yang ditampilkan saat fallback dieksekusi

**Note**: URL fallback akan dibuka di dalam browser Electron, bukan di browser default user.

### 🌍 Environment Variables

Anda dapat menggunakan environment variables di path:
- `%USERPROFILE%`: User profile directory
- `%PROGRAMFILES%`: Program Files directory
- `%PROGRAMFILES(X86)%`: Program Files (x86) directory

### 🔍 Wildcard Paths

Untuk aplikasi dengan versioning di folder name:
```json
"paths": [
  "%USERPROFILE%\\AppData\\Local\\Discord\\app-*\\Discord.exe"
]
```

### 📱 Contoh Aplikasi

#### Discord
```json
{
  "id": "discord",
  "name": "Discord", 
  "enabled": true,
  "style": {
    "backgroundColor": "#5865F2",
    "hoverColor": "#4752C4",
    "activeColor": "#3C45A5", 
    "textColor": "#ffffff"
  }
}
```

#### Spotify
```json
{
  "id": "spotify",
  "name": "Spotify",
  "enabled": false,
  "style": {
    "backgroundColor": "#1DB954",
    "hoverColor": "#1ed760", 
    "activeColor": "#169c46",
    "textColor": "#ffffff"
  }
}
```

### 🚀 Cara Menggunakan

1. **Edit file `app-buttons.json`** untuk menambah/mengedit aplikasi
2. **Set `enabled: true`** untuk mengaktifkan tombol
3. **Restart aplikasi** atau reload konfigurasi untuk melihat perubahan

### ➕ Menambah Aplikasi Baru

1. Buka `packages/shell/browser/config/app-buttons.json`
2. Tambahkan object baru ke array `appButtons`
3. Set konfigurasi sesuai kebutuhan
4. Set `enabled: true`
5. Save file dan restart aplikasi

### 💡 Tips
- Test path aplikasi sebelum menambahkan ke konfigurasi
- Gunakan fallback URL yang valid
- ID harus unik untuk setiap aplikasi

### 🔧 App Buttons Troubleshooting
- **Tombol tidak muncul**: Periksa `enabled: true` dan syntax JSON
- **Aplikasi tidak launch**: Periksa path di `detection.paths`
- **URL tidak terbuka**: Periksa URL fallback dan domain whitelist

---

## 📚 Additional Resources

### 📖 Documentation
- [Electron Official Docs](https://electronjs.org/docs)
- [Chrome Extensions API](https://developer.chrome.com/extensions)
- [Node-API Documentation](https://nodejs.org/api/n-api.html)

### 🛠️ Development Tools
- Electron DevTools for debugging
- Chrome Extensions Developer Mode
- Native addon debugging with Visual Studio

### 🤝 Contributing
- Follow ESLint configuration
- Add TypeScript types for new APIs
- Test on multiple platforms
- Document security implications

---

## 📄 License Information

**Core Project**: GPL-3.0 (with proprietary-use licensing available)
**Individual Packages**: 
- `electron-chrome-extensions`: Custom license
- `electron-chrome-context-menu`: MIT
- `electron-chrome-web-store`: MIT
- `shell`: MIT

For proprietary use licensing, contact the project maintainers or sponsor through GitHub.

---

*📝 This comprehensive mega documentation covers the complete Sejati Electron Browser project including architecture, security implementations, build systems, UI components, development guides, and configuration systems. Last updated: 2025*
