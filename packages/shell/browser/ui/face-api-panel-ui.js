class FaceAPIPanelUI {
  constructor() {
    this.panel = document.getElementById('face-api-panel')
    this.canvas = document.getElementById('capture-canvas')
    this.ctx = this.canvas.getContext('2d')
    
    // Camera streams for each tab
    this.streams = {
      register: null,
      verify: null,
      identify: null,
      compare: null
    }
    
    // Captured images for compare
    this.compareImages = {
      source: null,
      target: null
    }
    
    this.init()
  }

  async init() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab))
    })

    // Close panel
    document.getElementById('close-panel').addEventListener('click', () => {
      this.closePanel()
    })

    // Register tab
    document.getElementById('register-start-camera').addEventListener('click', () => this.startCamera('register'))
    document.getElementById('register-stop-camera').addEventListener('click', () => this.stopCamera('register'))
    document.getElementById('register-submit').addEventListener('click', () => this.handleRegister())

    // Verify tab
    document.getElementById('verify-start-camera').addEventListener('click', () => this.startCamera('verify'))
    document.getElementById('verify-stop-camera').addEventListener('click', () => this.stopCamera('verify'))
    document.getElementById('verify-submit').addEventListener('click', () => this.handleVerify())

    // Identify tab
    document.getElementById('identify-start-camera').addEventListener('click', () => this.startCamera('identify'))
    document.getElementById('identify-stop-camera').addEventListener('click', () => this.stopCamera('identify'))
    document.getElementById('identify-submit').addEventListener('click', () => this.handleIdentify())

    // Compare tab
    document.getElementById('compare-start-camera').addEventListener('click', () => this.startCamera('compare'))
    document.getElementById('compare-stop-camera').addEventListener('click', () => this.stopCamera('compare'))
    document.getElementById('compare-capture-source').addEventListener('click', () => this.captureCompareImage('source'))
    document.getElementById('compare-capture-target').addEventListener('click', () => this.captureCompareImage('target'))
    document.getElementById('compare-submit').addEventListener('click', () => this.handleCompare())

    // Users tab
    document.getElementById('users-refresh').addEventListener('click', () => this.loadUsers())

    // Initialize Face API
    if (window.faceAPI) {
      await window.faceAPI.initialize()
      console.log('FaceAPIPanelUI: Face API initialized')
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName)
    })

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`)
    })

    // Load users if switching to users tab
    if (tabName === 'users') {
      this.loadUsers()
    }
  }

  async startCamera(tab) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      })

      this.streams[tab] = stream
      const video = document.getElementById(`${tab}-video`)
      const overlay = document.getElementById(`${tab}-video-overlay`)
      
      video.srcObject = stream
      overlay.style.display = 'none'

      // Enable/disable buttons
      document.getElementById(`${tab}-start-camera`).disabled = true
      document.getElementById(`${tab}-stop-camera`).disabled = false
      document.getElementById(`${tab}-submit`).disabled = false

      console.log(`FaceAPIPanelUI: Camera started for ${tab}`)
    } catch (error) {
      console.error(`FaceAPIPanelUI: Failed to start camera for ${tab}:`, error)
      this.showStatus(tab, `Failed to start camera: ${error.message}`, 'error')
    }
  }

  stopCamera(tab) {
    if (this.streams[tab]) {
      this.streams[tab].getTracks().forEach(track => track.stop())
      this.streams[tab] = null

      const video = document.getElementById(`${tab}-video`)
      const overlay = document.getElementById(`${tab}-video-overlay`)
      
      video.srcObject = null
      overlay.style.display = 'flex'
      overlay.textContent = 'Camera Off'

      // Enable/disable buttons
      document.getElementById(`${tab}-start-camera`).disabled = false
      document.getElementById(`${tab}-stop-camera`).disabled = true
      document.getElementById(`${tab}-submit`).disabled = true

      console.log(`FaceAPIPanelUI: Camera stopped for ${tab}`)
    }
  }

  captureImage(videoElement) {
    this.canvas.width = videoElement.videoWidth
    this.canvas.height = videoElement.videoHeight
    this.ctx.drawImage(videoElement, 0, 0)
    
    // Get base64 without prefix
    const dataURL = this.canvas.toDataURL('image/jpeg', 0.9)
    return dataURL.split(',')[1]
  }

  async handleRegister() {
    const userId = document.getElementById('register-user-id').value.trim()
    const userName = document.getElementById('register-user-name').value.trim()

    if (!userId || !userName) {
      this.showStatus('register', 'Please enter both User ID and User Name', 'error')
      return
    }

    if (!this.streams.register) {
      this.showStatus('register', 'Please start camera first', 'error')
      return
    }

    try {
      this.showStatus('register', 'Capturing and registering...', 'info')

      const video = document.getElementById('register-video')
      const imageBase64 = this.captureImage(video)

      const result = await window.faceAPI.registerUser(userId, userName, imageBase64)

      if (result.success) {
        this.showStatus('register', `✓ User ${userName} registered successfully!`, 'success')
        document.getElementById('register-user-id').value = ''
        document.getElementById('register-user-name').value = ''
      } else {
        this.showStatus('register', `✗ Registration failed: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('FaceAPIPanelUI: Registration error:', error)
      this.showStatus('register', `Error: ${error.message}`, 'error')
    }
  }

  async handleVerify() {
    const userId = document.getElementById('verify-user-id').value.trim()

    if (!userId) {
      this.showStatus('verify', 'Please enter User ID', 'error')
      return
    }

    if (!this.streams.verify) {
      this.showStatus('verify', 'Please start camera first', 'error')
      return
    }

    try {
      this.showStatus('verify', 'Capturing and verifying...', 'info')

      const video = document.getElementById('verify-video')
      const imageBase64 = this.captureImage(video)

      const result = await window.faceAPI.verifyUser(userId, imageBase64)

      const resultBox = document.getElementById('verify-result')
      const resultText = document.getElementById('verify-result-text')
      const similarityText = document.getElementById('verify-similarity')

      resultBox.style.display = 'block'

      if (result.success && result.verified) {
        this.showStatus('verify', '✓ Verification successful!', 'success')
        resultText.textContent = `✓ VERIFIED - ${result.userName}`
        resultText.className = 'result-value verified'
        similarityText.textContent = `${(result.similarity * 100).toFixed(2)}%`
      } else {
        this.showStatus('verify', '✗ Verification failed', 'error')
        resultText.textContent = '✗ NOT VERIFIED'
        resultText.className = 'result-value failed'
        similarityText.textContent = result.similarity ? `${(result.similarity * 100).toFixed(2)}%` : 'N/A'
      }

      if (result.hasMask) {
        this.showStatus('verify', '⚠️ Mask detected - please remove mask', 'error')
      }
    } catch (error) {
      console.error('FaceAPIPanelUI: Verification error:', error)
      this.showStatus('verify', `Error: ${error.message}`, 'error')
    }
  }

  async handleIdentify() {
    if (!this.streams.identify) {
      this.showStatus('identify', 'Please start camera first', 'error')
      return
    }

    try {
      this.showStatus('identify', 'Capturing and identifying...', 'info')

      const video = document.getElementById('identify-video')
      const imageBase64 = this.captureImage(video)

      const result = await window.faceAPI.identifyUser(imageBase64)

      const resultBox = document.getElementById('identify-result')
      const userNameText = document.getElementById('identify-user-name')
      const userIdText = document.getElementById('identify-user-id')
      const confidenceText = document.getElementById('identify-confidence')

      resultBox.style.display = 'block'

      if (result.success && result.identified) {
        this.showStatus('identify', '✓ User identified!', 'success')
        userNameText.textContent = result.userName
        userNameText.className = 'result-value verified'
        userIdText.textContent = result.userId
        confidenceText.textContent = `${(result.confidenceLevel * 100).toFixed(2)}%`
      } else {
        this.showStatus('identify', '✗ No matching user found', 'error')
        userNameText.textContent = 'Unknown'
        userNameText.className = 'result-value failed'
        userIdText.textContent = 'N/A'
        confidenceText.textContent = 'N/A'
      }

      if (result.hasMask) {
        this.showStatus('identify', '⚠️ Mask detected - please remove mask', 'error')
      }
    } catch (error) {
      console.error('FaceAPIPanelUI: Identification error:', error)
      this.showStatus('identify', `Error: ${error.message}`, 'error')
    }
  }

  captureCompareImage(type) {
    if (!this.streams.compare) {
      this.showStatus('compare', 'Please start camera first', 'error')
      return
    }

    const video = document.getElementById('compare-video')
    const imageBase64 = this.captureImage(video)
    
    this.compareImages[type] = imageBase64

    const btn = document.getElementById(`compare-capture-${type}`)
    btn.textContent = `✓ ${type.charAt(0).toUpperCase() + type.slice(1)} Captured`
    btn.classList.remove('btn-secondary')
    btn.classList.add('btn-success')

    // Enable compare button if both images captured
    if (this.compareImages.source && this.compareImages.target) {
      document.getElementById('compare-submit').disabled = false
    }

    this.showStatus('compare', `${type.charAt(0).toUpperCase() + type.slice(1)} image captured`, 'success')
  }

  async handleCompare() {
    if (!this.compareImages.source || !this.compareImages.target) {
      this.showStatus('compare', 'Please capture both source and target images', 'error')
      return
    }

    try {
      this.showStatus('compare', 'Comparing images...', 'info')

      const result = await window.faceAPI.compareImages(this.compareImages.source, this.compareImages.target)

      const resultBox = document.getElementById('compare-result')
      const resultText = document.getElementById('compare-result-text')
      const similarityText = document.getElementById('compare-similarity')

      resultBox.style.display = 'block'

      if (result.success && result.verified) {
        this.showStatus('compare', '✓ Images match!', 'success')
        resultText.textContent = '✓ MATCH'
        resultText.className = 'result-value verified'
        similarityText.textContent = `${(result.similarity * 100).toFixed(2)}%`
      } else {
        this.showStatus('compare', '✗ Images do not match', 'error')
        resultText.textContent = '✗ NO MATCH'
        resultText.className = 'result-value failed'
        similarityText.textContent = result.similarity ? `${(result.similarity * 100).toFixed(2)}%` : 'N/A'
      }

      // Reset captured images
      this.compareImages.source = null
      this.compareImages.target = null
      
      document.getElementById('compare-capture-source').textContent = '📸 Capture Source'
      document.getElementById('compare-capture-source').classList.remove('btn-success')
      document.getElementById('compare-capture-source').classList.add('btn-secondary')
      
      document.getElementById('compare-capture-target').textContent = '📸 Capture Target'
      document.getElementById('compare-capture-target').classList.remove('btn-success')
      document.getElementById('compare-capture-target').classList.add('btn-secondary')
      
      document.getElementById('compare-submit').disabled = true
    } catch (error) {
      console.error('FaceAPIPanelUI: Comparison error:', error)
      this.showStatus('compare', `Error: ${error.message}`, 'error')
    }
  }

  async loadUsers() {
    try {
      this.showStatus('users', 'Loading users...', 'info')

      const result = await window.faceAPI.getRegisteredUsers()

      const userList = document.getElementById('user-list')

      if (result.success && result.users.length > 0) {
        userList.innerHTML = result.users.map(user => `
          <div class="user-item">
            <div class="user-info">
              <div class="user-name">${user.userName}</div>
              <div class="user-id">ID: ${user.userId}</div>
            </div>
            <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="faceAPIPanelUI.deleteUser('${user.userId}')">Delete</button>
          </div>
        `).join('')

        this.showStatus('users', `${result.users.length} users loaded`, 'success')
      } else {
        userList.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px;">No registered users</div>'
        this.showStatus('users', 'No registered users', 'info')
      }
    } catch (error) {
      console.error('FaceAPIPanelUI: Load users error:', error)
      this.showStatus('users', `Error: ${error.message}`, 'error')
    }
  }

  async deleteUser(userId) {
    if (!confirm(`Are you sure you want to delete user ${userId}?`)) {
      return
    }

    try {
      this.showStatus('users', `Deleting user ${userId}...`, 'info')

      const result = await window.faceAPI.deleteUser(userId)

      if (result.success) {
        this.showStatus('users', `✓ User ${userId} deleted`, 'success')
        this.loadUsers()
      } else {
        this.showStatus('users', `✗ Failed to delete user: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('FaceAPIPanelUI: Delete user error:', error)
      this.showStatus('users', `Error: ${error.message}`, 'error')
    }
  }

  showStatus(tab, message, type) {
    const statusEl = document.getElementById(`${tab}-status`)
    statusEl.textContent = message
    statusEl.className = `status-message active ${type}`
    
    // Auto hide after 5 seconds for success/info
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        statusEl.classList.remove('active')
      }, 5000)
    }
  }

  openPanel() {
    this.panel.classList.add('active')
  }

  closePanel() {
    this.panel.classList.remove('active')
    
    // Stop all cameras
    Object.keys(this.streams).forEach(tab => {
      if (this.streams[tab]) {
        this.stopCamera(tab)
      }
    })
  }
}

// Initialize UI
const faceAPIPanelUI = new FaceAPIPanelUI()

// Expose to window for external access
window.faceAPIPanelUI = faceAPIPanelUI

console.log('Face API Panel UI initialized')
