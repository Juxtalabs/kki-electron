const { Menu, app } = require('electron')

const zoom = require('./utils/zoom')

const setupMenu = (browser) => {
  const isMac = process.platform === 'darwin'

  const tab = () => browser.getFocusedWindow().getFocusedTab()
  const tabWc = () => tab().webContents

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit Kiosk Mode',
          accelerator: isMac ? 'Command+Shift+Q' : 'Ctrl+Shift+Q',
          click: () => {
            browser.promptExitPassword()
          }
        }
      ]
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          nonNativeMacOSRole: true,
          click: () => tabWc().reload(),
        },
        {
          label: 'Force Reload',
          accelerator: 'Shift+CmdOrCtrl+R',
          nonNativeMacOSRole: true,
          click: () => tabWc().reloadIgnoringCache(),
        },
        {
          label: 'Toggle Developer Tool asdf',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          nonNativeMacOSRole: true,
          click: () => tabWc().toggleDevTools(),
        },
        { type: 'separator' },
        // Spelled out rather than using the zoom roles: the zoomIn role only
        // registers 'CommandOrControl+Plus', which never matches the unshifted
        // Ctrl+= most people press. The keys are handled in Browser's
        // before-input-event instead (utils/zoom.js), so the accelerators here
        // are labels only - registerAccelerator keeps Electron from binding
        // them a second time and double-stepping the zoom.
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          registerAccelerator: false,
          click: () => zoom.resetZoom(tabWc()),
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          registerAccelerator: false,
          click: () => zoom.zoomIn(tabWc()),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          registerAccelerator: false,
          click: () => zoom.zoomOut(tabWc()),
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

module.exports = {
  setupMenu,
}
