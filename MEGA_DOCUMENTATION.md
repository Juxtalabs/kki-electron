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

---

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

**Development Commands:**
```bash
npm run start:no-monitor-check  # Start without monitor check
npm run start:debug            # Debug mode with bypass
```

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
- **Blocked Shortcuts**: 60+ system combinations including:
  - `Alt+Tab` (Application switching)
  - `Alt+F4` (Close application)
  - `Win+D` (Show desktop)
  - `F11` (Fullscreen toggle)
  - `Ctrl+Shift+I` (Developer tools)
  - Print screen combinations

### 🔐 Session Security

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

## 🚀 Getting Started

### 📋 Prerequisites
- Node.js >= 16.0.0
- Yarn >= 1.10.0
- Python 3.x (for native addon compilation)
- Windows SDK (for keyboard hook compilation)

### 🔧 Installation
```bash
# Clone repository
git clone https://github.com/Sejati-io/sejati-electron.git
cd sejati-electron

# Install dependencies
yarn install

# Build native addons (Windows only)
cd packages/shell
npm run rebuild-native
```

### 🏃 Running the Application
```bash
# Development mode (with monitor check)
yarn user:start

# Debug mode with logging (bypasses monitor check)
yarn start:debug

# Skip monitor check for development
cd packages/shell
npm run start:no-monitor-check

# Skip build for faster startup
yarn start:skip-build
```

### 📦 Building for Distribution
```bash
# Build all packages
yarn user:build

# Package application
yarn package

# Create distributable
yarn make
```

---

## 🔧 Development Guidelines

### 🏗️ Architecture Principles
1. **Modular Design**: Separate concerns into distinct modules
2. **Event-Driven**: Use EventEmitter for loose coupling
3. **Security First**: Sandbox and isolate all components
4. **Cross-Platform**: Windows-specific features with fallbacks

### 📝 Code Conventions
- **ESLint**: Enforced code style
- **TypeScript**: Type safety for new code
- **Documentation**: JSDoc comments for APIs
- **Error Handling**: Graceful fallbacks and logging

### 🧪 Testing Strategy
- Unit tests for core functionality
- Extension compatibility tests
- Integration tests for keyboard security
- Cross-platform validation

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

*📝 This documentation covers the complete Sejati Electron Browser project structure, functionality, and implementation details. Last updated: 2025*
