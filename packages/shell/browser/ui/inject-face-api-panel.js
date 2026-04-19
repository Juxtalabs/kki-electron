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

    // Get reference to Face API service from Browser instance
    const Browser = require('../core/Browser')
    const browserInstance = global.__browserInstance
    
    if (!browserInstance || !browserInstance.faceAPIService) {
      console.error('injectFaceAPIPanel: Browser instance or Face API service not found')
      return
    }
    
    const faceAPIService = browserInstance.faceAPIService
    
    // Inject Face API bridge that calls service methods directly
    await webContents.executeJavaScript(`
      (function() {
        if (window.faceAPI) {
          console.log('Face API bridge already injected');
          return;
        }
        
        // Create faceAPI object with direct service calls via executeJavaScript
        window.faceAPI = {
          _callId: 0,
          _pendingCalls: new Map(),
          
          _call: function(method, ...args) {
            const callId = ++this._callId;
            return new Promise((resolve, reject) => {
              this._pendingCalls.set(callId, { resolve, reject });
              
              // Store call data in window for main process to read
              window.__faceAPICall = {
                id: callId,
                method: method,
                args: args
              };
              
              // Signal main process
              console.log('Face API call:', method, args);
              
              // Timeout after 30 seconds
              setTimeout(() => {
                if (this._pendingCalls.has(callId)) {
                  this._pendingCalls.delete(callId);
                  reject(new Error('Face API call timeout'));
                }
              }, 30000);
            });
          },
          
          _handleResponse: function(callId, error, result) {
            const pending = this._pendingCalls.get(callId);
            if (pending) {
              this._pendingCalls.delete(callId);
              if (error) {
                pending.reject(new Error(error));
              } else {
                pending.resolve(result);
              }
            }
          },
          
          initialize: function() { return this._call('initialize'); },
          registerUser: function(userId, userName, imageBase64) { 
            return this._call('registerUser', userId, userName, imageBase64); 
          },
          verifyUser: function(userId, imageBase64) { 
            return this._call('verifyUser', userId, imageBase64); 
          },
          identifyUser: function(imageBase64) { 
            return this._call('identifyUser', imageBase64); 
          },
          compareImages: function(sourceImageBase64, targetImageBase64) { 
            return this._call('compareImages', sourceImageBase64, targetImageBase64); 
          },
          deleteUser: function(userId) { 
            return this._call('deleteUser', userId); 
          },
          getRegisteredUsers: function() { 
            return this._call('getRegisteredUsers'); 
          },
          isUserRegistered: function(userId) { 
            return this._call('isUserRegistered', userId); 
          }
        };
        
        console.log('Face API bridge injected successfully');
      })();
    `)
    
    // Setup polling to check for Face API calls and execute them
    const pollInterval = setInterval(async () => {
      if (webContents.isDestroyed()) {
        clearInterval(pollInterval)
        return
      }
      
      try {
        const callData = await webContents.executeJavaScript('window.__faceAPICall')
        if (callData && callData.id) {
          // Clear the call data
          await webContents.executeJavaScript('window.__faceAPICall = null')
          
          const { id, method, args } = callData
          
          try {
            // Call the actual service method
            let result
            switch (method) {
              case 'initialize':
                result = await faceAPIService.initialize()
                break
              case 'registerUser':
                result = await faceAPIService.registerUser(...args)
                break
              case 'verifyUser':
                result = await faceAPIService.verifyUser(...args)
                break
              case 'identifyUser':
                result = await faceAPIService.identifyUser(...args)
                break
              case 'compareImages':
                result = await faceAPIService.compareImages(...args)
                break
              case 'deleteUser':
                result = await faceAPIService.deleteUser(...args)
                break
              case 'getRegisteredUsers':
                result = await faceAPIService.getRegisteredUsers()
                break
              case 'isUserRegistered':
                result = await faceAPIService.isUserRegistered(...args)
                break
              default:
                throw new Error(`Unknown method: ${method}`)
            }
            
            // Send result back
            await webContents.executeJavaScript(`
              window.faceAPI._handleResponse(${id}, null, ${JSON.stringify(result)})
            `)
          } catch (error) {
            // Send error back
            await webContents.executeJavaScript(`
              window.faceAPI._handleResponse(${id}, ${JSON.stringify(error.message)}, null)
            `)
          }
        }
      } catch (error) {
        // Ignore errors from destroyed webContents
      }
    }, 100) // Poll every 100ms

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
