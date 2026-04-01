// Script to inject face verification UI into browser window
const path = require('path')
const fs = require('fs')

function injectFaceVerificationUI(webContents) {
  if (!webContents || webContents.isDestroyed()) {
    console.warn('Cannot inject face verification UI: webContents is invalid')
    return
  }

  try {
    // Read HTML and JS files
    const htmlPath = path.join(__dirname, 'face-verification-overlay.html')
    const jsPath = path.join(__dirname, 'face-verification-ui.js')
    
    const html = fs.readFileSync(htmlPath, 'utf-8')
    const js = fs.readFileSync(jsPath, 'utf-8')
    
    // Extract just the body content (without html/head tags)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    const bodyContent = bodyMatch ? bodyMatch[1] : ''
    
    // Extract just the styles
    const styleMatch = html.match(/<style[^>]*>([\s\S]*)<\/style>/i)
    const styles = styleMatch ? styleMatch[1] : ''
    
    // Inject into page
    const injectionScript = `
      (function() {
        // Only inject once
        if (window.__faceVerificationInjected) {
          console.log('Face verification UI already injected');
          return;
        }
        window.__faceVerificationInjected = true;

        // Inject styles
        const styleEl = document.createElement('style');
        styleEl.textContent = ${JSON.stringify(styles)};
        document.head.appendChild(styleEl);

        // Inject HTML
        const container = document.createElement('div');
        container.innerHTML = ${JSON.stringify(bodyContent)};
        document.body.appendChild(container);

        // Helper to initialize UI after face-api.js is ready
        function initFaceVerificationUI() {
          try {
            ${js}

            if (window.faceVerificationUI && typeof window.faceVerificationUI.openCamera === 'function') {
              window.faceVerificationUI.openCamera();
            } else {
              console.warn('Face verification UI: window.faceVerificationUI not available after script execution');
            }

            console.log('Face verification UI injected successfully');
          } catch (err) {
            console.error('Face verification UI: Error during initialization:', err);
          }
        }

        // Load face-api.js from CDN first, then initialize UI
        if (!window.faceapi) {
          const scriptEl = document.createElement('script');
          scriptEl.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js';
          scriptEl.onload = () => {
            console.log('Face verification UI: face-api.js loaded from CDN');
            initFaceVerificationUI();
          };
          scriptEl.onerror = (e) => {
            console.error('Face verification UI: Failed to load face-api.js from CDN', e);
          };
          document.head.appendChild(scriptEl);
        } else {
          // face-api already present
          initFaceVerificationUI();
        }
      })();
    `
    
    webContents.executeJavaScript(injectionScript)
      .then(() => {
        console.log('Face verification UI injection completed')
      })
      .catch((error) => {
        console.error('Failed to inject face verification UI:', error)
      })
      
  } catch (error) {
    console.error('Error reading face verification UI files:', error)
  }
}

module.exports = { injectFaceVerificationUI }
