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
