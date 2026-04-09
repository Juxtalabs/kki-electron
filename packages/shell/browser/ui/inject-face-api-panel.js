const fs = require('fs')
const path = require('path')
const { PATHS } = require('../config/paths')

async function injectFaceAPIPanel(webContents) {
  try {
    if (!webContents || webContents.isDestroyed()) {
      console.error('injectFaceAPIPanel: Invalid webContents')
      return
    }

    console.log('injectFaceAPIPanel: Starting injection...')

    // Read HTML and JS files
    // NOTE: __dirname akan berubah jadi .webpack/main setelah dibundle,
    // jadi gunakan PATHS.WEBUI yang selalu menunjuk ke folder UI asli.
    const htmlPath = path.join(PATHS.WEBUI, 'face-api-panel.html')
    const jsPath = path.join(PATHS.WEBUI, 'face-api-panel-ui.js')

    const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
    const jsContent = fs.readFileSync(jsPath, 'utf-8')

    // Extract styles and body content from HTML
    const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/)
    const bodyMatch = htmlContent.match(/<body>([\s\S]*?)<\/body>/)

    if (!styleMatch || !bodyMatch) {
      console.error('injectFaceAPIPanel: Failed to parse HTML')
      return
    }

    const styles = styleMatch[1]
    const bodyContent = bodyMatch[1].replace(/<script[^>]*>.*?<\/script>/gi, '')

    // Inject HTML & CSS into page
    await webContents.executeJavaScript(`
      (function() {
        // Check if already injected
        if (window.__faceAPIPanelInjected) {
          console.log('Face API Panel already injected, opening panel...');
          if (window.faceAPIPanelUI) {
            window.faceAPIPanelUI.openPanel();
          }
          return;
        }

        console.log('Face API Panel: Injecting UI...');

        // Inject styles
        const styleEl = document.createElement('style');
        styleEl.textContent = \`${styles.replace(/`/g, '\\`')}\`;
        document.head.appendChild(styleEl);

        // Inject HTML
        const container = document.createElement('div');
        container.innerHTML = \`${bodyContent.replace(/`/g, '\\`')}\`;
        document.body.appendChild(container);

        // Inject JavaScript
        const scriptEl = document.createElement('script');
        scriptEl.id = 'face-api-panel-ui-script';
        document.body.appendChild(scriptEl);
      })();
    `)
    
    // Jalankan kode UI panel langsung di renderer
    await webContents.executeJavaScript(jsContent)

    // Tandai sebagai injected dan buka panel jika tersedia
    await webContents.executeJavaScript(`
      if (window.faceAPIPanelUI) {
        window.__faceAPIPanelInjected = true;
        console.log('Face API Panel: UI injected successfully');
        window.faceAPIPanelUI.openPanel();
      } else {
        console.warn('Face API Panel: faceAPIPanelUI not found after injection');
      }
    `)

    console.log('injectFaceAPIPanel: Injection completed')
  } catch (error) {
    console.error('injectFaceAPIPanel: Error during injection:', error)
  }
}

module.exports = { injectFaceAPIPanel }
